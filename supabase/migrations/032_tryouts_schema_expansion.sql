-- Phase 12: Tryouts Schema Expansion
-- =================================
-- Expands tryouts to support org + sport + program + season scope,
-- normalized datetimes, team links, and evaluation criteria.
--
-- This migration is additive and keeps legacy columns from 014_tryouts.sql
-- to avoid breaking existing data. The app should prefer the new columns.

-- -----------------------------------------------------------------
-- ENUM: tryout_type
-- -----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE tryout_type AS ENUM ('open', 'invitation_only', 'make_up', 'evaluation_clinic');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------
-- TRYOUTS: add new columns
-- -----------------------------------------------------------------
ALTER TABLE tryouts
  ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES sports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type tryout_type NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capacity INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill name from title (legacy)
UPDATE tryouts
SET name = COALESCE(name, title)
WHERE name IS NULL;

-- Backfill start_at/end_at from legacy tryout_date + start_time/end_time where possible.
-- Assumption: legacy times interpreted as UTC for deterministic conversion.
UPDATE tryouts
SET start_at = COALESCE(
  start_at,
  CASE
    WHEN tryout_date IS NOT NULL AND start_time IS NOT NULL
      THEN ((tryout_date::text || ' ' || start_time::text)::timestamp AT TIME ZONE 'UTC')
    ELSE NULL
  END
);

UPDATE tryouts
SET end_at = COALESCE(
  end_at,
  CASE
    WHEN tryout_date IS NOT NULL AND end_time IS NOT NULL
      THEN ((tryout_date::text || ' ' || end_time::text)::timestamp AT TIME ZONE 'UTC')
    ELSE NULL
  END
);

-- Keep capacity aligned with legacy max_spots when present
UPDATE tryouts
SET capacity = COALESCE(capacity, max_spots)
WHERE capacity IS NULL AND max_spots IS NOT NULL;

-- Basic integrity checks (non-breaking: only enforced when columns are populated)
ALTER TABLE tryouts DROP CONSTRAINT IF EXISTS tryouts_valid_time_order;
ALTER TABLE tryouts ADD CONSTRAINT tryouts_valid_time_order CHECK (
  start_at IS NULL OR end_at IS NULL OR end_at > start_at
);

ALTER TABLE tryouts DROP CONSTRAINT IF EXISTS tryouts_valid_capacity;
ALTER TABLE tryouts ADD CONSTRAINT tryouts_valid_capacity CHECK (
  capacity IS NULL OR capacity >= 0
);

CREATE INDEX IF NOT EXISTS idx_tryouts_sport_id ON tryouts(sport_id);
CREATE INDEX IF NOT EXISTS idx_tryouts_program_id ON tryouts(program_id);
CREATE INDEX IF NOT EXISTS idx_tryouts_season_id ON tryouts(season_id);
CREATE INDEX IF NOT EXISTS idx_tryouts_start_at ON tryouts(start_at);

-- -----------------------------------------------------------------
-- TABLE: tryout_teams (optional link to one-or-more teams)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tryout_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tryout_id UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tryout_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_tryout_teams_tryout_id ON tryout_teams(tryout_id);
CREATE INDEX IF NOT EXISTS idx_tryout_teams_team_id ON tryout_teams(team_id);

ALTER TABLE tryout_teams ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- TABLE: tryout_criteria
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tryout_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tryout_id UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  min_score INTEGER NOT NULL DEFAULT 1,
  max_score INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tryout_criteria_score_range CHECK (min_score >= 0 AND max_score >= min_score)
);

CREATE INDEX IF NOT EXISTS idx_tryout_criteria_tryout_id ON tryout_criteria(tryout_id);
CREATE INDEX IF NOT EXISTS idx_tryout_criteria_sort_order ON tryout_criteria(sort_order);

DROP TRIGGER IF EXISTS update_tryout_criteria_updated_at ON tryout_criteria;
CREATE TRIGGER update_tryout_criteria_updated_at
  BEFORE UPDATE ON tryout_criteria
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tryout_criteria ENABLE ROW LEVEL SECURITY;

