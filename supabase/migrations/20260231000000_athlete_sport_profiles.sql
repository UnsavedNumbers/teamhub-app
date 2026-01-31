-- Migration: Create athlete_sport_profiles table
-- ================================================
-- Purpose: Store sport-specific profile and equipment data per athlete, per sport
-- Key principle: 1 row per athlete per sport per org
-- Design: JSONB for flexibility, normalized universal fields in athletes table

-- Create the athlete_sport_profiles table
CREATE TABLE IF NOT EXISTS athlete_sport_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  sport_code TEXT NOT NULL,
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  equipment_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  completeness_score INT NOT NULL DEFAULT 0,
  last_verified_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT athlete_sport_profiles_unique_athlete_sport_org 
    UNIQUE(org_id, athlete_id, sport_code),
  CONSTRAINT athlete_sport_profiles_sport_code_format 
    CHECK (sport_code ~ '^[a-z0-9_]+$'),
  CONSTRAINT athlete_sport_profiles_completeness_range 
    CHECK (completeness_score >= 0 AND completeness_score <= 100)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_athlete_sport_profiles_org 
  ON athlete_sport_profiles(org_id);

CREATE INDEX IF NOT EXISTS idx_athlete_sport_profiles_athlete 
  ON athlete_sport_profiles(athlete_id);

CREATE INDEX IF NOT EXISTS idx_athlete_sport_profiles_sport 
  ON athlete_sport_profiles(sport_code);

CREATE INDEX IF NOT EXISTS idx_athlete_sport_profiles_org_sport 
  ON athlete_sport_profiles(org_id, sport_code);

-- Add trigger for updated_at (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_athlete_sport_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_athlete_sport_profiles_updated_at
      BEFORE UPDATE ON athlete_sport_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable RLS (policies will be added in a later migration)
ALTER TABLE athlete_sport_profiles ENABLE ROW LEVEL SECURITY;

-- Add table comment for documentation
COMMENT ON TABLE athlete_sport_profiles IS 
  'Sport-specific profile and equipment data for athletes. Uses JSONB for flexibility while maintaining validation through sport_field_definitions table.';

COMMENT ON COLUMN athlete_sport_profiles.sport_code IS 
  'Snake_case sport identifier (e.g., basketball, flag_football). Must match sport_field_definitions.';

COMMENT ON COLUMN athlete_sport_profiles.profile_data IS 
  'JSONB containing sport-specific profile fields (positions, experience, metrics, etc.). Schema driven by sport_field_definitions.';

COMMENT ON COLUMN athlete_sport_profiles.equipment_data IS 
  'JSONB containing sport-specific equipment sizing (jerseys, shoes, protective gear, etc.). Schema driven by sport_field_definitions.';

COMMENT ON COLUMN athlete_sport_profiles.completeness_score IS 
  'Percentage (0-100) of required fields completed based on org_sport_profile_settings. Calculated on upsert.';

COMMENT ON COLUMN athlete_sport_profiles.last_verified_at IS 
  'Timestamp when parent/guardian last verified this data is current. Used for reminder campaigns.';
