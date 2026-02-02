-- ============================================================================
-- Auto Gallery Creation and Gallery Inheritance
-- ============================================================================
-- This migration implements:
-- 1. is_system_generated column for galleries
-- 2. Auto-creation triggers for athletes, teams, events, travel_plans, programs
-- 3. Delete triggers to clean up galleries when entities are deleted
-- 4. get_related_galleries RPC for gallery inheritance
-- 5. Backfill script for existing entities
--
-- Auto-gallery entity types: athlete, team, event, travel, program
-- Multi-gallery entity types: org, season (user-created galleries only)
-- ============================================================================

-- ============================================================================
-- 1. Add is_system_generated column to galleries
-- ============================================================================

ALTER TABLE public.galleries
ADD COLUMN IF NOT EXISTS is_system_generated boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.galleries.is_system_generated IS
'Indicates if gallery was automatically created by the system (for athlete/team/event/travel/program entities). System galleries cannot be manually deleted.';

-- ============================================================================
-- 2. Auto-creation triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Athlete Gallery Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_athlete_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery_name text;
  v_org_id uuid;
BEGIN
  -- Skip if org_id is null (athlete not yet associated with an org)
  IF NEW.org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if gallery already exists (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.galleries
    WHERE org_id = NEW.org_id
      AND gallery_type = 'athlete'
      AND entity_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Build gallery name: "Athlete's Photos" or "First Last's Photos"
  v_gallery_name := COALESCE(NULLIF(TRIM(NEW.first_name || ' ' || NEW.last_name), ''), 'Athlete') || '''s Photos';

  -- Create the system gallery
  INSERT INTO public.galleries (
    org_id,
    gallery_type,
    entity_id,
    name,
    allow_contributions,
    require_approval,
    visibility,
    is_system_generated
  ) VALUES (
    NEW.org_id,
    'athlete',
    NEW.id,
    v_gallery_name,
    true,
    true,
    'team',
    true
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Gallery was created concurrently, that's fine
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_athlete_gallery
AFTER INSERT ON public.athletes
FOR EACH ROW
EXECUTE FUNCTION public.create_athlete_gallery();

-- ----------------------------------------------------------------------------
-- Team Gallery Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_team_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if gallery already exists (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.galleries
    WHERE org_id = NEW.org_id
      AND gallery_type = 'team'
      AND entity_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Create the system gallery with name "Team Name Photos"
  INSERT INTO public.galleries (
    org_id,
    gallery_type,
    entity_id,
    name,
    allow_contributions,
    require_approval,
    visibility,
    is_system_generated
  ) VALUES (
    NEW.org_id,
    'team',
    NEW.id,
    TRIM(NEW.name) || ' Photos',
    true,
    true,
    'team',
    true
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Gallery was created concurrently, that's fine
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_team_gallery
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.create_team_gallery();

-- ----------------------------------------------------------------------------
-- Event Gallery Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_event_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Get org_id from the team
  SELECT t.org_id INTO v_org_id
  FROM public.teams t
  WHERE t.id = NEW.team_id;

  -- Skip if team not found or no org_id
  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if gallery already exists (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.galleries
    WHERE org_id = v_org_id
      AND gallery_type = 'event'
      AND entity_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Create the system gallery with name "Event Title Photos"
  INSERT INTO public.galleries (
    org_id,
    gallery_type,
    entity_id,
    name,
    allow_contributions,
    require_approval,
    visibility,
    is_system_generated
  ) VALUES (
    v_org_id,
    'event',
    NEW.id,
    TRIM(NEW.title) || ' Photos',
    true,
    true,
    'team',
    true
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Gallery was created concurrently, that's fine
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_event_gallery
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.create_event_gallery();

-- ----------------------------------------------------------------------------
-- Travel Plan Gallery Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_travel_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Get org_id from the team
  SELECT t.org_id INTO v_org_id
  FROM public.teams t
  WHERE t.id = NEW.team_id;

  -- Skip if team not found or no org_id
  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if gallery already exists (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.galleries
    WHERE org_id = v_org_id
      AND gallery_type = 'travel'
      AND entity_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Create the system gallery with name "Travel Title Photos"
  INSERT INTO public.galleries (
    org_id,
    gallery_type,
    entity_id,
    name,
    allow_contributions,
    require_approval,
    visibility,
    is_system_generated
  ) VALUES (
    v_org_id,
    'travel',
    NEW.id,
    TRIM(NEW.title) || ' Photos',
    true,
    true,
    'team',
    true
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Gallery was created concurrently, that's fine
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_travel_gallery
AFTER INSERT ON public.travel_plans
FOR EACH ROW
EXECUTE FUNCTION public.create_travel_gallery();

-- ----------------------------------------------------------------------------
-- Program Gallery Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_program_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if gallery already exists (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.galleries
    WHERE org_id = NEW.org_id
      AND gallery_type = 'program'
      AND entity_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Create the system gallery with name "Program Name Photos"
  INSERT INTO public.galleries (
    org_id,
    gallery_type,
    entity_id,
    name,
    allow_contributions,
    require_approval,
    visibility,
    is_system_generated
  ) VALUES (
    NEW.org_id,
    'program',
    NEW.id,
    TRIM(NEW.name) || ' Photos',
    true,
    true,
    'team',
    true
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Gallery was created concurrently, that's fine
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_program_gallery
AFTER INSERT ON public.programs
FOR EACH ROW
EXECUTE FUNCTION public.create_program_gallery();

-- ============================================================================
-- 3. Delete triggers to clean up system galleries when entities are deleted
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Athlete Delete Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_athlete_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the system gallery associated with this athlete
  DELETE FROM public.galleries
  WHERE gallery_type = 'athlete'
    AND entity_id = OLD.id
    AND is_system_generated = true;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_delete_athlete_gallery
AFTER DELETE ON public.athletes
FOR EACH ROW
EXECUTE FUNCTION public.delete_athlete_gallery();

-- ----------------------------------------------------------------------------
-- Team Delete Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_team_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the system gallery associated with this team
  DELETE FROM public.galleries
  WHERE gallery_type = 'team'
    AND entity_id = OLD.id
    AND is_system_generated = true;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_delete_team_gallery
AFTER DELETE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.delete_team_gallery();

-- ----------------------------------------------------------------------------
-- Event Delete Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_event_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the system gallery associated with this event
  DELETE FROM public.galleries
  WHERE gallery_type = 'event'
    AND entity_id = OLD.id
    AND is_system_generated = true;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_delete_event_gallery
AFTER DELETE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.delete_event_gallery();

-- ----------------------------------------------------------------------------
-- Travel Plan Delete Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_travel_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the system gallery associated with this travel plan
  DELETE FROM public.galleries
  WHERE gallery_type = 'travel'
    AND entity_id = OLD.id
    AND is_system_generated = true;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_delete_travel_gallery
AFTER DELETE ON public.travel_plans
FOR EACH ROW
EXECUTE FUNCTION public.delete_travel_gallery();

-- ----------------------------------------------------------------------------
-- Program Delete Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_program_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the system gallery associated with this program
  DELETE FROM public.galleries
  WHERE gallery_type = 'program'
    AND entity_id = OLD.id
    AND is_system_generated = true;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_delete_program_gallery
AFTER DELETE ON public.programs
FOR EACH ROW
EXECUTE FUNCTION public.delete_program_gallery();

-- ============================================================================
-- 4. Prevent deletion of system galleries (application-level enforcement also)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_system_gallery_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block deletion of system galleries
  IF OLD.is_system_generated = true THEN
    RAISE EXCEPTION 'Cannot delete system-generated gallery. Galleries are automatically managed for athletes, teams, events, travel plans, and programs.'
    USING ERRCODE = 'restrict_violation',
          HINT = 'System galleries are automatically created and managed. Delete the associated entity to remove the gallery.';
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_system_gallery_delete
BEFORE DELETE ON public.galleries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_system_gallery_delete();

-- ============================================================================
-- 5. Gallery Inheritance - get_related_galleries RPC
-- ============================================================================

-- Return type for related galleries
DROP TYPE IF EXISTS public.related_gallery_item CASCADE;

CREATE TYPE public.related_gallery_item AS (
  relationship_type text,
  gallery_id uuid,
  gallery_name text,
  photo_count bigint,
  cover_url text
);

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
    INNER JOIN public.seasons s ON s.id = tm.season_id
    INNER JOIN public.galleries g ON g.gallery_type = 'season' AND g.entity_id = s.id
    WHERE tm.athlete_id = p_entity_id
      AND tm.deleted_at IS NULL
      AND tm.status = 'active'
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
    INNER JOIN public.programs p ON p.id = t.program_id
    INNER JOIN public.galleries g ON g.gallery_type = 'program' AND g.entity_id = p.id
    WHERE tm.athlete_id = p_entity_id
      AND tm.deleted_at IS NULL
      AND tm.status = 'active'
      AND g.org_id = v_org_id;

  -- -------------------------------------------------------------------------
  -- Team: Return event, travel, season, program, athlete galleries
  -- -------------------------------------------------------------------------
  ELSIF p_entity_type = 'team' THEN
    -- Get team details
    SELECT t.id, t.org_id, t.program_id INTO v_team_id, v_org_id, v_program_id
    FROM public.teams t
    WHERE t.id = p_entity_id;

    IF v_org_id IS NULL THEN
      RETURN;
    END IF;

    -- Event galleries (team's events)
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

    -- Travel plan galleries (team's travel plans)
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

    -- Season galleries (team's seasons)
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
    FROM public.seasons s
    INNER JOIN public.galleries g ON g.gallery_type = 'season' AND g.entity_id = s.id
    WHERE s.team_id = p_entity_id
      AND g.org_id = v_org_id;

    -- Program gallery (team's program)
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

    -- Travel plan gallery (if event linked to a travel plan with matching dates/location)
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
  ELSIF p_entity_type = 'travel_plan' THEN
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
    FROM public.events e
    INNER JOIN public.galleries g ON g.gallery_type = 'event' AND g.entity_id = e.id
    WHERE e.team_id = v_team_id
      AND e.start_time::date >= (SELECT tp.start_date FROM public.travel_plans tp WHERE tp.id = p_entity_id)
      AND e.start_time::date <= (SELECT tp.end_date FROM public.travel_plans tp WHERE tp.id = p_entity_id)
      AND g.org_id = v_org_id;

    -- Team gallery (assigned team)
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
  -- Program: Return team, season galleries
  -- -------------------------------------------------------------------------
  ELSIF p_entity_type = 'program' THEN
    -- Get program details
    SELECT p.org_id INTO v_org_id
    FROM public.programs p
    WHERE p.id = p_entity_id;

    IF v_org_id IS NULL THEN
      RETURN;
    END IF;

    -- Team galleries (teams in program)
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
    WHERE t.program_id = p_entity_id
      AND g.org_id = v_org_id;

    -- Season galleries (program's seasons)
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
    FROM public.seasons s
    INNER JOIN public.galleries g ON g.gallery_type = 'season' AND g.entity_id = s.id
    WHERE s.program_id = p_entity_id
      AND g.org_id = v_org_id;

  -- -------------------------------------------------------------------------
  -- Season: Return team, event galleries
  -- -------------------------------------------------------------------------
  ELSIF p_entity_type = 'season' THEN
    -- Get season details
    SELECT s.org_id, s.team_id INTO v_org_id, v_team_id
    FROM public.seasons s
    WHERE s.id = p_entity_id;

    IF v_org_id IS NULL THEN
      RETURN;
    END IF;

    -- Team gallery (season's team)
    IF v_team_id IS NOT NULL THEN
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
    END IF;

    -- Event galleries (season's events)
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
    WHERE e.season_id = p_entity_id
      AND g.org_id = v_org_id;

  -- -------------------------------------------------------------------------
  -- Organization: Return all team, program, season galleries
  -- -------------------------------------------------------------------------
  ELSIF p_entity_type = 'organization' OR p_entity_type = 'org' THEN
    -- Get org_id
    v_org_id := p_entity_id;

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
      AND g.org_id = v_org_id;

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
      AND g.org_id = v_org_id;

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
      AND g.org_id = v_org_id;

  END IF;

  RETURN;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_related_galleries IS
'Returns related galleries for a given entity type and ID. Results are grouped by relationship type (team, event, travel, season, program, athlete, org). Only returns galleries the current user can view (via RLS).';

-- ============================================================================
-- 6. Backfill existing entities with system galleries
-- ============================================================================

-- Backfill athletes
INSERT INTO public.galleries (
  org_id,
  gallery_type,
  entity_id,
  name,
  allow_contributions,
  require_approval,
  visibility,
  is_system_generated
)
SELECT
  a.org_id,
  'athlete',
  a.id,
  COALESCE(NULLIF(TRIM(a.first_name || ' ' || a.last_name), ''), 'Athlete') || '''s Photos',
  true,
  true,
  'team',
  true
FROM public.athletes a
WHERE a.org_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.galleries g
    WHERE g.gallery_type = 'athlete'
      AND g.entity_id = a.id
  )
ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING;

