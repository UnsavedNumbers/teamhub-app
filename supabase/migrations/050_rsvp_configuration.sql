-- RSVP Configuration for Events
-- ===============================
-- Adds RSVP configuration fields to events table with proper constraints

-- Add RSVP configuration columns to events table
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS rsvp_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rsvp_type TEXT;

-- Add CHECK constraint to enforce valid state combinations
ALTER TABLE events 
  DROP CONSTRAINT IF EXISTS rsvp_config_check;

ALTER TABLE events 
  ADD CONSTRAINT rsvp_config_check 
  CHECK (
    (rsvp_enabled = false AND rsvp_type IS NULL) OR 
    (rsvp_enabled = true AND rsvp_type IN ('general', 'athlete'))
  );

-- Add index for efficient querying of RSVP-enabled events
CREATE INDEX IF NOT EXISTS idx_events_rsvp_enabled ON events(rsvp_enabled) WHERE rsvp_enabled = true;
CREATE INDEX IF NOT EXISTS idx_events_rsvp_type ON events(rsvp_type) WHERE rsvp_type IS NOT NULL;

-- Set default values for existing events (migration safety)
UPDATE events 
SET rsvp_enabled = false, rsvp_type = NULL 
WHERE rsvp_enabled IS NULL OR rsvp_type IS NULL;
