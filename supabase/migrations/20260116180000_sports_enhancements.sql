-- Sports Schema Enhancement: Add icon, color, and soft delete support
-- =================================================================

-- Add new columns to sports table
ALTER TABLE sports
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#137fec',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_sports_deleted_at ON sports(deleted_at) WHERE deleted_at IS NULL;

-- RLS Policies for sports
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;

-- Select: Org members can view sports (excluding deleted)
DROP POLICY IF EXISTS "Org members can view sports" ON sports;
CREATE POLICY "Org members can view sports"
  ON sports
  FOR SELECT
  USING (
    deleted_at IS NULL 
    AND org_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Insert: Org admins can create sports
DROP POLICY IF EXISTS "Org admins can create sports" ON sports;
CREATE POLICY "Org admins can create sports"
  ON sports
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'admin')
    )
  );

-- Update: Org admins can update sports
DROP POLICY IF EXISTS "Org admins can update sports" ON sports;
CREATE POLICY "Org admins can update sports"
  ON sports
  FOR UPDATE
  USING (
    org_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'admin')
    )
  );

-- Delete: Org admins can soft delete sports (update deleted_at)
DROP POLICY IF EXISTS "Org admins can soft delete sports" ON sports;
CREATE POLICY "Org admins can soft delete sports"
  ON sports
  FOR UPDATE
  USING (
    org_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'admin')
    )
  )
  WITH CHECK (deleted_at IS NOT NULL);

-- Add soft delete support to programs
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_programs_deleted_at ON programs(deleted_at) WHERE deleted_at IS NULL;

-- RLS Policies for programs
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Select: Org members can view programs (excluding deleted)
DROP POLICY IF EXISTS "Org members can view programs" ON programs;
CREATE POLICY "Org members can view programs"
  ON programs
  FOR SELECT
  USING (
    deleted_at IS NULL 
    AND org_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Insert: Org admins can create programs
DROP POLICY IF EXISTS "Org admins can create programs" ON programs;
CREATE POLICY "Org admins can create programs"
  ON programs
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'admin')
    )
  );

-- Update: Org admins can update programs
DROP POLICY IF EXISTS "Org admins can update programs" ON programs;
CREATE POLICY "Org admins can update programs"
  ON programs
  FOR UPDATE
  USING (
    org_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'admin')
    )
  );
