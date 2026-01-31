-- Add place_id column to event_locations table
-- This stores the Google Place ID for structured address data

DO $$ 
BEGIN
  -- Add place_id to event_locations if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_locations' AND column_name = 'place_id'
  ) THEN
    ALTER TABLE event_locations ADD COLUMN place_id TEXT;
    
    COMMENT ON COLUMN event_locations.place_id IS 'Google Places API place_id for structured address data';
  END IF;
END $$;

-- Add place_id to organizations table if it doesn't exist
-- Organizations may have address fields (address, city, state, zip)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'place_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN place_id TEXT;
    
    COMMENT ON COLUMN organizations.place_id IS 'Google Places API place_id for structured address data';
  END IF;
END $$;

-- Create indexes for place_id lookups (optional but useful for queries)
CREATE INDEX IF NOT EXISTS idx_event_locations_place_id ON event_locations(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_place_id ON organizations(place_id) WHERE place_id IS NOT NULL;
