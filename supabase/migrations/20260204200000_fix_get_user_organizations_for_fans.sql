-- ============================================
-- FIX FAN USER ACCESS TO ORGANIZATIONS
-- ============================================
-- Problem 1: Fan users have no entries in organization_members,
-- so get_user_organizations returns empty array.
-- This breaks navigation for fan portal users.
--
-- Problem 2: The organizations table has NO RLS policy allowing
-- regular authenticated users to view organizations. Only org_admin
-- and platform_admin policies exist. This causes fan RPC functions
-- to fail when querying public organizations.
--
-- Solution:
-- 1. Add RLS policy to allow authenticated users to SELECT public organizations
-- 2. Update get_user_organizations to UNION fan_org_follows
-- ============================================

-- ============================================
-- PART 1: RLS POLICY FOR PUBLIC ORGANIZATIONS
-- ============================================

-- Allow authenticated users to view organizations that are public or unlisted
-- This is required for fan features, search, and public profile pages
DROP POLICY IF EXISTS "Authenticated users can view public organizations" ON public.organizations;
CREATE POLICY "Authenticated users can view public organizations"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if organization is public or unlisted
    COALESCE(privacy_level, 'public'::entity_privacy_level) IN ('public'::entity_privacy_level, 'unlisted'::entity_privacy_level)
    OR
    -- Also allow if user is a member of the organization
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

COMMENT ON POLICY "Authenticated users can view public organizations" ON public.organizations 
  IS 'Allows authenticated users to view public/unlisted organizations and organizations they are members of. Required for fan features.';

-- ============================================
-- PART 2: UPDATE get_user_organizations FOR FANS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_organizations(check_user_id uuid)
RETURNS TABLE(org_id uuid, org_name text, roles public.org_member_role[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  -- Get organizations where user is a member (staff/coach/parent/admin)
  SELECT
    om.org_id,
    o.name AS org_name,
    ARRAY_AGG(DISTINCT om.role ORDER BY om.role) AS roles
  FROM organization_members om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = check_user_id
    AND om.is_active = true  -- Only active memberships
  GROUP BY om.org_id, o.name

  UNION

  -- Get organizations that user follows as a fan
  SELECT
    fof.org_id,
    o.name AS org_name,
    ARRAY[]::public.org_member_role[] AS roles  -- Empty array for fan follows
  FROM fan_org_follows fof
  JOIN organizations o ON o.id = fof.org_id
  WHERE fof.user_id = check_user_id
    -- Only include if NOT already in organization_members
    AND NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = check_user_id
        AND om.org_id = fof.org_id
        AND om.is_active = true
    )

  ORDER BY org_name;
$$;

COMMENT ON FUNCTION public.get_user_organizations(uuid) IS 'Returns all organizations for a user: org memberships (with roles) and fan follows (with empty roles array). Fan follows are excluded if user is also an org member.';
