-- Hotfix: Update search_entities function to use correct column names
-- The previous migration may have failed silently or the function wasn't updated

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
      o.primary_city as location_city,
      o.primary_state as location_state,
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
    WHERE 'org' = ANY(p_entity_types)
      AND (
        LOWER(o.name) LIKE '%' || v_search_terms || '%' OR
        LOWER(COALESCE(o.primary_city, '')) LIKE '%' || v_search_terms || '%' OR
        LOWER(COALESCE(o.primary_state, '')) LIKE '%' || v_search_terms || '%'
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
