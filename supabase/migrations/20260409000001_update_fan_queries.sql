-- update_fan_queries
-- Updates RPC functions to respect new fan visibility columns
-- 1. get_fan_calendar: Events must be public AND (followed/bookmarked) OR ticketed
-- 2. search_entities: Only return orgs with profile_visible_to_fans=true and teams with visible_to_fans=true
-- 3. get_org_profile: Enforce profile_visible_to_fans check
-- 4. Add 'public' to video_visibility enum

-- 4. Enable public visibility for videos
ALTER TYPE public.video_visibility ADD VALUE IF NOT EXISTS 'public';

-- 1. Update get_fan_calendar
CREATE OR REPLACE FUNCTION public.get_fan_calendar(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_org_ids UUID[] DEFAULT NULL,
  p_sources VARCHAR[] DEFAULT NULL
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
    -- Also get event_ids from tickets for regular events table
    SELECT DISTINCT t.event_id
    FROM public.tickets t
    WHERE t.event_id IS NOT NULL
      AND t.holder_user_id = v_user_id
  ),
  all_events AS (
    -- Regular events from events table
    SELECT DISTINCT ON (e.id)
      e.id,
      e.title,
      e.start_time,
      e.end_time,
      e.location,
      e.timezone,
      e.org_id,
      e.visibility,
      e.event_type,
      e.description,
      o.name as org_name,
      o.slug as org_slug,
      ARRAY_AGG(DISTINCT source.source) FILTER (WHERE source.source IS NOT NULL) as sources,
      'event' as record_type
    FROM public.events e
    JOIN public.organizations o ON o.id = e.org_id
    CROSS JOIN LATERAL (
      SELECT
        CASE
          WHEN e.org_id IN (SELECT org_id FROM followed_orgs) THEN 'followed'
          WHEN e.id IN (SELECT event_id FROM bookmarked_events) THEN 'bookmarked'
          WHEN e.id IN (SELECT event_id FROM user_tickets) THEN 'ticketed'
        END as source
    ) source
    WHERE
      -- Events must be public OR user has tickets
      (
        e.visibility = 'public'
        OR e.id IN (SELECT event_id FROM user_tickets)
      )
      -- And user must follow org OR have tickets
      AND (
        e.org_id IN (SELECT org_id FROM followed_orgs)
        OR e.id IN (SELECT event_id FROM bookmarked_events)
        OR e.id IN (SELECT event_id FROM user_tickets)
      )
      -- Date range filter
      AND (p_start_date IS NULL OR e.start_time >= p_start_date)
      AND (p_end_date IS NULL OR e.start_time <= p_end_date)
      -- Org filter
      AND (p_org_ids IS NULL OR e.org_id = ANY(p_org_ids))
      -- Only upcoming or recent events
      AND e.start_time > NOW() - INTERVAL '7 days'
    GROUP BY e.id, e.title, e.start_time, e.end_time, e.location, e.timezone,
             e.org_id, e.visibility, e.event_type, e.description, o.name, o.slug
    ORDER BY e.id, e.start_time

    UNION ALL

    -- Ticketed events from ticketed_events table
    SELECT DISTINCT
      te.id,
      te.name as title,
      te.starts_at as start_time,
      te.ends_at as end_time,
      v.name as location,
      o.timezone as timezone,
      te.org_id,
      'public' as visibility, -- Ticketed events are public if user has tickets
      'ticketed' as event_type,
      te.description,
      o.name as org_name,
      o.slug as org_slug,
      ARRAY['ticketed']::VARCHAR[] as sources,
      'ticketed_event' as record_type
    FROM public.ticketed_events te
    JOIN public.organizations o ON o.id = te.org_id
    LEFT JOIN public.venues v ON v.id = te.venue_id
    WHERE te.id IN (SELECT ticketed_event_id FROM user_ticketed_event_ids)
      -- Only show ticketed events where user actually has tickets
      AND (p_start_date IS NULL OR te.starts_at >= p_start_date)
      AND (p_end_date IS NULL OR te.starts_at <= p_end_date)
      -- Org filter
      AND (p_org_ids IS NULL OR te.org_id = ANY(p_org_ids))
      -- Only upcoming or recent events
      AND te.starts_at > NOW() - INTERVAL '7 days'
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


-- 2. Update search_entities
CREATE OR REPLACE FUNCTION public.search_entities(
  p_query TEXT,
  p_entity_types VARCHAR[] DEFAULT ARRAY['org', 'team', 'athlete']::VARCHAR[],
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_result JSONB;
  v_search_terms TEXT;
  v_user_id UUID := auth.uid();
BEGIN
  -- Normalize search query
  v_search_terms := LOWER(TRIM(p_query));

  IF LENGTH(v_search_terms) < 2 THEN
    RETURN json_build_object('results', '[]'::json);
  END IF;

  WITH search_orgs AS (
    SELECT
      'org'::VARCHAR as entity_type,
      o.id,
      o.name,
      o.slug,
      o.primary_city as location_city,
      o.primary_state as location_state,
      NULL::VARCHAR as parent_org_name,
      NULL::VARCHAR as sport,
      o.logo_url,
      CASE
        WHEN LOWER(o.name) = v_search_terms THEN 100
        WHEN LOWER(o.name) LIKE v_search_terms || '%' THEN 90
        WHEN LOWER(o.name) LIKE '%' || v_search_terms || '%' THEN 70
        ELSE 50
      END as relevance_score,
      COALESCE(EXISTS(
        SELECT 1 FROM public.fan_org_follows fof
        WHERE fof.user_id = v_user_id AND fof.org_id = o.id
      ), FALSE) as is_following
    FROM public.organizations o
    WHERE 'org' = ANY(p_entity_types)
      -- NEW: Check profile_visible_to_fans
      AND o.profile_visible_to_fans = TRUE
      AND (
        LOWER(o.name) LIKE '%' || v_search_terms || '%' OR
        LOWER(o.primary_city) LIKE '%' || v_search_terms || '%' OR
        LOWER(o.primary_state) LIKE '%' || v_search_terms || '%'
      )
    ORDER BY relevance_score DESC, o.name
    LIMIT p_limit
  ),
  search_teams AS (
    SELECT
      'team'::VARCHAR as entity_type,
      t.id,
      t.name,
      NULL::VARCHAR as slug,
      NULL::VARCHAR as location_city,
      NULL::VARCHAR as location_state,
      o.name as parent_org_name,
      s.name as sport,
      NULL::TEXT as logo_url,
      CASE
        WHEN LOWER(t.name) = v_search_terms THEN 100
        WHEN LOWER(t.name) LIKE v_search_terms || '%' THEN 90
        WHEN LOWER(t.name) LIKE '%' || v_search_terms || '%' THEN 70
        ELSE 50
      END as relevance_score,
      COALESCE(EXISTS(
        SELECT 1 FROM public.fan_org_follows fof
        WHERE fof.user_id = v_user_id AND fof.org_id = t.org_id
      ), FALSE) as is_following
    FROM public.teams t
    JOIN public.organizations o ON o.id = t.org_id
    LEFT JOIN public.sports s ON s.id = t.sport_id
    WHERE 'team' = ANY(p_entity_types)
      -- NEW: Check visible_to_fans
      AND t.visible_to_fans = TRUE
      AND LOWER(t.name) LIKE '%' || v_search_terms || '%'
    ORDER BY relevance_score DESC, t.name
    LIMIT p_limit
  ),
  search_athletes AS (
    SELECT
      'athlete'::VARCHAR as entity_type,
      a.id,
      CONCAT(a.first_name, ' ', a.last_name) as name,
      NULL::VARCHAR as slug,
      NULL::VARCHAR as location_city,
      NULL::VARCHAR as location_state,
      o.name as parent_org_name,
      NULL::VARCHAR as sport,
      a.profile_photo_url as logo_url,
      CASE
        WHEN LOWER(CONCAT(a.first_name, ' ', a.last_name)) = v_search_terms THEN 100
        WHEN LOWER(CONCAT(a.first_name, ' ', a.last_name)) LIKE v_search_terms || '%' THEN 90
        WHEN LOWER(a.first_name) LIKE v_search_terms || '%' THEN 85
        WHEN LOWER(a.last_name) LIKE v_search_terms || '%' THEN 85
        WHEN LOWER(CONCAT(a.first_name, ' ', a.last_name)) LIKE '%' || v_search_terms || '%' THEN 70
        ELSE 50
      END as relevance_score,
      FALSE as is_following
    FROM public.athletes a
    JOIN public.organizations o ON o.id = a.org_id
    WHERE a.privacy_level = 'public'
      AND a.deleted_at IS NULL
      AND o.profile_visible_to_fans = TRUE -- Only search athletes from visible orgs
      AND 'athlete' = ANY(p_entity_types)
      AND (
        LOWER(a.first_name) LIKE '%' || v_search_terms || '%' OR
        LOWER(a.last_name) LIKE '%' || v_search_terms || '%' OR
        LOWER(CONCAT(a.first_name, ' ', a.last_name)) LIKE '%' || v_search_terms || '%'
      )
    ORDER BY relevance_score DESC, a.last_name, a.first_name
    LIMIT p_limit
  ),
  all_results AS (
    SELECT * FROM search_orgs
    UNION ALL
    SELECT * FROM search_teams
    UNION ALL
    SELECT * FROM search_athletes
  )
  SELECT json_build_object(
    'results', COALESCE(json_agg(
      json_build_object(
        'entity_type', entity_type,
        'id', id,
        'name', name,
        'slug', slug,
        'location_city', location_city,
        'location_state', location_state,
        'parent_org_name', parent_org_name,
        'sport', sport,
        'logo_url', logo_url,
        'relevance_score', relevance_score,
        'isFollowing', is_following
      ) ORDER BY relevance_score DESC, name
    ), '[]'::json),
    'total_count', COUNT(*)
  ) INTO v_result
  FROM (
    SELECT * FROM all_results
    ORDER BY relevance_score DESC, name
    LIMIT p_limit
  ) limited_results;

  RETURN v_result;
END;
$$;

-- 3. Update get_org_profile
CREATE OR REPLACE FUNCTION public.get_org_profile(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
  v_is_following BOOLEAN;
  v_privacy_level VARCHAR;
  v_profile_visible_to_fans BOOLEAN;
BEGIN
  -- Check privacy info
  SELECT COALESCE(privacy_level::text, 'public'), COALESCE(profile_visible_to_fans, FALSE)
  INTO v_privacy_level, v_profile_visible_to_fans
  FROM public.organizations
  WHERE id = p_org_id;

  IF v_privacy_level IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Check visibility
  IF v_profile_visible_to_fans IS NOT TRUE THEN
     RETURN json_build_object('error', 'access_denied', 'message', 'This organization profile is not public');
  END IF;

  -- Check if private and user doesn't have access
  IF v_privacy_level = 'private' THEN
    RETURN json_build_object('error', 'access_denied', 'message', 'This organization is private');
  END IF;

  -- Check if user is following
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.fan_org_follows
      WHERE user_id = v_user_id AND org_id = p_org_id
    ) INTO v_is_following;
  ELSE
    v_is_following := FALSE;
  END IF;

  -- Get org data with all required fields
  SELECT json_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'description', COALESCE(o.description, ''),
    'location_city', o.primary_city,
    'location_state', o.primary_state,
    'location_visible', COALESCE(o.profile_visible_to_fans, FALSE),
    'website', o.website,
    'email', o.email,
    'phone', o.phone,
    'logo_url', o.logo_url,
    'cover_url', NULL, -- TODO: Add cover_url column if needed
    'privacy_level', v_privacy_level,
    'is_following', v_is_following,
    'follower_count', COALESCE((
      SELECT COUNT(*) FROM public.fan_org_follows
      WHERE org_id = o.id
    ), 0),
    'created_at', o.created_at
  ) INTO v_result
  FROM public.organizations o
  WHERE o.id = p_org_id;

  RETURN v_result;
END;
$$;

-- 4. Create get_team_profile function
CREATE OR REPLACE FUNCTION public.get_team_profile(p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
  v_is_following BOOLEAN;
  v_org_id UUID;
  v_visible_to_fans BOOLEAN;
  v_team_exists BOOLEAN;
BEGIN
  -- First check if team exists
  SELECT EXISTS(
    SELECT 1 FROM public.teams WHERE id = p_team_id
  ) INTO v_team_exists;

  IF NOT v_team_exists THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Get org_id and visibility
  SELECT org_id, COALESCE(visible_to_fans, FALSE)
  INTO v_org_id, v_visible_to_fans
  FROM public.teams
  WHERE id = p_team_id;

  -- Check visibility for fan access
  IF v_visible_to_fans IS NOT TRUE THEN
     RETURN json_build_object('error', 'access_denied', 'message', 'This team profile is not public');
  END IF;

  -- Check if user is following the parent org
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.fan_org_follows
      WHERE user_id = v_user_id AND org_id = v_org_id
    ) INTO v_is_following;
  ELSE
    v_is_following := FALSE;
  END IF;

  -- Get team data
  SELECT json_build_object(
    'id', t.id,
    'name', t.name,
    'description', COALESCE(t.description, ''),
    'sport', s.name,
    'season', t.season,
    'gender', t.gender,
    'age_group', t.age_group,
    'logo_url', t.logo_url,
    'cover_url', NULL,
    'parent_org_id', t.org_id,
    'parent_org_name', o.name,
    'parent_org_slug', o.slug,
    'visible_to_fans', v_visible_to_fans,
    'is_following', v_is_following,
    'follower_count', COALESCE((
      SELECT COUNT(*) FROM public.fan_org_follows
      WHERE org_id = t.org_id
    ), 0),
    'created_at', t.created_at
  ) INTO v_result
  FROM public.teams t
  JOIN public.organizations o ON o.id = t.org_id
  LEFT JOIN public.sports s ON s.id = t.sport_id
  WHERE t.id = p_team_id;

  RETURN v_result;
END;
$$;

-- 5. Create get_athlete_profile function
CREATE OR REPLACE FUNCTION public.get_athlete_profile(p_athlete_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
  v_org_id UUID;
  v_privacy_level VARCHAR;
  v_athlete_exists BOOLEAN;
  v_team_names VARCHAR[];
BEGIN
  -- First check if athlete exists
  SELECT EXISTS(
    SELECT 1 FROM public.athletes WHERE id = p_athlete_id AND deleted_at IS NULL
  ) INTO v_athlete_exists;

  IF NOT v_athlete_exists THEN
    RAISE EXCEPTION 'Athlete not found';
  END IF;

  -- Get org_id and privacy level
  SELECT org_id, COALESCE(privacy_level::text, 'public')
  INTO v_org_id, v_privacy_level
  FROM public.athletes
  WHERE id = p_athlete_id AND deleted_at IS NULL;

  -- Check privacy - private athletes are not accessible to fans
  IF v_privacy_level = 'private' THEN
    RETURN json_build_object('error', 'access_denied', 'message', 'This athlete profile is private');
  END IF;

  -- Get athlete's team names
  SELECT ARRAY_AGG(t.name)
  INTO v_team_names
  FROM public.team_athletes ta
  JOIN public.teams t ON t.id = ta.team_id
  WHERE ta.athlete_id = p_athlete_id
    AND t.visible_to_fans = TRUE;

  -- Get athlete data
  SELECT json_build_object(
    'id', a.id,
    'first_name', a.first_name,
    'last_name', a.last_name,
    'full_name', CONCAT(a.first_name, ' ', a.last_name),
    'jersey_number', a.jersey_number,
    'position', a.position,
    'height', a.height,
    'weight', a.weight,
    'graduation_year', a.graduation_year,
    'bio', COALESCE(a.bio, ''),
    'profile_photo_url', a.profile_photo_url,
    'cover_url', NULL,
    'org_id', a.org_id,
    'org_name', o.name,
    'org_slug', o.slug,
    'privacy_level', v_privacy_level,
    'current_teams', COALESCE(v_team_names, ARRAY[]::VARCHAR[]),
    'created_at', a.created_at
  ) INTO v_result
  FROM public.athletes a
  JOIN public.organizations o ON o.id = a.org_id
  WHERE a.id = p_athlete_id AND a.deleted_at IS NULL;

  RETURN v_result;
END;
$$;
