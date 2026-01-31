-- Phase 02: Team Memberships Table
-- =================================
-- Links children to teams for specific seasons

-- Create membership status enum
DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('active', 'invited', 'removed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the team_memberships table
CREATE TABLE IF NOT EXISTS team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  status membership_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate memberships
  UNIQUE(child_id, team_id, season_id)
);

-- Add indexes for common lookups
CREATE INDEX idx_memberships_athlete_id ON team_memberships(athlete_id);
CREATE INDEX idx_memberships_team_id ON team_memberships(team_id);
CREATE INDEX idx_memberships_season_id ON team_memberships(season_id);

-- Add trigger for updated_at
CREATE TRIGGER update_team_memberships_updated_at
  BEFORE UPDATE ON team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS Policies for team_memberships are added in 017_deferred_rls_policies.sql
-- This is because they depend on users, children, and teams tables
