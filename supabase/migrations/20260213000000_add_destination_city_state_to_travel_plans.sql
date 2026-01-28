-- Add missing destination_city and destination_state columns to travel_plans table
-- These columns were referenced in the code but missing from the previous migration

DO $$ 
BEGIN
  -- Add destination_city column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'destination_city') THEN
    ALTER TABLE travel_plans ADD COLUMN destination_city TEXT;
  END IF;

  -- Add destination_state column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_plans' AND column_name = 'destination_state') THEN
    ALTER TABLE travel_plans ADD COLUMN destination_state TEXT;
  END IF;
END $$;
