-- ============================================================================
-- Fix reporting RPC functions: nested aggregates, ambiguous columns, missing columns
-- ============================================================================
-- Fixes:
-- 1. get_registration_metrics:  ambiguous created_at, nested COUNT inside jsonb_agg
-- 2. get_revenue_metrics:       nested SUM inside jsonb_agg
-- 3. get_ticketing_metrics:     nested SUM inside jsonb_agg
-- 4. get_events_metrics:        t.season_id does not exist (teams), nested COUNT
-- 5. get_errors_metrics:        nested COUNT inside jsonb_agg
-- 6. get_video_metrics:         t.season_id does not exist (teams)
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
          COUNT(CASE WHEN tr.status = 'completed' THEN 1 END)::INTEGER AS completed
        FROM tryout_registrations tr
        JOIN tryouts t ON tr.tryout_id = t.id
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_date_start IS NULL OR tr.created_at >= p_date_start)
          AND (p_date_end IS NULL OR tr.created_at <= p_date_end)
      ) stats
    ),
    'dropOffPoints', '[]'::jsonb,
    'registrationsByProgram', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('programId', pid, 'programName', pname, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT p.id AS pid, p.name AS pname, COUNT(*)::INTEGER AS cnt
        FROM tryout_registrations tr
        JOIN tryouts t ON tr.tryout_id = t.id
        JOIN programs p ON t.program_id = p.id
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_date_start IS NULL OR tr.created_at >= p_date_start)
          AND (p_date_end IS NULL OR tr.created_at <= p_date_end)
        GROUP BY p.id, p.name
      ) sub
    ),
    'incompleteRegistrations', (
      SELECT COUNT(*)::INTEGER
      FROM tryout_registrations tr
      JOIN tryouts t ON tr.tryout_id = t.id
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_date_start IS NULL OR tr.created_at >= p_date_start)
        AND (p_date_end IS NULL OR tr.created_at <= p_date_end)
        AND tr.status != 'completed'
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
-- get_ticketing_metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ticketing_metrics(
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
    'ticketsSoldOverTime', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', day, 'value', qty) ORDER BY day), '[]'::jsonb)
      FROM (
        SELECT
          date_trunc('day', tord.created_at)::DATE::TEXT AS day,
          SUM(COALESCE(toi.quantity, 0))::INTEGER AS qty
        FROM ticket_orders tord
        LEFT JOIN ticket_order_items toi ON tord.id = toi.ticket_order_id
        WHERE tord.org_id = p_org_id
          AND tord.status IN ('paid', 'pending_payment')
          AND (p_date_start IS NULL OR tord.created_at >= p_date_start)
          AND (p_date_end IS NULL OR tord.created_at <= p_date_end)
        GROUP BY date_trunc('day', tord.created_at)
      ) sub
    ),
    'ticketRevenueByEvent', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('eventId', eid, 'eventName', ename, 'revenue', rev)), '[]'::jsonb)
      FROM (
        SELECT
          te.id AS eid,
          te.title AS ename,
          SUM(COALESCE(tord.org_revenue_cents, tord.total_cents, 0))::NUMERIC / 100 AS rev
        FROM ticketed_events te
        LEFT JOIN ticket_orders tord ON te.id = tord.ticketed_event_id
          AND tord.org_id = p_org_id
          AND tord.status IN ('paid', 'pending_payment')
          AND (p_date_start IS NULL OR tord.created_at >= p_date_start)
          AND (p_date_end IS NULL OR tord.created_at <= p_date_end)
        WHERE te.org_id = p_org_id
        GROUP BY te.id, te.title
      ) sub
    ),
    'checkInRateByEvent', '[]'::jsonb,
    'walkUpVsPreSale', jsonb_build_object(
      'walkUp', 0,
      'preSale', (
        SELECT COUNT(*)::INTEGER
        FROM ticket_orders
        WHERE org_id = p_org_id
          AND status IN ('paid', 'pending_payment')
          AND (p_date_start IS NULL OR created_at >= p_date_start)
          AND (p_date_end IS NULL OR created_at <= p_date_end)
      )
    ),
    'totalTicketRevenue', (
      SELECT COALESCE(SUM(COALESCE(org_revenue_cents, total_cents, 0)), 0)::NUMERIC / 100
      FROM ticket_orders
      WHERE org_id = p_org_id
        AND status IN ('paid', 'pending_payment')
        AND (p_date_start IS NULL OR created_at >= p_date_start)
        AND (p_date_end IS NULL OR created_at <= p_date_end)
    ),
    'topEventsByAttendance', '[]'::jsonb
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- get_events_metrics
-- (uses e.season_id directly on events table; teams do NOT have season_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_events_metrics(
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
    'upcomingEventsCount', (
      SELECT COUNT(*)::INTEGER
      FROM events e
      JOIN teams t ON e.team_id = t.id
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_season_id IS NULL OR e.season_id = p_season_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR e.team_id = p_team_id)
        AND e.start_time > NOW()
        AND NOT e.is_cancelled
    ),
    'eventsCancelledOverTime', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', day, 'value', cnt) ORDER BY day), '[]'::jsonb)
      FROM (
        SELECT
          date_trunc('day', e.start_time)::DATE::TEXT AS day,
          COUNT(*)::INTEGER AS cnt
        FROM events e
        JOIN teams t ON e.team_id = t.id
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_season_id IS NULL OR e.season_id = p_season_id)
          AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
          AND (p_program_id IS NULL OR t.program_id = p_program_id)
          AND (p_level_id IS NULL OR t.level_id = p_level_id)
          AND (p_team_id IS NULL OR e.team_id = p_team_id)
          AND e.is_cancelled = true
          AND (p_date_start IS NULL OR e.start_time >= p_date_start)
          AND (p_date_end IS NULL OR e.start_time <= p_date_end)
        GROUP BY date_trunc('day', e.start_time)
      ) sub
    ),
    'rsvpRateByEvent', '[]'::jsonb
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- get_errors_metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_errors_metrics(
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
  failure_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO failure_count
  FROM payments
  WHERE org_id = p_org_id
    AND status = 'failed'
    AND (p_date_start IS NULL OR created_at >= p_date_start)
    AND (p_date_end IS NULL OR created_at <= p_date_end);

  SELECT jsonb_build_object(
    'paymentFailuresOverTime', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', day, 'value', cnt) ORDER BY day), '[]'::jsonb)
      FROM (
        SELECT
          date_trunc('day', created_at)::DATE::TEXT AS day,
          COUNT(*)::INTEGER AS cnt
        FROM payments
        WHERE org_id = p_org_id
          AND status = 'failed'
          AND (p_date_start IS NULL OR created_at >= p_date_start)
          AND (p_date_end IS NULL OR created_at <= p_date_end)
        GROUP BY date_trunc('day', created_at)
      ) sub
    ),
    'paymentFailureReasons', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('reason', reason, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT
          COALESCE(failure_reason, 'Unknown') AS reason,
          COUNT(*)::INTEGER AS cnt
        FROM payments
        WHERE org_id = p_org_id
          AND status = 'failed'
          AND (p_date_start IS NULL OR created_at >= p_date_start)
          AND (p_date_end IS NULL OR created_at <= p_date_end)
        GROUP BY failure_reason
      ) sub
    ),
    'errorTypesBreakdown', jsonb_build_array(
      jsonb_build_object('type', 'Payment Failure', 'count', failure_count)
    ),
    'failedCheckIns', 0
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- get_video_metrics
-- (teams do NOT have season_id; season filter removed from team queries)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_video_metrics(
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
    'videoViewsOverTime', '[]'::jsonb,
    'mostWatchedVideos', '[]'::jsonb,
    'videosWithZeroViews', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('videoId', v.id, 'videoName', COALESCE(v.title, 'Untitled'))), '[]'::jsonb)
      FROM videos v
      JOIN teams t ON v.team_id = t.id
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR v.team_id = p_team_id)
        AND (p_date_start IS NULL OR v.created_at >= p_date_start)
        AND (p_date_end IS NULL OR v.created_at <= p_date_end)
    ),
    'viewsByTeam', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('teamId', t.id, 'teamName', COALESCE(t.name, 'Unknown'), 'views', 0)), '[]'::jsonb)
      FROM teams t
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR t.id = p_team_id)
        AND EXISTS (
          SELECT 1 FROM videos v
          WHERE v.team_id = t.id
            AND (p_date_start IS NULL OR v.created_at >= p_date_start)
            AND (p_date_end IS NULL OR v.created_at <= p_date_end)
        )
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_registration_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticketing_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_events_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_errors_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_video_metrics TO authenticated;
