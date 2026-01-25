-- Migration: Guardian Invite Email Notification
-- =============================================
-- Adds support for sending emails when guardian invites are created
-- This ensures guardians receive an email when they are invited to link to an athlete

-- ==============================================
-- Add guardian_invite to notification_job_type enum
-- ==============================================
ALTER TYPE notification_job_type ADD VALUE IF NOT EXISTS 'guardian_invite';

-- ==============================================
-- Function: Queue guardian invite notification email
-- ==============================================
-- This function is called by a trigger when a new parent_invite is created.
-- It queues a notification job that will be processed by the notification-worker Edge Function.
-- The client triggers the notification-worker after calling link_guardian_to_athlete.

CREATE OR REPLACE FUNCTION queue_guardian_invite_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_athlete RECORD;
  v_organization RECORD;
  v_invite_url TEXT;
  v_app_url TEXT;
BEGIN
  -- Only queue notification for new pending invites
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    
    -- Get athlete details
    SELECT first_name, last_name
    INTO v_athlete
    FROM athletes
    WHERE id = NEW.athlete_id;
    
    -- Get organization details (handle both org_id and organization_id columns)
    SELECT name
    INTO v_organization
    FROM organizations
    WHERE id = NEW.org_id;
    
    -- Build the invite URL
    -- Use environment variable or default to production URL
    v_app_url := COALESCE(
      current_setting('app.settings.app_url', true),
      'https://youthsports.team'
    );
    v_invite_url := v_app_url || '/accept-invite?token=' || NEW.token || '&type=guardian';
    
    -- Insert notification job
    INSERT INTO notification_jobs (
      org_id,
      user_id,
      email,
      type,
      payload,
      status
    ) VALUES (
      NEW.org_id,
      NULL, -- No user_id yet since they may not have an account
      NEW.email,
      'guardian_invite',
      jsonb_build_object(
        'recipient_email', NEW.email,
        'athlete_first_name', COALESCE(v_athlete.first_name, ''),
        'athlete_last_name', COALESCE(v_athlete.last_name, ''),
        'athlete_name', COALESCE(v_athlete.first_name || ' ' || v_athlete.last_name, 'your athlete'),
        'organization_name', COALESCE(v_organization.name, 'the organization'),
        'invite_token', NEW.token,
        'invite_url', v_invite_url,
        'expires_at', NEW.expires_at
      ),
      'queued'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION queue_guardian_invite_notification IS 
  'Queues an email notification when a guardian invite is created. The notification-worker Edge Function processes the queued job and sends the email via Resend.';

-- ==============================================
-- Trigger: Queue notification on parent_invite insert
-- ==============================================
DROP TRIGGER IF EXISTS guardian_invite_send_notification ON parent_invites;

CREATE TRIGGER guardian_invite_send_notification
  AFTER INSERT ON parent_invites
  FOR EACH ROW
  EXECUTE FUNCTION queue_guardian_invite_notification();

COMMENT ON TRIGGER guardian_invite_send_notification ON parent_invites IS 
  'Automatically queues an email notification when a new guardian invite is created.';
