-- Phase 02: Teams Table
-- ======================
-- Teams belong to organizations

-- Create the teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for org_id lookups
CREATE INDEX idx_teams_org_id ON teams(org_id);

-- Add trigger for updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS Policies for teams are added in 017_deferred_rls_policies.sql
-- This is because they depend on users, children, and team_memberships tables
