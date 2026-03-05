-- Fix get_user_organizations RPC to handle demo_sessions with NULL organization_id
-- When ds.organization_id is NULL, join through demo_organizations to get the org_id
-- This allows demo sessions to work even when the demo org hasn't been explicitly linked
-- to a real organization row yet.

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

  UNION

  -- Get demo organization from active demo session (for shared demo accounts)
  -- Use COALESCE to prefer ds.organization_id, fallback to dmo.organization_id
  -- If both are NULL, use demo_org_id (dmo.id) as fallback - this allows demo sessions
  -- to work even when the demo org hasn't been linked to a real organization yet
  SELECT
    COALESCE(ds.organization_id, dmo.organization_id, dmo.id) AS org_id,
    COALESCE(o.name, dmo.name) AS org_name,
    CASE
      WHEN dar.role = 'org_admin' THEN ARRAY['org_admin']::public.org_member_role[]
      WHEN dar.role = 'coach' THEN ARRAY['coach']::public.org_member_role[]
      WHEN dar.role = 'parent' THEN ARRAY['parent']::public.org_member_role[]
      WHEN dar.role = 'staff' THEN ARRAY['staff']::public.org_member_role[]
      -- Note: 'athlete' and 'fan' are not valid org_member_role enum values
      -- Athletes don't have org_member_role entries (they're in athletes table)
      -- Fan is a platform capability, not an org role
      -- For demo purposes, return empty array (UI will handle these specially)
      WHEN dar.role IN ('athlete', 'fan') THEN ARRAY[]::public.org_member_role[]
      ELSE ARRAY[]::public.org_member_role[]
    END AS roles
  FROM demo_sessions ds
  JOIN demo_account_roles dar ON dar.user_id = ds.user_id
  JOIN demo_organizations dmo ON dmo.id = ds.demo_org_id
  LEFT JOIN organizations o ON o.id = COALESCE(ds.organization_id, dmo.organization_id)
  WHERE ds.user_id = check_user_id
    AND ds.expires_at > now()
    -- Only include if NOT already in organization_members or fan_org_follows
    -- Check against the actual org_id (or demo_org_id if org_id is NULL)
    AND NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = check_user_id
        AND om.org_id = COALESCE(ds.organization_id, dmo.organization_id, dmo.id)
        AND om.is_active = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM fan_org_follows fof
      WHERE fof.user_id = check_user_id
        AND fof.org_id = COALESCE(ds.organization_id, dmo.organization_id, dmo.id)
    )

  ORDER BY org_name;
$$;

COMMENT ON FUNCTION public.get_user_organizations(uuid) IS 'Returns all organizations for a user: org memberships (with roles), fan follows (with empty roles array), and demo organizations from active demo sessions (for shared demo accounts). Handles NULL organization_id in demo_sessions by falling back to demo_organizations.organization_id, and further falls back to demo_org_id if organization_id is also NULL.';
