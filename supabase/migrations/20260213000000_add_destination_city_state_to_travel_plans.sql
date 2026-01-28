-- Add all missing destination, venue, and hotel columns to travel_plans table
-- These columns are referenced in the code but may be missing from previous migrations
-- This migration ensures all required columns exist regardless of migration order

DO $$ 
BEGIN
  -- Destination fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'destination_city') THEN
    ALTER TABLE travel_plans ADD COLUMN destination_city TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'destination_state') THEN
    ALTER TABLE travel_plans ADD COLUMN destination_state TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'destination_state_code') THEN
    ALTER TABLE travel_plans ADD COLUMN destination_state_code TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'destination_country') THEN
    ALTER TABLE travel_plans ADD COLUMN destination_country TEXT DEFAULT 'US';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'destination_place_id') THEN
    ALTER TABLE travel_plans ADD COLUMN destination_place_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'destination_lat') THEN
    ALTER TABLE travel_plans ADD COLUMN destination_lat DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'destination_lng') THEN
    ALTER TABLE travel_plans ADD COLUMN destination_lng DOUBLE PRECISION;
  END IF;

  -- Venue fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'venue_place_id') THEN
    ALTER TABLE travel_plans ADD COLUMN venue_place_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'venue_lat') THEN
    ALTER TABLE travel_plans ADD COLUMN venue_lat DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'venue_lng') THEN
    ALTER TABLE travel_plans ADD COLUMN venue_lng DOUBLE PRECISION;
  END IF;

  -- Hotel fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'hotel_place_id') THEN
    ALTER TABLE travel_plans ADD COLUMN hotel_place_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'hotel_lat') THEN
    ALTER TABLE travel_plans ADD COLUMN hotel_lat DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'hotel_lng') THEN
    ALTER TABLE travel_plans ADD COLUMN hotel_lng DOUBLE PRECISION;
  END IF;

  -- Additional fields that may be missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'maps_url') THEN
    ALTER TABLE travel_plans ADD COLUMN maps_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'itinerary_file_path') THEN
    ALTER TABLE travel_plans ADD COLUMN itinerary_file_path TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'status') THEN
    ALTER TABLE travel_plans ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
  END IF;

  -- Status lifecycle timestamps (from migration 033)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'published_at') THEN
    ALTER TABLE travel_plans ADD COLUMN published_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'cancelled_at') THEN
    ALTER TABLE travel_plans ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;

  -- Meeting locations (from migration 033)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'meeting_locations') THEN
    ALTER TABLE travel_plans ADD COLUMN meeting_locations JSONB;
  END IF;
END $$;
