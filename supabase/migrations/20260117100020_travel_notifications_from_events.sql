-- Phase 3: Travel Notifications from Events
-- ==========================================
-- Updates notification system to work with event-based travel detection
-- Implements Issue 6 solution: Smart notification timing

-- ============================================================================
-- PART 1: Update notification_outbox to support event-based notifications
-- ============================================================================

-- Make travel_plan_id nullable since we'll now reference events
ALTER TABLE notification_outbox 
  ALTER COLUMN travel_plan_id DROP NOT NULL;

-- Add event_id column for event-based notifications
ALTER TABLE notification_outbox 
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notification_outbox_event_id 
  ON notification_outbox(event_id);

COMMENT ON COLUMN notification_outbox.event_id IS 
  'Reference to event for event-based travel notifications';

-- ============================================================================
-- PART 2: Create Travel Event Notification Trigger Function
-- ============================================================================
-- Implements Issue 6: Smart notification timing
-- - Notify on travel status change (becomes travel or stops being travel)
-- - Notify on significant updates to existing travel events

CREATE OR REPLACE FUNCTION enqueue_travel_event_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_was_travel BOOLEAN;
  v_is_travel BOOLEAN;
  v_significant_update BOOLEAN := false;
  v_event_type TEXT;
  v_dedupe_key TEXT;
BEGIN
  -- Calculate travel status before and after
  -- For OLD, we need to temporarily consider what the function would return
  -- Since the function reads current state, we check based on known indicators
  v_was_travel := COALESCE(OLD.requires_travel, false) OR 
                  COALESCE(OLD.overnight, false) OR
                  OLD.hotel_name IS NOT NULL OR
                  OLD.type = 'travel' OR
                  (OLD.travel_override IS NOT NULL AND (OLD.travel_override->>'is_travel')::boolean = true);
                  
  v_is_travel := is_travel_event(NEW.id);
  
  -- Check for significant updates to existing travel events
  IF v_was_travel AND v_is_travel THEN
    v_significant_update := 
      -- Hotel info changed
      (COALESCE(OLD.hotel_name,'') IS DISTINCT FROM COALESCE(NEW.hotel_name,'')) OR
      (COALESCE(OLD.hotel_address,'') IS DISTINCT FROM COALESCE(NEW.hotel_address,'')) OR
      -- Cancellation status changed
      (OLD.is_cancelled IS DISTINCT FROM NEW.is_cancelled) OR
      -- Date shift > 24 hours
      (ABS(EXTRACT(EPOCH FROM (NEW.start_time - OLD.start_time))) > 86400) OR
      -- Meeting locations changed
      (COALESCE(OLD.meeting_locations::text,'{}') IS DISTINCT FROM COALESCE(NEW.meeting_locations::text,'{}'));
  END IF;
  
  -- Determine notification type
  IF NOT v_was_travel AND v_is_travel THEN
    -- Event became a travel event
    v_event_type := 'travel_published';
    v_dedupe_key := 'travel:event:' || NEW.id::text || ':published:' || COALESCE(NEW.updated_at::text, now()::text);
    
  ELSIF v_was_travel AND NOT v_is_travel THEN
    -- Event stopped being a travel event
    v_event_type := 'travel_cancelled';
    v_dedupe_key := 'travel:event:' || NEW.id::text || ':cancelled:' || COALESCE(NEW.updated_at::text, now()::text);
    
  ELSIF NEW.is_cancelled = true AND OLD.is_cancelled = false AND v_is_travel THEN
    -- Travel event was cancelled
    v_event_type := 'travel_cancelled';
    v_dedupe_key := 'travel:event:' || NEW.id::text || ':event_cancelled:' || COALESCE(NEW.updated_at::text, now()::text);
    
  ELSIF v_significant_update THEN
    -- Significant update to existing travel event
    v_event_type := 'travel_updated';
    v_dedupe_key := 'travel:event:' || NEW.id::text || ':updated:' || COALESCE(NEW.updated_at::text, now()::text);
    
  ELSE
    -- No notification needed
    RETURN NEW;
  END IF;
  
  -- Enqueue the notification
  INSERT INTO notification_outbox (
    event_type, 
    dedupe_key, 
    travel_plan_id,
    event_id,
    team_id, 
    season_id, 
    payload
  )
  VALUES (
    v_event_type,
    v_dedupe_key,
    NULL, -- No travel_plan reference for event-based notifications
    NEW.id,
    NEW.team_id,
    NEW.season_id,
    jsonb_build_object(
      'event_id', NEW.id,
      'title', NEW.title,
      'start_time', NEW.start_time,
      'end_time', NEW.end_time,
      'hotel_name', NEW.hotel_name,
      'hotel_address', NEW.hotel_address,
      'is_cancelled', NEW.is_cancelled,
      'type', 'event_based',
      'notification_reason', v_event_type
    )
  )
  ON CONFLICT (dedupe_key) DO NOTHING;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enqueue_travel_event_notification() IS 
  'Enqueues notifications for travel-related event changes. Triggers on travel status changes and significant updates.';

