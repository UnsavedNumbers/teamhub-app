-- Comprehensive verification of RLS disable migration
-- Run this after applying 20260131000000_disable_rls_security_pause.sql

-- 1. Verify RLS status per table
WITH excluded_tables AS (
  SELECT unnest(ARRAY[
    'users','platform_admins','organization_members','organization_invites','audit_logs_old'
  ]) AS tablename
)
SELECT 
  t.tablename,
  t.rowsecurity,
  CASE 
    WHEN e.tablename IS NOT NULL THEN 'EXCLUDED (should be true)'
    ELSE 'DISABLED (should be false)'
  END as expected,
  CASE 
    WHEN e.tablename IS NOT NULL AND t.rowsecurity = true THEN '✓ CORRECT'
    WHEN e.tablename IS NOT NULL AND t.rowsecurity = false THEN '✗ ERROR: Should be enabled'
    WHEN e.tablename IS NULL AND t.rowsecurity = false THEN '✓ CORRECT'
    WHEN e.tablename IS NULL AND t.rowsecurity = true THEN '✗ ERROR: Should be disabled'
  END as status
FROM pg_tables t
LEFT JOIN excluded_tables e ON e.tablename = t.tablename
WHERE t.schemaname = 'public'
ORDER BY 
  CASE WHEN e.tablename IS NOT NULL THEN 0 ELSE 1 END,
  t.tablename;

-- 2. Policy preservation check
SELECT 
  COUNT(*) as total_policies,
  COUNT(DISTINCT tablename) as tables_with_policies
FROM pg_policies 
WHERE schemaname = 'public';
-- Should show ~400+ policies still defined

-- 3. Summary counts
SELECT 
  COUNT(*) FILTER (WHERE rowsecurity = true) as rls_enabled_count,
  COUNT(*) FILTER (WHERE rowsecurity = false) as rls_disabled_count,
  COUNT(*) as total_tables
FROM pg_tables
WHERE schemaname = 'public';

-- 4. Verify excluded tables still have RLS enabled
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
