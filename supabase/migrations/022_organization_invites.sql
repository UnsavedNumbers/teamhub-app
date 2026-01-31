-- Phase 3: Organization Invite System
-- =====================================
-- Functions for creating and accepting organization invites with race condition protection

-- ============================================
-- 1. Create organization invite function
-- ============================================
CREATE OR REPLACE FUNCTION create_organization_invite(
  p_org_id UUID,
  p_email TEXT,
  p_role org_member_role DEFAULT 'parent',
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
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  -- Check if user is org admin or platform admin
  IF NOT (user_is_org_admin(v_current_user_id, p_org_id) OR is_platform_admin(v_current_user_id)) THEN
    RAISE EXCEPTION 'Only organization admins can create invites';
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.org_id = p_org_id
    AND LOWER(u.email) = LOWER(p_email)
  ) THEN
    RAISE EXCEPTION 'User is already a member of this organization';
  END IF;
  
  -- Check if there's already a pending invite
  IF EXISTS (
    SELECT 1 FROM organization_invites
    WHERE org_id = p_org_id
    AND LOWER(email) = LOWER(p_email)
    AND accepted_at IS NULL
    AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'A pending invite already exists for this email';
  END IF;
  
  -- Generate token and expiration
  v_token := gen_random_uuid()::text;
  v_expires_at := NOW() + (p_expires_in_days || ' days')::interval;
  
  -- Create the invite
  INSERT INTO organization_invites (
    org_id,
    email,
    role,
    token,
    expires_at,
    created_by_user_id
  ) VALUES (
    p_org_id,
    LOWER(p_email),
    p_role,
    v_token,
    v_expires_at,
    v_current_user_id
  );
  
  -- Return the token and expiration
  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$;

-- ============================================
-- 2. Accept organization invite function
-- ============================================
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
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'You must be logged in to accept an invite';
    RETURN;
  END IF;
  
  -- Get user's email
  SELECT email INTO v_user_email FROM users WHERE id = v_current_user_id;
  
  -- Lock the invite row to prevent race conditions
  -- Using FOR UPDATE NOWAIT to fail fast if another transaction is processing
  BEGIN
    SELECT 
      oi.id,
      oi.org_id,
      o.name as org_name,
      oi.email,
      oi.role,
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
  
  -- Check if invite exists
  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'Invalid invite token';
    RETURN;
  END IF;
  
  -- Check if already accepted
  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'This invite has already been accepted';
    RETURN;
  END IF;
  
  -- Check if expired
  IF v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'This invite has expired';
    RETURN;
  END IF;
  
  -- Check email matches (optional - allow any authenticated user to accept)
  -- For now, we allow any authenticated user to accept the invite
  -- Uncomment below to require email match:
  -- IF LOWER(v_user_email) != LOWER(v_invite.email) THEN
  --   RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'This invite was sent to a different email address';
  --   RETURN;
  -- END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = v_invite.org_id
    AND user_id = v_current_user_id
  ) THEN
    RETURN QUERY SELECT false, v_invite.org_id, v_invite.org_name, v_invite.role, 'You are already a member of this organization';
    RETURN;
  END IF;
  
  -- Mark invite as accepted
  UPDATE organization_invites
  SET accepted_at = NOW()
  WHERE id = v_invite.id;
  
  -- Create organization membership
  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (v_invite.org_id, v_current_user_id, v_invite.role);
  
  -- Also update the legacy org_id/role on users table for backward compatibility
  UPDATE users
  SET 
    org_id = COALESCE(org_id, v_invite.org_id),
    role = CASE 
      WHEN v_invite.role = 'org_admin' THEN 'admin'::user_role
      WHEN v_invite.role = 'coach' THEN 'coach'::user_role
      ELSE 'parent'::user_role
    END
  WHERE id = v_current_user_id
  AND org_id IS NULL; -- Only set if not already set
  
  -- Return success
  RETURN QUERY SELECT true, v_invite.org_id, v_invite.org_name, v_invite.role, 'Successfully joined organization';
