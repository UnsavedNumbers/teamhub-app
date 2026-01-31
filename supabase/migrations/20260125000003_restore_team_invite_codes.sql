-- Restore invite_code column on teams table
-- ==========================================
-- This migration restores the invite_code column that was removed in 20260119000002_teams_schema_update.sql
-- The invite_code is needed for the Join Team functionality

-- Add invite_code column back to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Generate invite codes for existing teams that don't have one
-- Use UPPER() to ensure all codes are uppercase
UPDATE teams 
SET invite_code = UPPER(substr(md5(random()::text), 1, 8)) 
WHERE invite_code IS NULL;

-- Add unique constraint on invite_code
-- First drop if exists to avoid errors
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'teams_invite_code_key'
    ) THEN
        ALTER TABLE teams DROP CONSTRAINT teams_invite_code_key;
    END IF;
END $$;

ALTER TABLE teams ADD CONSTRAINT teams_invite_code_key UNIQUE (invite_code);

-- Make invite_code required for new teams (NOT NULL)
ALTER TABLE teams ALTER COLUMN invite_code SET NOT NULL;

-- Ensure the trigger exists to auto-generate invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := UPPER(substr(md5(random()::text), 1, 8));
  ELSE
    -- Normalize to uppercase if provided
    NEW.invite_code := UPPER(TRIM(NEW.invite_code));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS set_team_invite_code ON teams;
CREATE TRIGGER set_team_invite_code
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION generate_invite_code();

-- Ensure RLS policy exists for invite code lookup
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can lookup team by invite code" ON teams;

-- Create policy to allow anyone to lookup team by invite code
CREATE POLICY "Anyone can lookup team by invite code" ON teams
  FOR SELECT
  USING (true);

-- Add index for faster invite code lookups
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON teams(invite_code);

-- Add comment for documentation
COMMENT ON COLUMN teams.invite_code IS 'Unique 8-character uppercase code for joining teams. Auto-generated if not provided.';
