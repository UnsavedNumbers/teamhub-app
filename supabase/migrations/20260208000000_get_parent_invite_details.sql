-- Migration: Get Parent Invite Details (Unauthenticated)
-- ======================================================
-- Creates a function that allows unauthenticated users to fetch invite details
-- This is needed for the signup flow to pre-fill the email field with the invite email
-- and pass the athlete_id through the signup process.

-- ==============================================
-- Function: Get Parent Invite Details
-- ==============================================
-- This function allows unauthenticated users to fetch invite details before signup.
-- It returns non-sensitive information: email, athlete_id, org_id, and validation status.
-- Security: SECURITY DEFINER but only returns non-sensitive data.

CREATE OR REPLACE FUNCTION get_parent_invite_details(p_token TEXT)
RETURNS TABLE(
  valid BOOLEAN,
  email TEXT,
  athlete_id UUID,
  org_id UUID,
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
  SELECT
    id,
    org_id,
    athlete_id,
    email,
    expires_at,
    status
  INTO v_invite
  FROM parent_invites
  WHERE token = p_token;
  
  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, NULL::UUID, false, false, 'Invalid invite token';
    RETURN;
  END IF;
  
  IF v_invite.status = 'accepted' THEN
    RETURN QUERY SELECT false, v_invite.email, v_invite.athlete_id, v_invite.org_id, false, true, 'Invite already accepted';
    RETURN;
  END IF;
  
  IF v_invite.status <> 'pending' THEN
    RETURN QUERY SELECT false, v_invite.email, v_invite.athlete_id, v_invite.org_id, false, false, 'Invite is not pending';
    RETURN;
  END IF;
  
  IF v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT false, v_invite.email, v_invite.athlete_id, v_invite.org_id, true, false, 'Invite expired';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, v_invite.email, v_invite.athlete_id, v_invite.org_id, false, false, 'Valid invite';
END;
$$;

COMMENT ON FUNCTION get_parent_invite_details IS 
  'Allows unauthenticated users to fetch parent invite details (email, athlete_id, org_id) for signup flow. Returns validation status and error messages.';

-- ==============================================
-- Grant Permissions
-- ==============================================
-- Grant execute permissions to anon and authenticated roles
-- This allows unauthenticated users to call the function before signup

GRANT EXECUTE ON FUNCTION get_parent_invite_details(TEXT) TO anon, authenticated;
