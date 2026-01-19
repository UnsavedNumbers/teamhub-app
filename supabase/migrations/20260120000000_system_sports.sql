-- System Sports Migration
-- ========================
-- Makes sports system-wide: organizations select from predefined system sports
-- instead of creating their own. This ensures consistency across the platform.

-- -----------------------------------------------------------------
-- 1. Add is_system flag to sports table
-- -----------------------------------------------------------------
ALTER TABLE sports 
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sports_is_system ON sports(is_system) WHERE is_system = true;

-- -----------------------------------------------------------------
-- 2. Make org_id nullable for system sports
-- -----------------------------------------------------------------
-- First, drop the NOT NULL constraint
ALTER TABLE sports 
  ALTER COLUMN org_id DROP NOT NULL;

-- Update the unique constraint to allow system sports (org_id can be NULL)
DROP INDEX IF EXISTS sports_org_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS sports_org_id_name_key 
  ON sports(org_id, name) 
  WHERE org_id IS NOT NULL;

-- System sports are unique by name only
CREATE UNIQUE INDEX IF NOT EXISTS sports_system_name_key 
  ON sports(name) 
  WHERE is_system = true AND org_id IS NULL;

-- -----------------------------------------------------------------
-- 3. Update foreign key constraint to allow NULL org_id
-- -----------------------------------------------------------------
-- The existing FK constraint should already allow NULL, but let's verify
-- If it doesn't, we'll need to drop and recreate it
DO $$
BEGIN
  -- Check if constraint exists and if it allows NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'sports_org_id_fkey'
  ) THEN
    -- Drop the constraint
    ALTER TABLE sports DROP CONSTRAINT IF EXISTS sports_org_id_fkey;
    
    -- Recreate with NULL allowed
    ALTER TABLE sports
      ADD CONSTRAINT sports_org_id_fkey
      FOREIGN KEY (org_id) 
      REFERENCES organizations(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------
-- 4. Seed all 21 system sports
-- -----------------------------------------------------------------
INSERT INTO sports (name, is_system, org_id, icon, color, created_at, updated_at)
VALUES
  ('Soccer', true, NULL, 'sports_soccer', '#16a34a', NOW(), NOW()),
  ('Basketball', true, NULL, 'sports_basketball', '#ea580c', NOW(), NOW()),
  ('Baseball', true, NULL, 'sports_baseball', '#dc2626', NOW(), NOW()),
  ('Softball', true, NULL, 'sports_baseball', '#f59e0b', NOW(), NOW()),
  ('Football', true, NULL, 'sports_football', '#991b1b', NOW(), NOW()),
  ('Flag Football', true, NULL, 'sports_football', '#b91c1c', NOW(), NOW()),
  ('Volleyball', true, NULL, 'sports_volleyball', '#7c3aed', NOW(), NOW()),
  ('Lacrosse', true, NULL, 'sports', '#059669', NOW(), NOW()),
  ('Field Hockey', true, NULL, 'sports_hockey', '#0d9488', NOW(), NOW()),
  ('Ice Hockey', true, NULL, 'sports_hockey', '#0891b2', NOW(), NOW()),
  ('Wrestling', true, NULL, 'sports_martial_arts', '#1e40af', NOW(), NOW()),
  ('Track & Field', true, NULL, 'sports', '#7c2d12', NOW(), NOW()),
  ('Gymnastics', true, NULL, 'sports_gymnastics', '#be185d', NOW(), NOW()),
  ('Cross Country', true, NULL, 'directions_run', '#92400e', NOW(), NOW()),
  ('Tennis', true, NULL, 'sports_tennis', '#166534', NOW(), NOW()),
  ('Cheerleading', true, NULL, 'celebration', '#c026d3', NOW(), NOW()),
  ('Poms', true, NULL, 'celebration', '#a21caf', NOW(), NOW()),
  ('Dance', true, NULL, 'music_note', '#9f1239', NOW(), NOW()),
  ('Golf', true, NULL, 'sports_golf', '#065f46', NOW(), NOW()),
  ('Swimming', true, NULL, 'pool', '#0c4a6e', NOW(), NOW()),
  ('Diving', true, NULL, 'pool', '#075985', NOW(), NOW())
ON CONFLICT (name) WHERE is_system = true AND org_id IS NULL
DO NOTHING;

-- -----------------------------------------------------------------
-- 5. Create junction table for organization_sports
-- -----------------------------------------------------------------
-- This allows organizations to "enable" system sports
CREATE TABLE IF NOT EXISTS organization_sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, sport_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_sports_org_id ON organization_sports(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_sports_sport_id ON organization_sports(sport_id);

DROP TRIGGER IF EXISTS update_organization_sports_updated_at ON organization_sports;
CREATE TRIGGER update_organization_sports_updated_at
  BEFORE UPDATE ON organization_sports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------
-- 6. Migrate existing org sports to organization_sports
-- -----------------------------------------------------------------
-- For existing organizations that have created sports, link them to system sports if they match
INSERT INTO organization_sports (organization_id, sport_id, created_at, updated_at)
SELECT DISTINCT
  s.org_id,
  ss.id,
  s.created_at,
  NOW()
FROM sports s
INNER JOIN sports ss ON LOWER(TRIM(s.name)) = LOWER(TRIM(ss.name)) AND ss.is_system = true
WHERE s.is_system = false
  AND s.org_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization_sports os 
    WHERE os.organization_id = s.org_id AND os.sport_id = ss.id
  )
ON CONFLICT (organization_id, sport_id) DO NOTHING;

-- -----------------------------------------------------------------
-- 7. RLS Policies for organization_sports
-- -----------------------------------------------------------------
ALTER TABLE organization_sports ENABLE ROW LEVEL SECURITY;

-- Select: Org members can view their org's sports
DROP POLICY IF EXISTS "Org members can view organization sports" ON organization_sports;
CREATE POLICY "Org members can view organization sports"
  ON organization_sports
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Insert: Org admins can link system sports to their org
DROP POLICY IF EXISTS "Org admins can link system sports" ON organization_sports;
CREATE POLICY "Org admins can link system sports"
  ON organization_sports
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'admin')
    )
    AND sport_id IN (
      SELECT id FROM sports WHERE is_system = true
    )
  );

