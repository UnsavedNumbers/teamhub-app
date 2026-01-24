-- Fix helper functions to use correct column names

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