END;
$$;

-- ============================================
-- 3. Get invite details function (for display)
-- ============================================
CREATE OR REPLACE FUNCTION get_invite_details(p_token TEXT)
RETURNS TABLE(
  valid BOOLEAN,
  organization_name TEXT,
  role org_member_role,
  email TEXT,
  expires_at TIMESTAMPTZ,
  expired BOOLEAN,
  already_accepted BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Get invite details
  SELECT 
    oi.org_id,
    o.name as org_name,
    oi.email,
    oi.role,
    oi.expires_at,
    oi.accepted_at
  INTO v_invite
  FROM organization_invites oi
  JOIN organizations o ON o.id = oi.org_id
  WHERE oi.token = p_token;
  
  -- Check if invite exists
  IF v_invite IS NULL THEN
    RETURN QUERY SELECT 
      false, 
      NULL::TEXT, 
      NULL::org_member_role, 
      NULL::TEXT, 
      NULL::TIMESTAMPTZ, 
      false, 
      false, 
      'Invalid invite token';
    RETURN;
  END IF;
  
  -- Check various states
  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN QUERY SELECT 
      false, 
      v_invite.org_name, 
      v_invite.role, 
      v_invite.email, 
      v_invite.expires_at, 
      false, 
      true, 
      'This invite has already been accepted';
    RETURN;
  END IF;
  
  IF v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT 
      false, 
      v_invite.org_name, 
      v_invite.role, 
      v_invite.email, 
      v_invite.expires_at, 
      true, 
      false, 
      'This invite has expired';
    RETURN;
  END IF;
  
  -- Valid invite
  RETURN QUERY SELECT 
    true, 
    v_invite.org_name, 
    v_invite.role, 
    v_invite.email, 
    v_invite.expires_at, 
    false, 
    false, 
    'Valid invite';
END;
$$;

-- ============================================
-- 4. Revoke organization invite function
-- ============================================
CREATE OR REPLACE FUNCTION revoke_organization_invite(p_invite_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  -- Get the org_id of the invite
  SELECT org_id INTO v_org_id
  FROM organization_invites
  WHERE id = p_invite_id AND accepted_at IS NULL;
  
  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check permissions
  IF NOT (user_is_org_admin(v_current_user_id, v_org_id) OR is_platform_admin(v_current_user_id)) THEN
    RAISE EXCEPTION 'Only organization admins can revoke invites';
  END IF;
  
  -- Delete the invite
  DELETE FROM organization_invites WHERE id = p_invite_id;
  
  RETURN true;
END;
$$;

-- ============================================
-- 5. Check for pending invites for current user
-- ============================================
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
  
  RETURN QUERY
  SELECT 
    oi.token,
    o.name,
    oi.role,
    oi.expires_at
  FROM organization_invites oi
  JOIN organizations o ON o.id = oi.org_id
  WHERE LOWER(oi.email) = LOWER(v_user_email)
  AND oi.accepted_at IS NULL
  AND oi.expires_at > NOW()
  ORDER BY oi.created_at DESC;
END;
$$;

-- ============================================
-- 6. Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION create_organization_invite(UUID, TEXT, org_member_role, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_organization_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invite_details(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invite_details(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION revoke_organization_invite(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_invites_for_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organizations(UUID) TO authenticated;

-- ============================================
-- 7. Add comments
-- ============================================
COMMENT ON FUNCTION create_organization_invite IS 'Creates an invite token for a user to join an organization. Only org admins can call this.';
COMMENT ON FUNCTION accept_organization_invite IS 'Accepts an invite and creates organization membership. Uses SELECT FOR UPDATE NOWAIT to prevent race conditions.';
COMMENT ON FUNCTION get_invite_details IS 'Gets invite details for display on the accept invite page. Can be called by anyone with the token.';
COMMENT ON FUNCTION revoke_organization_invite IS 'Revokes a pending invite. Only org admins can call this.';
COMMENT ON FUNCTION get_pending_invites_for_user IS 'Gets all pending invites for the current user based on their email.';
