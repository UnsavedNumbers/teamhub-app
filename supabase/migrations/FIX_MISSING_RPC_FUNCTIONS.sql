-- ============================================
-- FIX: Missing RPC Functions
-- ============================================
-- This migration creates the missing RPC functions that are causing
-- the dashboard to hang. Run this in your Supabase Dashboard SQL Editor.
--
-- Prerequisites:
-- - org_member_role enum must exist
-- - organization_members table must exist
-- - organization_invites table must exist (for get_pending_invites_for_user)
-- - organizations table must exist
-- - users table must exist
--
-- ============================================
-- 1. Create org_member_role enum (if it doesn't exist)
-- ============================================
DO $$ BEGIN
  CREATE TYPE org_member_role AS ENUM ('parent', 'coach', 'org_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. Create get_user_organizations function
-- ============================================
CREATE OR REPLACE FUNCTION get_user_organizations(check_user_id UUID)
RETURNS TABLE(organization_id UUID, org_name TEXT, role org_member_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    om.organization_id,
    o.name as org_name,
    om.role
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = check_user_id
  ORDER BY o.name;
$$;

-- ============================================
-- 3. Create get_pending_invites_for_user function
-- ============================================
-- Note: This requires the organization_invites table to exist
-- If you get an error, you may need to run migration 022_organization_invites.sql first
CREATE OR REPLACE FUNCTION get_pending_invites_for_user()
RETURNS TABLE(
  invite_token TEXT,
  organization_name TEXT,
  role org_member_role,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO v_user_email FROM users WHERE id = auth.uid();
  
  -- Return empty result if user email not found
  IF v_user_email IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    oi.token,
    o.name,
    oi.role,
    oi.expires_at
  FROM organization_invites oi
  JOIN organizations o ON o.id = oi.organization_id
  WHERE LOWER(oi.email) = LOWER(v_user_email)
  AND oi.accepted_at IS NULL
  AND oi.expires_at > NOW()
  ORDER BY oi.created_at DESC;
END;
$$;

-- ============================================
-- 4. Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION get_user_organizations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_invites_for_user() TO authenticated;

-- ============================================
-- 5. Add comments
-- ============================================
COMMENT ON FUNCTION get_user_organizations(UUID) IS 'Gets all organizations for a user with their role in each organization.';
COMMENT ON FUNCTION get_pending_invites_for_user IS 'Gets all pending invites for the current user based on their email.';
