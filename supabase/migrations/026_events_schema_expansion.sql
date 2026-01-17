-- Phase 06: Events Schema Expansion
-- ===================================
-- Expands the events table to support all required event types and fields
-- from the Scheduling Calendar Feature specification

-- Add new event types to enum
DO $$ BEGIN
  -- Add tryout type
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'event_type' AND e.enumlabel = 'tryout') THEN
    ALTER TYPE event_type ADD VALUE 'tryout';
  END IF;
  
  -- Add travel type
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'event_type' AND e.enumlabel = 'travel') THEN
    ALTER TYPE event_type ADD VALUE 'travel';
  END IF;
  
  -- Add pickup_dropoff type
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'event_type' AND e.enumlabel = 'pickup_dropoff') THEN
    ALTER TYPE event_type ADD VALUE 'pickup_dropoff';
  END IF;
  
  -- Add social type
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'event_type' AND e.enumlabel = 'social') THEN
    ALTER TYPE event_type ADD VALUE 'social';
  END IF;
  
  -- Add blackout type
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'event_type' AND e.enumlabel = 'blackout') THEN
    ALTER TYPE event_type ADD VALUE 'blackout';
  END IF;
END $$;

-- Add new columns to events table
-- All columns are nullable or have defaults to avoid breaking existing data

-- Track who created the event
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id);

-- Explicit timezone storage (IANA timezone string)
ALTER TABLE events ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';

-- Uniform and equipment notes
ALTER TABLE events ADD COLUMN IF NOT EXISTS uniform_notes TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS equipment_notes TEXT;

-- Weather dependency flag
ALTER TABLE events ADD COLUMN IF NOT EXISTS weather_dependent BOOLEAN DEFAULT false;

-- External links (e.g., tournament brackets, livestream)
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_link TEXT;

-- Cancellation tracking
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancelled_by_user_id UUID REFERENCES users(id);

-- Add check constraint for cancellation data integrity
ALTER TABLE events DROP CONSTRAINT IF EXISTS cancellation_data_integrity;
ALTER TABLE events ADD CONSTRAINT cancellation_data_integrity CHECK (
  (is_cancelled = false AND cancellation_reason IS NULL AND cancelled_at IS NULL AND cancelled_by_user_id IS NULL) OR
  (is_cancelled = true AND cancelled_at IS NOT NULL)
);

-- Add check constraint for timezone validity (basic check)
ALTER TABLE events DROP CONSTRAINT IF EXISTS valid_timezone;
ALTER TABLE events ADD CONSTRAINT valid_timezone CHECK (
  timezone ~ '^[A-Za-z]+/[A-Za-z_]+$' OR timezone = 'UTC'
);

-- Add check constraint for time ordering
ALTER TABLE events DROP CONSTRAINT IF EXISTS valid_time_order;
ALTER TABLE events ADD CONSTRAINT valid_time_order CHECK (
  end_time > start_time AND
  (arrival_time IS NULL OR arrival_time < start_time)
);

-- Create index for cancelled events filtering
CREATE INDEX IF NOT EXISTS idx_events_is_cancelled ON events(is_cancelled);

-- Create index for timezone queries
CREATE INDEX IF NOT EXISTS idx_events_timezone ON events(timezone);

-- Create index for created_by_user_id
CREATE INDEX IF NOT EXISTS idx_events_created_by_user_id ON events(created_by_user_id);

-- Update the updated_at trigger (already exists, but ensure it's working)
-- The trigger update_events_updated_at should already exist from migration 009
