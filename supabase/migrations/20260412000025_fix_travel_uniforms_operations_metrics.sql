-- ============================================================================
-- Fix nested aggregates and table references in travel, uniforms, and operations metrics
-- ============================================================================
-- Fixes:
-- 1. get_travel_metrics: COUNT(*) nested inside jsonb_agg in tripsPerMonth
-- 2. get_uniform_metrics: COUNT(*) nested inside jsonb_agg in ordersByItem
-- 3. get_operations_metrics: audit_log table does not exist (use placeholder or alternative)
-- ============================================================================

-- ============================================================================
-- get_travel_metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_travel_metrics(
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
    'tripsPerMonth', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('month', month_val, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT
          TO_CHAR(start_date, 'YYYY-MM') AS month_val,
          COUNT(*)::INTEGER AS cnt
        FROM travel_plans tp
        JOIN teams t ON tp.team_id = t.id
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_season_id IS NULL OR tp.season_id = p_season_id)
          AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
          AND (p_program_id IS NULL OR t.program_id = p_program_id)
          AND (p_level_id IS NULL OR t.level_id = p_level_id)
          AND (p_team_id IS NULL OR tp.team_id = p_team_id)
          AND (p_date_start IS NULL OR tp.start_date >= p_date_start::DATE)
          AND (p_date_end IS NULL OR tp.start_date <= p_date_end::DATE)
          AND tp.status = 'published'
        GROUP BY TO_CHAR(start_date, 'YYYY-MM')
      ) sub
      ORDER BY month_val
    ),
    'overlappingTravel', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'teamId', team_data.id,
          'teamName', team_data.name,
          'overlapCount', team_data.overlap_count
        )
      ), '[]'::jsonb)
      FROM (
        SELECT
          t.id,
          t.name,
          (
            SELECT COUNT(*)::INTEGER
            FROM travel_plans tp1
            JOIN travel_plans tp2 ON tp1.team_id = tp2.team_id
            WHERE tp1.team_id = t.id
              AND tp1.id != tp2.id
              AND tp1.start_date <= tp2.end_date
              AND tp1.end_date >= tp2.start_date
              AND tp1.status = 'published'
              AND tp2.status = 'published'
          ) / 2 AS overlap_count
        FROM teams t
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
          AND (p_program_id IS NULL OR t.program_id = p_program_id)
          AND (p_level_id IS NULL OR t.level_id = p_level_id)
          AND (p_team_id IS NULL OR t.id = p_team_id)
      ) team_data
      WHERE team_data.overlap_count > 0
    ),
    'missingDetails', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'tripId', tp.id,
          'tripName', tp.title,
          'missingFields', (
            SELECT COALESCE(jsonb_agg(field), '[]'::jsonb)
            FROM (
              SELECT 'hotel_name' as field WHERE tp.hotel_name IS NULL OR tp.hotel_name = ''
              UNION ALL
              SELECT 'hotel_address' WHERE tp.hotel_address IS NULL OR tp.hotel_address = ''
              UNION ALL
              SELECT 'hotel_phone' WHERE tp.hotel_phone IS NULL OR tp.hotel_phone = ''
              UNION ALL
              SELECT 'itinerary_file_path' WHERE tp.itinerary_file_path IS NULL OR tp.itinerary_file_path = ''
            ) missing
          )
        )
      ), '[]'::jsonb)
      FROM travel_plans tp
      JOIN teams t ON tp.team_id = t.id
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_season_id IS NULL OR tp.season_id = p_season_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR tp.team_id = p_team_id)
        AND (p_date_start IS NULL OR tp.start_date >= p_date_start::DATE)
        AND (p_date_end IS NULL OR tp.start_date <= p_date_end::DATE)
        AND tp.status = 'published'
        AND (
          tp.hotel_name IS NULL OR tp.hotel_name = '' OR
          tp.hotel_address IS NULL OR tp.hotel_address = '' OR
          tp.hotel_phone IS NULL OR tp.hotel_phone = '' OR
          tp.itinerary_file_path IS NULL OR tp.itinerary_file_path = ''
        )
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- get_uniform_metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_uniform_metrics(
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
    'sizeCompletionRate', (
      SELECT CASE
        WHEN total_athletes > 0 THEN
          ROUND((completed_athletes::NUMERIC / total_athletes::NUMERIC) * 100, 2)
        ELSE 0
      END
      FROM (
        SELECT
          COUNT(DISTINCT a.id)::INTEGER as total_athletes,
          COUNT(DISTINCT CASE WHEN us.status = 'submitted' THEN a.id END)::INTEGER as completed_athletes
        FROM athletes a
        JOIN team_memberships tm ON a.id = tm.athlete_id
        JOIN teams t ON tm.team_id = t.id
        JOIN uniform_kits uk ON t.id = uk.team_id
        LEFT JOIN uniform_submissions us ON uk.id = us.kit_id AND a.id = us.athlete_id
        WHERE a.org_id = p_org_id
          AND a.deleted_at IS NULL
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_season_id IS NULL OR uk.season_id = p_season_id)
          AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
          AND (p_program_id IS NULL OR t.program_id = p_program_id)
          AND (p_level_id IS NULL OR t.level_id = p_level_id)
          AND (p_team_id IS NULL OR t.id = p_team_id)
          AND tm.deleted_at IS NULL
      ) stats
    ),
    'missingSizes', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'teamId', team_data.id,
          'teamName', team_data.name,
          'missingCount', team_data.missing_count
        )
      ), '[]'::jsonb)
      FROM (
        SELECT
          t.id,
          t.name,
          (
            SELECT COUNT(*)::INTEGER
            FROM athletes a
            JOIN team_memberships tm ON a.id = tm.athlete_id
            JOIN uniform_kits uk ON t.id = uk.team_id
            LEFT JOIN uniform_submissions us ON uk.id = us.kit_id AND a.id = us.athlete_id
            WHERE tm.team_id = t.id
              AND a.deleted_at IS NULL
              AND tm.deleted_at IS NULL
              AND (us.status IS NULL OR us.status != 'submitted')
          ) AS missing_count
        FROM teams t
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
          AND (p_program_id IS NULL OR t.program_id = p_program_id)
          AND (p_level_id IS NULL OR t.level_id = p_level_id)
          AND (p_team_id IS NULL OR t.id = p_team_id)
      ) team_data
      WHERE team_data.missing_count > 0
    ),
    'ordersByItem', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('item', item_name, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT
          uki.name AS item_name,
          COUNT(*)::INTEGER AS cnt
        FROM uniform_submission_items usi
        JOIN uniform_submissions us ON usi.submission_id = us.id
        JOIN uniform_kit_items uki ON usi.item_id = uki.id
        JOIN uniform_kits uk ON us.kit_id = uk.id
        JOIN teams t ON uk.team_id = t.id
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_season_id IS NULL OR uk.season_id = p_season_id)
          AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
          AND (p_program_id IS NULL OR t.program_id = p_program_id)
          AND (p_level_id IS NULL OR t.level_id = p_level_id)
          AND (p_team_id IS NULL OR t.id = p_team_id)
          AND (p_date_start IS NULL OR us.submitted_at >= p_date_start)
          AND (p_date_end IS NULL OR us.submitted_at <= p_date_end)
        GROUP BY uki.name
      ) sub
    ),
    'deadlineCompliance', (
      SELECT CASE
        WHEN total_kits > 0 THEN
          ROUND((on_time_kits::NUMERIC / total_kits::NUMERIC) * 100, 2)
        ELSE 0
      END
      FROM (
        SELECT
          COUNT(*)::INTEGER as total_kits,
          COUNT(CASE WHEN uk.deadline_at IS NULL OR uk.deadline_at >= CURRENT_TIMESTAMP THEN 1 END)::INTEGER as on_time_kits
        FROM uniform_kits uk
        JOIN teams t ON uk.team_id = t.id
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_season_id IS NULL OR uk.season_id = p_season_id)
          AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
          AND (p_program_id IS NULL OR t.program_id = p_program_id)
          AND (p_level_id IS NULL OR t.level_id = p_level_id)
          AND (p_team_id IS NULL OR t.id = p_team_id)
      ) stats
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- get_operations_metrics
-- Note: audit_log table does not exist. Using placeholder values.
-- If audit logging is needed, use org_user_audit_log or another appropriate table.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_operations_metrics(
  p_org_id UUID,
  p_sub_org_id UUID DEFAULT NULL,
  p_date_start TIMESTAMPTZ DEFAULT NULL,
  p_date_end TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'adminActivity', jsonb_build_object(
      'creates', 0,  -- Placeholder - audit_log table does not exist
      'updates', 0,  -- Placeholder - audit_log table does not exist
      'deletes', 0   -- Placeholder - audit_log table does not exist
    ),
    'permissionBlocks', 0,  -- Placeholder - permission blocking not tracked
    'notificationDeliveryStats', NULL  -- Placeholder - notification stats not tracked
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_travel_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_uniform_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_operations_metrics TO authenticated;
