-- Programs Schema Update: Add description and age range columns
-- =================================================================

-- Add new columns to programs table
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS age_min INTEGER,
  ADD COLUMN IF NOT EXISTS age_max INTEGER;

-- Add check constraint for age range validity
ALTER TABLE programs
  DROP CONSTRAINT IF EXISTS check_programs_age_range;

ALTER TABLE programs
  ADD CONSTRAINT check_programs_age_range 
  CHECK (
    (age_min IS NULL AND age_max IS NULL) OR
    (age_min IS NOT NULL AND age_max IS NOT NULL AND age_min <= age_max)
  );

-- Add comment for documentation
COMMENT ON COLUMN programs.description IS 'Optional description of the program';
COMMENT ON COLUMN programs.age_min IS 'Minimum age for program participants';
COMMENT ON COLUMN programs.age_max IS 'Maximum age for program participants';
