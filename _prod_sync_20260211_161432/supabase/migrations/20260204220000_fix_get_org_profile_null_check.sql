-- ============================================
-- FIX get_org_profile FUNCTION
-- ============================================
-- Problem: The function checks IF v_privacy_level IS NULL and raises
-- "Organization not found". But privacy_level can be NULL for existing
-- orgs that were created before the column was added, and NULL should
-- be treated as 'public', not as "not found".
--
-- Solution: Check if the org EXISTS first, then handle NULL privacy_level
-- as 'public'.
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
  v_privacy_level TEXT;
  v_org_exists BOOLEAN;
BEGIN
  -- First check if organization exists at all
  SELECT EXISTS(
    SELECT 1 FROM public.organizations WHERE id = p_org_id
  ) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  -- Get privacy level (NULL = public)
  SELECT COALESCE(privacy_level::text, 'public') INTO v_privacy_level
  FROM public.organizations
  WHERE id = p_org_id;
  
  -- Check if private and user doesn't have access
  IF v_privacy_level = 'private' THEN
    -- Check if user is approved (for now, just block)
    -- TODO: Add approval table check when implemented
    RETURN jsonb_build_object('error', 'access_denied', 'message', 'This organization is private');
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
  SELECT jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'description', o.description,
    'location_city', o.primary_city,
    'location_state', o.primary_state,
    'website', o.website,
    'privacy_level', COALESCE(o.privacy_level::text, 'public'),
    'is_following', v_is_following,
    'created_at', o.created_at
  ) INTO v_result
  FROM public.organizations o
  WHERE o.id = p_org_id;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_org_profile(UUID) IS 'Get organization profile with privacy checks and follow status. Treats NULL privacy_level as public.';
