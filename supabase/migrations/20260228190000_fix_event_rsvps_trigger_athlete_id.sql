-- Replace RSVP trigger functions to use event_rsvps.athlete_id (not child_id).
-- Run this on remote if create_rsvps_for_event() still references child_id after event_rsvps was renamed.

CREATE OR REPLACE FUNCTION create_rsvps_for_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rsvp_enabled = true AND NEW.rsvp_type = 'athlete' THEN
    INSERT INTO event_rsvps (event_id, athlete_id, status)
    SELECT
      NEW.id,
      tm.athlete_id,
      'unknown'
    FROM team_memberships tm
    WHERE tm.team_id = NEW.team_id
      AND tm.season_id = NEW.season_id
      AND tm.status = 'active'
    ON CONFLICT (event_id, athlete_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_rsvps_for_new_team_member()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO event_rsvps (event_id, athlete_id, status)
    SELECT
      e.id,
      NEW.athlete_id,
      'unknown'
    FROM events e
    WHERE e.team_id = NEW.team_id
      AND e.season_id = NEW.season_id
      AND e.rsvp_enabled = true
      AND e.rsvp_type = 'athlete'
      AND e.start_time > NOW()
    ON CONFLICT (event_id, athlete_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
