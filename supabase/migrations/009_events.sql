-- Phase 04: Events Table
-- =======================
-- Events for teams (practices, games, tournaments, meetings)

-- Create event type enum
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('practice', 'game', 'tournament', 'meeting');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type event_type NOT NULL DEFAULT 'practice',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  arrival_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_events_team_id ON events(team_id);
CREATE INDEX idx_events_season_id ON events(season_id);
CREATE INDEX idx_events_start_time ON events(start_time);

-- Add trigger for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS Policies for events are added in 017_deferred_rls_policies.sql
-- This is because they depend on users, children, and team_memberships tables