-- Backfill teams
INSERT INTO public.galleries (
  org_id,
  gallery_type,
  entity_id,
  name,
  allow_contributions,
  require_approval,
  visibility,
  is_system_generated
)
SELECT
  t.org_id,
  'team',
  t.id,
  TRIM(t.name) || ' Photos',
  true,
  true,
  'team',
  true
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.galleries g
  WHERE g.gallery_type = 'team'
    AND g.entity_id = t.id
)
ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING;

-- Backfill events
INSERT INTO public.galleries (
  org_id,
  gallery_type,
  entity_id,
  name,
  allow_contributions,
  require_approval,
  visibility,
  is_system_generated
)
SELECT
  t.org_id,
  'event',
  e.id,
  TRIM(e.title) || ' Photos',
  true,
  true,
  'team',
  true
FROM public.events e
INNER JOIN public.teams t ON t.id = e.team_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.galleries g
  WHERE g.gallery_type = 'event'
    AND g.entity_id = e.id
)
ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING;

-- Backfill travel plans
INSERT INTO public.galleries (
  org_id,
  gallery_type,
  entity_id,
  name,
  allow_contributions,
  require_approval,
  visibility,
  is_system_generated
)
SELECT
  t.org_id,
  'travel',
  tp.id,
  TRIM(tp.title) || ' Photos',
  true,
  true,
  'team',
  true
FROM public.travel_plans tp
INNER JOIN public.teams t ON t.id = tp.team_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.galleries g
  WHERE g.gallery_type = 'travel'
    AND g.entity_id = tp.id
)
ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING;

-- Backfill programs
INSERT INTO public.galleries (
  org_id,
  gallery_type,
  entity_id,
  name,
  allow_contributions,
  require_approval,
  visibility,
  is_system_generated
)
SELECT
  p.org_id,
  'program',
  p.id,
  TRIM(p.name) || ' Photos',
  true,
  true,
  'team',
  true
FROM public.programs p
WHERE NOT EXISTS (
  SELECT 1 FROM public.galleries g
  WHERE g.gallery_type = 'program'
    AND g.entity_id = p.id
)
ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING;

-- ============================================================================
-- 7. Grant necessary permissions
-- ============================================================================

-- Grant execute on new functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_related_galleries(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_system_gallery_delete() TO authenticated;

-- ============================================================================
-- End of Migration
-- ============================================================================
