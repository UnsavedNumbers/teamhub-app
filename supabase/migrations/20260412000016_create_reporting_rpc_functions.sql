-- ============================================
-- REPORTING CONSOLE RPC FUNCTIONS
-- ============================================
-- RPC functions for querying reporting metrics
-- ============================================

-- ============================================================================
-- Helper function to build WHERE clause from filters
-- ============================================================================

CREATE OR REPLACE FUNCTION build_reporting_where_clause(
  p_org_id UUID,
  p_sub_org_id UUID DEFAULT NULL,
  p_season_id UUID DEFAULT NULL,
  p_sport_id UUID DEFAULT NULL,
  p_program_id UUID DEFAULT NULL,
  p_level_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL,
  p_athlete_id UUID DEFAULT NULL,
  p_date_start TIMESTAMPTZ DEFAULT NULL,
  p_date_end TIMESTAMPTZ DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  conditions TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Always require org_id
  conditions := array_append(conditions, format('org_id = %L', p_org_id));
  
  -- Sub-org filter (if parent_org_id exists)
  IF p_sub_org_id IS NOT NULL THEN
    conditions := array_append(conditions, format('id = %L', p_sub_org_id));
  END IF;
  
  -- Season filter
  IF p_season_id IS NOT NULL THEN
    conditions := array_append(conditions, format('season_id = %L', p_season_id));
  END IF;
  
  -- Sport filter
  IF p_sport_id IS NOT NULL THEN
    conditions := array_append(conditions, format('sport_id = %L', p_sport_id));
  END IF;
  
  -- Program filter
  IF p_program_id IS NOT NULL THEN
    conditions := array_append(conditions, format('program_id = %L', p_program_id));
  END IF;
  
  -- Level filter
  IF p_level_id IS NOT NULL THEN
    conditions := array_append(conditions, format('level_id = %L', p_level_id));
  END IF;
  
  -- Team filter
  IF p_team_id IS NOT NULL THEN
    conditions := array_append(conditions, format('team_id = %L', p_team_id));
  END IF;
  
  -- Athlete filter
  IF p_athlete_id IS NOT NULL THEN
    conditions := array_append(conditions, format('athlete_id = %L', p_athlete_id));
  END IF;
  
  -- Date range filter
  IF p_date_start IS NOT NULL THEN
    conditions := array_append(conditions, format('created_at >= %L', p_date_start));
  END IF;
  
  IF p_date_end IS NOT NULL THEN
    conditions := array_append(conditions, format('created_at <= %L', p_date_end));
  END IF;
  
  RETURN array_to_string(conditions, ' AND ');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Organization Health Metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_org_health_metrics(
  p_org_id UUID,
  p_sub_org_id UUID DEFAULT NULL,
  p_date_start TIMESTAMPTZ DEFAULT NULL,
  p_date_end TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalSubOrgs', (
      SELECT COUNT(*)::INTEGER
      FROM organizations
      WHERE parent_org_id = p_org_id
        AND (p_sub_org_id IS NULL OR id = p_sub_org_id)
    ),
    'activeSubOrgs', (
      SELECT COUNT(*)::INTEGER
      FROM organizations
      WHERE parent_org_id = p_org_id
        AND status = 'active'
        AND (p_sub_org_id IS NULL OR id = p_sub_org_id)
    ),
    'inactiveSubOrgs', (
      SELECT COUNT(*)::INTEGER
      FROM organizations
      WHERE parent_org_id = p_org_id
        AND status != 'active'
        AND (p_sub_org_id IS NULL OR id = p_sub_org_id)
    ),
    'teamsPerSubOrg', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'subOrgId', o.id,
          'subOrgName', o.name,
          'teamCount', COALESCE(team_counts.count, 0)
        )
      ), '[]'::jsonb)
      FROM organizations o
      LEFT JOIN (
        SELECT org_id, COUNT(*)::INTEGER as count
        FROM teams
        WHERE org_id IN (SELECT id FROM organizations WHERE parent_org_id = p_org_id)
          AND (p_sub_org_id IS NULL OR org_id = p_sub_org_id)
        GROUP BY org_id
      ) team_counts ON o.id = team_counts.org_id
      WHERE o.parent_org_id = p_org_id
        AND (p_sub_org_id IS NULL OR o.id = p_sub_org_id)
    ),
    'athletesPerSubOrg', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'subOrgId', o.id,
          'subOrgName', o.name,
          'athleteCount', COALESCE(athlete_counts.count, 0)
        )
      ), '[]'::jsonb)
      FROM organizations o
      LEFT JOIN (
        SELECT org_id, COUNT(*)::INTEGER as count
        FROM athletes
        WHERE org_id IN (SELECT id FROM organizations WHERE parent_org_id = p_org_id)
          AND deleted_at IS NULL
          AND (p_sub_org_id IS NULL OR org_id = p_sub_org_id)
        GROUP BY org_id
      ) athlete_counts ON o.id = athlete_counts.org_id
      WHERE o.parent_org_id = p_org_id
        AND (p_sub_org_id IS NULL OR o.id = p_sub_org_id)
    ),
    'growthOverTime', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', date_trunc('day', created_at)::DATE::TEXT,
          'value', COUNT(*)::INTEGER
        )
        ORDER BY date_trunc('day', created_at)
      ), '[]'::jsonb)
      FROM athletes
      WHERE org_id = p_org_id
        AND (p_sub_org_id IS NULL OR org_id = p_sub_org_id)
        AND deleted_at IS NULL
        AND (p_date_start IS NULL OR created_at >= p_date_start)
        AND (p_date_end IS NULL OR created_at <= p_date_end)
      GROUP BY date_trunc('day', created_at)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Participation Metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_participation_metrics(
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
  team_filter TEXT;
BEGIN
  -- Build team filter
  team_filter := 't.org_id = ' || quote_literal(p_org_id);
  IF p_sub_org_id IS NOT NULL THEN
    team_filter := team_filter || ' AND t.org_id = ' || quote_literal(p_sub_org_id);
  END IF;
  IF p_sport_id IS NOT NULL THEN
    team_filter := team_filter || ' AND t.sport_id = ' || quote_literal(p_sport_id);
  END IF;
  IF p_program_id IS NOT NULL THEN
    team_filter := team_filter || ' AND t.program_id = ' || quote_literal(p_program_id);
  END IF;
  IF p_level_id IS NOT NULL THEN
    team_filter := team_filter || ' AND t.level_id = ' || quote_literal(p_level_id);
  END IF;
  IF p_team_id IS NOT NULL THEN
    team_filter := team_filter || ' AND t.id = ' || quote_literal(p_team_id);
  END IF;
  
  SELECT jsonb_build_object(
    'activeAthletesByTeam', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'teamId', t.id,
          'teamName', t.name,
          'count', (
            SELECT COUNT(DISTINCT tm.athlete_id)::INTEGER
            FROM team_memberships tm
            WHERE tm.team_id = t.id
              AND (p_season_id IS NULL OR tm.season_id = p_season_id)
              AND tm.deleted_at IS NULL
          )
        )
      ), '[]'::jsonb)
      FROM teams t
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR t.id = p_team_id)
    ),
    'rosterChurn', (
      SELECT jsonb_build_object(
        'adds', (
          SELECT COUNT(*)::INTEGER
          FROM team_memberships
          WHERE team_id IN (SELECT id FROM teams WHERE org_id = p_org_id)
            AND (p_season_id IS NULL OR season_id = p_season_id)
            AND (p_date_start IS NULL OR created_at >= p_date_start)
            AND (p_date_end IS NULL OR created_at <= p_date_end)
        ),
        'removes', (
          SELECT COUNT(*)::INTEGER
          FROM team_memberships
          WHERE team_id IN (SELECT id FROM teams WHERE org_id = p_org_id)
            AND (p_season_id IS NULL OR season_id = p_season_id)
            AND deleted_at IS NOT NULL
            AND (p_date_start IS NULL OR deleted_at >= p_date_start)
            AND (p_date_end IS NULL OR deleted_at <= p_date_end)
        ),
        'netChange', (
          SELECT COUNT(*)::INTEGER
          FROM team_memberships
          WHERE team_id IN (SELECT id FROM teams WHERE org_id = p_org_id)
            AND (p_season_id IS NULL OR season_id = p_season_id)
            AND deleted_at IS NULL
        ) - (
          SELECT COUNT(*)::INTEGER
          FROM team_memberships
          WHERE team_id IN (SELECT id FROM teams WHERE org_id = p_org_id)
            AND (p_season_id IS NULL OR season_id = p_season_id)
            AND deleted_at IS NOT NULL
        )
      )
    ),
    'multiTeamAthletes', (
      SELECT COUNT(DISTINCT athlete_id)::INTEGER
      FROM (
        SELECT athlete_id, COUNT(DISTINCT team_id) as team_count
        FROM team_memberships
        WHERE team_id IN (SELECT id FROM teams WHERE org_id = p_org_id)
          AND (p_season_id IS NULL OR season_id = p_season_id)
          AND deleted_at IS NULL
        GROUP BY athlete_id
        HAVING COUNT(DISTINCT team_id) > 1
      ) multi_team
    ),
    'guardiansCoverage', (
      SELECT jsonb_build_object(
        'total', (
          SELECT COUNT(DISTINCT a.id)::INTEGER
          FROM athletes a
          WHERE a.org_id = p_org_id
            AND a.deleted_at IS NULL
        ),
        'missing', (
          SELECT COUNT(*)::INTEGER
          FROM athletes a
          WHERE a.org_id = p_org_id
            AND a.deleted_at IS NULL
            AND a.family_id IS NULL
        ),
        'unverified', 0  -- Placeholder - verification tracking not implemented
      )
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Scheduling Metrics
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
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'type', type::TEXT,
          'count', COUNT(*)::INTEGER
        )
      ), '[]'::jsonb)
      FROM events
      WHERE org_id = p_org_id
        AND (p_season_id IS NULL OR season_id = p_season_id)
        AND (p_team_id IS NULL OR team_id = p_team_id)
        AND (p_date_start IS NULL OR start_time >= p_date_start)
        AND (p_date_end IS NULL OR start_time <= p_date_end)
        AND is_cancelled = false
      GROUP BY type
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
          'teamId', t.id,
          'teamName', t.name,
          'conflictCount', (
            SELECT COUNT(*)::INTEGER
            FROM events e1
            JOIN events e2 ON e1.team_id = e2.team_id
            WHERE e1.team_id = t.id
              AND e1.id != e2.id
              AND e1.start_time < e2.end_time
              AND e1.end_time > e2.start_time
              AND e1.is_cancelled = false
              AND e2.is_cancelled = false
          ) / 2  -- Divide by 2 since each conflict is counted twice
        )
      ), '[]'::jsonb)
      FROM teams t
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR t.id = p_team_id)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Travel Metrics
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
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'month', TO_CHAR(start_date, 'YYYY-MM'),
          'count', COUNT(*)::INTEGER
        )
        ORDER BY TO_CHAR(start_date, 'YYYY-MM')
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
      GROUP BY TO_CHAR(start_date, 'YYYY-MM')
    ),
    'overlappingTravel', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'teamId', t.id,
          'teamName', t.name,
          'overlapCount', (
            SELECT COUNT(*)::INTEGER
            FROM travel_plans tp1
            JOIN travel_plans tp2 ON tp1.team_id = tp2.team_id
            WHERE tp1.team_id = t.id
              AND tp1.id != tp2.id
              AND tp1.start_date <= tp2.end_date
              AND tp1.end_date >= tp2.start_date
              AND tp1.status = 'published'
              AND tp2.status = 'published'
          ) / 2
        )
      ), '[]'::jsonb)
      FROM teams t
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR t.id = p_team_id)
    ),
    'missingDetails', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'tripId', tp.id,
          'tripName', tp.title,
          'missingFields', (
            SELECT jsonb_agg(field)
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
-- Payment Metrics
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
        AND p.status = 'paid'
        AND (p_date_start IS NULL OR p.paid_at >= p_date_start)
        AND (p_date_end IS NULL OR p.paid_at <= p_date_end)
    ),
    'outstandingBalance', (
      SELECT COALESCE(SUM(fa.amount_cents - COALESCE(paid_amount, 0)), 0)::INTEGER
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
          ) payments ON fa.id = payments.fee_assignment_id
          WHERE f.org_id = p_org_id
            AND (p_season_id IS NULL OR f.season_id = p_season_id)
            AND fa.amount_cents > COALESCE(paid_amount, 0)
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
          ) payments ON fa.id = payments.fee_assignment_id
          WHERE f.org_id = p_org_id
            AND (p_season_id IS NULL OR f.season_id = p_season_id)
            AND fa.amount_cents > COALESCE(paid_amount, 0)
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
          ) payments ON fa.id = payments.fee_assignment_id
          WHERE f.org_id = p_org_id
            AND (p_season_id IS NULL OR f.season_id = p_season_id)
            AND fa.amount_cents > COALESCE(paid_amount, 0)
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
          ) payments ON fa.id = payments.fee_assignment_id
          WHERE f.org_id = p_org_id
            AND (p_season_id IS NULL OR f.season_id = p_season_id)
            AND fa.amount_cents > COALESCE(paid_amount, 0)
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
        AND p.status = 'paid'
        AND pa.amount_cents < fa.amount_cents
        AND (p_date_start IS NULL OR p.paid_at >= p_date_start)
        AND (p_date_end IS NULL OR p.paid_at <= p_date_end)
    ),
    'offlinePayments', (
      SELECT COALESCE(SUM(pa.amount_cents), 0)::INTEGER
      FROM payment_allocations pa
      JOIN payments p ON pa.payment_id = p.id
      WHERE p.org_id = p_org_id
        AND p.status = 'paid'
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
        AND p.status = 'paid'
        AND p.paid_at IS NOT NULL
        AND (p_date_start IS NULL OR p.paid_at >= p_date_start)
        AND (p_date_end IS NULL OR p.paid_at <= p_date_end)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Uniform Metrics
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
          'teamId', t.id,
          'teamName', t.name,
          'missingCount', (
            SELECT COUNT(*)::INTEGER
            FROM athletes a
            JOIN team_memberships tm ON a.id = tm.athlete_id
            JOIN uniform_kits uk ON t.id = uk.team_id
            LEFT JOIN uniform_submissions us ON uk.id = us.kit_id AND a.id = us.athlete_id
            WHERE tm.team_id = t.id
              AND a.deleted_at IS NULL
              AND tm.deleted_at IS NULL
              AND (us.status IS NULL OR us.status != 'submitted')
          )
        )
      ), '[]'::jsonb)
      FROM teams t
      WHERE t.org_id = p_org_id
        AND (p_sub_org_id IS NULL OR t.org_id = p_sub_org_id)
        AND (p_sport_id IS NULL OR t.sport_id = p_sport_id)
        AND (p_program_id IS NULL OR t.program_id = p_program_id)
        AND (p_level_id IS NULL OR t.level_id = p_level_id)
        AND (p_team_id IS NULL OR t.id = p_team_id)
    ),
    'ordersByItem', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'item', uki.name,
          'count', COUNT(*)::INTEGER
        )
      ), '[]'::jsonb)
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
-- Communication Metrics
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
          'teamId', t.id,
          'teamName', t.name,
          'count', COUNT(a.id)::INTEGER
        )
      ), '[]'::jsonb)
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
    ),
    'huddlesVolume', 0,  -- Placeholder - huddles data in Stream.io
    'huddlesByTeam', '[]'::jsonb,  -- Placeholder
    'engagementRate', NULL,  -- Placeholder - requires view tracking
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

