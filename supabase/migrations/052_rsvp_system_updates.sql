-- RSVP System Updates
-- ===================
-- Updates existing RSVP system to respect RSVP configuration

-- Remove auto-create trigger (we'll replace it with conditional version)
DROP TRIGGER IF EXISTS create_rsvps_on_event_insert ON events;

-- Create conditional trigger function that only creates athlete RSVPs when enabled
CREATE OR REPLACE FUNCTION create_rsvps_for_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create RSVPs if RSVP is enabled and type is 'athlete'
  IF NEW.rsvp_enabled = true AND NEW.rsvp_type = 'athlete' THEN
    -- Create RSVP records for all active team members
    INSERT INTO event_rsvps (event_id, child_id, status)
    SELECT 
      NEW.id,
      tm.child_id,
      'unknown'
    FROM team_memberships tm
    WHERE tm.team_id = NEW.team_id
      AND tm.season_id = NEW.season_id
      AND tm.status = 'active'
    ON CONFLICT (event_id, child_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger with conditional logic
CREATE TRIGGER create_rsvps_on_event_insert
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION create_rsvps_for_event();

-- Create trigger function for new team members (creates RSVPs for existing events)
CREATE OR REPLACE FUNCTION create_rsvps_for_new_team_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for active memberships
  IF NEW.status = 'active' THEN
    -- Create RSVPs for future events with athlete RSVP enabled
    INSERT INTO event_rsvps (event_id, child_id, status)
    SELECT 
      e.id,
      NEW.child_id,
      'unknown'
    FROM events e
    WHERE e.team_id = NEW.team_id
      AND e.season_id = NEW.season_id
      AND e.rsvp_enabled = true
      AND e.rsvp_type = 'athlete'
      AND e.start_time > NOW()
    ON CONFLICT (event_id, child_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for team membership insertions
DROP TRIGGER IF EXISTS create_rsvps_on_team_membership_insert ON team_memberships;
CREATE TRIGGER create_rsvps_on_team_membership_insert
  AFTER INSERT ON team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION create_rsvps_for_new_team_member();
