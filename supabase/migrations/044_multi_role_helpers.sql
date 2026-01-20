-- Phase 0X: Multi-role helper functions
-- =====================================
-- Updates RPC functions to work with the new multi-role model and adds helper
-- functions that will be shared by RLS policies and the frontend.

-- Return all roles for a user inside a specific organization (array form).
CREATE OR REPLACE FUNCTION get_user_roles_for_org(
  check_user_id UUID,
  check_org_id UUID
)
RETURNS org_member_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(role ORDER BY role)
  FROM organization_members
  WHERE user_id = check_user_id
    AND org_id = check_org_id;
$$;

-- Return all organizations for a user along with the roles they hold per org.
DROP FUNCTION IF EXISTS get_user_organizations(UUID);
CREATE OR REPLACE FUNCTION get_user_organizations(check_user_id UUID)
RETURNS TABLE(
  org_id UUID,
  org_name TEXT,
  roles org_member_role[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    om.org_id,
    o.name AS org_name,
    ARRAY_AGG(DISTINCT om.role ORDER BY om.role) AS roles
  FROM organization_members om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = check_user_id
  GROUP BY om.org_id, o.name
  ORDER BY o.name;
$$;

-- Check if a user has any of the requested roles in an organization.
CREATE OR REPLACE FUNCTION user_has_any_org_roles(
  check_user_id UUID,
  check_org_id UUID,
  check_roles org_member_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    is_platform_admin(check_user_id) OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = check_user_id
        AND org_id = check_org_id
        AND role = ANY(check_roles)
    );
$$;

-- Check if a user has all of the requested roles in an organization.
CREATE OR REPLACE FUNCTION user_has_all_org_roles(
  check_user_id UUID,
  check_org_id UUID,
  check_roles org_member_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    is_platform_admin(check_user_id) OR
    NOT EXISTS (
      SELECT 1 FROM UNNEST(check_roles) AS missing(role)
      WHERE NOT EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = check_user_id
          AND org_id = check_org_id
          AND role = missing.role
      )
    );
$$;