-- ============================================================================
-- Operations Metrics
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
    'adminActivity', (
      SELECT jsonb_build_object(
        'creates', (
          SELECT COUNT(*)::INTEGER
          FROM audit_log
          WHERE org_id = p_org_id
            AND action = 'create'
            AND (p_date_start IS NULL OR created_at >= p_date_start)
            AND (p_date_end IS NULL OR created_at <= p_date_end)
        ),
        'updates', (
          SELECT COUNT(*)::INTEGER
          FROM audit_log
          WHERE org_id = p_org_id
            AND action = 'update'
            AND (p_date_start IS NULL OR created_at >= p_date_start)
            AND (p_date_end IS NULL OR created_at <= p_date_end)
        ),
        'deletes', (
          SELECT COUNT(*)::INTEGER
          FROM audit_log
          WHERE org_id = p_org_id
            AND action = 'delete'
            AND (p_date_start IS NULL OR created_at >= p_date_start)
            AND (p_date_end IS NULL OR created_at <= p_date_end)
        )
      )
    ),
    'permissionBlocks', 0,  -- Placeholder - permission blocking not tracked
    'notificationDeliveryStats', NULL  -- Placeholder - notification stats not tracked
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_org_health_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_participation_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_scheduling_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_travel_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_uniform_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_communication_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_operations_metrics TO authenticated;