-- ============================================================================
-- PART 3: Create Trigger for Event-Based Travel Notifications
-- ============================================================================

-- Drop old trigger if exists (we'll create a new one)
DROP TRIGGER IF EXISTS trg_enqueue_travel_event_notification ON events;

CREATE TRIGGER trg_enqueue_travel_event_notification
  AFTER UPDATE ON events
  FOR EACH ROW
  WHEN (
    -- Any travel-relevant field changed
    OLD.requires_travel IS DISTINCT FROM NEW.requires_travel OR
    OLD.overnight IS DISTINCT FROM NEW.overnight OR
    OLD.hotel_name IS DISTINCT FROM NEW.hotel_name OR
    OLD.hotel_address IS DISTINCT FROM NEW.hotel_address OR
    OLD.is_cancelled IS DISTINCT FROM NEW.is_cancelled OR
    OLD.type IS DISTINCT FROM NEW.type OR
    OLD.travel_override IS DISTINCT FROM NEW.travel_override OR
    OLD.meeting_locations IS DISTINCT FROM NEW.meeting_locations OR
    -- Significant time change
    ABS(EXTRACT(EPOCH FROM (NEW.start_time - OLD.start_time))) > 86400
  )
  EXECUTE FUNCTION enqueue_travel_event_notification();

-- Also trigger on INSERT for new events that are immediately travel
CREATE OR REPLACE FUNCTION enqueue_new_travel_event_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify if the new event is a travel event
  IF is_travel_event(NEW.id) THEN
    INSERT INTO notification_outbox (
      event_type, 
      dedupe_key, 
      travel_plan_id,
      event_id,
      team_id, 
      season_id, 
      payload
    )
    VALUES (
      'travel_published',
      'travel:event:' || NEW.id::text || ':created:' || COALESCE(NEW.created_at::text, now()::text),
      NULL,
      NEW.id,
      NEW.team_id,
      NEW.season_id,
      jsonb_build_object(
        'event_id', NEW.id,
        'title', NEW.title,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'hotel_name', NEW.hotel_name,
        'hotel_address', NEW.hotel_address,
        'type', 'event_based',
        'notification_reason', 'new_travel_event'
      )
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_new_travel_event_notification ON events;

CREATE TRIGGER trg_enqueue_new_travel_event_notification
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_new_travel_event_notification();

-- ============================================================================
-- PART 4: Updated Recipient Resolution Function for Event-Based Notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION travel_event_recipient_emails(p_team_id UUID)
RETURNS TABLE(email TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT u.email
  FROM users u
  JOIN athletes c ON c.family_id = u.family_id
  JOIN team_memberships tm ON tm.athlete_id = c.id
  WHERE u.role = 'parent'
    AND tm.team_id = p_team_id
    AND tm.status = 'active'
    AND u.email IS NOT NULL
    AND u.email <> '';
$$;

COMMENT ON FUNCTION travel_event_recipient_emails(UUID) IS 
  'Returns distinct parent email addresses for a given team. Used for travel event notifications.';

-- ============================================================================
-- PART 5: Helper function to get pending travel notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_travel_notifications(p_limit INT DEFAULT 100)
RETURNS TABLE (
  notification_id UUID,
  event_type TEXT,
  event_id UUID,
  team_id UUID,
  title TEXT,
  start_time TIMESTAMPTZ,
  payload JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    n.id,
    n.event_type,
    n.event_id,
    n.team_id,
    COALESCE(n.payload->>'title', e.title) as title,
    COALESCE((n.payload->>'start_time')::timestamptz, e.start_time) as start_time,
    n.payload,
    n.created_at
  FROM notification_outbox n
  LEFT JOIN events e ON e.id = n.event_id
  WHERE n.status = 'pending'
    AND n.event_type LIKE 'travel_%'
  ORDER BY n.created_at ASC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION get_pending_travel_notifications(INT) IS 
  'Returns pending travel notifications for processing by Edge Function';
