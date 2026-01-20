-- Phase 05: Attendance Table
-- ===========================
-- RSVP per child per event

-- Create attendance status enum
DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('going', 'late', 'not_going');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  status attendance_status NOT NULL DEFAULT 'going',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, child_id)
);

-- Add indexes
CREATE INDEX idx_attendance_event_id ON attendance(event_id);
CREATE INDEX idx_attendance_athlete_id ON attendance(athlete_id);

-- Add trigger for updated_at
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- NOTE: RLS Policies for attendance are added in 017_deferred_rls_policies.sql
-- This is because they depend on users, children, events, and teams tables
