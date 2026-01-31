-- Add preferred_name column to athletes table
-- This field stores the name the athlete prefers to go by (nickname, shortened name, etc.)

ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS preferred_name TEXT;

COMMENT ON COLUMN athletes.preferred_name IS 'The name the athlete prefers to be called (nickname, goes by name)';
