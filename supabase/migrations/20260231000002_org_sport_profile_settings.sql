-- Migration: Create org_sport_profile_settings table
-- ====================================================
-- Purpose: Org-level overrides for which fields are required/enabled per sport
-- Allows orgs to customize which sport-specific fields they collect

-- Create the org_sport_profile_settings table
CREATE TABLE IF NOT EXISTS org_sport_profile_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sport_code TEXT NOT NULL,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT org_sport_profile_settings_unique_org_sport 
    UNIQUE(org_id, sport_code),
  CONSTRAINT org_sport_profile_settings_sport_code_format 
    CHECK (sport_code ~ '^[a-z0-9_]+$'),
  CONSTRAINT org_sport_profile_settings_version_positive 
    CHECK (version > 0)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_org_sport_profile_settings_org 
  ON org_sport_profile_settings(org_id);

CREATE INDEX IF NOT EXISTS idx_org_sport_profile_settings_sport 
  ON org_sport_profile_settings(sport_code);

-- Add trigger for updated_at
CREATE TRIGGER update_org_sport_profile_settings_updated_at
  BEFORE UPDATE ON org_sport_profile_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for version increment on update
CREATE OR REPLACE FUNCTION increment_org_sport_settings_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_org_sport_profile_settings_version
  BEFORE UPDATE ON org_sport_profile_settings
  FOR EACH ROW
  WHEN (OLD.overrides IS DISTINCT FROM NEW.overrides)
  EXECUTE FUNCTION increment_org_sport_settings_version();

-- Enable RLS (policies will be added in a later migration)
ALTER TABLE org_sport_profile_settings ENABLE ROW LEVEL SECURITY;

-- Add table comment for documentation
COMMENT ON TABLE org_sport_profile_settings IS 
  'Organization-specific overrides for sport profile field requirements. Allows orgs to customize which fields are required, optional, or hidden for each sport.';

COMMENT ON COLUMN org_sport_profile_settings.overrides IS 
  'JSONB object mapping field_key to override settings. Example: {"primary_position": {"is_required": true}, "wingspan_in": {"is_enabled": false}}';

COMMENT ON COLUMN org_sport_profile_settings.version IS 
  'Version number for optimistic locking. Incremented automatically on each update to overrides.';

-- ============================================================================
-- EXAMPLE OVERRIDE STRUCTURE (for documentation)
-- ============================================================================
-- The overrides JSONB should follow this structure:
-- {
--   "field_key": {
--     "is_required": boolean,     // Override the default is_optional setting
--     "is_enabled": boolean,      // Override the default is_enabled setting
--     "custom_help_text": string  // Optional custom help text for this org
--   }
-- }
--
-- Example for basketball:
-- {
--   "primary_position": {
--     "is_required": true
--   },
--   "wingspan_in": {
--     "is_enabled": false  // This org doesn't collect wingspan
--   },
--   "jersey_size": {
--     "is_required": true,
--     "custom_help_text": "Required for uniform ordering deadline: March 1st"
--   }
-- }
