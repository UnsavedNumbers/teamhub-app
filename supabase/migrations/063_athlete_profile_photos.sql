-- Migration: Implement athlete profile photo system
-- ========================================================
-- Adds profile_photo_updated_at and has_profile_photo columns
-- Profile photos are stored in public-media bucket with fixed paths:
-- orgs/{org_id}/athletes/{athlete_id}/profile/{original.jpg|512.jpg|256.jpg}

-- ==============================================
-- Add profile photo columns to athletes table
-- ==============================================
ALTER TABLE athletes 
  ADD COLUMN IF NOT EXISTS profile_photo_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS has_profile_photo BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN athletes.profile_photo_updated_at IS 'Timestamp when profile photo was last updated. Used for cache busting.';
COMMENT ON COLUMN athletes.has_profile_photo IS 'Whether athlete has a profile photo. Derived from storage existence.';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_athletes_has_profile_photo ON athletes(has_profile_photo) WHERE has_profile_photo = TRUE;

-- ==============================================
-- Function: Update profile photo timestamp
-- ==============================================
CREATE OR REPLACE FUNCTION update_athlete_profile_photo_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- This will be called after profile photo upload
  -- The application will update this field directly
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_athlete_profile_photo_timestamp IS 'Trigger function for profile photo updates (currently no-op, updated by application)';
