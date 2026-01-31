-- ============================================================================
-- Migration: Fix Ambiguous Column Reference in get_organization_users
-- ============================================================================
-- This migration fixes the "column reference 'created_at' is ambiguous" error
-- in the get_organization_users RPC function.
--
-- The issue was that the subquery selecting from auth.users used 'created_at'
-- which conflicted with u.created_at in the outer query.
--
-- Fix: Use explicit table aliases in all subqueries.
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

  -- Return users for this organization
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.phone,
    u.display_name,
    ARRAY_AGG(DISTINCT om.role::TEXT) FILTER (WHERE om.org_id = target_org_id) AS roles,
    EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = u.id) AS is_platform_admin,
    -- Fix: Use explicit alias for auth.users columns to avoid ambiguity
    (SELECT au.last_sign_in_at FROM auth.users au WHERE au.id = u.id) AS last_sign_in_at,
    (SELECT au.email_confirmed_at IS NOT NULL FROM auth.users au WHERE au.id = u.id) AS email_confirmed,
    (SELECT au.banned_until IS NOT NULL AND au.banned_until > NOW() FROM auth.users au WHERE au.id = u.id) AS is_disabled,
    u.created_at,
    u.updated_at
  FROM users u
  INNER JOIN organization_members om ON om.user_id = u.id
  WHERE om.org_id = target_org_id
  GROUP BY u.id, u.email, u.phone, u.display_name, u.created_at, u.updated_at
  ORDER BY u.display_name, u.email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_users(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_organization_users IS 'Platform admin function: Returns all users for a specific organization with their roles. More efficient than filtering admin_users view. Requires platform admin role.';
