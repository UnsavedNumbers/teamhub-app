-- Fix Missing Fields in Schema
-- ==============================
-- This migration adds fields that are referenced in code but missing from the schema
-- OR documents fields that should be removed from code

-- ============================================================================
-- 1. RSVP Fields on Events (EXISTS in migration 050, but types not regenerated)
-- ============================================================================
-- These fields already exist via migration 050_rsvp_configuration.sql
-- Just ensuring they're present and have proper constraints

DO $$ 
BEGIN
  -- Ensure rsvp_enabled exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'rsvp_enabled'
  ) THEN
    ALTER TABLE events 
      ADD COLUMN rsvp_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Ensure rsvp_type exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'rsvp_type'
  ) THEN
    ALTER TABLE events 
      ADD COLUMN rsvp_type TEXT;
  END IF;

  -- Ensure constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'rsvp_config_check' AND table_name = 'events'
  ) THEN
    ALTER TABLE events 
      ADD CONSTRAINT rsvp_config_check 
      CHECK (
        (rsvp_enabled = false AND rsvp_type IS NULL) OR 
        (rsvp_enabled = true AND rsvp_type IN ('general', 'athlete'))
      );
  END IF;
END $$;

-- ============================================================================
-- 2. maps_url on event_locations (DECISION: ADD - used for Google Maps links)
-- ============================================================================
-- This field is referenced in code for displaying map links
-- Add it to event_locations table

ALTER TABLE event_locations 
  ADD COLUMN IF NOT EXISTS maps_url TEXT;

COMMENT ON COLUMN event_locations.maps_url IS 'Google Maps or other map service URL for this location';

-- ============================================================================
-- 3. version on license_tiers (DECISION: ADD - used for optimistic locking)
-- ============================================================================
-- This field is used for optimistic locking in license tier updates
-- Add it to license_tiers table (only if table exists)

DO $$ 
BEGIN
  -- Check if license_tiers table exists before adding column
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'license_tiers'
  ) THEN
    ALTER TABLE license_tiers 
      ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

    COMMENT ON COLUMN license_tiers.version IS 'Version number for optimistic locking during updates';

    -- Create index for version queries
    CREATE INDEX IF NOT EXISTS idx_license_tiers_version ON license_tiers(version);

    -- Update existing license_tiers to have version = 1
    UPDATE license_tiers 
    SET version = 1 
    WHERE version IS NULL;
  END IF;
END $$;

-- ============================================================================
-- 4. Create missing tables that are referenced but don't exist
-- ============================================================================

-- Create family_members table if it doesn't exist
-- This table links users to families (for parent-child relationships)
-- Derived from child_guardians: users who are guardians of children in a family
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'guardian', 'emergency_contact')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(family_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);

-- Enable RLS
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy: Users can see their own family memberships
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'family_members' 
    AND policyname = 'Users can view their own family memberships'
  ) THEN
    CREATE POLICY "Users can view their own family memberships"
      ON family_members
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Populate family_members from child_guardians if child_guardians exists
-- This creates the family_members entries based on existing guardian relationships
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'child_guardians'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'children'
  ) THEN
    -- Insert family memberships from child_guardians
    INSERT INTO family_members (family_id, user_id, role, is_primary, created_at, updated_at)
    SELECT DISTINCT
      c.family_id,
      cg.user_id,
      'parent'::TEXT,
      false,
      NOW(),
      NOW()
    FROM child_guardians cg
    JOIN children c ON c.id = cg.child_id
    WHERE cg.status = 'active'
      AND c.family_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM family_members fm
        WHERE fm.family_id = c.family_id AND fm.user_id = cg.user_id
      )
    ON CONFLICT (family_id, user_id) DO NOTHING;
  END IF;
END $$;

-- Create event_attendance table if it doesn't exist
DO $$ 
BEGIN
  -- Create enum type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_attendance_status') THEN
    CREATE TYPE event_attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  status event_attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  recorded_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(event_id, child_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_attendance_event_id ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_child_id ON event_attendance(child_id);

-- Enable RLS
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

-- Create license_tiers table if it doesn't exist (from license entitlements system)
CREATE TABLE IF NOT EXISTS license_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key TEXT UNIQUE NOT NULL,
  tier_name TEXT NOT NULL,
  description TEXT,
  stripe_price_id TEXT UNIQUE NOT NULL,
  stripe_verified_at TIMESTAMPTZ,
  stripe_product_name TEXT,
  stripe_amount_cents INTEGER,
  stripe_interval TEXT,
  stripe_currency TEXT,
  stripe_active BOOLEAN,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for license_tiers
CREATE INDEX IF NOT EXISTS idx_license_tiers_tier_key ON license_tiers(tier_key);
CREATE INDEX IF NOT EXISTS idx_license_tiers_status ON license_tiers(status);
CREATE INDEX IF NOT EXISTS idx_license_tiers_stripe_price_id ON license_tiers(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_license_tiers_version ON license_tiers(version);

-- Enable RLS
ALTER TABLE license_tiers ENABLE ROW LEVEL SECURITY;
