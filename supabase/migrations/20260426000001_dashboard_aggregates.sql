-- Dashboard aggregate RPCs for unified demo/real service DTOs.
-- These functions perform server-side authorization checks and return stable JSON payloads.

CREATE OR REPLACE FUNCTION public.get_org_dashboard_kpis(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_allowed boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  v_is_allowed := is_platform_admin(v_user_id) OR is_org_admin(org_id, v_user_id);
  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Forbidden'
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH totals AS (
      SELECT
        (SELECT count(*)::int FROM teams t WHERE t.org_id = org_id AND coalesce(t.is_active, true)) AS total_teams,
        (SELECT count(*)::int FROM athletes a WHERE a.org_id = org_id AND a.deleted_at IS NULL) AS total_athletes,
        (SELECT count(*)::int FROM seasons s WHERE s.org_id = org_id AND coalesce(s.is_active, false)) AS active_seasons,
        (
          SELECT coalesce(sum(fa.balance_cents), 0)::bigint
          FROM fee_assignments fa
          WHERE fa.org_id = org_id
            AND fa.balance_cents > 0
        ) AS outstanding_balance_cents,
        (
          SELECT count(*)::int
          FROM events e
          WHERE e.org_id = org_id
            AND coalesce(e.is_cancelled, false) = false
            AND e.start_time >= now()
            AND e.start_time <= (now() + interval '30 days')
        ) AS upcoming_events,
        (
          SELECT count(*)::int
          FROM ticket_orders o
          WHERE o.org_id = org_id
            AND o.status = 'pending_payment'
        ) AS pending_uniform_orders
    )
    SELECT jsonb_build_object(
      'org_id', org_id,
      'total_teams', coalesce(t.total_teams, 0),
      'total_athletes', coalesce(t.total_athletes, 0),
      'active_seasons', coalesce(t.active_seasons, 0),
      'outstanding_balance_cents', coalesce(t.outstanding_balance_cents, 0),
      'upcoming_events', coalesce(t.upcoming_events, 0),
      'pending_uniform_orders', coalesce(t.pending_uniform_orders, 0)
    )
    FROM totals t
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_coach_team_kpis(
  org_id uuid,
  coach_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  v_is_admin := is_platform_admin(v_user_id) OR is_org_admin(org_id, v_user_id);
  IF NOT v_is_admin AND v_user_id <> coach_user_id THEN
    RAISE EXCEPTION 'Forbidden'
      USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1
    FROM team_coaches tc
    WHERE tc.org_id = org_id
      AND tc.coach_user_id = coach_user_id
      AND coalesce(tc.status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Forbidden'
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH coach_teams AS (
      SELECT DISTINCT tc.team_id
      FROM team_coaches tc
      WHERE tc.org_id = org_id
        AND tc.coach_user_id = coach_user_id
        AND coalesce(tc.status, 'active') = 'active'
    ),
    team_members AS (
      SELECT DISTINCT tm.athlete_id, tm.team_id
      FROM team_memberships tm
      JOIN coach_teams ct ON ct.team_id = tm.team_id
      WHERE tm.deleted_at IS NULL
    ),
    attendance_rollup AS (
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE a.status = 'going')::int AS going_count,
        count(*) FILTER (WHERE a.status = 'late')::int AS late_count
      FROM attendance a
      JOIN events e ON e.id = a.event_id
      JOIN coach_teams ct ON ct.team_id = e.team_id
      WHERE e.org_id = org_id
        AND e.start_time >= (now() - interval '30 days')
        AND e.start_time <= now()
    ),
    profile_rollup AS (
      SELECT
        coalesce(avg(asp.completeness_score), 0)::numeric(5,2) AS avg_profile_completeness
      FROM athlete_sport_profiles asp
      JOIN team_members tm ON tm.athlete_id = asp.athlete_id
      WHERE asp.org_id = org_id
    )
    SELECT jsonb_build_object(
      'org_id', org_id,
      'coach_user_id', coach_user_id,
      'team_count', (SELECT count(*)::int FROM coach_teams),
      'athlete_count', (SELECT count(DISTINCT athlete_id)::int FROM team_members),
      'upcoming_events', (
        SELECT count(*)::int
        FROM events e
        JOIN coach_teams ct ON ct.team_id = e.team_id
        WHERE e.org_id = org_id
          AND coalesce(e.is_cancelled, false) = false
          AND e.start_time >= now()
          AND e.start_time <= (now() + interval '14 days')
      ),
      'attendance_rate', (
        SELECT CASE
          WHEN ar.total = 0 THEN 0
          ELSE round((((ar.going_count + ar.late_count)::numeric / ar.total::numeric) * 100), 2)
        END
        FROM attendance_rollup ar
      ),
      'avg_profile_completeness', (SELECT pr.avg_profile_completeness FROM profile_rollup pr)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_coach_sport_profile_insights(
  org_id uuid,
  coach_user_id uuid,
  sport_key text,
  filters jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  v_is_admin := is_platform_admin(v_user_id) OR is_org_admin(org_id, v_user_id);
  IF NOT v_is_admin AND v_user_id <> coach_user_id THEN
    RAISE EXCEPTION 'Forbidden'
      USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1
    FROM team_coaches tc
    WHERE tc.org_id = org_id
      AND tc.coach_user_id = coach_user_id
      AND coalesce(tc.status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Forbidden'
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH coach_teams AS (
      SELECT DISTINCT tc.team_id
      FROM team_coaches tc
      WHERE tc.org_id = org_id
        AND tc.coach_user_id = coach_user_id
        AND coalesce(tc.status, 'active') = 'active'
    ),
    scoped_teams AS (
      SELECT ct.team_id
      FROM coach_teams ct
      WHERE NOT (filters ? 'team_ids')
        OR ct.team_id = ANY (
          ARRAY(
            SELECT value::uuid
            FROM jsonb_array_elements_text(coalesce(filters->'team_ids', '[]'::jsonb))
          )
        )
    ),
    athlete_scope AS (
      SELECT DISTINCT tm.athlete_id
      FROM team_memberships tm
      JOIN scoped_teams st ON st.team_id = tm.team_id
      WHERE tm.deleted_at IS NULL
    ),
    profile_scope AS (
      SELECT
        asp.athlete_id,
        asp.completeness_score,
        coalesce(nullif(trim(asp.profile_data->>'position'), ''), 'Unspecified') AS position_label,
        lower(
          coalesce(
            nullif(trim(asp.profile_data->>'shooting_hand'), ''),
            nullif(trim(asp.profile_data->>'throwing_hand'), ''),
            nullif(trim(asp.profile_data->>'preferred_foot'), ''),
            nullif(trim(asp.profile_data->>'playing_hand'), ''),
            nullif(trim(a.dominant_hand), ''),
            'unknown'
          )
        ) AS hand_label
      FROM athlete_sport_profiles asp
      JOIN athletes a ON a.id = asp.athlete_id
      JOIN athlete_scope ats ON ats.athlete_id = asp.athlete_id
      WHERE asp.org_id = org_id
        AND (sport_key IS NULL OR sport_key = '' OR lower(asp.sport_code) = lower(sport_key))
    ),
    position_rollup AS (
      SELECT
        ps.position_label,
        count(*)::int AS count
      FROM profile_scope ps
      GROUP BY ps.position_label
    )
    SELECT jsonb_build_object(
      'org_id', org_id,
      'coach_user_id', coach_user_id,
      'sport_key', sport_key,
      'total_profiles', (SELECT count(*)::int FROM profile_scope),
      'avg_completeness', (
        SELECT coalesce(round(avg(ps.completeness_score)::numeric, 2), 0)
        FROM profile_scope ps
      ),
      'left_handed_count', (
        SELECT count(*)::int
        FROM profile_scope ps
        WHERE ps.hand_label IN ('left', 'left-handed', 'left handed', 'l')
      ),
      'right_handed_count', (
        SELECT count(*)::int
        FROM profile_scope ps
        WHERE ps.hand_label IN ('right', 'right-handed', 'right handed', 'r')
      ),
      'unknown_handed_count', (
        SELECT count(*)::int
        FROM profile_scope ps
        WHERE ps.hand_label NOT IN ('left', 'left-handed', 'left handed', 'l', 'right', 'right-handed', 'right handed', 'r')
      ),
      'position_distribution', (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object('position', pr.position_label, 'count', pr.count)
            ORDER BY pr.count DESC, pr.position_label ASC
          ),
          '[]'::jsonb
        )
        FROM position_rollup pr
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_attendance_summary(
  org_id uuid,
  team_ids uuid[] DEFAULT NULL,
  date_range jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_coach boolean := false;
  v_start timestamptz := coalesce(nullif(date_range->>'start', '')::timestamptz, now() - interval '30 days');
  v_end timestamptz := coalesce(nullif(date_range->>'end', '')::timestamptz, now());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  v_is_admin := is_platform_admin(v_user_id) OR is_org_admin(org_id, v_user_id);
  v_is_coach := EXISTS (
    SELECT 1
    FROM team_coaches tc
    WHERE tc.org_id = org_id
      AND tc.coach_user_id = v_user_id
      AND coalesce(tc.status, 'active') = 'active'
  );

  IF NOT v_is_admin AND NOT v_is_coach THEN
    RAISE EXCEPTION 'Forbidden'
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH scoped_teams AS (
      SELECT t.id, t.name
      FROM teams t
      WHERE t.org_id = org_id
        AND (team_ids IS NULL OR cardinality(team_ids) = 0 OR t.id = ANY(team_ids))
    ),
    scoped_attendance AS (
      SELECT
        a.status,
        e.team_id,
        st.name AS team_name
      FROM attendance a
      JOIN events e ON e.id = a.event_id
      JOIN scoped_teams st ON st.id = e.team_id
      WHERE e.org_id = org_id
        AND e.start_time >= v_start
        AND e.start_time <= v_end
    ),
    team_rollup AS (
      SELECT
        sa.team_id,
        max(sa.team_name) AS team_name,
        count(*)::int AS total_responses,
        count(*) FILTER (WHERE sa.status = 'going')::int AS going_count,
        count(*) FILTER (WHERE sa.status = 'late')::int AS late_count,
        count(*) FILTER (WHERE sa.status = 'not_going')::int AS not_going_count
      FROM scoped_attendance sa
      GROUP BY sa.team_id
    )
    SELECT jsonb_build_object(
      'org_id', org_id,
      'date_start', v_start,
      'date_end', v_end,
      'total_responses', coalesce((SELECT count(*)::int FROM scoped_attendance), 0),
      'going_count', coalesce((SELECT count(*)::int FROM scoped_attendance sa WHERE sa.status = 'going'), 0),
      'late_count', coalesce((SELECT count(*)::int FROM scoped_attendance sa WHERE sa.status = 'late'), 0),
      'not_going_count', coalesce((SELECT count(*)::int FROM scoped_attendance sa WHERE sa.status = 'not_going'), 0),
      'response_rate', (
        SELECT
          CASE
            WHEN count(*) = 0 THEN 0
            ELSE round((((count(*) FILTER (WHERE sa.status IN ('going', 'late')))::numeric / count(*)::numeric) * 100), 2)
          END
        FROM scoped_attendance sa
      ),
      'by_team', (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'team_id', tr.team_id,
              'team_name', tr.team_name,
              'total_responses', tr.total_responses,
              'going_count', tr.going_count,
              'late_count', tr.late_count,
              'not_going_count', tr.not_going_count
            )
            ORDER BY tr.team_name ASC
          ),
          '[]'::jsonb
        )
        FROM team_rollup tr
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ticketing_summary(
  org_id uuid,
  date_range jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_allowed boolean := false;
  v_start timestamptz := coalesce(nullif(date_range->>'start', '')::timestamptz, now() - interval '90 days');
  v_end timestamptz := coalesce(nullif(date_range->>'end', '')::timestamptz, now());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  v_is_allowed := is_platform_admin(v_user_id) OR is_org_admin(org_id, v_user_id);
  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Forbidden'
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH filtered_orders AS (
      SELECT o.*
      FROM ticket_orders o
      WHERE o.org_id = org_id
        AND coalesce(o.processed_at, o.created_at) >= v_start
        AND coalesce(o.processed_at, o.created_at) <= v_end
    ),
    paid_orders AS (
      SELECT *
      FROM filtered_orders fo
      WHERE fo.status = 'paid'
    ),
    event_rollup AS (
      SELECT
        po.ticketed_event_id,
        coalesce(te.title, 'Untitled Event') AS event_title,
        coalesce(sum(po.total_cents), 0)::bigint AS gross_cents,
        coalesce(sum(po.fees_cents), 0)::bigint AS fees_cents,
        coalesce(sum(po.platform_fee_cents), 0)::bigint AS platform_fee_cents,
        coalesce(sum(po.org_revenue_cents), 0)::bigint AS org_revenue_cents,
        count(*)::int AS order_count,
        coalesce(sum(oi.ticket_count), 0)::bigint AS ticket_count
      FROM paid_orders po
      LEFT JOIN ticketed_events te ON te.id = po.ticketed_event_id
      LEFT JOIN LATERAL (
        SELECT coalesce(sum(toi.quantity), 0)::bigint AS ticket_count
        FROM ticket_order_items toi
        WHERE toi.order_id = po.id
      ) oi ON true
      GROUP BY po.ticketed_event_id, te.title
    ),
    month_rollup AS (
      SELECT
        to_char(date_trunc('month', coalesce(po.processed_at, po.created_at)), 'YYYY-MM') AS month,
        coalesce(sum(po.total_cents), 0)::bigint AS gross_cents,
        coalesce(sum(po.fees_cents), 0)::bigint AS fees_cents,
        coalesce(sum(po.platform_fee_cents), 0)::bigint AS platform_fee_cents,
        coalesce(sum(po.org_revenue_cents), 0)::bigint AS org_revenue_cents,
        count(*)::int AS order_count,
        coalesce(sum(oi.ticket_count), 0)::bigint AS ticket_count
      FROM paid_orders po
      LEFT JOIN LATERAL (
        SELECT coalesce(sum(toi.quantity), 0)::bigint AS ticket_count
        FROM ticket_order_items toi
        WHERE toi.order_id = po.id
      ) oi ON true
      GROUP BY to_char(date_trunc('month', coalesce(po.processed_at, po.created_at)), 'YYYY-MM')
    )
    SELECT jsonb_build_object(
      'org_id', org_id,
      'date_start', v_start,
      'date_end', v_end,
      'orders_count', coalesce((SELECT count(*)::int FROM filtered_orders), 0),
      'paid_orders_count', coalesce((SELECT count(*)::int FROM paid_orders), 0),
      'refunded_orders_count', coalesce((SELECT count(*)::int FROM filtered_orders fo WHERE fo.status = 'refunded'), 0),
      'gross_cents', coalesce((SELECT sum(po.total_cents)::bigint FROM paid_orders po), 0),
      'fees_cents', coalesce((SELECT sum(po.fees_cents)::bigint FROM paid_orders po), 0),
      'platform_fee_cents', coalesce((SELECT sum(po.platform_fee_cents)::bigint FROM paid_orders po), 0),
      'org_revenue_cents', coalesce((SELECT sum(po.org_revenue_cents)::bigint FROM paid_orders po), 0),
      'ticket_count', coalesce((SELECT sum(oi.quantity)::bigint FROM ticket_order_items oi JOIN paid_orders po ON po.id = oi.order_id), 0),
      'by_event', (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'ticketed_event_id', er.ticketed_event_id,
              'event_title', er.event_title,
              'gross_cents', er.gross_cents,
              'platform_fee_cents', er.platform_fee_cents,
              'org_revenue_cents', er.org_revenue_cents,
              'order_count', er.order_count,
              'ticket_count', er.ticket_count
            )
            ORDER BY er.org_revenue_cents DESC
          ),
          '[]'::jsonb
        )
        FROM event_rollup er
      ),
      'by_month', (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'month', mr.month,
              'gross_cents', mr.gross_cents,
              'platform_fee_cents', mr.platform_fee_cents,
              'org_revenue_cents', mr.org_revenue_cents,
              'order_count', mr.order_count,
              'ticket_count', mr.ticket_count
            )
            ORDER BY mr.month DESC
          ),
          '[]'::jsonb
        )
        FROM month_rollup mr
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_facilities_utilization(
  org_id uuid,
  date_range jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_allowed boolean := false;
  v_start timestamptz := coalesce(nullif(date_range->>'start', '')::timestamptz, now() - interval '30 days');
  v_end timestamptz := coalesce(nullif(date_range->>'end', '')::timestamptz, now());
  v_window_hours numeric := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  v_is_allowed := is_platform_admin(v_user_id) OR is_org_admin(org_id, v_user_id);
  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Forbidden'
      USING ERRCODE = '42501';
  END IF;

  v_window_hours := greatest(extract(epoch FROM (v_end - v_start)) / 3600.0, 0);

  RETURN (
    WITH resources AS (
      SELECT r.id, r.facility_id, r.name
      FROM facility_resources r
      WHERE r.org_id = org_id
        AND coalesce(r.reservable, true)
    ),
    reservations AS (
      SELECT
        fr.resource_id,
        fr.facility_id,
        greatest(fr.start_at, v_start) AS start_at,
        least(fr.end_at, v_end) AS end_at
      FROM facility_reservations fr
      WHERE fr.org_id = org_id
        AND fr.status <> 'cancelled'
        AND fr.end_at > v_start
        AND fr.start_at < v_end
    ),
    resource_hours AS (
      SELECT
        r.id AS resource_id,
        r.facility_id,
        r.name AS resource_name,
        count(res.resource_id)::int AS reservation_count,
        coalesce(
          sum(
            greatest(extract(epoch FROM (res.end_at - res.start_at)) / 3600.0, 0)
          ),
          0
        )::numeric AS reserved_hours
      FROM resources r
      LEFT JOIN reservations res ON res.resource_id = r.id
      GROUP BY r.id, r.facility_id, r.name
    ),
    facility_hours AS (
      SELECT
        f.id AS facility_id,
        f.name AS facility_name,
        count(rh.resource_id)::int AS resource_count,
        coalesce(sum(rh.reserved_hours), 0)::numeric AS reserved_hours,
        coalesce(sum(rh.reservation_count), 0)::int AS reservation_count
      FROM facilities f
      LEFT JOIN resource_hours rh ON rh.facility_id = f.id
      WHERE f.org_id = org_id
      GROUP BY f.id, f.name
    )
    SELECT jsonb_build_object(
      'org_id', org_id,
      'date_start', v_start,
      'date_end', v_end,
      'total_resources', coalesce((SELECT count(*)::int FROM resources), 0),
      'reserved_resources', coalesce((SELECT count(*)::int FROM resource_hours rh WHERE rh.reserved_hours > 0), 0),
      'total_reservation_hours', coalesce((SELECT sum(rh.reserved_hours) FROM resource_hours rh), 0),
      'avg_utilization_pct', (
        SELECT
          CASE
            WHEN v_window_hours <= 0 OR count(*) = 0 THEN 0
            ELSE round((coalesce(sum(rh.reserved_hours), 0) / (count(*)::numeric * v_window_hours)) * 100, 2)
          END
        FROM resource_hours rh
      ),
      'by_resource', (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'resource_id', rh.resource_id,
              'facility_id', rh.facility_id,
              'resource_name', rh.resource_name,
              'reservation_count', rh.reservation_count,
              'reserved_hours', rh.reserved_hours,
              'utilization_pct',
                CASE
                  WHEN v_window_hours <= 0 THEN 0
                  ELSE round((rh.reserved_hours / v_window_hours) * 100, 2)
                END
            )
            ORDER BY rh.reserved_hours DESC, rh.resource_name ASC
          ),
          '[]'::jsonb
        )
        FROM resource_hours rh
      ),
      'by_facility', (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'facility_id', fh.facility_id,
              'facility_name', fh.facility_name,
              'resource_count', fh.resource_count,
              'reservation_count', fh.reservation_count,
              'reserved_hours', fh.reserved_hours,
              'utilization_pct',
                CASE
                  WHEN v_window_hours <= 0 OR fh.resource_count = 0 THEN 0
                  ELSE round((fh.reserved_hours / (fh.resource_count::numeric * v_window_hours)) * 100, 2)
                END
            )
            ORDER BY fh.reserved_hours DESC, fh.facility_name ASC
          ),
          '[]'::jsonb
        )
        FROM facility_hours fh
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_dashboard_kpis(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_coach_team_kpis(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_coach_sport_profile_insights(uuid, uuid, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_attendance_summary(uuid, uuid[], jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_ticketing_summary(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_facilities_utilization(uuid, jsonb) TO authenticated, service_role;
