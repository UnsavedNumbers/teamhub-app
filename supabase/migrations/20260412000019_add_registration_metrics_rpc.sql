-- ============================================================================
-- Add missing get_registration_metrics RPC function
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
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', date_trunc('day', created_at)::DATE::TEXT,
          'value', COUNT(*)::INTEGER
        )
        ORDER BY date_trunc('day', created_at)
      ), '[]'::jsonb)
      FROM tryout_registrations tr
      JOIN tryouts t ON tr.tryout_id = t.id
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_date_start IS NULL OR tr.created_at >= p_date_start)
        AND (p_date_end IS NULL OR tr.created_at <= p_date_end)
      GROUP BY date_trunc('day', tr.created_at)
    ),
    'registrationCompletionRate', (
      SELECT CASE
        WHEN total_registrations > 0 THEN
          (completed_registrations::NUMERIC / total_registrations::NUMERIC)
        ELSE 0
      END
      FROM (
        SELECT
          COUNT(*)::INTEGER as total_registrations,
          COUNT(CASE WHEN tr.status = 'completed' THEN 1 END)::INTEGER as completed_registrations
        FROM tryout_registrations tr
        JOIN tryouts t ON tr.tryout_id = t.id
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_date_start IS NULL OR tr.created_at >= p_date_start)
          AND (p_date_end IS NULL OR tr.created_at <= p_date_end)
      ) stats
    ),
    'dropOffPoints', '[]'::jsonb,  -- Placeholder - requires step tracking
    'registrationsByProgram', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'programId', p.id,
          'programName', p.name,
          'count', COUNT(*)::INTEGER
        )
      ), '[]'::jsonb)
      FROM tryout_registrations tr
      JOIN tryouts t ON tr.tryout_id = t.id
      JOIN programs p ON t.program_id = p.id
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_date_start IS NULL OR tr.created_at >= p_date_start)
        AND (p_date_end IS NULL OR tr.created_at <= p_date_end)
      GROUP BY p.id, p.name
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
    'waiversSigned', 0,  -- Placeholder - requires waiver tracking
    'waiversPending', 0  -- Placeholder - requires waiver tracking
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_registration_metrics TO authenticated;
