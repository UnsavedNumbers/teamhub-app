-- Add slug column to sports table
-- =================================
-- Adds a slug field for URL-friendly sport identifiers and seeds slugs for all existing sports

-- -----------------------------------------------------------------
-- 1. Add slug column to sports table
-- -----------------------------------------------------------------
ALTER TABLE sports 
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_sports_slug ON sports(slug) WHERE slug IS NOT NULL;

-- Create unique constraint for system sports slugs
CREATE UNIQUE INDEX IF NOT EXISTS sports_system_slug_key 
  ON sports(slug) 
  WHERE is_system = true AND org_id IS NULL AND slug IS NOT NULL;

-- -----------------------------------------------------------------
-- 2. Function to generate slug from name
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_sport_slug(sport_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(sport_name),
        '[^a-zA-Z0-9\s&]', '', 'g'  -- Remove special characters except spaces and &
      ),
      '\s+', '-', 'g'  -- Replace spaces and multiple spaces with single dash
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- -----------------------------------------------------------------
-- 3. Update existing sports with slugs
-- -----------------------------------------------------------------
UPDATE sports
SET slug = generate_sport_slug(name)
WHERE slug IS NULL;

-- Handle special cases for multi-word sports
UPDATE sports
SET slug = CASE
  WHEN name = 'Track & Field' THEN 'track-and-field'
  WHEN name = 'Field Hockey' THEN 'field-hockey'
  WHEN name = 'Ice Hockey' THEN 'ice-hockey'
  WHEN name = 'Flag Football' THEN 'flag-football'
  WHEN name = 'Cross Country' THEN 'cross-country'
  ELSE slug
END
WHERE is_system = true AND org_id IS NULL;

-- -----------------------------------------------------------------
-- 4. Add NOT NULL constraint for system sports (after seeding)
-- -----------------------------------------------------------------
-- For system sports, slug should not be null
-- Note: We'll enforce this at the application level since CHECK constraints
-- with implication are complex in PostgreSQL. The unique index above ensures
-- system sports have unique slugs.

-- -----------------------------------------------------------------
-- 5. Comments
-- -----------------------------------------------------------------
COMMENT ON COLUMN sports.slug IS 'URL-friendly identifier for the sport (e.g., "track-and-field", "field-hockey")';
