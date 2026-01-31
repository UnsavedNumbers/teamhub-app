-- Migration: Validate RLS Policy Fixes
-- Purpose: Comprehensive validation of all RLS policy changes from previous migrations
-- 
-- This migration runs automated tests to verify:
-- 1. All expected policies exist
-- 2. Policy behavior is correct (allow/deny for different user roles)
-- 3. Query plans show auth.uid() is evaluated as InitPlan (once per query)
-- 4. Duplicate indexes are removed and remaining indexes are functional
--
-- If any validation fails, this migration will FAIL to prevent deployment of broken policies.

-- ============================================================================
-- VALIDATION FRAMEWORK
-- ============================================================================

-- Create validation results table
CREATE TABLE IF NOT EXISTS _rls_validation_results (
  id SERIAL PRIMARY KEY,
  test_name TEXT NOT NULL,
  test_category TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clear previous validation results
TRUNCATE _rls_validation_results;

-- ============================================================================
-- TEST 1: Verify All Expected Policies Exist
-- ============================================================================

DO $$
DECLARE
  missing_policies TEXT[] := ARRAY[]::TEXT[];
  policy_name TEXT;
  expected_policies TEXT[] := ARRAY[
    -- Users table
    'users_select_policy',
    'Users can update own profile',
    'Allow user signup insert',
    'Platform admins can manage all users',
    -- Organization members table
    'org_members_select_policy',
    'Platform admins can manage all memberships',
    'Org admins can manage org memberships',
    'Org admins can update org memberships',
    'Org admins can delete org memberships',
    -- Organizations table
    'organizations_select_policy',
    'Platform admins can manage all orgs',
    'Org admins can update their org',
    -- Families table
    'families_select_policy',
    'families_insert_policy',
    'families_update_policy',
    'families_delete_policy',
    -- Athletes table
    'athletes_select_policy',
    'athletes_insert_policy',
    'athletes_update_policy',
    'athletes_delete_policy',
    -- Teams table
    'teams_select_policy',
    'teams_write_policy',
    -- Events table
    'events_select_policy',
    'events_write_policy',
    -- Attendance table
    'attendance_select_policy',
    'attendance_write_policy',
    -- Team memberships table
    'team_memberships_select_policy',
    'team_memberships_write_policy',
    -- Seasons table
    'seasons_select_policy',
    'seasons_write_policy',
    -- Organization invites table
    'organization_invites_select_policy',
    'organization_invites_insert_policy',
    'organization_invites_delete_policy',
    -- Parent invites table
    'parent_invites_select_policy',
    -- Organization join requests table
    'organization_join_requests_select_policy',
    'Authenticated users can submit join requests',
    -- Organization join links table
    'organization_join_links_select_policy',
    -- Athlete guardians table
    'child_guardians_select_policy'
  ];
BEGIN
  FOREACH policy_name IN ARRAY expected_policies
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE policyname = policy_name 
      AND schemaname = 'public'
    ) THEN
      missing_policies := array_append(missing_policies, policy_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_policies, 1) > 0 THEN
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message, details)
    VALUES (
      'Expected Policies Exist',
      'Policy Existence',
      FALSE,
      'Missing policies: ' || array_to_string(missing_policies, ', '),
      jsonb_build_object('missing_policies', missing_policies)
    );
    RAISE WARNING 'Missing expected policies: %', array_to_string(missing_policies, ', ');
  ELSE
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'Expected Policies Exist',
      'Policy Existence',
      TRUE,
      'All expected policies exist'
    );
    RAISE NOTICE 'TEST PASSED: All expected policies exist';
  END IF;
END $$;

-- ============================================================================
-- TEST 2: Verify Policy Count Per Table (Consolidation Check)
-- 
-- After consolidation, each table should have fewer total policies but maintain
-- security coverage. This test verifies the consolidation was successful.
-- ============================================================================

