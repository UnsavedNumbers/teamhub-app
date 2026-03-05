-- ============================================================================
-- Fix reporting RPC functions: incorrect column references
-- ============================================================================
-- Fixes:
-- 1. get_registration_metrics: tryouts table doesn't have program_id
-- 2. get_registration_metrics (in migration 16): tryouts.program_id doesn't exist
-- ============================================================================

-- ============================================================================
-- get_registration_metrics
-- (tryouts table has: id, org_id, title, sport (text), age_group, etc.
--  but NO program_id, level_id, sport_id columns)
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
-- Also fix get_registration_metrics in migration 16 (if it exists)
-- ============================================================================

-- Note: Migration 16's get_registration_metrics also has the same issue
-- This CREATE OR REPLACE will override it

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_registration_metrics TO authenticated;
