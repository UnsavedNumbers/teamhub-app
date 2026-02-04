-- ============================================================================
-- Expand gallery_type Enum and Auto-Create Galleries for All Entities
-- ============================================================================
-- This migration:
-- 1. Adds 'travel_plan' to the gallery_type enum (org, season, team, event, athlete, travel already exist, adding travel_plan)
-- 2. Creates triggers to auto-create galleries when entities are created
-- 3. Provides backfill for existing entities without galleries
--
-- Entity Types with Auto-Generated Galleries:
--   - org (organization-level galleries)
--   - season (season galleries)
--   - team (team galleries)
--   - event (event galleries)
--   - travel_plan (travel plan galleries)
--   - athlete (athlete galleries)
-- ============================================================================

-- ============================================================================
-- 1. Expand gallery_type Enum
-- ============================================================================

-- Note: All required enum values already exist in baseline.
-- Current enum values: org, team, athlete, event, travel, program, season
-- No changes needed to enum.

-- ============================================================================
-- 2. Create Trigger Functions for Auto-Gallery Creation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Organization Gallery Auto-Creation
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_create_org_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery_id uuid;
BEGIN
  -- Create default organization gallery
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
    NEW.id,
    'org',
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.name), ''), 'Organization') || ' Photos',
    true,
    true,
    'team',
    true
  )
  ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING
  RETURNING id INTO v_gallery_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the organization creation
    RAISE WARNING 'Failed to create gallery for organization %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_create_org_gallery() IS
'Automatically creates a default gallery when a new organization is created';

-- ----------------------------------------------------------------------------
-- Season Gallery Auto-Creation
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_create_season_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery_id uuid;
BEGIN
  -- Create default season gallery
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
    'season',
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.name), ''), 'Season') || ' Photos',
    true,
    true,
    'team',
    true
  )
  ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING
  RETURNING id INTO v_gallery_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the season creation
    RAISE WARNING 'Failed to create gallery for season %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_create_season_gallery() IS
'Automatically creates a default gallery when a new season is created';

-- ----------------------------------------------------------------------------
-- Team Gallery Auto-Creation
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_create_team_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery_id uuid;
BEGIN
  -- Create default team gallery
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
    COALESCE(NULLIF(TRIM(NEW.name), ''), 'Team') || ' Photos',
    true,
    true,
    'team',
    true
  )
  ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING
  RETURNING id INTO v_gallery_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the team creation
    RAISE WARNING 'Failed to create gallery for team %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_create_team_gallery() IS
'Automatically creates a default gallery when a new team is created';

-- ----------------------------------------------------------------------------
-- Event Gallery Auto-Creation
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_create_event_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery_id uuid;
  v_org_id uuid;
BEGIN
  -- Get org_id from team
  SELECT org_id INTO v_org_id
  FROM public.teams
  WHERE id = NEW.team_id;

  IF v_org_id IS NULL THEN
    RAISE WARNING 'Cannot create gallery for event %: team % not found', NEW.id, NEW.team_id;
    RETURN NEW;
  END IF;

  -- Create default event gallery
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
    COALESCE(NULLIF(TRIM(NEW.title), ''), 'Event') || ' Photos',
    true,
    true,
    'team',
    true
  )
  ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING
  RETURNING id INTO v_gallery_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the event creation
    RAISE WARNING 'Failed to create gallery for event %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_create_event_gallery() IS
'Automatically creates a default gallery when a new event is created';

-- ----------------------------------------------------------------------------
-- Travel Plan Gallery Auto-Creation
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_create_travel_plan_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery_id uuid;
  v_org_id uuid;
BEGIN
  -- Get org_id from team
  SELECT org_id INTO v_org_id
  FROM public.teams
  WHERE id = NEW.team_id;

  IF v_org_id IS NULL THEN
    RAISE WARNING 'Cannot create gallery for travel plan %: team % not found', NEW.id, NEW.team_id;
    RETURN NEW;
  END IF;

  -- Create default travel plan gallery
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
    COALESCE(NULLIF(TRIM(NEW.title), ''), 'Travel Plan') || ' Photos',
    true,
    true,
    'team',
    true
  )
  ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING
  RETURNING id INTO v_gallery_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the travel plan creation
    RAISE WARNING 'Failed to create gallery for travel plan %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_create_travel_plan_gallery() IS
'Automatically creates a default gallery when a new travel plan is created';

