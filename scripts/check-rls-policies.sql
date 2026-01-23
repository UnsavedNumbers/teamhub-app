-- Fix RLS policies that reference organization_id instead of org_id

-- Check current policies on sports table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'sports';

-- Check current policies on organization_sports table  
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'organization_sports';
