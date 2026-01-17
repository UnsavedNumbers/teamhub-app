-- Phase 0X: Multi-Role Support Updates
-- ====================================
-- Unlocks multi-role per user per organization by relaxing the existing
-- constraint and adding a role-aware unique key + index.

-- Drop the legacy single-role constraint so we can keep one row per role.
ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS uq_org_member_user_org;

-- Enforce uniqueness at the (org, user, role) level.
ALTER TABLE organization_members
  ADD CONSTRAINT uq_org_member_user_org_role
  UNIQUE (organization_id, user_id, role);

-- Create an index that covers the common multi-role lookup path.
CREATE INDEX IF NOT EXISTS idx_org_members_user_org_role
  ON organization_members (user_id, organization_id, role);

CREATE INDEX IF NOT EXISTS idx_org_members_user_org
  ON organization_members (user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_org_members_org_role
  ON organization_members (organization_id, role);

CREATE INDEX IF NOT EXISTS idx_org_members_user_org_role_covering
  ON organization_members (user_id, organization_id, role)
  INCLUDE (created_at, updated_at);

-- Advisory-lock-backed helpers for role changes to prevent race conditions.
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

  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES (p_user_id, p_org_id, p_role)
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  RETURN FOUND;
END;
$$;

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
    AND organization_id = p_org_id
    AND role = p_role;

  RETURN FOUND;
END;
$$;