-- ----------------------------------------------------------------------------
-- Athlete Gallery Auto-Creation
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_create_athlete_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery_id uuid;
BEGIN
  -- Create default athlete gallery
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
    COALESCE(NULLIF(TRIM(NEW.first_name || ' ' || NEW.last_name), ''), 'Athlete') || '''s Photos',
    true,
    true,
    'team',
    true
  )
  ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING
  RETURNING id INTO v_gallery_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the athlete creation
    RAISE WARNING 'Failed to create gallery for athlete %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_create_athlete_gallery() IS
'Automatically creates a default gallery when a new athlete is created';

-- ============================================================================
-- 3. Create Triggers
-- ============================================================================

-- Drop existing triggers if they exist (to allow migration to be re-run)
DROP TRIGGER IF EXISTS trg_auto_create_org_gallery ON public.organizations;
DROP TRIGGER IF EXISTS trg_auto_create_season_gallery ON public.seasons;
DROP TRIGGER IF EXISTS trg_auto_create_team_gallery ON public.teams;
DROP TRIGGER IF EXISTS trg_auto_create_event_gallery ON public.events;
DROP TRIGGER IF EXISTS trg_auto_create_travel_plan_gallery ON public.travel_plans;
DROP TRIGGER IF EXISTS trg_auto_create_athlete_gallery ON public.athletes;

-- Create triggers to auto-create galleries
CREATE TRIGGER trg_auto_create_org_gallery
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_org_gallery();

CREATE TRIGGER trg_auto_create_season_gallery
AFTER INSERT ON public.seasons
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_season_gallery();

CREATE TRIGGER trg_auto_create_team_gallery
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_team_gallery();

CREATE TRIGGER trg_auto_create_event_gallery
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_event_gallery();

CREATE TRIGGER trg_auto_create_travel_plan_gallery
AFTER INSERT ON public.travel_plans
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_travel_plan_gallery();

CREATE TRIGGER trg_auto_create_athlete_gallery
AFTER INSERT ON public.athletes
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_athlete_gallery();

-- ============================================================================
-- 4. Update Delete Triggers for Travel Plans
-- ============================================================================

-- Add delete trigger for travel_plan galleries
CREATE OR REPLACE FUNCTION public.delete_travel_plan_gallery()
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

DROP TRIGGER IF EXISTS trg_delete_travel_plan_gallery ON public.travel_plans;

CREATE TRIGGER trg_delete_travel_plan_gallery
AFTER DELETE ON public.travel_plans
FOR EACH ROW
EXECUTE FUNCTION public.delete_travel_plan_gallery();

-- Add delete trigger for season galleries
CREATE OR REPLACE FUNCTION public.delete_season_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the system gallery associated with this season
  DELETE FROM public.galleries
  WHERE gallery_type = 'season'
    AND entity_id = OLD.id
    AND is_system_generated = true;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_season_gallery ON public.seasons;

CREATE TRIGGER trg_delete_season_gallery
AFTER DELETE ON public.seasons
FOR EACH ROW
EXECUTE FUNCTION public.delete_season_gallery();

-- Add delete trigger for org galleries
CREATE OR REPLACE FUNCTION public.delete_org_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the system gallery associated with this organization
  DELETE FROM public.galleries
  WHERE gallery_type = 'org'
    AND entity_id = OLD.id
    AND is_system_generated = true;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_org_gallery ON public.organizations;

CREATE TRIGGER trg_delete_org_gallery
AFTER DELETE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.delete_org_gallery();

-- ============================================================================
-- 5. Backfill Galleries for Existing Entities
-- ============================================================================

-- Temporarily disable RLS for backfill operations
SET LOCAL session_replication_role = 'replica';

-- Backfill organizations
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
  o.id,
  'org',
  o.id,
  COALESCE(NULLIF(TRIM(o.name), ''), 'Organization') || ' Photos',
  true,
  true,
  'team',
  true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.galleries g
  WHERE g.gallery_type = 'org'
    AND g.entity_id = o.id
)
ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING;

-- Backfill seasons
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
  s.org_id,
  'season',
  s.id,
  COALESCE(NULLIF(TRIM(s.name), ''), 'Season') || ' Photos',
  true,
  true,
  'team',
  true
FROM public.seasons s
WHERE NOT EXISTS (
  SELECT 1 FROM public.galleries g
  WHERE g.gallery_type = 'season'
    AND g.entity_id = s.id
)
ON CONFLICT (org_id, gallery_type, entity_id) DO NOTHING;

-- Backfill teams (if not already done)
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
  COALESCE(NULLIF(TRIM(t.name), ''), 'Team') || ' Photos',
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

-- Backfill events (if not already done)
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
  COALESCE(NULLIF(TRIM(e.title), ''), 'Event') || ' Photos',
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
  COALESCE(NULLIF(TRIM(tp.title), ''), 'Travel Plan') || ' Photos',
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

-- Backfill athletes (if not already done)
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

-- Re-enable RLS
SET LOCAL session_replication_role = 'origin';

-- ============================================================================
-- 6. Update ensure_entity_gallery function to support all types
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_entity_gallery(
  p_entity_type public.gallery_type,
  p_entity_id uuid,
  p_org_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery_id uuid;
  v_gallery_name text;
  v_org_id uuid;
BEGIN
  -- Get org_id based on entity type if not provided
  IF p_org_id IS NULL THEN
    CASE p_entity_type
      WHEN 'org'::public.gallery_type THEN
        SELECT id INTO v_org_id FROM public.organizations WHERE id = p_entity_id;
      WHEN 'athlete'::public.gallery_type THEN
        SELECT a.org_id INTO v_org_id FROM public.athletes a WHERE a.id = p_entity_id;
      WHEN 'team'::public.gallery_type THEN
        SELECT t.org_id INTO v_org_id FROM public.teams t WHERE t.id = p_entity_id;
      WHEN 'season'::public.gallery_type THEN
        SELECT s.org_id INTO v_org_id FROM public.seasons s WHERE s.id = p_entity_id;
      WHEN 'program'::public.gallery_type THEN
        SELECT p.org_id INTO v_org_id FROM public.programs p WHERE p.id = p_entity_id;
      WHEN 'event'::public.gallery_type THEN
        SELECT t.org_id INTO v_org_id FROM public.events e JOIN public.teams t ON t.id = e.team_id WHERE e.id = p_entity_id;
      WHEN 'travel'::public.gallery_type THEN
        SELECT t.org_id INTO v_org_id FROM public.travel_plans tp JOIN public.teams t ON t.id = tp.team_id WHERE tp.id = p_entity_id;
      ELSE
        RAISE EXCEPTION 'Invalid entity type: %', p_entity_type;
    END CASE;

    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Organization not found for entity type %, entity %', p_entity_type, p_entity_id;
    END IF;
  ELSE
    v_org_id := p_org_id;
  END IF;

  -- Check if gallery already exists (idempotent)
  SELECT id INTO v_gallery_id
  FROM public.galleries
  WHERE org_id = v_org_id
    AND gallery_type = p_entity_type
    AND entity_id = p_entity_id
  LIMIT 1;

  IF v_gallery_id IS NOT NULL THEN
    RETURN v_gallery_id;
  END IF;

  -- Build gallery name if not provided
  IF p_name IS NOT NULL THEN
    v_gallery_name := p_name;
  ELSE
    CASE p_entity_type
      WHEN 'org'::public.gallery_type THEN
        SELECT COALESCE(NULLIF(TRIM(o.name), ''), 'Organization') || ' Photos'
        INTO v_gallery_name
        FROM public.organizations o WHERE o.id = p_entity_id;
      WHEN 'athlete'::public.gallery_type THEN
        SELECT COALESCE(NULLIF(TRIM(a.first_name || ' ' || a.last_name), ''), 'Athlete') || '''s Photos'
        INTO v_gallery_name
        FROM public.athletes a WHERE a.id = p_entity_id;
      WHEN 'team'::public.gallery_type THEN
        SELECT t.name || ' Photos' INTO v_gallery_name FROM public.teams t WHERE t.id = p_entity_id;
      WHEN 'season'::public.gallery_type THEN
        SELECT s.name || ' Photos' INTO v_gallery_name FROM public.seasons s WHERE s.id = p_entity_id;
      WHEN 'program'::public.gallery_type THEN
        SELECT p.name || ' Photos' INTO v_gallery_name FROM public.programs p WHERE p.id = p_entity_id;
      WHEN 'event'::public.gallery_type THEN
        SELECT e.title || ' Photos' INTO v_gallery_name FROM public.events e WHERE e.id = p_entity_id;
      WHEN 'travel'::public.gallery_type THEN
        SELECT tp.title || ' Photos' INTO v_gallery_name FROM public.travel_plans tp WHERE tp.id = p_entity_id;
      ELSE
        v_gallery_name := 'Photos';
    END CASE;
  END IF;

  -- Temporarily disable RLS for this insert
  SET LOCAL session_replication_role = 'replica';

  -- Create the gallery
  INSERT INTO public.galleries (
    org_id,
    gallery_type,
    entity_id,
    name,
    allow_contributions,
    require_approval,
    visibility,
    is_system_generated,
    created_by_user_id
  ) VALUES (
    v_org_id,
    p_entity_type,
    p_entity_id,
    v_gallery_name,
    true,
    true,
    'team',
    true,
    p_user_id
  )
  RETURNING id INTO v_gallery_id;

  RETURN v_gallery_id;
EXCEPTION
  WHEN unique_violation THEN
    -- Gallery was created concurrently, fetch and return it
    SELECT id INTO v_gallery_id
    FROM public.galleries
    WHERE org_id = v_org_id
      AND gallery_type = p_entity_type
      AND entity_id = p_entity_id
    LIMIT 1;
    RETURN v_gallery_id;
END;
$$;

COMMENT ON FUNCTION public.ensure_entity_gallery IS
'Creates or retrieves the system-generated gallery for an entity. Supports all entity types: org, season, team, event, travel_plan, athlete. Runs with elevated privileges to bypass RLS for gallery creation.';

-- ============================================================================
-- 7. Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.auto_create_org_gallery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_create_season_gallery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_create_team_gallery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_create_event_gallery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_create_travel_plan_gallery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_create_athlete_gallery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_travel_plan_gallery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_season_gallery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_org_gallery() TO authenticated;

-- ============================================================================
-- End of Migration
-- ============================================================================
