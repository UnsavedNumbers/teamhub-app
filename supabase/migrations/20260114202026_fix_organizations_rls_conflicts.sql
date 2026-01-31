-- Fix: Remove conflicting RLS policies on organizations table
-- ============================================================
-- The old "Admins can manage organizations" policy from 017 uses FOR ALL
-- which includes INSERT, but its USING clause prevents new org creation.
-- We need to drop it and ensure clean policies exist.

-- Drop old conflicting policies from migration 017
DROP POLICY IF EXISTS "Admins can manage organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

-- Ensure the INSERT policy exists and is correct
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure SELECT policies exist (from migration 021)
DROP POLICY IF EXISTS "Members can view their orgs" ON organizations;
CREATE POLICY "Members can view their orgs" ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
      AND org_id = organizations.id
    )
    OR is_platform_admin(auth.uid())
  );

-- Ensure UPDATE policy exists for org admins
DROP POLICY IF EXISTS "Org admins can update their org" ON organizations;
CREATE POLICY "Org admins can update their org" ON organizations
  FOR UPDATE
  USING (user_is_org_admin(auth.uid(), id));

-- Platform admins can do everything
DROP POLICY IF EXISTS "Platform admins can manage all orgs" ON organizations;
CREATE POLICY "Platform admins can manage all orgs" ON organizations
  FOR ALL
  USING (is_platform_admin(auth.uid()));

-- Platform admins SELECT policy (redundant but explicit)
DROP POLICY IF EXISTS "Platform admins can view all orgs" ON organizations;
