-- ============================================================================
-- Fix add_org_role and remove_org_role functions to use org_id
-- ============================================================================
-- The functions were using organization_id but the table column is org_id.
-- This migration fixes the column references.

-- Fix add_org_role function
CREATE OR REPLACE FUNCTION add_org_role(
  p_user_id UUID,
  p_org_id UUID,
  p_role org_member_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key BIGINT := hashtext(p_user_id::text || p_org_id::text);
BEGIN
  PERFORM pg_advisory_xact_lock(v_lock_key);

  INSERT INTO organization_members (user_id, org_id, role)
  VALUES (p_user_id, p_org_id, p_role)
  ON CONFLICT (org_id, user_id, role) DO NOTHING;

  RETURN FOUND;
END;
$$;

-- Fix remove_org_role function
CREATE OR REPLACE FUNCTION remove_org_role(
  p_user_id UUID,
  p_org_id UUID,
  p_role org_member_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key BIGINT := hashtext(p_user_id::text || p_org_id::text);
BEGIN
  PERFORM pg_advisory_xact_lock(v_lock_key);

  DELETE FROM organization_members
  WHERE user_id = p_user_id
    AND org_id = p_org_id
    AND role = p_role;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION add_org_role IS 'Add organization role to user. Idempotent - safe to call multiple times.';
COMMENT ON FUNCTION remove_org_role IS 'Remove organization role from user.';
