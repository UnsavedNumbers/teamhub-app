-- ============================================================================
-- Fix nested aggregates in get_scheduling_metrics and get_communication_metrics
-- ============================================================================
-- Fixes:
-- 1. get_scheduling_metrics: COUNT(*) nested inside jsonb_agg in eventsByType
-- 2. get_communication_metrics: Ensure it's using subqueries correctly
-- ============================================================================

-- ============================================================================
-- get_scheduling_metrics
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
      SELECT COALESCE(jsonb_agg(jsonb_build_object('type', etype, 'count', cnt)), '[]'::jsonb)
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
            WHEN total_events > 0 THEN
              ROUND((COALESCE(rsvp_count, 0)::NUMERIC / total_events::NUMERIC) * 100, 2)
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
            WHEN total_events > 0 THEN
              ROUND((COALESCE(attendance_count, 0)::NUMERIC / total_events::NUMERIC) * 100, 2)
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
-- get_communication_metrics
-- (Verify it's using subqueries correctly - already fixed but ensure it's correct)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_communication_metrics(
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
    'announcementsVolume', (
      SELECT COUNT(*)::INTEGER
      FROM announcements
      WHERE org_id = p_org_id
        AND (p_team_id IS NULL OR team_id = p_team_id)
        AND (p_date_start IS NULL OR created_at >= p_date_start)
        AND (p_date_end IS NULL OR created_at <= p_date_end)
    ),
    'announcementsByTeam', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'teamId', team_data.id,
          'teamName', team_data.name,
          'count', team_data.announcement_count
        )
      ), '[]'::jsonb)
      FROM (
        SELECT 
          t.id,
          t.name,
          COUNT(a.id)::INTEGER as announcement_count
        FROM teams t
        LEFT JOIN announcements a ON t.id = a.team_id
          AND a.org_id = p_org_id
          AND (p_date_start IS NULL OR a.created_at >= p_date_start)
          AND (p_date_end IS NULL OR a.created_at <= p_date_end)
        WHERE t.org_id = p_org_id
          AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
          AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
          AND (p_program_id IS NULL OR t.program_id = p_program_id)
          AND (p_level_id IS NULL OR t.level_id = p_level_id)
          AND (p_team_id IS NULL OR t.id = p_team_id)
        GROUP BY t.id, t.name
      ) team_data
    ),
    'huddlesVolume', 0,
    'huddlesByTeam', '[]'::jsonb,
    'engagementRate', NULL,
    'flaggedMessages', (
      SELECT COUNT(*)::INTEGER
      FROM huddle_reports
      WHERE status = 'pending'
        AND (p_date_start IS NULL OR created_at >= p_date_start)
        AND (p_date_end IS NULL OR created_at <= p_date_end)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_scheduling_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_communication_metrics TO authenticated;
