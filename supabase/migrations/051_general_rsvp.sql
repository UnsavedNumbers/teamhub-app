-- General RSVP Table
-- ==================
-- Creates table for general (head count) RSVPs per parent user

-- Create general RSVP status enum
DO $$ BEGIN
  CREATE TYPE general_rsvp_status AS ENUM ('going', 'not_going', 'maybe');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create event_general_rsvps table
CREATE TABLE IF NOT EXISTS event_general_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status general_rsvp_status NOT NULL,
  note TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one RSVP per user per event (prevents duplicate RSVPs)
  UNIQUE(event_id, user_id),
  
  -- Ensure responded_at is set when status is provided
  CONSTRAINT general_rsvp_response_tracking CHECK (
    responded_at IS NOT NULL
  )
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_event_general_rsvps_event_id ON event_general_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_general_rsvps_user_id ON event_general_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_general_rsvps_status ON event_general_rsvps(status);
CREATE INDEX IF NOT EXISTS idx_event_general_rsvps_responded_at ON event_general_rsvps(responded_at DESC);

-- Add CHECK constraint on status
ALTER TABLE event_general_rsvps 
  ADD CONSTRAINT status_check 
  CHECK (status IN ('going', 'not_going', 'maybe'));

-- Add trigger for updated_at
CREATE TRIGGER update_event_general_rsvps_updated_at
  BEFORE UPDATE ON event_general_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically set responded_at when status changes
CREATE OR REPLACE FUNCTION set_general_rsvp_responded_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Always set responded_at when status is set
  IF NEW.responded_at IS NULL THEN
    NEW.responded_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER general_rsvp_responded_at_trigger
  BEFORE INSERT OR UPDATE ON event_general_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION set_general_rsvp_responded_at();

-- Enable RLS
ALTER TABLE event_general_rsvps ENABLE ROW LEVEL SECURITY;
