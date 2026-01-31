-- Sport-Specific Uniforms Migration
-- ====================================
-- Adds sport awareness to uniform_kits table, supporting both org-level templates
-- and team-level uniforms. Follows existing schema patterns exactly.

-- ============================================
-- 1) Add new columns to uniform_kits
-- ============================================

-- Sport and program references (required for org-level templates)
ALTER TABLE uniform_kits 
  ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES sports(id),
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id),
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- Sport-specific fields stored as JSONB
ALTER TABLE uniform_kits 
  ADD COLUMN IF NOT EXISTS sport_specific_fields JSONB DEFAULT '{}'::jsonb;

-- Common fields (stored as columns, not in JSONB)
ALTER TABLE uniform_kits 
  ADD COLUMN IF NOT EXISTS primary_color TEXT,
  ADD COLUMN IF NOT EXISTS secondary_color TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT,
  ADD COLUMN IF NOT EXISTS vendor TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ============================================
-- 2) Backfill existing uniform_kits
-- ============================================

-- Derive sport_id, org_id, and program_id from team relationships
UPDATE uniform_kits uk
SET 
  sport_id = p.sport_id,
  org_id = t.org_id,
  program_id = t.program_id,
  sport_specific_fields = '{}'::jsonb
FROM teams t
LEFT JOIN programs p ON p.id = t.program_id
WHERE uk.team_id = t.id
  AND uk.sport_id IS NULL;

-- ============================================
-- 3) Make team_id and season_id nullable
-- ============================================

-- Drop the existing NOT NULL constraint on team_id
ALTER TABLE uniform_kits 
  ALTER COLUMN team_id DROP NOT NULL;

-- Drop the existing NOT NULL constraint on season_id
ALTER TABLE uniform_kits 
  ALTER COLUMN season_id DROP NOT NULL;

-- ============================================
-- 4) Update unique constraints
-- ============================================

-- Drop existing unique constraint
ALTER TABLE uniform_kits 
  DROP CONSTRAINT IF EXISTS uq_uniform_kits_team_season_name;

-- Create partial unique index for org-level templates (team_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_uniform_kits_org_template 
  ON uniform_kits(org_id, sport_id, COALESCE(program_id, '00000000-0000-0000-0000-000000000000'::uuid), name)
  WHERE team_id IS NULL;

-- Create unique constraint for team-level uniforms (team_id IS NOT NULL)
ALTER TABLE uniform_kits 
  ADD CONSTRAINT uq_uniform_kits_team_season_name 
  UNIQUE (team_id, season_id, name);

-- ============================================
-- 5) Add indexes for new columns
-- ============================================

CREATE INDEX IF NOT EXISTS idx_uniform_kits_sport_id ON uniform_kits(sport_id);
CREATE INDEX IF NOT EXISTS idx_uniform_kits_program_id ON uniform_kits(program_id);
CREATE INDEX IF NOT EXISTS idx_uniform_kits_org_id ON uniform_kits(org_id);
CREATE INDEX IF NOT EXISTS idx_uniform_kits_status ON uniform_kits(status);

-- ============================================
-- 6) Add sport_specific_fields to uniform_kit_items
-- ============================================

ALTER TABLE uniform_kit_items 
  ADD COLUMN IF NOT EXISTS sport_specific_fields JSONB DEFAULT '{}'::jsonb;

-- ============================================
-- 7) Add comments for documentation
-- ============================================

COMMENT ON COLUMN uniform_kits.sport_id IS 'Sport this uniform belongs to. Required for org-level templates.';
COMMENT ON COLUMN uniform_kits.program_id IS 'Program this uniform belongs to (optional, for program-specific uniforms).';
COMMENT ON COLUMN uniform_kits.org_id IS 'Organization this uniform belongs to. Required for org-level templates.';
COMMENT ON COLUMN uniform_kits.team_id IS 'Team this uniform belongs to. NULL for org-level templates, set for team-specific uniforms.';
COMMENT ON COLUMN uniform_kits.season_id IS 'Season this uniform belongs to. Required for team-level, optional for org-level templates.';
COMMENT ON COLUMN uniform_kits.sport_specific_fields IS 'JSONB field storing sport-specific data (e.g., jersey_number, sock_color, etc.).';
COMMENT ON COLUMN uniform_kit_items.sport_specific_fields IS 'JSONB field storing item-level sport-specific data (e.g., jersey fit, sleeve length, etc.).';
