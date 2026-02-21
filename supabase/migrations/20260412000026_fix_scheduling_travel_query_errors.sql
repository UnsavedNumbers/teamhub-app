-- ============================================================================
-- Fix query errors in scheduling and travel metrics
-- ============================================================================
-- Fixes:
-- 1. get_scheduling_metrics: event_counts.team_id reference issue
-- 2. get_travel_metrics: ORDER BY month_val must be in GROUP BY or aggregate
-- ============================================================================

-- ============================================================================
-- get_scheduling_metrics
-- Fix: Ensure event_counts CTE columns are properly referenced
-- ============================================================================

CREATE OR REPLACE FUNCTION get_scheduling_metrics(
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
    'eventsByType', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('type', etype, 'count', cnt) ORDER BY etype), '[]'::jsonb)
      FROM (
        SELECT
          type::TEXT AS etype,
          COUNT(*)::INTEGER AS cnt
        FROM events
        WHERE org_id = p_org_id
          AND (p_season_id IS NULL OR season_id = p_season_id)
          AND (p_team_id IS NULL OR team_id = p_team_id)
          AND (p_date_start IS NULL OR start_time >= p_date_start)
          AND (p_date_end IS NULL OR start_time <= p_date_end)
          AND is_cancelled = false
        GROUP BY type
      ) sub
    ),
    'rsvpRates', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'teamId', t.id,
          'teamName', t.name,
          'rate', CASE
            WHEN COALESCE(event_counts.total_events, 0) > 0 THEN
              ROUND((COALESCE(rsvp_counts.rsvp_count, 0)::NUMERIC / event_counts.total_events::NUMERIC) * 100, 2)
            ELSE 0
          END
        )
      ), '[]'::jsonb)
      FROM teams t
      LEFT JOIN (
        SELECT team_id, COUNT(*)::INTEGER as total_events
        FROM events
        WHERE org_id = p_org_id
          AND rsvp_enabled = true
          AND (p_season_id IS NULL OR season_id = p_season_id)
          AND (p_date_start IS NULL OR start_time >= p_date_start)
          AND (p_date_end IS NULL OR start_time <= p_date_end)
        GROUP BY team_id
      ) event_counts ON t.id = event_counts.team_id
      LEFT JOIN (
        SELECT team_id, COUNT(*)::INTEGER as rsvp_count
        FROM event_rsvps
        WHERE (p_date_start IS NULL OR created_at >= p_date_start)
          AND (p_date_end IS NULL OR created_at <= p_date_end)
        GROUP BY team_id
      ) rsvp_counts ON t.id = rsvp_counts.team_id
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR t.id = p_team_id)
    ),
    'attendanceRates', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'teamId', t.id,
          'teamName', t.name,
          'rate', CASE
            WHEN COALESCE(event_counts.total_events, 0) > 0 THEN
              ROUND((COALESCE(attendance_counts.attendance_count, 0)::NUMERIC / event_counts.total_events::NUMERIC) * 100, 2)
            ELSE 0
          END
        )
      ), '[]'::jsonb)
      FROM teams t
      LEFT JOIN (
        SELECT team_id, COUNT(*)::INTEGER as total_events
        FROM events
        WHERE org_id = p_org_id
          AND (p_season_id IS NULL OR season_id = p_season_id)
          AND (p_date_start IS NULL OR start_time >= p_date_start)
          AND (p_date_end IS NULL OR start_time <= p_date_end)
        GROUP BY team_id
      ) event_counts ON t.id = event_counts.team_id
      LEFT JOIN (
        SELECT team_id, COUNT(*)::INTEGER as attendance_count
        FROM event_attendance
        WHERE status = 'present'
          AND (p_date_start IS NULL OR created_at >= p_date_start)
          AND (p_date_end IS NULL OR created_at <= p_date_end)
        GROUP BY team_id
      ) attendance_counts ON t.id = attendance_counts.team_id
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR t.id = p_team_id)
    ),
    'noResponseList', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'eventId', e.id,
          'eventName', e.title,
          'athleteId', a.id,
          'athleteName', a.first_name || ' ' || a.last_name
        )
      ), '[]'::jsonb)
      FROM events e
      JOIN team_memberships tm ON e.team_id = tm.team_id
      JOIN athletes a ON tm.athlete_id = a.id
      LEFT JOIN event_rsvps er ON e.id = er.event_id AND a.id = er.athlete_id
      WHERE e.org_id = p_org_id
        AND e.rsvp_enabled = true
        AND (p_season_id IS NULL OR e.season_id = p_season_id)
        AND (p_team_id IS NULL OR e.team_id = p_team_id)
        AND (p_date_start IS NULL OR e.start_time >= p_date_start)
        AND (p_date_end IS NULL OR e.start_time <= p_date_end)
        AND er.id IS NULL
        AND tm.deleted_at IS NULL
        AND a.deleted_at IS NULL
      LIMIT 100
    ),
    'conflicts', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'teamId', team_data.id,
          'teamName', team_data.name,
          'conflictCount', team_data.conflict_count
        )
      ), '[]'::jsonb)
      FROM (
        SELECT
          t.id,
          t.name,
          (
            SELECT COUNT(*)::INTEGER
            FROM events e1
            JOIN events e2 ON e1.team_id = e2.team_id
            WHERE e1.team_id = t.id
              AND e1.id != e2.id
              AND e1.start_time < e2.end_time
              AND e1.end_time > e2.start_time
              AND e1.is_cancelled = false
              AND e2.is_cancelled = false
          ) / 2 AS conflict_count
        FROM teams t
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
          AND (p_program_id IS NULL OR t.program_id = p_program_id)
          AND (p_level_id IS NULL OR t.level_id = p_level_id)
          AND (p_team_id IS NULL OR t.id = p_team_id)
      ) team_data
      WHERE team_data.conflict_count > 0
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- get_travel_metrics
-- Fix: ORDER BY must be inside jsonb_agg or applied to subquery before aggregation
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
      SELECT COALESCE(jsonb_agg(jsonb_build_object('month', month_val, 'count', cnt) ORDER BY month_val), '[]'::jsonb)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_scheduling_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_travel_metrics TO authenticated;
