-- Drop duplicate get_fan_calendar functions
-- Keep only the one from 20260410000001 that properly joins through teams

-- Drop all existing versions
DROP FUNCTION IF EXISTS public.get_fan_calendar(TIMESTAMPTZ, TIMESTAMPTZ, UUID[], TEXT[]);
DROP FUNCTION IF EXISTS public.get_fan_calendar(TIMESTAMPTZ, TIMESTAMPTZ, UUID[], VARCHAR[]);
DROP FUNCTION IF EXISTS public.get_fan_calendar(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ, p_org_ids UUID[], p_sources VARCHAR[]);
DROP FUNCTION IF EXISTS public.get_fan_calendar(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ, p_org_ids UUID[], p_sources TEXT[]);

-- Recreate the correct version (from 20260410000001_fix_fan_calendar_team_org_join.sql)
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
    -- Get ticketed_event_ids from user's tickets
    SELECT DISTINCT tt.ticketed_event_id
    FROM public.tickets t
    JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
    WHERE t.holder_user_id = v_user_id
  ),
  user_tickets AS (
    -- Tickets table uses ticketed_event_id, not event_id
    -- This CTE is for linking regular events to tickets if needed
    -- Since tickets only link to ticketed_events, we leave this empty
    SELECT NULL::uuid as event_id WHERE false
  ),
  regular_events AS (
    -- Regular events from events table (JOIN through teams to get org_id)
    SELECT
      e.id,
      e.title,
      e.start_time,
      e.end_time,
      e.location,
      e.timezone,
      t.org_id,
      e.visibility::text,
      e.type::text as event_type,
      e.notes as description,
      o.name as org_name,
      o.slug as org_slug,
      ARRAY_AGG(DISTINCT source.source) FILTER (WHERE source.source IS NOT NULL) as sources,
      'event'::text as record_type
    FROM public.events e
    JOIN public.teams t ON t.id = e.team_id
    JOIN public.organizations o ON o.id = t.org_id
    CROSS JOIN LATERAL (
      SELECT
        CASE
          WHEN t.org_id IN (SELECT org_id FROM followed_orgs) THEN 'followed'
          WHEN e.id IN (SELECT event_id FROM bookmarked_events) THEN 'bookmarked'
        END as source
    ) source
    WHERE
      -- Events must be public
      e.visibility = 'public'
      -- And user must follow org OR have bookmarked
      AND (
        t.org_id IN (SELECT org_id FROM followed_orgs)
        OR e.id IN (SELECT event_id FROM bookmarked_events)
      )
      -- Date range filter
      AND (p_start_date IS NULL OR e.start_time >= p_start_date)
      AND (p_end_date IS NULL OR e.start_time <= p_end_date)
      -- Org filter (now using t.org_id)
      AND (p_org_ids IS NULL OR t.org_id = ANY(p_org_ids))
      -- Only upcoming or recent events
      AND e.start_time > NOW() - INTERVAL '7 days'
    GROUP BY e.id, e.title, e.start_time, e.end_time, e.location, e.timezone,
             t.org_id, e.visibility, e.type, e.notes, o.name, o.slug
  ),
  ticketed_events_query AS (
    -- Ticketed events from ticketed_events table
    SELECT
      te.id,
      te.name as title,
      te.starts_at as start_time,
      te.ends_at as end_time,
      v.name as location,
      o.timezone as timezone,
      te.org_id,
      'public'::text as visibility,
      'ticketed'::text as event_type,
      te.description,
      o.name as org_name,
      o.slug as org_slug,
      ARRAY['ticketed']::TEXT[] as sources,
      'ticketed_event'::text as record_type
    FROM public.ticketed_events te
    JOIN public.organizations o ON o.id = te.org_id
    LEFT JOIN public.venues v ON v.id = te.venue_id
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

COMMENT ON FUNCTION public.get_fan_calendar(TIMESTAMPTZ, TIMESTAMPTZ, UUID[], TEXT[]) 
IS 'Returns calendar events for fans. Events must be public AND from followed orgs/bookmarked/ticketed. Fixed to JOIN through teams table for org_id.';
