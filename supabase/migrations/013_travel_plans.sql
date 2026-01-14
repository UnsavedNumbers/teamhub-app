-- Phase 08: Travel Plans Table
-- ==============================
-- Tournament travel information for teams

-- Create the travel_plans table
CREATE TABLE IF NOT EXISTS travel_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  venue_name TEXT,
  venue_address TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hotel_name TEXT,
  hotel_address TEXT,
  hotel_phone TEXT,
  hotel_confirmation TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_travel_plans_team_id ON travel_plans(team_id);
CREATE INDEX idx_travel_plans_season_id ON travel_plans(season_id);
CREATE INDEX idx_travel_plans_start_date ON travel_plans(start_date);

-- Add trigger for updated_at
CREATE TRIGGER update_travel_plans_updated_at
  BEFORE UPDATE ON travel_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE travel_plans ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS Policies for travel_plans are added in 017_deferred_rls_policies.sql
-- This is because they depend on users, children, teams, and team_memberships tables
