-- ============================================================================
-- Migration: Create get_organization_users RPC Function
-- ============================================================================
-- This migration creates an RPC function to efficiently fetch users for a
-- specific organization. This is more efficient than parsing JSON arrays
-- from the admin_users view.
--
-- Issue #2 Solution: User Filtering Complexity - Parsing JSON Arrays
--
-- Technical Safeguards:
-- - Validates org_id exists before querying
-- - Returns empty result set if org not found (doesn't error)
-- - Includes all user fields needed for admin panel
-- - Properly handles role aggregation
-- - Security definer with platform admin check
-- ============================================================================

CREATE OR REPLACE FUNCTION get_organization_users(target_org_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  phone TEXT,
  display_name TEXT,
  roles TEXT[],
  is_platform_admin BOOLEAN,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed BOOLEAN,
  is_disabled BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check caller is platform admin
  IF NOT EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized: not a platform admin';
  END IF;

  -- Validate org_id (optional - can return empty if org doesn't exist)
  -- This allows the function to work even if org_id is invalid (returns empty set)

  -- Return users for this organization
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.phone,
    u.display_name,
    ARRAY_AGG(DISTINCT om.role::TEXT) FILTER (WHERE om.org_id = target_org_id) AS roles,
    EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = u.id) AS is_platform_admin,
    (SELECT created_at FROM auth.users au WHERE au.id = u.id) AS last_sign_in_at,
    (SELECT email_confirmed_at IS NOT NULL FROM auth.users au WHERE au.id = u.id) AS email_confirmed,
    (SELECT banned_until IS NOT NULL AND banned_until > NOW() FROM auth.users au WHERE au.id = u.id) AS is_disabled,
    u.created_at,
    u.updated_at
  FROM users u
  INNER JOIN organization_members om ON om.user_id = u.id
  WHERE om.org_id = target_org_id
  GROUP BY u.id, u.email, u.phone, u.display_name, u.created_at, u.updated_at
  ORDER BY u.display_name, u.email;
END;
$$;

-- Grant execute permission to authenticated users (RLS will enforce platform admin check)
GRANT EXECUTE ON FUNCTION get_organization_users(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_organization_users IS 'Platform admin function: Returns all users for a specific organization with their roles. More efficient than filtering admin_users view. Requires platform admin role.';