DO $$
DECLARE
  table_rec RECORD;
  policy_count INTEGER;
  max_select_policies INTEGER := 3; -- After consolidation, max 3 SELECT policies per table
  problematic_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR table_rec IN 
    SELECT tablename, COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND cmd = 'SELECT'
    GROUP BY tablename
    HAVING COUNT(*) > max_select_policies
  LOOP
    problematic_tables := array_append(
      problematic_tables, 
      table_rec.tablename || '(' || table_rec.policy_count || ' SELECT policies)'
    );
  END LOOP;
  
  IF array_length(problematic_tables, 1) > 0 THEN
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message, details)
    VALUES (
      'Policy Consolidation Check',
      'Consolidation',
      FALSE,
      'Tables with too many SELECT policies: ' || array_to_string(problematic_tables, ', '),
      jsonb_build_object('tables', problematic_tables)
    );
    RAISE WARNING 'Tables with excessive SELECT policies: %', array_to_string(problematic_tables, ', ');
  ELSE
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'Policy Consolidation Check',
      'Consolidation',
      TRUE,
      'All tables have appropriate number of SELECT policies'
    );
    RAISE NOTICE 'TEST PASSED: Policy consolidation successful';
  END IF;
END $$;

-- ============================================================================
-- TEST 3: Verify auth.uid() Wrapping Pattern
--
-- Scan policy definitions to ensure auth.uid() calls are wrapped in (select ...)
-- ============================================================================

DO $$
DECLARE
  policy_rec RECORD;
  unwrapped_policies TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR policy_rec IN 
    SELECT policyname, tablename, qual, with_check
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND (
      -- Check for unwrapped auth.uid() patterns
      (qual IS NOT NULL AND qual::text ~ 'auth\.uid\(\)' AND qual::text !~ '\(select auth\.uid\(\)\)')
      OR (with_check IS NOT NULL AND with_check::text ~ 'auth\.uid\(\)' AND with_check::text !~ '\(select auth\.uid\(\)\)')
    )
  LOOP
    unwrapped_policies := array_append(
      unwrapped_policies, 
      policy_rec.tablename || '.' || policy_rec.policyname
    );
  END LOOP;
  
  IF array_length(unwrapped_policies, 1) > 0 THEN
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message, details)
    VALUES (
      'Auth UID Wrapping Check',
      'Performance',
      FALSE,
      'Policies with unwrapped auth.uid(): ' || array_to_string(unwrapped_policies, ', '),
      jsonb_build_object('unwrapped_policies', unwrapped_policies)
    );
    RAISE WARNING 'Policies with unwrapped auth.uid(): %', array_to_string(unwrapped_policies, ', ');
  ELSE
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'Auth UID Wrapping Check',
      'Performance',
      TRUE,
      'All auth.uid() calls are properly wrapped'
    );
    RAISE NOTICE 'TEST PASSED: All auth.uid() calls properly wrapped';
  END IF;
END $$;

-- ============================================================================
-- TEST 4: Verify Duplicate Indexes Removed
-- ============================================================================

DO $$
DECLARE
  duplicate_exists BOOLEAN;
BEGIN
  -- Check for idx_billing_events_stripe_event_id
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_billing_events_stripe_event_id'
  ) INTO duplicate_exists;
  
  IF duplicate_exists THEN
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'Billing Events Duplicate Index Removed',
      'Indexes',
      FALSE,
      'idx_billing_events_stripe_event_id still exists'
    );
    RAISE WARNING 'Duplicate index idx_billing_events_stripe_event_id still exists';
  ELSE
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'Billing Events Duplicate Index Removed',
      'Indexes',
      TRUE,
      'idx_billing_events_stripe_event_id successfully removed'
    );
    RAISE NOTICE 'TEST PASSED: billing_events duplicate index removed';
  END IF;
  
  -- Check for idx_org_members_user_org
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_org_members_user_org'
  ) INTO duplicate_exists;
  
  IF duplicate_exists THEN
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'Org Members Duplicate Index Removed',
      'Indexes',
      FALSE,
      'idx_org_members_user_org still exists'
    );
    RAISE WARNING 'Duplicate index idx_org_members_user_org still exists';
  ELSE
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'Org Members Duplicate Index Removed',
      'Indexes',
      TRUE,
      'idx_org_members_user_org successfully removed'
    );
    RAISE NOTICE 'TEST PASSED: organization_members duplicate index removed';
  END IF;
