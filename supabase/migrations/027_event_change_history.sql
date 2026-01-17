-- Phase 07: Event Change History (Audit Trail)
-- ==============================================
-- Tracks all changes to events for audit purposes and notification triggers

-- Create the event_change_history table
CREATE TABLE IF NOT EXISTS event_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  changed_by_user_id UUID NOT NULL REFERENCES users(id),
  change_type TEXT NOT NULL, -- 'created', 'updated', 'cancelled', 'restored', 'rescheduled'
  field_name TEXT, -- NULL for creation, specific field for updates
  old_value TEXT,
  new_value TEXT,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_event_history_event_id ON event_change_history(event_id);
CREATE INDEX IF NOT EXISTS idx_event_history_created_at ON event_change_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_history_change_type ON event_change_history(change_type);
CREATE INDEX IF NOT EXISTS idx_event_history_notification_sent ON event_change_history(notification_sent) WHERE notification_sent = false;

-- Add check constraint for valid change types
ALTER TABLE event_change_history DROP CONSTRAINT IF EXISTS valid_change_type;
ALTER TABLE event_change_history ADD CONSTRAINT valid_change_type CHECK (
  change_type IN ('created', 'updated', 'cancelled', 'restored', 'rescheduled', 'deleted')
);

-- Create function to log event changes
CREATE OR REPLACE FUNCTION log_event_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log event creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO event_change_history (
      event_id,
      changed_by_user_id,
      change_type
    ) VALUES (
      NEW.id,
      COALESCE(NEW.created_by_user_id, auth.uid()),
      'created'
    );
    RETURN NEW;
  END IF;

  -- Log event updates
  IF TG_OP = 'UPDATE' THEN
    -- Log time changes (rescheduling)
    IF OLD.start_time != NEW.start_time OR OLD.end_time != NEW.end_time THEN
      INSERT INTO event_change_history (
        event_id,
        changed_by_user_id,
        change_type,
        field_name,
        old_value,
        new_value
      ) VALUES (
        NEW.id,
        auth.uid(),
        'rescheduled',
        'time',
        jsonb_build_object('start', OLD.start_time, 'end', OLD.end_time)::text,
        jsonb_build_object('start', NEW.start_time, 'end', NEW.end_time)::text
      );
    END IF;

    -- Log location changes
    IF OLD.location IS DISTINCT FROM NEW.location THEN
      INSERT INTO event_change_history (
        event_id,
        changed_by_user_id,
        change_type,
        field_name,
        old_value,
        new_value
      ) VALUES (
        NEW.id,
        auth.uid(),
        'updated',
        'location',
        OLD.location,
        NEW.location
      );
    END IF;

    -- Log cancellation
    IF OLD.is_cancelled = false AND NEW.is_cancelled = true THEN
      INSERT INTO event_change_history (
        event_id,
        changed_by_user_id,
        change_type,
        field_name,
        old_value,
        new_value
      ) VALUES (
        NEW.id,
        COALESCE(NEW.cancelled_by_user_id, auth.uid()),
        'cancelled',
        'cancellation_reason',
        NULL,
        NEW.cancellation_reason
      );
    END IF;

    -- Log restoration (uncancellation)
    IF OLD.is_cancelled = true AND NEW.is_cancelled = false THEN
      INSERT INTO event_change_history (
        event_id,
        changed_by_user_id,
        change_type
      ) VALUES (
        NEW.id,
        auth.uid(),
        'restored'
      );
    END IF;

    RETURN NEW;
  END IF;

  -- Log event deletion
  IF TG_OP = 'DELETE' THEN
    INSERT INTO event_change_history (
      event_id,
      changed_by_user_id,
      change_type
    ) VALUES (
      OLD.id,
      auth.uid(),
      'deleted'
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for event changes
DROP TRIGGER IF EXISTS event_change_trigger ON events;
CREATE TRIGGER event_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION log_event_change();

-- Enable RLS on event_change_history
ALTER TABLE event_change_history ENABLE ROW LEVEL SECURITY;

-- Staff can view event history for their org's events
CREATE POLICY "Staff can view event history" ON event_change_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN teams t ON t.id = e.team_id
      JOIN users u ON u.id = auth.uid()
      WHERE e.id = event_change_history.event_id
      AND u.role IN ('admin', 'coach')
      AND u.org_id = t.org_id
    )
  );

-- System can insert history (via trigger)
CREATE POLICY "System can insert history" ON event_change_history
  FOR INSERT
  WITH CHECK (true);
