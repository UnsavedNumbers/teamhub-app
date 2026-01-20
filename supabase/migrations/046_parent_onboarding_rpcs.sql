-- Phase 0X: Parent Onboarding RPCs
-- ==================================
-- Implements the flows described in the plan: admin attachments, parent invites,
-- join links, join request reviews, and child claim token redemption.

-- Flow A: Admin attaches parents to child, creating guardians or invites.
CREATE OR REPLACE FUNCTION admin_attach_parents_to_child(
  p_org_id UUID,
  p_child_id UUID,
  p_parent_emails TEXT[],
  p_team_id UUID DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT 7
)
RETURNS TABLE(
  email TEXT,
  status parent_invite_status,
  token TEXT,
  user_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID := auth.uid();
  v_email TEXT;
  v_user_id UUID;
  v_token TEXT;
BEGIN
  IF NOT (user_is_org_admin(v_current_user, p_org_id) OR is_platform_admin(v_current_user)) THEN
    RAISE EXCEPTION 'Only organization admins can attach parents';
  END IF;

  IF p_parent_emails IS NULL OR CARDINALITY(p_parent_emails) = 0 THEN
    RAISE EXCEPTION 'At least one parent email is required';
  END IF;

  FOREACH v_email IN ARRAY (
    SELECT DISTINCT LOWER(email)
    FROM UNNEST(p_parent_emails) AS email
    WHERE TRIM(email) <> ''
  ) LOOP
    SELECT id INTO v_user_id FROM users WHERE LOWER(email) = v_email LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      PERFORM add_org_role(v_user_id, p_org_id, 'parent');
      INSERT INTO athlete_guardians (athlete_id, user_id, org_id, status)
      VALUES (p_child_id, v_user_id, p_org_id, 'active')
      ON CONFLICT (athlete_id, user_id, org_id)
      DO UPDATE SET status = 'active', updated_at = NOW();
      RETURN QUERY SELECT v_email, 'active'::parent_invite_status, NULL::TEXT, v_user_id, 'Parent attached immediately'::TEXT;
    ELSE
      v_token := gen_random_uuid()::text;
      INSERT INTO parent_invites (
        org_id,
        athlete_id,
        team_id,
        email,
        token,
        expires_at,
        status,
        created_by_user_id
      ) VALUES (
        p_org_id,
        p_child_id,
        p_team_id,
        v_email,
        v_token,
        NOW() + (p_expires_in_days || ' days')::interval,
        'pending',
        v_current_user
      );
      RETURN QUERY SELECT v_email, 'pending'::parent_invite_status, v_token, NULL::UUID, 'Parent invited'::TEXT;
    END IF;
  END LOOP;
END;
$$;

-- Flow A: Parent accepts pending invite via token.
CREATE OR REPLACE FUNCTION accept_parent_invite(p_token TEXT)
RETURNS TABLE(
  success BOOLEAN,
  org_id UUID,
  athlete_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_current_user UUID := auth.uid();
  v_user_email TEXT;
BEGIN
  IF v_current_user IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Login required';
    RETURN;
  END IF;

  SELECT email INTO v_user_email FROM users WHERE id = v_current_user;

  BEGIN
    SELECT
      id,
      org_id,
      athlete_id,
      email,
      token,
      expires_at,
      status
    INTO v_invite
    FROM parent_invites
    WHERE token = p_token
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Invite is being processed';
      RETURN;
  END;

  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Invalid token';
    RETURN;
  END IF;

  IF v_invite.status <> 'pending' THEN
    RETURN QUERY SELECT false, v_invite.org_id, v_invite.athlete_id, 'Invite already processed';
    RETURN;
  END IF;

  IF v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT false, v_invite.org_id, v_invite.athlete_id, 'Invite expired';
    RETURN;
  END IF;

  IF LOWER(v_invite.email) <> LOWER(v_user_email) THEN
    RETURN QUERY SELECT false, v_invite.org_id, v_invite.athlete_id, 'Email mismatch';
    RETURN;
  END IF;

  INSERT INTO athlete_guardians (athlete_id, user_id, org_id, status)
  VALUES (v_invite.athlete_id, v_current_user, v_invite.org_id, 'active')
  ON CONFLICT (athlete_id, user_id, org_id)
  DO UPDATE SET status = 'active', updated_at = NOW();

  PERFORM add_org_role(v_current_user, v_invite.org_id, 'parent');

  UPDATE parent_invites
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by_user_id = v_current_user
  WHERE id = v_invite.id;

  RETURN QUERY SELECT true, v_invite.org_id, v_invite.athlete_id, 'Parent attached';
END;
$$;

-- Flow B: Organization creates join links.
CREATE OR REPLACE FUNCTION create_join_link(
  p_org_id UUID,
  p_team_id UUID DEFAULT NULL,
  p_auto_approve BOOLEAN DEFAULT FALSE,
  p_expires_in_days INTEGER DEFAULT 7
)
RETURNS TABLE(
  token TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT := gen_random_uuid()::text;
  v_current_user UUID := auth.uid();
  v_expiration TIMESTAMPTZ := NOW() + (p_expires_in_days || ' days')::interval;
BEGIN
  IF NOT (user_is_org_admin(v_current_user, p_org_id) OR is_platform_admin(v_current_user)) THEN
    RAISE EXCEPTION 'Only organization admins can create join links';
  END IF;

  INSERT INTO join_links (
    org_id,
    team_id,
    token,
    auto_approve,
    expires_at,
    created_by_user_id
  ) VALUES (
    p_org_id,
    p_team_id,
    v_token,
    p_auto_approve,
    v_expiration,
    v_current_user
  );

  RETURN QUERY SELECT v_token, v_expiration;
END;
$$;

-- Flow B: Parent submits join request via link.
CREATE OR REPLACE FUNCTION submit_join_request(
  p_link_token TEXT,
  p_child_id UUID,
  p_season_id UUID,
  p_team_id UUID DEFAULT NULL
)
RETURNS TABLE(
  request_id UUID,
  status join_request_status,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link RECORD;
  v_current_user UUID := auth.uid();
  v_target_team UUID;
  v_status join_request_status;
  v_request_id UUID;
BEGIN
  IF v_current_user IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'denied', 'Login required';
    RETURN;
  END IF;

  SELECT
    id,
    org_id,
    team_id,
    auto_approve,
    expires_at
  INTO v_link
  FROM join_links
  WHERE token = p_link_token
  FOR UPDATE NOWAIT;

  IF v_link IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'denied', 'Invalid join link';
    RETURN;
  END IF;

  IF v_link.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, 'denied', 'Join link expired';
    RETURN;
  END IF;

  v_target_team := COALESCE(v_link.team_id, p_team_id);
  IF v_target_team IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'denied', 'No team selected';
    RETURN;
  END IF;

  v_status := CASE WHEN v_link.auto_approve THEN 'approved' ELSE 'pending' END;

  INSERT INTO join_requests (
    org_id,
    team_id,
    season_id,
      athlete_id,
    requested_by_user_id,
    join_link_id,
    status
  ) VALUES (
    v_link.org_id,
    v_target_team,
    p_season_id,
    p_child_id,
    v_current_user,
    v_link.id,
    v_status
  )
  RETURNING id INTO v_request_id;

  IF v_link.auto_approve THEN
    INSERT INTO team_memberships (athlete_id, team_id, season_id, status)
    VALUES (p_child_id, v_target_team, p_season_id, 'active')
    ON CONFLICT (athlete_id, team_id, season_id) DO NOTHING;

    INSERT INTO athlete_guardians (athlete_id, user_id, org_id, status)
    VALUES (p_child_id, v_current_user, v_link.org_id, 'active')
    ON CONFLICT (athlete_id, user_id, org_id)
    DO UPDATE SET status = 'active', updated_at = NOW();

    PERFORM add_org_role(v_current_user, v_link.org_id, 'parent');
  END IF;

  RETURN QUERY SELECT v_request_id, v_status, 'Join request submitted';
END;
$$;

-- Flow B: Admin reviews join request.
CREATE OR REPLACE FUNCTION review_join_request(
  p_request_id UUID,
  p_approve BOOLEAN,
  p_decision_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  request_id UUID,
  status join_request_status,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_current_user UUID := auth.uid();
  v_new_status join_request_status;
BEGIN
  SELECT *
  INTO v_request
  FROM join_requests
  WHERE id = p_request_id
  FOR UPDATE NOWAIT;

  IF v_request IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'denied', 'Request not found';
    RETURN;
  END IF;

  IF NOT (user_is_org_admin(v_current_user, v_request.org_id) OR is_platform_admin(v_current_user)) THEN
    RETURN QUERY SELECT p_request_id, 'denied', 'Unauthorized';
    RETURN;
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN QUERY SELECT p_request_id, v_request.status, 'Request already reviewed';
    RETURN;
  END IF;

  IF p_approve THEN
    INSERT INTO team_memberships (athlete_id, team_id, season_id, status)
    VALUES (v_request.athlete_id, v_request.team_id, v_request.season_id, 'active')
    ON CONFLICT (athlete_id, team_id, season_id) DO NOTHING;

    INSERT INTO athlete_guardians (athlete_id, user_id, org_id, status)
    VALUES (v_request.athlete_id, v_request.requested_by_user_id, v_request.org_id, 'active')
    ON CONFLICT (athlete_id, user_id, org_id)
    DO UPDATE SET status = 'active', updated_at = NOW();

    PERFORM add_org_role(v_request.requested_by_user_id, v_request.org_id, 'parent');

    v_new_status := 'approved';
  ELSE
    v_new_status := 'denied';
  END IF;

  UPDATE join_requests
  SET status = v_new_status,
      reviewed_by_user_id = v_current_user,
      reviewed_at = NOW(),
      decision_reason = p_decision_reason
  WHERE id = p_request_id;

  RETURN QUERY SELECT p_request_id, v_new_status, 'Review processed';
END;
$$;

-- Flow C: Create child claim tokens for parents.
CREATE OR REPLACE FUNCTION create_child_claim_token(
  p_child_id UUID,
  p_org_id UUID,
  p_team_id UUID,
  p_season_id UUID,
  p_expires_in_days INTEGER DEFAULT 7
)
RETURNS TABLE(
  token TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID := auth.uid();
  v_token TEXT := gen_random_uuid()::text;
  v_expires_at TIMESTAMPTZ := NOW() + (p_expires_in_days || ' days')::interval;
BEGIN
  IF NOT (user_is_org_admin(v_current_user, p_org_id) OR is_platform_admin(v_current_user)) THEN
    RAISE EXCEPTION 'Only organization admins can create child claim tokens';
  END IF;

  INSERT INTO child_claim_tokens (
    org_id,
    team_id,
    season_id,
      athlete_id,
    token,
    expires_at,
    created_by_user_id
  ) VALUES (
    p_org_id,
    p_team_id,
    p_season_id,
    p_child_id,
    v_token,
    v_expires_at,
    v_current_user
  );

  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$;

-- Flow C: Parent redeems child claim token.
CREATE OR REPLACE FUNCTION redeem_child_claim_token(p_token TEXT)
RETURNS TABLE(
  success BOOLEAN,
  athlete_id UUID,
  org_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token RECORD;
  v_current_user UUID := auth.uid();
BEGIN
  IF v_current_user IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Login required';
    RETURN;
  END IF;

  SELECT *
  INTO v_token
  FROM child_claim_tokens
  WHERE token = p_token
  FOR UPDATE NOWAIT;

  IF v_token IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Invalid token';
    RETURN;
  END IF;

  IF v_token.expires_at < NOW() THEN
    RETURN QUERY SELECT false, v_token.athlete_id, v_token.org_id, 'Token expired';
    RETURN;
  END IF;

  IF v_token.used_at IS NOT NULL THEN
    RETURN QUERY SELECT false, v_token.athlete_id, v_token.org_id, 'Token already used';
    RETURN;
  END IF;

  INSERT INTO athlete_guardians (athlete_id, user_id, org_id, status)
  VALUES (v_token.athlete_id, v_current_user, v_token.org_id, 'active')
  ON CONFLICT (athlete_id, user_id, org_id)
  DO UPDATE SET status = 'active', updated_at = NOW();

  PERFORM add_org_role(v_current_user, v_token.org_id, 'parent');

  IF v_token.team_id IS NOT NULL THEN
    INSERT INTO team_memberships (athlete_id, team_id, season_id, status)
    VALUES (v_token.athlete_id, v_token.team_id, v_token.season_id, 'active')
    ON CONFLICT (athlete_id, team_id, season_id) DO NOTHING;
  END IF;

  UPDATE child_claim_tokens
  SET used_at = NOW(),
      used_by_user_id = v_current_user
  WHERE id = v_token.id;

  RETURN QUERY SELECT true, v_token.athlete_id, v_token.org_id, 'Child claimed';
END;
$$;
