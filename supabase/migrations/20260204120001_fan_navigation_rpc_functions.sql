-- ============================================
-- FAN NAVIGATION RPC FUNCTIONS
-- ============================================
-- RPC functions for fan navigation features:
-- 1. Calendar aggregation
-- 2. Discovery search
-- 3. Entity following
-- 4. Feed management
-- ============================================

-- ============================================
-- PART 1: FAN CALENDAR AGGREGATION
-- ============================================

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

  -- Aggregate events from all followed orgs, bookmarked events, and ticketed events
  WITH followed_orgs AS (
    SELECT org_id FROM public.fan_org_follows WHERE user_id = v_user_id
  ),
  bookmarked_events AS (
    SELECT event_id FROM public.fan_event_bookmarks WHERE user_id = v_user_id
  ),
  user_tickets AS (
    SELECT DISTINCT t.event_id
    FROM public.tickets t
    LEFT JOIN public.purchases p ON p.id = t.purchase_id
    WHERE t.holder_user_id = v_user_id OR p.user_id = v_user_id
  ),
  aggregated_events AS (
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
      ARRAY_AGG(DISTINCT source.source) as sources
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
      -- Visibility check: public events or user has special access
      (e.visibility = 'public' OR 
       e.org_id IN (SELECT org_id FROM followed_orgs) OR
       e.id IN (SELECT event_id FROM bookmarked_events) OR
       e.id IN (SELECT event_id FROM user_tickets))
      -- Date range filter
      AND (p_start_date IS NULL OR e.start_time >= p_start_date)
      AND (p_end_date IS NULL OR e.start_time <= p_end_date)
      -- Org filter
      AND (p_org_ids IS NULL OR e.org_id = ANY(p_org_ids))
      -- Source filter
      AND (p_sources IS NULL OR source.source = ANY(p_sources))
      -- Only upcoming or recent events
      AND e.start_time > NOW() - INTERVAL '7 days'
    GROUP BY e.id, e.title, e.start_time, e.end_time, e.location, e.timezone,
             e.org_id, e.visibility, e.event_type, e.description, o.name, o.slug
    ORDER BY e.id, e.start_time
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
  FROM aggregated_events;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_fan_calendar(TIMESTAMPTZ, TIMESTAMPTZ, UUID[], VARCHAR[]) IS 'Aggregates calendar events from followed orgs, bookmarks, and ticketed events for fan view';

-- ============================================
-- PART 2: DISCOVERY SEARCH
-- ============================================

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
      o.location_city,
      o.location_state,
      NULL::VARCHAR as parent_org_name,
      NULL::VARCHAR as sport,
      -- Relevance scoring
      CASE 
        WHEN LOWER(o.name) = v_search_terms THEN 100
        WHEN LOWER(o.name) LIKE v_search_terms || '%' THEN 90
        WHEN LOWER(o.name) LIKE '%' || v_search_terms || '%' THEN 70
        ELSE 50
      END as relevance_score
    FROM public.organizations o
    WHERE o.privacy_level = 'public'
      AND 'org' = ANY(p_entity_types)
      AND (
        LOWER(o.name) LIKE '%' || v_search_terms || '%' OR
        LOWER(o.location_city) LIKE '%' || v_search_terms || '%' OR
        LOWER(o.location_state) LIKE '%' || v_search_terms || '%'
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
      -- Relevance scoring
      CASE 
        WHEN LOWER(t.name) = v_search_terms THEN 100
        WHEN LOWER(t.name) LIKE v_search_terms || '%' THEN 90
        WHEN LOWER(t.name) LIKE '%' || v_search_terms || '%' THEN 70
        ELSE 50
      END as relevance_score
    FROM public.teams t
    JOIN public.organizations o ON o.id = t.org_id
    LEFT JOIN public.sports s ON s.id = t.sport_id
    WHERE t.privacy_level = 'public'
      AND 'team' = ANY(p_entity_types)
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
      -- Relevance scoring
      CASE 
        WHEN LOWER(CONCAT(a.first_name, ' ', a.last_name)) = v_search_terms THEN 100
        WHEN LOWER(CONCAT(a.first_name, ' ', a.last_name)) LIKE v_search_terms || '%' THEN 90
        WHEN LOWER(a.first_name) LIKE v_search_terms || '%' THEN 85
        WHEN LOWER(a.last_name) LIKE v_search_terms || '%' THEN 85
        WHEN LOWER(CONCAT(a.first_name, ' ', a.last_name)) LIKE '%' || v_search_terms || '%' THEN 70
        ELSE 50
      END as relevance_score
    FROM public.athletes a
    JOIN public.organizations o ON o.id = a.org_id
    WHERE a.privacy_level = 'public'
      AND a.deleted_at IS NULL
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
        'relevance_score', relevance_score
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

COMMENT ON FUNCTION public.search_entities(TEXT, VARCHAR[], INTEGER) IS 'Search for public entities (orgs, teams, athletes) with relevance scoring. Only returns public entities.';

-- ============================================
-- PART 3: FOLLOW/UNFOLLOW TEAMS AND ATHLETES
-- ============================================

CREATE OR REPLACE FUNCTION public.follow_team(
  p_team_id UUID,
  p_source VARCHAR(50) DEFAULT 'manual'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- TODO: Create fan_team_follows table
  -- For now, this is a placeholder for future implementation
  RAISE EXCEPTION 'Team following not yet implemented';
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.follow_athlete(
  p_athlete_id UUID,
  p_source VARCHAR(50) DEFAULT 'manual'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- TODO: Create fan_athlete_follows table
  -- For now, this is a placeholder for future implementation
  RAISE EXCEPTION 'Athlete following not yet implemented';
  
  RETURN true;
END;
$$;

-- ============================================
-- PART 4: GET ENTITY PROFILE
-- ============================================

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
BEGIN
  -- Check privacy level
  SELECT privacy_level INTO v_privacy_level
  FROM public.organizations
  WHERE id = p_org_id;
  
  IF v_privacy_level IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  -- Check if private and user doesn't have access
  IF v_privacy_level = 'private' THEN
    -- TODO: Add approval table check
    -- For now, return access denied
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
  
  -- Get org data
  SELECT json_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'description', o.description,
    'location_city', o.location_city,
    'location_state', o.location_state,
    'website', o.website,
    'privacy_level', o.privacy_level,
    'is_following', v_is_following,
    'created_at', o.created_at
  ) INTO v_result
  FROM public.organizations o
  WHERE o.id = p_org_id;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_org_profile(UUID) IS 'Get organization profile with privacy checks and follow status';
