-- RSVP Notification System
-- =========================
-- Creates notification outbox and triggers for RSVP reminders

-- Create RSVP notification outbox table
CREATE TABLE IF NOT EXISTS rsvp_notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
  attempt_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  event_type TEXT NOT NULL, -- rsvp_required | rsvp_reminder | rsvp_last_call
  dedupe_key TEXT NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  payload JSONB
);

-- Add unique constraint on dedupe_key to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvp_notification_outbox_dedupe_key 
  ON rsvp_notification_outbox(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_rsvp_notification_outbox_status 
  ON rsvp_notification_outbox(status);
CREATE INDEX IF NOT EXISTS idx_rsvp_notification_outbox_created_at 
  ON rsvp_notification_outbox(created_at);
CREATE INDEX IF NOT EXISTS idx_rsvp_notification_outbox_event_id 
  ON rsvp_notification_outbox(event_id);

-- Enable RLS
ALTER TABLE rsvp_notification_outbox ENABLE ROW LEVEL SECURITY;

-- Only allow admins to read outbox rows (Edge Function uses service role)
DROP POLICY IF EXISTS "Admins can read RSVP notification outbox" ON rsvp_notification_outbox;
CREATE POLICY "Admins can read RSVP notification outbox" ON rsvp_notification_outbox
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'platform_admin')
    )
  );

-- Function to enqueue RSVP notification
CREATE OR REPLACE FUNCTION enqueue_rsvp_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enqueue if RSVP is enabled and type is set
  IF NEW.rsvp_enabled = true AND NEW.rsvp_type IS NOT NULL THEN
    INSERT INTO rsvp_notification_outbox (
      event_type,
      dedupe_key,
      event_id,
      team_id,
      season_id,
      payload
    )
    VALUES (
      'rsvp_required',
      'rsvp:' || NEW.id::text || ':required:' || date_trunc('day', NOW())::text,
      NEW.id,
      NEW.team_id,
      NEW.season_id,
      jsonb_build_object(
        'rsvp_type', NEW.rsvp_type, 
        'rsvp_enabled', NEW.rsvp_enabled,
        'event_title', NEW.title,
        'event_start_time', NEW.start_time
      )
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to enqueue RSVP notification when event is created/updated with RSVP enabled
DROP TRIGGER IF EXISTS enqueue_rsvp_notification_trigger ON events;
CREATE TRIGGER enqueue_rsvp_notification_trigger
  AFTER INSERT OR UPDATE OF rsvp_enabled, rsvp_type ON events
  FOR EACH ROW
  WHEN (NEW.rsvp_enabled = true AND NEW.rsvp_type IS NOT NULL)
  EXECUTE FUNCTION enqueue_rsvp_notification();
