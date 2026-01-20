-- Phase 0X: Organization Invite Enhancements
-- ===========================================
-- Adds a roles array to organization_invites and updates the RPCs to insert
-- multiple roles per invite, relying on the advisory-lock helpers above.

-- Add a roles array column for future-proofing.
ALTER TABLE organization_invites
  ADD COLUMN IF NOT EXISTS roles org_member_role[] DEFAULT ARRAY['parent']::org_member_role[];

-- Recreate the invite creation function to accept multiple roles.
CREATE OR REPLACE FUNCTION create_organization_invite(
  p_org_id UUID,
  p_email TEXT,
  p_roles org_member_role[] DEFAULT ARRAY['parent']::org_member_role[],
  p_expires_in_days INTEGER DEFAULT 7
)
RETURNS TABLE(invite_token TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_current_user_id UUID;
  v_roles org_member_role[] := COALESCE(p_roles, ARRAY['parent']::org_member_role[]);
BEGIN
  -- Normalize to non-empty array
  IF CARDINALITY(v_roles) = 0 THEN
    v_roles := ARRAY['parent']::org_member_role[];
  END IF;

  v_current_user_id := auth.uid();

  IF NOT (user_is_org_admin(v_current_user_id, p_org_id) OR is_platform_admin(v_current_user_id)) THEN
    RAISE EXCEPTION 'Only organization admins can create invites';
  END IF;

  IF EXISTS (
    SELECT 1 FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.org_id = p_org_id
      AND LOWER(u.email) = LOWER(p_email)
  ) THEN
    RAISE EXCEPTION 'User is already a member of this organization';
  END IF;

  IF EXISTS (
    SELECT 1 FROM organization_invites
    WHERE org_id = p_org_id
      AND LOWER(email) = LOWER(p_email)
      AND accepted_at IS NULL
      AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'A pending invite already exists for this email';
  END IF;

  v_token := gen_random_uuid()::text;
  v_expires_at := NOW() + (p_expires_in_days || ' days')::interval;

  INSERT INTO organization_invites (
    org_id,
    email,
    role,
    roles,
    token,
    expires_at,
    created_by_user_id
  ) VALUES (
    p_org_id,
    LOWER(p_email),
    v_roles[1],
    v_roles,
    v_token,
    v_expires_at,
    v_current_user_id
  );

  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$;

-- Recreate the accept invite function to insert all roles.
CREATE OR REPLACE FUNCTION accept_organization_invite(p_token TEXT)
RETURNS TABLE(
  success BOOLEAN,
  org_id UUID,
  organization_name TEXT,
  role org_member_role,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_current_user_id UUID;
  v_user_email TEXT;
  v_roles org_member_role[];
  v_primary_role org_member_role;
  v_role org_member_role;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'You must be logged in to accept an invite';
    RETURN;
  END IF;

  SELECT email INTO v_user_email FROM users WHERE id = v_current_user_id;

  BEGIN
    SELECT 
      oi.id,
      oi.org_id,
      o.name AS org_name,
      oi.email,
      oi.role,
      oi.roles,
      oi.expires_at,
      oi.accepted_at
    INTO v_invite
    FROM organization_invites oi
    JOIN organizations o ON o.id = oi.org_id
    WHERE oi.token = p_token
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'Invite is being processed by another request';
      RETURN;
  END;

  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'Invalid invite token';
    RETURN;
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'This invite has already been accepted';
    RETURN;
  END IF;

  IF v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'This invite has expired';
    RETURN;
  END IF;

  v_roles := COALESCE(
    NULLIF(v_invite.roles, ARRAY[]::org_member_role[]),
    ARRAY[v_invite.role]::org_member_role[]
  );

  IF CARDINALITY(v_roles) = 0 THEN
    v_roles := ARRAY['parent']::org_member_role[];
  END IF;

  v_primary_role :=
    CASE
      WHEN 'org_admin' = ANY(v_roles) THEN 'org_admin'
      WHEN 'coach' = ANY(v_roles) THEN 'coach'
      ELSE 'parent'
    END;

  UPDATE organization_invites
  SET accepted_at = NOW(),
      role = v_primary_role
  WHERE id = v_invite.id;

  FOREACH v_role IN ARRAY v_roles LOOP
    PERFORM add_org_role(v_current_user_id, v_invite.org_id, v_role);
  END LOOP;

  UPDATE users
  SET
    org_id = COALESCE(org_id, v_invite.org_id),
    role = CASE
      WHEN v_primary_role = 'org_admin' THEN 'admin'::user_role
      WHEN v_primary_role = 'coach' THEN 'coach'::user_role
      ELSE 'parent'::user_role
    END
  WHERE id = v_current_user_id
    AND org_id IS NULL;

  RETURN QUERY SELECT true, v_invite.org_id, v_invite.org_name, v_primary_role, 'Successfully joined organization';
END;
$$;
