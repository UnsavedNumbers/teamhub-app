-- Fix get_fan_calendar - organizations table has no timezone column
-- Remove org.timezone reference

DROP FUNCTION IF EXISTS public.get_fan_calendar(TIMESTAMPTZ, TIMESTAMPTZ, UUID[], TEXT[]);

CREATE OR REPLACE FUNCTION public.get_fan_calendar(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_org_ids UUID[] DEFAULT NULL,
  p_sources TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  WITH followed_orgs AS (
    SELECT org_id FROM public.fan_org_follows WHERE user_id = v_user_id
  ),
  bookmarked_events AS (
    SELECT event_id FROM public.fan_event_bookmarks WHERE user_id = v_user_id
  ),
  user_ticketed_event_ids AS (
    SELECT DISTINCT tor.ticketed_event_id
    FROM public.ticket_orders tor
    WHERE tor.purchaser_user_id = v_user_id
      AND tor.status = 'paid'
  ),
  regular_events AS (
    SELECT
      e.id,
      e.title,
      e.start_time,
      e.end_time,
      e.location,
      COALESCE(e.timezone, 'America/New_York') as timezone,
      t.org_id,
      e.visibility::text,
      e.type::text as event_type,
      e.notes as description,
      org.name as org_name,
      org.slug as org_slug,
      ARRAY_AGG(DISTINCT src.source_type) FILTER (WHERE src.source_type IS NOT NULL) as sources,
      'event'::text as record_type
    FROM public.events e
    JOIN public.teams t ON t.id = e.team_id
    JOIN public.organizations org ON org.id = t.org_id
    CROSS JOIN LATERAL (
      SELECT
        CASE
          WHEN t.org_id IN (SELECT org_id FROM followed_orgs) THEN 'followed'
          WHEN e.id IN (SELECT event_id FROM bookmarked_events) THEN 'bookmarked'
        END as source_type
    ) src
    WHERE
      e.visibility = 'public'
      AND (
        t.org_id IN (SELECT org_id FROM followed_orgs)
        OR e.id IN (SELECT event_id FROM bookmarked_events)
      )
      AND (p_start_date IS NULL OR e.start_time >= p_start_date)
      AND (p_end_date IS NULL OR e.start_time <= p_end_date)
      AND (p_org_ids IS NULL OR t.org_id = ANY(p_org_ids))
      AND e.start_time > NOW() - INTERVAL '7 days'
    GROUP BY e.id, e.title, e.start_time, e.end_time, e.location, e.timezone,
             t.org_id, e.visibility, e.type, e.notes, org.name, org.slug
  ),
  ticketed_events_query AS (
    SELECT
      te.id,
      te.title as title,
      te.starts_at as start_time,
      te.ends_at as end_time,
      COALESCE(te.venue_name, te.venue_city) as location,
      COALESCE(te.timezone, 'America/New_York') as timezone,
      te.org_id,
      'public'::text as visibility,
      'ticketed'::text as event_type,
      te.description,
      org.name as org_name,
      org.slug as org_slug,
      ARRAY['ticketed']::TEXT[] as sources,
      'ticketed_event'::text as record_type
    FROM public.ticketed_events te
    JOIN public.organizations org ON org.id = te.org_id
    WHERE te.id IN (SELECT ticketed_event_id FROM user_ticketed_event_ids)
      AND (p_start_date IS NULL OR te.starts_at >= p_start_date)
      AND (p_end_date IS NULL OR te.starts_at <= p_end_date)
      AND (p_org_ids IS NULL OR te.org_id = ANY(p_org_ids))
      AND te.starts_at > NOW() - INTERVAL '7 days'
  ),
  all_events AS (
    SELECT * FROM regular_events
    UNION ALL
    SELECT * FROM ticketed_events_query
  )
  SELECT json_build_object(
    'events', COALESCE(json_agg(
      json_build_object(
        'id', id,
        'title', title,
        'start_time', start_time,
        'end_time', end_time,
        'location', location,
        'timezone', timezone,
        'org_id', org_id,
        'org_name', org_name,
        'org_slug', org_slug,
        'visibility', visibility,
        'event_type', event_type,
        'description', description,
        'sources', sources
      ) ORDER BY start_time
    ), '[]'::json),
    'generated_at', NOW()
  ) INTO v_result
  FROM all_events;

  RETURN v_result;
END;
$$;
