-- Verification Query for RLS Disable Migration
-- Run this in Supabase Dashboard SQL Editor after applying 20260131000000_disable_rls_security_pause.sql
-- 
-- This query verifies:
-- 1. Excluded auth tables still have RLS enabled
-- 2. All other tables have RLS disabled
-- 3. Policies are still preserved

-- Summary: RLS Status by Category
WITH excluded_tables AS (
  SELECT unnest(ARRAY[
    'users','platform_admins','organization_members','organization_invites','audit_logs_old'
  ]) AS tablename
)
SELECT 
  CASE 
    WHEN e.tablename IS NOT NULL THEN 'EXCLUDED (Auth)'
    ELSE 'DISABLED'
  END as category,
  COUNT(*) as table_count,
  COUNT(*) FILTER (WHERE t.rowsecurity = true) as rls_enabled,
  COUNT(*) FILTER (WHERE t.rowsecurity = false) as rls_disabled
FROM pg_tables t
LEFT JOIN excluded_tables e ON e.tablename = t.tablename
WHERE t.schemaname = 'public'
GROUP BY category
ORDER BY category;

-- Detailed: Tables with Issues (if any)
WITH excluded_tables AS (
  SELECT unnest(ARRAY[
    'users','platform_admins','organization_members','organization_invites','audit_logs_old'
  ]) AS tablename
)
SELECT 
  t.tablename,
  t.rowsecurity as current_rls_status,
  CASE 
    WHEN e.tablename IS NOT NULL THEN 'Should be ENABLED'
    ELSE 'Should be DISABLED'
  END as expected,
  CASE 
    WHEN e.tablename IS NOT NULL AND t.rowsecurity = true THEN '✓ CORRECT'
    WHEN e.tablename IS NOT NULL AND t.rowsecurity = false THEN '✗ ERROR'
    WHEN e.tablename IS NULL AND t.rowsecurity = false THEN '✓ CORRECT'
    WHEN e.tablename IS NULL AND t.rowsecurity = true THEN '✗ ERROR'
  END as status
FROM pg_tables t
LEFT JOIN excluded_tables e ON e.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND (
    (e.tablename IS NOT NULL AND t.rowsecurity = false) OR
    (e.tablename IS NULL AND t.rowsecurity = true)
  )
ORDER BY t.tablename;

-- Policy Preservation Check
SELECT 
  COUNT(*) as total_policies,
  COUNT(DISTINCT tablename) as tables_with_policies,
  COUNT(DISTINCT policyname) as unique_policy_names
FROM pg_policies 
WHERE schemaname = 'public';

-- Verify Excluded Auth Tables
SELECT 
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity = true THEN '✓ CORRECT - RLS enabled'
    ELSE '✗ ERROR - RLS should be enabled'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users','platform_admins','organization_members','organization_invites','audit_logs_old')
ORDER BY tablename;
