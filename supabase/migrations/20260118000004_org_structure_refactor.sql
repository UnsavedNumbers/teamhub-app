-- Migration: 20260118000004_org_structure_refactor
-- Description: Refactors organization hierarchy to Org -> Sport -> Program -> Level -> Team -> Season(Org-scoped)
-- derived from org_sport_program_level_team_season_e3b181c1.plan.md

-- 1. Create Levels Table
CREATE TABLE IF NOT EXISTS levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level_type TEXT NOT NULL DEFAULT 'age_based', -- age_based, grade_based, skill_based
  description TEXT,
  age_min INTEGER,
  age_max INTEGER,
  grade_min INTEGER,
  grade_max INTEGER,
  skill_min INTEGER,
  skill_max INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_levels_program_id ON levels(program_id);
CREATE INDEX IF NOT EXISTS idx_levels_org_id ON levels(org_id);
CREATE INDEX IF NOT EXISTS idx_levels_org_name ON levels(org_id, name);

-- 2. Update Programs Table
ALTER TABLE programs ADD COLUMN IF NOT EXISTS gender_category VARCHAR(20) NOT NULL DEFAULT 'coed';

-- 3. Update Teams Table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS level_id UUID REFERENCES levels(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_teams_level_id ON teams(level_id);

-- 4. Create Team Seasons Table
CREATE TABLE IF NOT EXISTS team_seasons (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, season_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_seasons_one_active 
ON team_seasons(team_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_team_seasons_season_id ON team_seasons(season_id);
CREATE INDEX IF NOT EXISTS idx_team_seasons_team_id ON team_seasons(team_id);

-- 5. Backfill Levels (Default 'Unassigned' level for each program)
INSERT INTO levels (org_id, program_id, name, level_type)
SELECT DISTINCT org_id, id, 'Unassigned', 'age_based' 
FROM programs 
WHERE id NOT IN (SELECT program_id FROM levels WHERE name = 'Unassigned');

-- 6. Backfill Teams (Assign detailed level_id)
UPDATE teams 
SET level_id = (
  SELECT l.id FROM levels l 
  WHERE l.program_id = teams.program_id AND l.name = 'Unassigned'
  LIMIT 1
)
WHERE level_id IS NULL;

-- 7. Deduplicate Seasons and Populate Team Seasons
DO $$
DECLARE
  r RECORD;
  canonical_id UUID;
BEGIN
  -- Identify unique organizations-season definitions currently bound to teams
  FOR r IN 
    SELECT DISTINCT org_id, name, start_date, end_date 
    FROM seasons 
    WHERE team_id IS NOT NULL 
  LOOP
    
    -- Pick the canonical ID (first created or first found)
    SELECT id INTO canonical_id 
    FROM seasons 
    WHERE org_id = r.org_id 
      AND name = r.name 
      AND start_date = r.start_date 
      AND end_date = r.end_date
    ORDER BY created_at ASC
    LIMIT 1;

    -- Insert links into team_seasons for ALL teams that had this season definition
    INSERT INTO team_seasons (team_id, season_id, is_active)
    SELECT s.team_id, canonical_id, s.is_active
    FROM seasons s
    WHERE s.org_id = r.org_id 
      AND s.name = r.name 
      AND s.start_date = r.start_date 
      AND s.end_date = r.end_date
    ON CONFLICT (team_id, season_id) DO NOTHING;

    -- Delete duplicates (seasons with same def but different ID)
    DELETE FROM seasons 
    WHERE org_id = r.org_id 
      AND name = r.name 
      AND start_date = r.start_date 
      AND end_date = r.end_date
      AND id != canonical_id;
      
  END LOOP;
END $$;

-- 8. Alter Seasons Table (Make team_id nullable/deprecated)
ALTER TABLE seasons ALTER COLUMN team_id DROP NOT NULL;

-- 9. Add Unique Constraint to Seasons (Now that duplicates are gone)
CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_org_unique 
ON seasons(org_id, name, start_date, end_date);

-- 10. Create View for Backward Compatibility
CREATE OR REPLACE VIEW team_seasons_view AS
SELECT 
  ts.team_id,
  s.id as season_id,
  s.org_id,
  s.name,
  s.start_date,
  s.end_date,
  s.is_active as season_is_active,
  ts.is_active as is_active -- Main active flag for the team context
FROM team_seasons ts
JOIN seasons s ON ts.season_id = s.id;
