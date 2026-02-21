-- ============================================================================
-- Fix reporting RPC functions: incorrect enum values
-- ============================================================================
-- Fixes:
-- 1. get_registration_metrics: 'completed' -> 'accepted' (tryout_registration_status)
-- 2. get_revenue_metrics: 'paid' -> 'succeeded' (payment_status_new)
-- 3. get_ticketing_metrics: 'paid' is correct (ticket_order_status)
-- ============================================================================

-- ============================================================================
-- get_registration_metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_registration_metrics(
  p_org_id UUID,
  p_sub_org_id UUID DEFAULT NULL,
  p_date_start TIMESTAMPTZ DEFAULT NULL,
  p_date_end TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'registrationsOverTime', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', day, 'value', cnt) ORDER BY day), '[]'::jsonb)
      FROM (
        SELECT
          date_trunc('day', tr.created_at)::DATE::TEXT AS day,
          COUNT(*)::INTEGER AS cnt
        FROM tryout_registrations tr
        JOIN tryouts t ON tr.tryout_id = t.id
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_date_start IS NULL OR tr.created_at >= p_date_start)
          AND (p_date_end IS NULL OR tr.created_at <= p_date_end)
        GROUP BY date_trunc('day', tr.created_at)
      ) sub
    ),
    'registrationCompletionRate', (
      SELECT CASE WHEN total > 0 THEN (completed::NUMERIC / total::NUMERIC) ELSE 0 END
      FROM (
        SELECT
          COUNT(*)::INTEGER AS total,
          COUNT(CASE WHEN tr.status IN ('accepted', 'offered') THEN 1 END)::INTEGER AS completed
        FROM tryout_registrations tr
        JOIN tryouts t ON tr.tryout_id = t.id
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_date_start IS NULL OR tr.created_at >= p_date_start)
          AND (p_date_end IS NULL OR tr.created_at <= p_date_end)
      ) stats
    ),
    'dropOffPoints', '[]'::jsonb,
    'registrationsByProgram', '[]'::jsonb,  -- Cannot join tryouts to programs (tryouts has no program_id)
    'incompleteRegistrations', (
      SELECT COUNT(*)::INTEGER
      FROM tryout_registrations tr
      JOIN tryouts t ON tr.tryout_id = t.id
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_date_start IS NULL OR tr.created_at >= p_date_start)
        AND (p_date_end IS NULL OR tr.created_at <= p_date_end)
        AND tr.status NOT IN ('accepted', 'offered', 'declined', 'rejected', 'withdrawn')
    ),
    'waiversSigned', 0,
    'waiversPending', 0
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- get_revenue_metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_revenue_metrics(
  p_org_id UUID,
  p_sub_org_id UUID DEFAULT NULL,
  p_season_id UUID DEFAULT NULL,
  p_sport_id UUID DEFAULT NULL,
  p_program_id UUID DEFAULT NULL,
  p_level_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL,
  p_date_start TIMESTAMPTZ DEFAULT NULL,
  p_date_end TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalRevenue', (
      SELECT COALESCE(SUM(amount_cents), 0)::NUMERIC / 100
      FROM payments
      WHERE org_id = p_org_id
        AND status = 'succeeded'
        AND (p_date_start IS NULL OR paid_at >= p_date_start)
        AND (p_date_end IS NULL OR paid_at <= p_date_end)
    ),
    'revenueOverTime', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', day, 'value', revenue) ORDER BY day), '[]'::jsonb)
      FROM (
        SELECT
          date_trunc('day', paid_at)::DATE::TEXT AS day,
          SUM(amount_cents)::NUMERIC / 100 AS revenue
        FROM payments
        WHERE org_id = p_org_id
          AND status = 'succeeded'
          AND (p_date_start IS NULL OR paid_at >= p_date_start)
          AND (p_date_end IS NULL OR paid_at <= p_date_end)
        GROUP BY date_trunc('day', paid_at)
      ) sub
    ),
    'revenueBySeason', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('seasonId', sid, 'seasonName', sname, 'revenue', rev)), '[]'::jsonb)
      FROM (
        SELECT
          s.id AS sid,
          s.name AS sname,
          COALESCE(SUM(pa.amount_cents), 0)::NUMERIC / 100 AS rev
        FROM seasons s
        LEFT JOIN fees f ON s.id = f.season_id AND f.org_id = p_org_id
        LEFT JOIN fee_assignments fa ON f.id = fa.fee_id
        LEFT JOIN payment_allocations pa ON fa.id = pa.fee_assignment_id
        LEFT JOIN payments p ON pa.payment_id = p.id
          AND p.status = 'succeeded'
          AND (p_date_start IS NULL OR p.paid_at >= p_date_start)
          AND (p_date_end IS NULL OR p.paid_at <= p_date_end)
        WHERE s.org_id = p_org_id
          AND (p_season_id IS NULL OR s.id = p_season_id)
        GROUP BY s.id, s.name
      ) sub
    ),
    'revenueByTeam', '[]'::jsonb,
    'paymentsCompleted', (
      SELECT COUNT(*)::INTEGER
      FROM payments
      WHERE org_id = p_org_id
        AND status = 'succeeded'
        AND (p_date_start IS NULL OR paid_at >= p_date_start)
        AND (p_date_end IS NULL OR paid_at <= p_date_end)
    ),
    'paymentsFailed', (
      SELECT COUNT(*)::INTEGER
      FROM payments
      WHERE org_id = p_org_id
        AND status = 'failed'
        AND (p_date_start IS NULL OR created_at >= p_date_start)
        AND (p_date_end IS NULL OR created_at <= p_date_end)
    ),
    'outstandingBalances', (
      SELECT COALESCE(SUM(GREATEST(fa.amount_cents - COALESCE(paid.paid_amount, 0), 0)), 0)::NUMERIC / 100
      FROM fee_assignments fa
      LEFT JOIN (
        SELECT fee_assignment_id, SUM(amount_cents) AS paid_amount
        FROM payment_allocations
        GROUP BY fee_assignment_id
      ) paid ON fa.id = paid.fee_assignment_id
      JOIN fees f ON fa.fee_id = f.id
      WHERE f.org_id = p_org_id
        AND (p_season_id IS NULL OR f.season_id = p_season_id)
    ),
    'paymentPlansOnTrack', 0,
    'paymentPlansOverdue', 0,
    'averagePaymentAmount', (
      SELECT CASE
        WHEN COUNT(*) > 0 THEN COALESCE(SUM(amount_cents), 0)::NUMERIC / COUNT(*) / 100
        ELSE 0
      END
      FROM payments
      WHERE org_id = p_org_id
        AND status = 'succeeded'
        AND (p_date_start IS NULL OR paid_at >= p_date_start)
        AND (p_date_end IS NULL OR paid_at <= p_date_end)
    ),
    'refundsOverTime', '[]'::jsonb
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- get_payment_metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payment_metrics(
  p_org_id UUID,
  p_sub_org_id UUID DEFAULT NULL,
  p_season_id UUID DEFAULT NULL,
  p_sport_id UUID DEFAULT NULL,
  p_program_id UUID DEFAULT NULL,
  p_level_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL,
  p_date_start TIMESTAMPTZ DEFAULT NULL,
  p_date_end TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'feesCreated', (
      SELECT COUNT(*)::INTEGER
      FROM fees
      WHERE org_id = p_org_id
        AND (p_season_id IS NULL OR season_id = p_season_id)
        AND (p_date_start IS NULL OR created_at >= p_date_start)
        AND (p_date_end IS NULL OR created_at <= p_date_end)
    ),
    'feesCollected', (
      SELECT COALESCE(SUM(pa.amount_cents), 0)::INTEGER
      FROM payment_allocations pa
      JOIN payments p ON pa.payment_id = p.id
      WHERE p.org_id = p_org_id
        AND p.status = 'succeeded'
        AND (p_date_start IS NULL OR p.paid_at >= p_date_start)
        AND (p_date_end IS NULL OR p.paid_at <= p_date_end)
    ),
    'outstandingBalance', (
      SELECT COALESCE(SUM(GREATEST(fa.amount_cents - COALESCE(paid.paid_amount, 0), 0)), 0)::INTEGER
      FROM fee_assignments fa
      LEFT JOIN (
        SELECT fee_assignment_id, SUM(amount_cents) as paid_amount
        FROM payment_allocations
        GROUP BY fee_assignment_id
      ) paid ON fa.id = paid.fee_assignment_id
      JOIN fees f ON fa.fee_id = f.id
      WHERE f.org_id = p_org_id
        AND (p_season_id IS NULL OR f.season_id = p_season_id)
        AND fa.amount_cents > COALESCE(paid.paid_amount, 0)
    ),
    'agingBuckets', (
      SELECT jsonb_build_object(
        '0-7', (
          SELECT COUNT(*)::INTEGER
          FROM fee_assignments fa
          JOIN fees f ON fa.fee_id = f.id
          LEFT JOIN (
            SELECT fee_assignment_id, SUM(amount_cents) as paid_amount
            FROM payment_allocations
            GROUP BY fee_assignment_id
          ) paid ON fa.id = paid.fee_assignment_id
          WHERE f.org_id = p_org_id
            AND (p_season_id IS NULL OR f.season_id = p_season_id)
            AND fa.amount_cents > COALESCE(paid.paid_amount, 0)
            AND f.due_date >= CURRENT_DATE - INTERVAL '7 days'
            AND f.due_date < CURRENT_DATE
        ),
        '8-30', (
          SELECT COUNT(*)::INTEGER
          FROM fee_assignments fa
          JOIN fees f ON fa.fee_id = f.id
          LEFT JOIN (
            SELECT fee_assignment_id, SUM(amount_cents) as paid_amount
            FROM payment_allocations
            GROUP BY fee_assignment_id
          ) paid ON fa.id = paid.fee_assignment_id
          WHERE f.org_id = p_org_id
            AND (p_season_id IS NULL OR f.season_id = p_season_id)
            AND fa.amount_cents > COALESCE(paid.paid_amount, 0)
            AND f.due_date >= CURRENT_DATE - INTERVAL '30 days'
            AND f.due_date < CURRENT_DATE - INTERVAL '7 days'
        ),
        '31-60', (
          SELECT COUNT(*)::INTEGER
          FROM fee_assignments fa
          JOIN fees f ON fa.fee_id = f.id
          LEFT JOIN (
            SELECT fee_assignment_id, SUM(amount_cents) as paid_amount
            FROM payment_allocations
            GROUP BY fee_assignment_id
          ) paid ON fa.id = paid.fee_assignment_id
          WHERE f.org_id = p_org_id
            AND (p_season_id IS NULL OR f.season_id = p_season_id)
            AND fa.amount_cents > COALESCE(paid.paid_amount, 0)
            AND f.due_date >= CURRENT_DATE - INTERVAL '60 days'
            AND f.due_date < CURRENT_DATE - INTERVAL '30 days'
        ),
        '60+', (
          SELECT COUNT(*)::INTEGER
          FROM fee_assignments fa
          JOIN fees f ON fa.fee_id = f.id
          LEFT JOIN (
            SELECT fee_assignment_id, SUM(amount_cents) as paid_amount
            FROM payment_allocations
            GROUP BY fee_assignment_id
          ) paid ON fa.id = paid.fee_assignment_id
          WHERE f.org_id = p_org_id
            AND (p_season_id IS NULL OR f.season_id = p_season_id)
            AND fa.amount_cents > COALESCE(paid.paid_amount, 0)
            AND f.due_date < CURRENT_DATE - INTERVAL '60 days'
        )
      )
    ),
    'partialPayments', (
      SELECT COUNT(*)::INTEGER
      FROM payment_allocations pa
      JOIN payments p ON pa.payment_id = p.id
      JOIN fee_assignments fa ON pa.fee_assignment_id = fa.id
      WHERE p.org_id = p_org_id
        AND p.status = 'succeeded'
        AND pa.amount_cents < fa.amount_cents
        AND (p_date_start IS NULL OR p.paid_at >= p_date_start)
        AND (p_date_end IS NULL OR p.paid_at <= p_date_end)
    ),
    'offlinePayments', (
      SELECT COALESCE(SUM(pa.amount_cents), 0)::INTEGER
      FROM payment_allocations pa
      JOIN payments p ON pa.payment_id = p.id
      WHERE p.org_id = p_org_id
        AND p.status = 'succeeded'
        AND p.payment_type = 'offline'
        AND (p_date_start IS NULL OR p.paid_at >= p_date_start)
        AND (p_date_end IS NULL OR p.paid_at <= p_date_end)
    ),
    'collectionVelocity', (
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (p.paid_at - f.created_at)) / 86400), 0)::NUMERIC(10, 2)
      FROM payment_allocations pa
      JOIN payments p ON pa.payment_id = p.id
      JOIN fee_assignments fa ON pa.fee_assignment_id = fa.id
      JOIN fees f ON fa.fee_id = f.id
      WHERE p.org_id = p_org_id
        AND p.status = 'succeeded'
        AND p.paid_at IS NOT NULL
        AND (p_date_start IS NULL OR p.paid_at >= p_date_start)
        AND (p_date_end IS NULL OR p.paid_at <= p_date_end)
    ),
    'paymentPlansOnTrack', 0,
    'paymentPlansOverdue', 0,
    'averagePaymentAmount', (
      SELECT CASE
        WHEN COUNT(*) > 0 THEN COALESCE(SUM(p.amount_cents), 0)::NUMERIC / COUNT(*) / 100
        ELSE 0
      END
      FROM payments p
      WHERE p.org_id = p_org_id
        AND p.status = 'succeeded'
        AND p.paid_at IS NOT NULL
        AND (p_date_start IS NULL OR p.paid_at >= p_date_start)
        AND (p_date_end IS NULL OR p.paid_at <= p_date_end)
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_registration_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_metrics TO authenticated;
