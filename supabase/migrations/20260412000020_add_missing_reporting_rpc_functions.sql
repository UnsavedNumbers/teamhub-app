-- ============================================================================
-- Add missing reporting RPC functions
-- ============================================================================
-- This migration adds the missing RPC functions for:
-- - get_revenue_metrics
-- - get_ticketing_metrics
-- - get_events_metrics
-- - get_errors_metrics
-- - get_video_metrics
-- ============================================================================

-- ============================================================================
-- Revenue Metrics
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
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', date_trunc('day', paid_at)::DATE::TEXT,
          'value', (SUM(amount_cents)::NUMERIC / 100)
        )
        ORDER BY date_trunc('day', paid_at)
      ), '[]'::jsonb)
      FROM payments
      WHERE org_id = p_org_id
        AND status = 'succeeded'
        AND (p_date_start IS NULL OR paid_at >= p_date_start)
        AND (p_date_end IS NULL OR paid_at <= p_date_end)
      GROUP BY date_trunc('day', paid_at)
    ),
    'revenueBySeason', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'seasonId', s.id,
          'seasonName', s.name,
          'revenue', (COALESCE(SUM(pa.amount_cents), 0)::NUMERIC / 100)
        )
      ), '[]'::jsonb)
      FROM seasons s
      LEFT JOIN fees f ON s.id = f.season_id AND f.org_id = p_org_id
      LEFT JOIN fee_assignments fa ON f.id = fa.fee_id
      LEFT JOIN payment_allocations pa ON fa.id = pa.fee_assignment_id
      LEFT JOIN payments p ON pa.payment_id = p.id AND p.status = 'succeeded'
        AND (p_date_start IS NULL OR p.paid_at >= p_date_start)
        AND (p_date_end IS NULL OR p.paid_at <= p_date_end)
      WHERE s.org_id = p_org_id
        AND (p_season_id IS NULL OR s.id = p_season_id)
      GROUP BY s.id, s.name
    ),
    'revenueByTeam', '[]'::jsonb,  -- Placeholder - requires team relationships
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
      SELECT COALESCE(SUM(fa.amount_cents - COALESCE(paid_amount, 0)), 0)::NUMERIC / 100
      FROM fee_assignments fa
      LEFT JOIN (
        SELECT fee_assignment_id, SUM(amount_cents) as paid_amount
        FROM payment_allocations
        GROUP BY fee_assignment_id
      ) payments ON fa.id = payments.fee_assignment_id
      JOIN fees f ON fa.fee_id = f.id
      WHERE f.org_id = p_org_id
        AND (p_season_id IS NULL OR f.season_id = p_season_id)
        AND fa.amount_cents > COALESCE(paid_amount, 0)
    ),
    'paymentPlansOnTrack', 0,  -- Placeholder - requires payment_plans table
    'paymentPlansOverdue', 0,  -- Placeholder - requires payment_plans table
    'averagePaymentAmount', (
      SELECT CASE
        WHEN COUNT(*) > 0 THEN (COALESCE(SUM(amount_cents), 0)::NUMERIC / COUNT(*) / 100)
        ELSE 0
      END
      FROM payments
      WHERE org_id = p_org_id
        AND status = 'succeeded'
        AND (p_date_start IS NULL OR paid_at >= p_date_start)
        AND (p_date_end IS NULL OR paid_at <= p_date_end)
    ),
    'refundsOverTime', '[]'::jsonb  -- Placeholder - requires refunds table
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Ticketing Metrics
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
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', date_trunc('day', tord.created_at)::DATE::TEXT,
          'value', SUM(COALESCE(toi.quantity, 0))::INTEGER
        )
        ORDER BY date_trunc('day', tord.created_at)
      ), '[]'::jsonb)
      FROM ticket_orders tord
      LEFT JOIN ticket_order_items toi ON tord.id = toi.ticket_order_id
      WHERE tord.org_id = p_org_id
        AND tord.status IN ('paid', 'pending_payment')
        AND (p_date_start IS NULL OR tord.created_at >= p_date_start)
        AND (p_date_end IS NULL OR tord.created_at <= p_date_end)
      GROUP BY date_trunc('day', tord.created_at)
    ),
    'ticketRevenueByEvent', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'eventId', te.id,
          'eventName', te.title,
          'revenue', (SUM(COALESCE(tord.org_revenue_cents, tord.total_cents, 0))::NUMERIC / 100)
        )
      ), '[]'::jsonb)
      FROM ticketed_events te
      LEFT JOIN ticket_orders tord ON te.id = tord.ticketed_event_id
        AND tord.org_id = p_org_id
        AND tord.status IN ('paid', 'pending_payment')
        AND (p_date_start IS NULL OR tord.created_at >= p_date_start)
        AND (p_date_end IS NULL OR tord.created_at <= p_date_end)
      WHERE te.org_id = p_org_id
      GROUP BY te.id, te.title
    ),
    'checkInRateByEvent', '[]'::jsonb,  -- Placeholder - requires tickets table with scanned status
    'walkUpVsPreSale', jsonb_build_object(
      'walkUp', 0,  -- Placeholder
      'preSale', (
        SELECT COUNT(*)::INTEGER
        FROM ticket_orders tord
        WHERE tord.org_id = p_org_id
          AND tord.status IN ('paid', 'pending_payment')
          AND (p_date_start IS NULL OR tord.created_at >= p_date_start)
          AND (p_date_end IS NULL OR tord.created_at <= p_date_end)
      )
    ),
    'totalTicketRevenue', (
      SELECT COALESCE(SUM(COALESCE(tord.org_revenue_cents, tord.total_cents, 0)), 0)::NUMERIC / 100
      FROM ticket_orders tord
      WHERE tord.org_id = p_org_id
        AND tord.status IN ('paid', 'pending_payment')
        AND (p_date_start IS NULL OR tord.created_at >= p_date_start)
        AND (p_date_end IS NULL OR tord.created_at <= p_date_end)
    ),
    'topEventsByAttendance', '[]'::jsonb  -- Placeholder - requires attendance tracking
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Events Metrics
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
        AND (p_season_id IS NULL OR t.season_id = p_season_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR e.team_id = p_team_id)
        AND e.start_time > NOW()
        AND NOT e.is_cancelled
    ),
    'eventsCancelledOverTime', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', date_trunc('day', e.start_time)::DATE::TEXT,
          'value', COUNT(*)::INTEGER
        )
        ORDER BY date_trunc('day', e.start_time)
      ), '[]'::jsonb)
      FROM events e
      JOIN teams t ON e.team_id = t.id
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_season_id IS NULL OR t.season_id = p_season_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR e.team_id = p_team_id)
        AND e.is_cancelled = true
        AND (p_date_start IS NULL OR e.start_time >= p_date_start)
        AND (p_date_end IS NULL OR e.start_time <= p_date_end)
      GROUP BY date_trunc('day', e.start_time)
    ),
    'rsvpRateByEvent', '[]'::jsonb  -- Placeholder - requires event_rsvps table
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Errors Metrics
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
BEGIN
  SELECT jsonb_build_object(
    'paymentFailuresOverTime', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', date_trunc('day', created_at)::DATE::TEXT,
          'value', COUNT(*)::INTEGER
        )
        ORDER BY date_trunc('day', created_at)
      ), '[]'::jsonb)
      FROM payments
      WHERE org_id = p_org_id
        AND status = 'failed'
        AND (p_date_start IS NULL OR created_at >= p_date_start)
        AND (p_date_end IS NULL OR created_at <= p_date_end)
      GROUP BY date_trunc('day', created_at)
    ),
    'paymentFailureReasons', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'reason', COALESCE(failure_reason, 'Unknown'),
          'count', COUNT(*)::INTEGER
        )
      ), '[]'::jsonb)
      FROM payments
      WHERE org_id = p_org_id
        AND status = 'failed'
        AND (p_date_start IS NULL OR created_at >= p_date_start)
        AND (p_date_end IS NULL OR created_at <= p_date_end)
      GROUP BY failure_reason
    ),
    'errorTypesBreakdown', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', 'Payment Failure',
          'count', COUNT(*)::INTEGER
        )
      )
      FROM payments
      WHERE org_id = p_org_id
        AND status = 'failed'
        AND (p_date_start IS NULL OR created_at >= p_date_start)
        AND (p_date_end IS NULL OR created_at <= p_date_end)
    ),
    'failedCheckIns', 0  -- Placeholder - requires tickets/check-ins table
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Video Metrics
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
    'videoViewsOverTime', '[]'::jsonb,  -- Placeholder - requires video_views table
    'mostWatchedVideos', '[]'::jsonb,  -- Placeholder - requires video_views table
    'videosWithZeroViews', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'videoId', v.id,
          'videoName', COALESCE(v.title, 'Untitled')
        )
      ), '[]'::jsonb)
      FROM videos v
      JOIN teams t ON v.team_id = t.id
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_season_id IS NULL OR t.season_id = p_season_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR v.team_id = p_team_id)
        AND (p_date_start IS NULL OR v.created_at >= p_date_start)
        AND (p_date_end IS NULL OR v.created_at <= p_date_end)
    ),
    'viewsByTeam', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'teamId', t.id,
          'teamName', COALESCE(t.name, 'Unknown'),
          'views', 0  -- Placeholder - requires video_views table
        )
      ), '[]'::jsonb)
      FROM teams t
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_season_id IS NULL OR t.season_id = p_season_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR t.id = p_team_id)
        AND EXISTS (
          SELECT 1 FROM videos v WHERE v.team_id = t.id
            AND (p_date_start IS NULL OR v.created_at >= p_date_start)
            AND (p_date_end IS NULL OR v.created_at <= p_date_end)
        )
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_revenue_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticketing_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_events_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_errors_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_video_metrics TO authenticated;
