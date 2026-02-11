-- Fix search_entities function - athletes table does not have profile_photo_url column
-- Athletes should return NULL for logo_url field

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
      NULL::TEXT as logo_url,  -- teams table does not have logo_url column
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
      NULL::TEXT as logo_url,  -- athletes table does not have profile_photo_url column
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
      AND o.profile_visible_to_fans = TRUE
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

COMMENT ON FUNCTION public.search_entities(TEXT, VARCHAR[], INTEGER) IS 'Search for public entities (orgs, teams, athletes) with relevance scoring. Only returns public entities. Fixed: teams and athletes do not have logo_url/profile_photo_url columns.';
