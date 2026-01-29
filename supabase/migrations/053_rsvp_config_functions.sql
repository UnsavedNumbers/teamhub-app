-- RSVP Configuration Functions
-- =============================
-- Safe functions for updating RSVP configuration with proper locking and validation

-- Function to safely update RSVP config (prevents race conditions)
CREATE OR REPLACE FUNCTION update_event_rsvp_config(
  p_event_id UUID,
  p_rsvp_enabled BOOLEAN,
  p_rsvp_type TEXT,
  p_clear_existing BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_existing_type TEXT;
  v_has_general_rsvps BOOLEAN;
  v_has_athlete_rsvps BOOLEAN;
BEGIN
  -- Lock event row to prevent concurrent updates
  SELECT rsvp_type INTO v_existing_type
  FROM events
  WHERE id = p_event_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Event not found');
  END IF;
  
  -- Validate new config
  IF p_rsvp_enabled = true AND p_rsvp_type NOT IN ('general', 'athlete') THEN
    RETURN jsonb_build_object('error', 'Invalid rsvp_type when enabled');
  END IF;
  
  IF p_rsvp_enabled = false AND p_rsvp_type IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'rsvp_type must be NULL when disabled');
  END IF;
  
  -- Check for existing RSVPs if type is changing
  IF p_rsvp_enabled = true AND p_rsvp_type != v_existing_type THEN
    SELECT EXISTS(SELECT 1 FROM event_general_rsvps WHERE event_id = p_event_id) INTO v_has_general_rsvps;
    SELECT EXISTS(SELECT 1 FROM event_rsvps WHERE event_id = p_event_id) INTO v_has_athlete_rsvps;
    
    IF (p_rsvp_type = 'athlete' AND v_has_general_rsvps) OR 
       (p_rsvp_type = 'general' AND v_has_athlete_rsvps) THEN
      IF p_clear_existing = false THEN
        RETURN jsonb_build_object(
          'error', 'Conflicting RSVPs exist', 
          'has_data', true,
          'has_general', v_has_general_rsvps,
          'has_athlete', v_has_athlete_rsvps
        );
      END IF;
      
      -- Clear conflicting RSVPs
      IF p_rsvp_type = 'athlete' THEN
        DELETE FROM event_general_rsvps WHERE event_id = p_event_id;
      ELSE
        DELETE FROM event_rsvps WHERE event_id = p_event_id;
      END IF;
    END IF;
  END IF;
  
  -- Update event config
  UPDATE events
  SET rsvp_enabled = p_rsvp_enabled,
      rsvp_type = CASE WHEN p_rsvp_enabled THEN p_rsvp_type ELSE NULL END,
      updated_at = NOW()
  WHERE id = p_event_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if child is eligible for event
CREATE OR REPLACE FUNCTION is_child_eligible_for_event(
  p_child_id UUID,
  p_event_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN events e ON e.team_id = tm.team_id AND e.season_id = tm.season_id
    WHERE tm.athlete_id = p_child_id
      AND e.id = p_event_id
      AND tm.status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Unified view for RSVP summaries (prevents type mismatch)
CREATE OR REPLACE VIEW event_rsvps_unified AS
SELECT 
  e.id as event_id,
  e.rsvp_type,
  CASE 
    WHEN e.rsvp_type = 'general' THEN
      (SELECT COUNT(*) FROM event_general_rsvps WHERE event_id = e.id)
    WHEN e.rsvp_type = 'athlete' THEN
      (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id)
    ELSE 0
  END as total_responses,
  CASE 
    WHEN e.rsvp_type = 'general' THEN
      (SELECT COUNT(*) FILTER (WHERE status = 'going') FROM event_general_rsvps WHERE event_id = e.id)
    WHEN e.rsvp_type = 'athlete' THEN
      (SELECT COUNT(*) FILTER (WHERE status = 'going') FROM event_rsvps WHERE event_id = e.id)
    ELSE 0
  END as going_count,
  CASE 
    WHEN e.rsvp_type = 'general' THEN
      (SELECT COUNT(*) FILTER (WHERE status = 'not_going') FROM event_general_rsvps WHERE event_id = e.id)
    WHEN e.rsvp_type = 'athlete' THEN
      (SELECT COUNT(*) FILTER (WHERE status = 'not_going') FROM event_rsvps WHERE event_id = e.id)
    ELSE 0
  END as not_going_count,
  CASE 
    WHEN e.rsvp_type = 'general' THEN
      (SELECT COUNT(*) FILTER (WHERE status = 'maybe') FROM event_general_rsvps WHERE event_id = e.id)
    WHEN e.rsvp_type = 'athlete' THEN
      (SELECT COUNT(*) FILTER (WHERE status = 'late') FROM event_rsvps WHERE event_id = e.id)
    ELSE 0
  END as maybe_or_late_count,
  CASE 
    WHEN e.rsvp_type = 'athlete' THEN
      (SELECT COUNT(*) FILTER (WHERE status = 'unknown') FROM event_rsvps WHERE event_id = e.id)
    ELSE 0
  END as unknown_count
FROM events e
WHERE e.rsvp_enabled = true;
