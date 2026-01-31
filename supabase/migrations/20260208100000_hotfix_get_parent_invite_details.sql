-- Hotfix: Recreate get_parent_invite_details function
-- ======================================================
-- The function has an ambiguous column reference error.
-- Dropping and recreating it to fix the issue.

-- Drop the function if it exists
DROP FUNCTION IF EXISTS get_parent_invite_details(TEXT);

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
  -- Select from parent_invites table with explicit table prefix
  SELECT
    pi.id,
    pi.org_id,
    pi.athlete_id,
    pi.email,
    pi.expires_at,
    pi.status
  INTO v_invite
  FROM parent_invites pi
  WHERE pi.token = p_token;

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