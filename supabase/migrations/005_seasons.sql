-- Phase 02: Seasons Table
-- ========================
-- Seasons are time-bounded periods for a team

-- Create the seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for team_id lookups
CREATE INDEX idx_seasons_team_id ON seasons(team_id);

-- Add trigger for updated_at
CREATE TRIGGER update_seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS Policies for seasons are added in 017_deferred_rls_policies.sql
-- This is because they depend on users, children, and team_memberships tables
