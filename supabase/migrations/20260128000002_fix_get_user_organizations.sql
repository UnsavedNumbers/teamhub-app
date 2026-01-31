-- Migration: Fix get_user_organizations function to use org_id
-- =============================================================
-- This migration fixes the get_user_organizations function to use the correct
-- column name (org_id) instead of the old column name (organization_id).
-- This must run after 20260126000000_normalize_schema_naming.sql

-- Update get_user_organizations to use org_id column
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

COMMENT ON FUNCTION get_user_organizations IS 'Returns all organizations for a user along with their roles per organization. Uses org_id column (renamed from organization_id).';
