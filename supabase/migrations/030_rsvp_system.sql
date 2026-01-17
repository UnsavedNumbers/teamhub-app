-- Phase 10: RSVP System
-- ======================
-- Implements RSVP tracking separate from attendance

-- Create RSVP status enum
DO $$ BEGIN
  CREATE TYPE rsvp_status AS ENUM ('going', 'late', 'not_going', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create event_rsvps table
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL DEFAULT 'unknown',
  responded_at TIMESTAMPTZ,
  responded_by_user_id UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one RSVP per child per event
  UNIQUE(event_id, child_id),
  
  -- Ensure responded_at is set when status is not unknown
  CONSTRAINT rsvp_response_tracking CHECK (
    (status = 'unknown' AND responded_at IS NULL) OR
    (status != 'unknown' AND responded_at IS NOT NULL)
  )
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_child_id ON event_rsvps(child_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON event_rsvps(status);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_responded_at ON event_rsvps(responded_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_event_rsvps_updated_at
  BEFORE UPDATE ON event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically set responded_at when status changes
CREATE OR REPLACE FUNCTION set_rsvp_responded_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is changing from unknown to something else, set responded_at
  IF OLD.status = 'unknown' AND NEW.status != 'unknown' AND NEW.responded_at IS NULL THEN
    NEW.responded_at := NOW();
    NEW.responded_by_user_id := auth.uid();
  END IF;
  
  -- If status is changing back to unknown, clear responded_at
  IF NEW.status = 'unknown' THEN
    NEW.responded_at := NULL;
    NEW.responded_by_user_id := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rsvp_responded_at_trigger
  BEFORE INSERT OR UPDATE ON event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION set_rsvp_responded_at();

-- Enable RLS on event_rsvps
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Parents can manage RSVPs for their children
CREATE POLICY "Parents can manage their children's RSVPs" ON event_rsvps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN children c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND c.id = event_rsvps.child_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN children c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND c.id = event_rsvps.child_id
    )
  );

-- Coaches and admins can view RSVPs for their team events
CREATE POLICY "Staff can view event RSVPs" ON event_rsvps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN teams t ON t.id = e.team_id
      JOIN users u ON u.id = auth.uid()
      WHERE e.id = event_rsvps.event_id
      AND u.role IN ('admin', 'coach')
      AND u.org_id = t.org_id
    )
  );

-- Coaches and admins can update RSVPs (for manual tracking)
CREATE POLICY "Staff can update event RSVPs" ON event_rsvps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN teams t ON t.id = e.team_id
      JOIN users u ON u.id = auth.uid()
      WHERE e.id = event_rsvps.event_id
      AND u.role IN ('admin', 'coach')
      AND u.org_id = t.org_id
    )
  );

-- Function to get RSVP summary for an event
CREATE OR REPLACE FUNCTION get_event_rsvp_summary(p_event_id UUID)
RETURNS TABLE (
  total_children INTEGER,
  going_count INTEGER,
  late_count INTEGER,
  not_going_count INTEGER,
  unknown_count INTEGER,
  response_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_children,
    COUNT(*) FILTER (WHERE status = 'going')::INTEGER AS going_count,
    COUNT(*) FILTER (WHERE status = 'late')::INTEGER AS late_count,
    COUNT(*) FILTER (WHERE status = 'not_going')::INTEGER AS not_going_count,
    COUNT(*) FILTER (WHERE status = 'unknown')::INTEGER AS unknown_count,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE status != 'unknown')::DECIMAL / COUNT(*)) * 100, 2)
    END AS response_rate
  FROM event_rsvps
  WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to auto-create RSVPs for team members when event is created
CREATE OR REPLACE FUNCTION create_rsvps_for_event()
RETURNS TRIGGER AS $$
BEGIN
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create RSVPs when event is created
DROP TRIGGER IF EXISTS create_rsvps_on_event_insert ON events;
CREATE TRIGGER create_rsvps_on_event_insert
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION create_rsvps_for_event();

-- Function to sync RSVP to attendance (pre-populate attendance from RSVP)
CREATE OR REPLACE FUNCTION sync_rsvp_to_attendance(p_event_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Insert or update attendance records based on RSVP status
  INSERT INTO attendance (event_id, child_id, status, note)
  SELECT 
    r.event_id,
    r.child_id,
    CASE 
      WHEN r.status = 'going' THEN 'going'::attendance_status
      WHEN r.status = 'late' THEN 'late'::attendance_status
      WHEN r.status = 'not_going' THEN 'not_going'::attendance_status
      ELSE 'going'::attendance_status -- Default to going for unknown
    END,
    r.note
  FROM event_rsvps r
  WHERE r.event_id = p_event_id
  AND r.status != 'unknown'
  ON CONFLICT (event_id, child_id) DO UPDATE
  SET 
    status = EXCLUDED.status,
    note = EXCLUDED.note,
    updated_at = NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
