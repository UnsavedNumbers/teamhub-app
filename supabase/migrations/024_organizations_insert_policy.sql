-- Fix: Add INSERT policy for organizations table
-- ==============================================
-- This migration adds the missing INSERT policy that allows authenticated users
-- to create new organizations. Without this policy, users get RLS violation errors
-- when trying to create an organization during onboarding.

-- Allow authenticated users to create new organizations
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add comment
COMMENT ON POLICY "Authenticated users can create organizations" ON organizations 
  IS 'Allows any authenticated user to create a new organization. The user will be added as org_admin immediately after creation.';