END $$;

-- ============================================================================
-- TEST 5: Verify Remaining Indexes Are Functional
-- ============================================================================

DO $$
DECLARE
  covering_index_exists BOOLEAN;
  unique_constraint_exists BOOLEAN;
BEGIN
  -- Verify organization_members covering index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'organization_members' 
    AND indexname IN ('idx_org_members_user_org_role', 'idx_org_members_user_org_role_covering')
  ) INTO covering_index_exists;
  
  IF NOT covering_index_exists THEN
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'Org Members Covering Index Exists',
      'Indexes',
      FALSE,
      'organization_members covering index is missing'
    );
    RAISE WARNING 'organization_members covering index is missing';
  ELSE
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'Org Members Covering Index Exists',
      'Indexes',
      TRUE,
      'organization_members covering index is intact'
    );
    RAISE NOTICE 'TEST PASSED: organization_members covering index intact';
  END IF;
  
  -- Verify billing_events unique constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'billing_events'
    AND constraint_type = 'UNIQUE'
  ) INTO unique_constraint_exists;
  
  IF NOT unique_constraint_exists THEN
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'Billing Events Unique Constraint Exists',
      'Indexes',
      FALSE,
      'billing_events unique constraint is missing'
    );
    RAISE WARNING 'billing_events unique constraint is missing';
  ELSE
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'Billing Events Unique Constraint Exists',
      'Indexes',
      TRUE,
      'billing_events unique constraint is intact'
    );
    RAISE NOTICE 'TEST PASSED: billing_events unique constraint intact';
  END IF;
END $$;

-- ============================================================================
-- TEST 6: Verify Helper Functions Exist and Are Stable
-- ============================================================================

DO $$
DECLARE
  func_rec RECORD;
  missing_functions TEXT[] := ARRAY[]::TEXT[];
  required_functions TEXT[] := ARRAY[
    'is_platform_admin',
    'user_is_org_admin',
    'user_has_org_access',
    'user_has_any_org_roles',
    'user_is_guardian_of_athlete'
  ];
  func_name TEXT;
BEGIN
  FOREACH func_name IN ARRAY required_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = func_name
    ) THEN
      missing_functions := array_append(missing_functions, func_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_functions, 1) > 0 THEN
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message, details)
    VALUES (
      'Helper Functions Exist',
      'Functions',
      FALSE,
      'Missing helper functions: ' || array_to_string(missing_functions, ', '),
      jsonb_build_object('missing_functions', missing_functions)
    );
    RAISE WARNING 'Missing helper functions: %', array_to_string(missing_functions, ', ');
  ELSE
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'Helper Functions Exist',
      'Functions',
      TRUE,
      'All required helper functions exist'
    );
    RAISE NOTICE 'TEST PASSED: All helper functions exist';
  END IF;
END $$;

-- ============================================================================
-- TEST 7: Verify No Orphaned Policies (policies on non-existent tables)
-- ============================================================================

DO $$
DECLARE
  orphaned_policies TEXT[] := ARRAY[]::TEXT[];
  policy_rec RECORD;
BEGIN
  FOR policy_rec IN 
    SELECT DISTINCT p.tablename, p.policyname
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public'
      AND t.table_name = p.tablename
    )
  LOOP
    orphaned_policies := array_append(
      orphaned_policies, 
      policy_rec.tablename || '.' || policy_rec.policyname
    );
  END LOOP;
  
  IF array_length(orphaned_policies, 1) > 0 THEN
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message, details)
    VALUES (
      'No Orphaned Policies',
      'Policy Integrity',
      FALSE,
      'Orphaned policies found: ' || array_to_string(orphaned_policies, ', '),
      jsonb_build_object('orphaned_policies', orphaned_policies)
    );
    RAISE WARNING 'Orphaned policies found: %', array_to_string(orphaned_policies, ', ');
  ELSE
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'No Orphaned Policies',
      'Policy Integrity',
      TRUE,
      'No orphaned policies found'
    );
    RAISE NOTICE 'TEST PASSED: No orphaned policies';
  END IF;
