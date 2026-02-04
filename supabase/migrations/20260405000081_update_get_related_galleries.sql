-- ============================================================================
-- Update get_related_galleries to Support All Gallery Types
-- ============================================================================
-- This migration updates the get_related_galleries function to support:
-- - org, season, team, event, travel_plan, athlete
-- It also ensures compatibility with both 'travel' and 'travel_plan' enum values
-- ============================================================================

-- Update the get_related_galleries function to support all gallery types
CREATE OR REPLACE FUNCTION public.get_related_galleries(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS SETOF public.related_gallery_item
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_team_id uuid;
  v_season_id uuid;
  v_program_id uuid;
BEGIN
  -- Validate input
  IF p_entity_id IS NULL THEN
    RETURN;
  END IF;

  -- -------------------------------------------------------------------------
  -- Athlete: Return team, event, travel, season, program, org galleries
  -- -------------------------------------------------------------------------
  IF p_entity_type = 'athlete' THEN
    -- Get org_id from athlete
    SELECT a.org_id INTO v_org_id
    FROM public.athletes a
    WHERE a.id = p_entity_id;

    IF v_org_id IS NULL THEN
      RETURN;
    END IF;

    -- Team galleries (via team_memberships)
    RETURN QUERY
    SELECT DISTINCT
      'team'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.team_memberships tm
    INNER JOIN public.teams t ON t.id = tm.team_id
    INNER JOIN public.galleries g ON g.gallery_type = 'team' AND g.entity_id = t.id
    WHERE tm.athlete_id = p_entity_id
      AND tm.deleted_at IS NULL
      AND tm.status = 'active'
      AND g.org_id = v_org_id;

    -- Event galleries (for teams the athlete is on)
    RETURN QUERY
    SELECT DISTINCT
      'event'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.team_memberships tm
    INNER JOIN public.events e ON e.team_id = tm.team_id
    INNER JOIN public.galleries g ON g.gallery_type = 'event' AND g.entity_id = e.id
    WHERE tm.athlete_id = p_entity_id
      AND tm.deleted_at IS NULL
      AND tm.status = 'active'
      AND g.org_id = v_org_id;

    -- Travel plan galleries (for teams the athlete is on)
    RETURN QUERY
    SELECT DISTINCT
      'travel'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.team_memberships tm
    INNER JOIN public.travel_plans tp ON tp.team_id = tm.team_id
    INNER JOIN public.galleries g ON g.gallery_type = 'travel' AND g.entity_id = tp.id
    WHERE tm.athlete_id = p_entity_id
      AND tm.deleted_at IS NULL
      AND tm.status = 'active'
      AND g.org_id = v_org_id;

    -- Season galleries (for teams the athlete is on)
    RETURN QUERY
    SELECT DISTINCT
      'season'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.team_memberships tm
    INNER JOIN public.teams t ON t.id = tm.team_id
    INNER JOIN public.galleries g ON g.gallery_type = 'season' AND g.entity_id = t.season_id
    WHERE tm.athlete_id = p_entity_id
      AND tm.deleted_at IS NULL
      AND tm.status = 'active'
      AND t.season_id IS NOT NULL
      AND g.org_id = v_org_id;

    -- Program galleries (for teams the athlete is on)
    RETURN QUERY
    SELECT DISTINCT
      'program'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.team_memberships tm
    INNER JOIN public.teams t ON t.id = tm.team_id
    INNER JOIN public.galleries g ON g.gallery_type = 'program' AND g.entity_id = t.program_id
    WHERE tm.athlete_id = p_entity_id
      AND tm.deleted_at IS NULL
      AND tm.status = 'active'
      AND t.program_id IS NOT NULL
      AND g.org_id = v_org_id;

    -- Organization galleries
    RETURN QUERY
    SELECT DISTINCT
      'org'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.galleries g
    WHERE g.gallery_type = 'org'
      AND g.org_id = v_org_id
      AND g.entity_id = v_org_id;

  -- -------------------------------------------------------------------------
  -- Team: Return event, travel, season, program, org, athlete galleries
  -- -------------------------------------------------------------------------
  ELSIF p_entity_type = 'team' THEN
    -- Get team details
    SELECT t.org_id, t.season_id, t.program_id INTO v_org_id, v_season_id, v_program_id
    FROM public.teams t
    WHERE t.id = p_entity_id;

    IF v_org_id IS NULL THEN
      RETURN;
    END IF;

    -- Event galleries (events for this team)
    RETURN QUERY
    SELECT
      'event'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.events e
    INNER JOIN public.galleries g ON g.gallery_type = 'event' AND g.entity_id = e.id
    WHERE e.team_id = p_entity_id
      AND g.org_id = v_org_id;

    -- Travel plan galleries (travel plans for this team)
    RETURN QUERY
    SELECT
      'travel'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.travel_plans tp
    INNER JOIN public.galleries g ON g.gallery_type = 'travel' AND g.entity_id = tp.id
    WHERE tp.team_id = p_entity_id
      AND g.org_id = v_org_id;

    -- Season gallery (if team has season)
    IF v_season_id IS NOT NULL THEN
      RETURN QUERY
      SELECT
        'season'::text AS relationship_type,
        g.id AS gallery_id,
        g.name AS gallery_name,
        COALESCE(
          (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
          0::bigint
        ) AS photo_count,
        NULL::text AS cover_url
      FROM public.galleries g
      WHERE g.gallery_type = 'season'
        AND g.entity_id = v_season_id
        AND g.org_id = v_org_id;
    END IF;

    -- Program gallery (if team has program)
    IF v_program_id IS NOT NULL THEN
      RETURN QUERY
      SELECT
        'program'::text AS relationship_type,
        g.id AS gallery_id,
        g.name AS gallery_name,
        COALESCE(
          (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
          0::bigint
        ) AS photo_count,
        NULL::text AS cover_url
      FROM public.galleries g
      WHERE g.gallery_type = 'program'
        AND g.entity_id = v_program_id
        AND g.org_id = v_org_id;
    END IF;

    -- Organization gallery
    RETURN QUERY
    SELECT
      'org'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.galleries g
    WHERE g.gallery_type = 'org'
      AND g.org_id = v_org_id
      AND g.entity_id = v_org_id;

    -- Athlete galleries (team's roster)
    RETURN QUERY
    SELECT
      'athlete'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.team_memberships tm
    INNER JOIN public.athletes a ON a.id = tm.athlete_id
    INNER JOIN public.galleries g ON g.gallery_type = 'athlete' AND g.entity_id = a.id
    WHERE tm.team_id = p_entity_id
      AND tm.deleted_at IS NULL
      AND tm.status = 'active'
      AND a.org_id = v_org_id;

  -- -------------------------------------------------------------------------
  -- Event: Return team, travel plan galleries
  -- -------------------------------------------------------------------------
  ELSIF p_entity_type = 'event' THEN
    -- Get event details
    SELECT e.team_id, (SELECT org_id FROM public.teams t WHERE t.id = e.team_id) INTO v_team_id, v_org_id
    FROM public.events e
    WHERE e.id = p_entity_id;

    IF v_org_id IS NULL THEN
      RETURN;
    END IF;

    -- Team gallery (participating team)
    RETURN QUERY
    SELECT
      'team'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.galleries g
    WHERE g.gallery_type = 'team'
      AND g.entity_id = v_team_id
      AND g.org_id = v_org_id;

    -- Travel plan gallery (if event linked to a travel plan with matching dates)
    RETURN QUERY
    SELECT
      'travel'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.travel_plans tp
    INNER JOIN public.galleries g ON g.gallery_type = 'travel' AND g.entity_id = tp.id
    WHERE tp.team_id = v_team_id
      AND tp.start_date <= (SELECT e.start_time::date FROM public.events e WHERE e.id = p_entity_id)
      AND tp.end_date >= (SELECT e.start_time::date FROM public.events e WHERE e.id = p_entity_id)
      AND g.org_id = v_org_id;

  -- -------------------------------------------------------------------------
  -- Travel Plan: Return event, team galleries
  -- -------------------------------------------------------------------------
  ELSIF p_entity_type = 'travel_plan' OR p_entity_type = 'travel' THEN
    -- Get travel plan details
    SELECT tp.team_id, (SELECT org_id FROM public.teams t WHERE t.id = tp.team_id) INTO v_team_id, v_org_id
    FROM public.travel_plans tp
    WHERE tp.id = p_entity_id;

    IF v_org_id IS NULL THEN
      RETURN;
    END IF;

    -- Event galleries (events within travel plan date range)
    RETURN QUERY
    SELECT
      'event'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.travel_plans tp
    INNER JOIN public.events e ON e.team_id = tp.team_id
      AND e.start_time::date BETWEEN tp.start_date AND tp.end_date
    INNER JOIN public.galleries g ON g.gallery_type = 'event' AND g.entity_id = e.id
    WHERE tp.id = p_entity_id
      AND g.org_id = v_org_id;

    -- Team gallery
    RETURN QUERY
    SELECT
      'team'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.galleries g
    WHERE g.gallery_type = 'team'
      AND g.entity_id = v_team_id
      AND g.org_id = v_org_id;

  -- -------------------------------------------------------------------------
  -- Season: Return team, program, org galleries
  -- -------------------------------------------------------------------------
  ELSIF p_entity_type = 'season' THEN
    -- Get season details
    SELECT s.org_id INTO v_org_id
    FROM public.seasons s
    WHERE s.id = p_entity_id;

    IF v_org_id IS NULL THEN
      RETURN;
    END IF;

    -- Team galleries (teams in this season)
    RETURN QUERY
    SELECT
      'team'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.teams t
    INNER JOIN public.galleries g ON g.gallery_type = 'team' AND g.entity_id = t.id
    WHERE t.season_id = p_entity_id
      AND g.org_id = v_org_id;

    -- Organization gallery
    RETURN QUERY
    SELECT
      'org'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.galleries g
    WHERE g.gallery_type = 'org'
      AND g.org_id = v_org_id
      AND g.entity_id = v_org_id;

  -- -------------------------------------------------------------------------
  -- Organization: Return all season, team, program galleries
  -- -------------------------------------------------------------------------
  ELSIF p_entity_type = 'org' THEN
    -- Season galleries
    RETURN QUERY
    SELECT
      'season'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.galleries g
    WHERE g.gallery_type = 'season'
      AND g.org_id = p_entity_id;

    -- Team galleries
    RETURN QUERY
    SELECT
      'team'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.galleries g
    WHERE g.gallery_type = 'team'
      AND g.org_id = p_entity_id;

    -- Program galleries
    RETURN QUERY
    SELECT
      'program'::text AS relationship_type,
      g.id AS gallery_id,
      g.name AS gallery_name,
      COALESCE(
        (SELECT COUNT(*) FROM public.gallery_photos gp WHERE gp.gallery_id = g.id AND gp.status = 'approved'),
        0::bigint
      ) AS photo_count,
      NULL::text AS cover_url
    FROM public.galleries g
    WHERE g.gallery_type = 'program'
      AND g.org_id = p_entity_id;

  END IF;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_related_galleries IS
'Returns related galleries for a given entity. Supports all entity types: athlete, team, event, travel_plan (using travel type), season, org.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_related_galleries(text, uuid) TO authenticated;

-- ============================================================================
-- End of Migration
-- ============================================================================
