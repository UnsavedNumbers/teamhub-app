-- Adds update_event_rsvp_config RPC used by admin event editor
-- Safely updates RSVP config and optionally clears existing RSVPs on change

CREATE OR REPLACE FUNCTION update_event_rsvp_config(
  p_event_id UUID,
  p_rsvp_enabled BOOLEAN,
  p_rsvp_type TEXT,
  p_clear_existing BOOLEAN
)
RETURNS TABLE (
  success BOOLEAN,
  error TEXT,
  has_data BOOLEAN
) AS $$
DECLARE
  v_current_enabled BOOLEAN;
  v_current_type TEXT;
  v_general_count INTEGER;
  v_athlete_count INTEGER;
  v_config_changed BOOLEAN;
BEGIN
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'Event ID is required';
  END IF;

  SELECT rsvp_enabled, rsvp_type
  INTO v_current_enabled, v_current_type
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Normalize: if RSVP disabled, force type to NULL
  IF NOT p_rsvp_enabled THEN
    p_rsvp_type := NULL;
  END IF;

  -- Validate RSVP type when enabled
  IF p_rsvp_enabled AND p_rsvp_type IS NULL THEN
    RAISE EXCEPTION 'RSVP type is required when RSVP is enabled';
  END IF;

  IF p_rsvp_enabled AND p_rsvp_type NOT IN ('general', 'athlete') THEN
    RAISE EXCEPTION 'Invalid RSVP type';
  END IF;

  v_config_changed :=
    (v_current_enabled IS DISTINCT FROM p_rsvp_enabled)
    OR (v_current_type IS DISTINCT FROM p_rsvp_type);

  IF v_config_changed THEN
    SELECT COUNT(*) INTO v_general_count
    FROM event_general_rsvps
    WHERE event_id = p_event_id;

    SELECT COUNT(*) INTO v_athlete_count
    FROM event_rsvps
    WHERE event_id = p_event_id;

    IF (v_general_count > 0 OR v_athlete_count > 0) THEN
      IF NOT p_clear_existing THEN
        RETURN QUERY SELECT false, 'existing_rsvps', true;
        RETURN;
      END IF;

      DELETE FROM event_general_rsvps WHERE event_id = p_event_id;
      DELETE FROM event_rsvps WHERE event_id = p_event_id;
    END IF;
  END IF;

  UPDATE events
  SET rsvp_enabled = p_rsvp_enabled,
      rsvp_type = p_rsvp_type,
      updated_at = NOW()
  WHERE id = p_event_id;

  RETURN QUERY SELECT true, NULL, false;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION update_event_rsvp_config(UUID, BOOLEAN, TEXT, BOOLEAN) TO authenticated;
