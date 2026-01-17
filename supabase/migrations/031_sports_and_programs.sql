-- Phase 11: Sports + Programs
-- ==========================
-- Introduces first-class sport/program entities scoped to organizations.
-- Also wires seasons.sport_id and seasons.program_id to FK constraints.

-- -----------------------------------------------------------------
-- TABLE: sports
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sports_org_id ON sports(org_id);
CREATE INDEX IF NOT EXISTS idx_sports_name ON sports(name);

DROP TRIGGER IF EXISTS update_sports_updated_at ON sports;
CREATE TRIGGER update_sports_updated_at
  BEFORE UPDATE ON sports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------
-- TABLE: programs
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, sport_id, name)
);

CREATE INDEX IF NOT EXISTS idx_programs_org_id ON programs(org_id);
CREATE INDEX IF NOT EXISTS idx_programs_sport_id ON programs(sport_id);
CREATE INDEX IF NOT EXISTS idx_programs_name ON programs(name);

DROP TRIGGER IF EXISTS update_programs_updated_at ON programs;
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------
-- SEASONS: add FK constraints to sport_id/program_id (columns added earlier)
-- -----------------------------------------------------------------
DO $$
BEGIN
  -- FK seasons.sport_id -> sports.id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seasons'
      AND column_name = 'sport_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'seasons'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'seasons_sport_id_fkey'
  ) THEN
    ALTER TABLE seasons
      ADD CONSTRAINT seasons_sport_id_fkey
      FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL;
  END IF;

  -- FK seasons.program_id -> programs.id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seasons'
      AND column_name = 'program_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'seasons'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'seasons_program_id_fkey'
  ) THEN
    ALTER TABLE seasons
      ADD CONSTRAINT seasons_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_seasons_sport_id ON seasons(sport_id);
CREATE INDEX IF NOT EXISTS idx_seasons_program_id ON seasons(program_id);

