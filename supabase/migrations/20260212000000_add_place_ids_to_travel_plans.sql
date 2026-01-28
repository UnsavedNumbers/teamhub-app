-- Add place_id and coordinate columns to travel_plans table
-- These columns store Google Places API data for destinations, venues, and hotels

DO $$ 
BEGIN
  -- Destination fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'destination_place_id') THEN
    ALTER TABLE travel_plans ADD COLUMN destination_place_id TEXT;
  END IF;

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

END $$;
