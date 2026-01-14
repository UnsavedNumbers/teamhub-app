-- ============================================
-- FIX: Add missing INSERT policy for organizations table
-- ============================================
-- Run this in Supabase SQL Editor to allow authenticated users to create organizations

-- First, check if the policy already exists and drop it if needed
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Add the INSERT policy
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY policyname;
