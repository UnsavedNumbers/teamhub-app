-- Fix: Ensure INSERT policy exists for organizations table
-- This drops and recreates the policy to ensure it's properly applied

-- Drop the policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Recreate the INSERT policy
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify RLS is enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