-- Delete: Org admins can unlink sports
DROP POLICY IF EXISTS "Org admins can unlink sports" ON organization_sports;
CREATE POLICY "Org admins can unlink sports"
  ON organization_sports
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'admin')
    )
  );

-- -----------------------------------------------------------------
-- 8. Update RLS Policies for sports to allow viewing system sports
-- -----------------------------------------------------------------
-- Update the existing policy to allow viewing system sports
DROP POLICY IF EXISTS "Org members can view sports" ON sports;
CREATE POLICY "Org members can view sports"
  ON sports
  FOR SELECT
  USING (
    deleted_at IS NULL 
    AND (
      -- System sports are visible to everyone
      (is_system = true AND org_id IS NULL)
      OR
      -- Org-specific sports are visible to org members
      org_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Update insert policy to prevent creating new sports (only system sports allowed)
DROP POLICY IF EXISTS "Org admins can create sports" ON sports;
CREATE POLICY "Org admins can create sports"
  ON sports
  FOR INSERT
  WITH CHECK (
    -- Only allow system sports to be created (via migration/seeding)
    -- Organizations should link to system sports via organization_sports
    is_system = true AND org_id IS NULL
  );

-- -----------------------------------------------------------------
-- 9. Comments
-- -----------------------------------------------------------------
COMMENT ON COLUMN sports.is_system IS 'True for system-wide predefined sports that all organizations can use';
COMMENT ON COLUMN sports.org_id IS 'NULL for system sports, set for organization-specific sports (legacy)';
COMMENT ON TABLE organization_sports IS 'Junction table linking organizations to system sports they have enabled';
