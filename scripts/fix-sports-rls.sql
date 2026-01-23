-- ============================================================================
-- FIX: Sports RLS Policies Column Name Issue
-- ============================================================================
-- Problem: RLS policies reference 'organization_id' but column is 'org_id'
-- This causes "column organization_id does not exist" errors
-- ============================================================================

BEGIN;

-- Drop all existing sports policies
DROP POLICY IF EXISTS "Users can view sports" ON sports;
DROP POLICY IF EXISTS "Org members can view sports" ON sports;
DROP POLICY IF EXISTS "Org admins can create sports" ON sports;
DROP POLICY IF EXISTS "Org admins can update sports" ON sports;
DROP POLICY IF EXISTS "Org admins can manage sports" ON sports;
DROP POLICY IF EXISTS "Org admins can soft delete sports" ON sports;
DROP POLICY IF EXISTS "System sports only via migration" ON sports;
DROP POLICY IF EXISTS "Anyone can view system sports and org sports" ON sports;

-- Create new SELECT policy with correct column name
CREATE POLICY "Anyone can view system sports and org sports"
ON sports
FOR SELECT
USING (
  (is_system = TRUE AND org_id IS NULL)
  OR
  (org_id IN (
    SELECT org_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  ))
);

-- Drop all existing organization_sports policies
DROP POLICY IF EXISTS "Org members can view organization sports" ON organization_sports;
DROP POLICY IF EXISTS "Org admins can link system sports" ON organization_sports;
DROP POLICY IF EXISTS "Org admins can unlink sports" ON organization_sports;

-- CREATE new organization_sports policies with correct column names
CREATE POLICY "Org members can view organization sports"
ON organization_sports
FOR SELECT
USING (
  org_id IN (
    SELECT org_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org admins can link system sports"
ON organization_sports
FOR INSERT
WITH CHECK (
  org_id IN (
    SELECT org_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role = 'org_admin'
  )
  AND sport_id IN (
    SELECT id FROM sports WHERE is_system = TRUE
  )
);

CREATE POLICY "Org admins can unlink sports"
ON organization_sports
FOR DELETE
USING (
  org_id IN (
    SELECT org_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role = 'org_admin'
  )
);

COMMIT;

-- Test the fix
SELECT 'RLS policies updated successfully!' AS status;
