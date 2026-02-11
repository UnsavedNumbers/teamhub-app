-- ============================================================================
-- Fix session_replication_role Permission Error in ensure_entity_gallery
-- ============================================================================
-- This migration fixes the permission error where ensure_entity_gallery fails
-- with "permission denied to set parameter session_replication_role"
--
-- The issue: SET LOCAL session_replication_role = 'replica' requires superuser
-- privileges, but the function runs with SECURITY DEFINER (not superuser).
--
-- Solution: Remove the session_replication_role setting since the function
-- already runs with SECURITY DEFINER and the RLS policy allows system-generated
-- galleries (is_system_generated = true), so RLS is not blocking the insert.
-- ============================================================================

-- Drop and recreate the function without session_replication_role
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

  -- Create the gallery (SECURITY DEFINER + RLS policy allows system-generated galleries)
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

-- Re-grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_entity_gallery(
  public.gallery_type,
  uuid,
  uuid,
  uuid,
  text
) TO authenticated;

COMMENT ON FUNCTION public.ensure_entity_gallery IS
'Creates or retrieves the system-generated gallery for an entity. Supports all entity types: org, season, team, event, travel_plan, athlete. Runs with elevated privileges (SECURITY DEFINER) to bypass RLS for gallery creation.';

-- ============================================================================
-- End of Migration
-- ============================================================================