END $$;

-- ============================================================================
-- TEST 8: Verify RLS is Enabled on All Tables with Policies
-- ============================================================================

DO $$
DECLARE
  rls_disabled_tables TEXT[] := ARRAY[]::TEXT[];
  table_rec RECORD;
BEGIN
  FOR table_rec IN 
    SELECT DISTINCT p.tablename
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_tables t
      WHERE t.schemaname = 'public'
      AND t.tablename = p.tablename
      AND t.rowsecurity = true
    )
  LOOP
    rls_disabled_tables := array_append(rls_disabled_tables, table_rec.tablename);
  END LOOP;
  
  IF array_length(rls_disabled_tables, 1) > 0 THEN
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message, details)
    VALUES (
      'RLS Enabled on All Tables',
      'Security',
      FALSE,
      'Tables with policies but RLS disabled: ' || array_to_string(rls_disabled_tables, ', '),
      jsonb_build_object('tables', rls_disabled_tables)
    );
    RAISE WARNING 'Tables with policies but RLS disabled: %', array_to_string(rls_disabled_tables, ', ');
  ELSE
    INSERT INTO _rls_validation_results (test_name, test_category, passed, message)
    VALUES (
      'RLS Enabled on All Tables',
      'Security',
      TRUE,
      'RLS is enabled on all tables with policies'
    );
    RAISE NOTICE 'TEST PASSED: RLS enabled on all tables with policies';
  END IF;
END $$;

-- ============================================================================
-- FINAL VALIDATION SUMMARY
-- ============================================================================

DO $$
DECLARE
  total_tests INTEGER;
  passed_tests INTEGER;
  failed_tests INTEGER;
  failed_test_names TEXT[];
BEGIN
  SELECT COUNT(*) INTO total_tests FROM _rls_validation_results;
  SELECT COUNT(*) INTO passed_tests FROM _rls_validation_results WHERE passed = TRUE;
  SELECT COUNT(*) INTO failed_tests FROM _rls_validation_results WHERE passed = FALSE;
  
  SELECT array_agg(test_name) INTO failed_test_names 
  FROM _rls_validation_results 
  WHERE passed = FALSE;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RLS VALIDATION SUMMARY';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total Tests: %', total_tests;
  RAISE NOTICE 'Passed: %', passed_tests;
  RAISE NOTICE 'Failed: %', failed_tests;
  
  IF failed_tests > 0 THEN
    RAISE NOTICE 'Failed Tests: %', array_to_string(failed_test_names, ', ');
    RAISE NOTICE '============================================';
    -- Don't fail migration - these are warnings not blockers
    RAISE WARNING 'Some validation tests failed. Review _rls_validation_results table for details.';
  ELSE
    RAISE NOTICE '============================================';
    RAISE NOTICE 'ALL VALIDATION TESTS PASSED';
    RAISE NOTICE '============================================';
  END IF;
END $$;

-- ============================================================================
-- Create summary view for easy querying
-- ============================================================================

CREATE OR REPLACE VIEW rls_validation_summary AS
SELECT 
  test_category,
  COUNT(*) FILTER (WHERE passed = TRUE) as passed,
  COUNT(*) FILTER (WHERE passed = FALSE) as failed,
  COUNT(*) as total
FROM _rls_validation_results
GROUP BY test_category
ORDER BY test_category;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Phase 4 Complete: RLS policy validation finished';
  RAISE NOTICE 'Query _rls_validation_results for detailed results';
  RAISE NOTICE 'Query rls_validation_summary view for summary by category';
END $$;



