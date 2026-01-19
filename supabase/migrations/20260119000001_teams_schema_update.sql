-- Teams Schema Update: Add organizational columns
-- =================================================================

-- Add new columns to teams table
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES sports(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS max_roster_size INTEGER,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Remove old text columns if they exist (legacy schema cleanup)
ALTER TABLE teams
  DROP COLUMN IF EXISTS sport,
  DROP COLUMN IF EXISTS program;

-- Remove invite_code if it exists (moved to separate invite codes table)
ALTER TABLE teams
  DROP COLUMN IF EXISTS invite_code;

-- Add indexes for foreign keys and filtering
CREATE INDEX IF NOT EXISTS idx_teams_sport_id ON teams(sport_id);
CREATE INDEX IF NOT EXISTS idx_teams_program_id ON teams(program_id);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active) WHERE is_active = true;

-- Add check constraint for roster size
ALTER TABLE teams
  DROP CONSTRAINT IF EXISTS check_teams_roster_size;

ALTER TABLE teams
  ADD CONSTRAINT check_teams_roster_size 
  CHECK (max_roster_size IS NULL OR max_roster_size > 0);

-- Add comments for documentation
COMMENT ON COLUMN teams.sport_id IS 'Reference to the sport this team plays';
COMMENT ON COLUMN teams.program_id IS 'Reference to the program this team belongs to';
COMMENT ON COLUMN teams.level_id IS 'Reference to the competition/skill level of this team';
COMMENT ON COLUMN teams.max_roster_size IS 'Maximum number of players allowed on the team roster';
COMMENT ON COLUMN teams.is_active IS 'Whether the team is currently active';
