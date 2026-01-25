-- Migration: Resend Guardian Invite Notification
-- ==============================================
-- Adds an RPC function to resend guardian invite emails
-- This extends the expiration and queues a new notification
-- The client triggers the notification-worker after calling this RPC.

CREATE OR REPLACE FUNCTION resend_guardian_invite(
  p_invite_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_athlete RECORD;
  v_organization RECORD;
  v_invite_url TEXT;
  v_app_url TEXT;
  v_new_expires_at TIMESTAMPTZ;
BEGIN
  -- Get the invite
  SELECT * INTO v_invite
  FROM parent_invites
  WHERE id = p_invite_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;
  
  IF v_invite.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite is no longer pending');
  END IF;
  
  -- Extend expiration by 30 days
  v_new_expires_at := NOW() + INTERVAL '30 days';
  
  -- Update the invite
  UPDATE parent_invites
  SET 
    expires_at = v_new_expires_at,
    updated_at = NOW()
  WHERE id = p_invite_id;
  
  -- Get athlete details
  SELECT first_name, last_name
  INTO v_athlete
  FROM athletes
  WHERE id = v_invite.athlete_id;
  
  -- Get organization details
  SELECT name
  INTO v_organization
  FROM organizations
  WHERE id = v_invite.org_id;
  
  -- Build the invite URL
  v_app_url := COALESCE(
    current_setting('app.settings.app_url', true),
    'https://youthsports.team'
  );
  v_invite_url := v_app_url || '/accept-invite?token=' || v_invite.token || '&type=guardian';
  
  -- Queue a new notification
  INSERT INTO notification_jobs (
    org_id,
    user_id,
    email,
    type,
    payload,
    status
  ) VALUES (
    v_invite.org_id,
    NULL,
    v_invite.email,
    'guardian_invite',
    jsonb_build_object(
      'recipient_email', v_invite.email,
      'athlete_first_name', COALESCE(v_athlete.first_name, ''),
      'athlete_last_name', COALESCE(v_athlete.last_name, ''),
      'athlete_name', COALESCE(v_athlete.first_name || ' ' || v_athlete.last_name, 'your athlete'),
      'organization_name', COALESCE(v_organization.name, 'the organization'),
      'invite_token', v_invite.token,
      'invite_url', v_invite_url,
      'expires_at', v_new_expires_at,
      'is_resend', true
    ),
    'queued'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'new_expires_at', v_new_expires_at
  );
END;
$$;

COMMENT ON FUNCTION resend_guardian_invite IS 
  'Resends a guardian invite email by extending the expiration and queuing a new notification.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION resend_guardian_invite TO authenticated;
