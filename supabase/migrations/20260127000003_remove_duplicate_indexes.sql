-- Migration: Remove Duplicate Indexes
-- Purpose: Remove redundant indexes that are already covered by unique constraints or other indexes
-- 
-- Problem: Duplicate indexes waste storage, slow down writes, and provide no query benefit.
-- Solution: Remove the redundant indexes while keeping the primary/unique constraint indexes.
--
-- Identified duplicates:
-- 1. billing_events: idx_billing_events_stripe_event_id duplicates the unique constraint index
-- 2. organization_members: idx_org_members_user_org is covered by idx_org_members_user_org_role

-- ============================================================================
-- PRE-REMOVAL: Backup index definitions for potential restoration
-- ============================================================================

-- Create backup table to store dropped index definitions
CREATE TABLE IF NOT EXISTS _index_backup AS 
SELECT 
  indexname,
  indexdef,
  tablename,
  schemaname
FROM pg_indexes 
WHERE indexname IN (
  'idx_billing_events_stripe_event_id',
  'idx_org_members_user_org'
);

-- ============================================================================
-- PRE-REMOVAL: Analyze current index usage
-- ============================================================================

-- Log current index statistics before removal
DO $$
DECLARE
  billing_idx_scans BIGINT;
  org_members_idx_scans BIGINT;
BEGIN
  -- Get current usage stats
  SELECT COALESCE(idx_scan, 0) INTO billing_idx_scans
  FROM pg_stat_user_indexes 
  WHERE indexrelname = 'idx_billing_events_stripe_event_id';
  
  SELECT COALESCE(idx_scan, 0) INTO org_members_idx_scans
  FROM pg_stat_user_indexes 
  WHERE indexrelname = 'idx_org_members_user_org';
  
  RAISE NOTICE 'Pre-removal index usage: idx_billing_events_stripe_event_id scans: %, idx_org_members_user_org scans: %',
    COALESCE(billing_idx_scans, 0), COALESCE(org_members_idx_scans, 0);
END $$;

-- ============================================================================
-- REMOVAL 1: billing_events duplicate index
-- 
-- Context: The billing_events table has:
--   - A UNIQUE constraint on stripe_event_id (creates implicit index)
--   - An explicit CREATE INDEX on stripe_event_id (redundant)
--
-- The unique constraint index will remain and serve all queries on stripe_event_id.
-- ============================================================================

-- Verify the unique constraint exists before dropping the duplicate index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'billing_events' 
    AND indexdef LIKE '%UNIQUE%' 
    AND indexdef LIKE '%stripe_event_id%'
  ) THEN
    -- Check for unique constraint
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      WHERE tc.table_name = 'billing_events'
      AND tc.constraint_type = 'UNIQUE'
      AND EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage ccu
        WHERE ccu.constraint_name = tc.constraint_name
        AND ccu.column_name = 'stripe_event_id'
      )
    ) THEN
      RAISE EXCEPTION 'No unique constraint found on billing_events.stripe_event_id - keeping duplicate index';
    END IF;
  END IF;
  
  RAISE NOTICE 'Verified: Unique constraint exists on billing_events.stripe_event_id';
END $$;

-- Drop the redundant index
DROP INDEX IF EXISTS idx_billing_events_stripe_event_id;

DO $$
BEGIN
  RAISE NOTICE 'Dropped duplicate index: idx_billing_events_stripe_event_id';
END $$;

-- ============================================================================
-- REMOVAL 2: organization_members redundant index
-- 
-- Context: The organization_members table has multiple overlapping indexes:
--   - idx_org_members_user_org (user_id, org_id) - 2 columns
--   - idx_org_members_user_org_role (user_id, org_id, role) - 3 columns  
--   - idx_org_members_user_org_role_covering (user_id, org_id, role) INCLUDE (...) - covering index
--
-- The 3-column index covers all queries that only need (user_id, org_id) because
-- PostgreSQL can use a prefix of a multi-column index. The 2-column index is redundant.
-- ============================================================================

-- Verify covering index exists before dropping the redundant one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'organization_members' 
    AND indexname IN ('idx_org_members_user_org_role', 'idx_org_members_user_org_role_covering')
  ) THEN
    RAISE EXCEPTION 'No covering index found on organization_members(user_id, org_id, role) - keeping idx_org_members_user_org';
  END IF;
  
  RAISE NOTICE 'Verified: Covering index exists on organization_members(user_id, org_id, role)';
END $$;

-- Drop the redundant 2-column index
DROP INDEX IF EXISTS idx_org_members_user_org;

DO $$
BEGIN
  RAISE NOTICE 'Dropped redundant index: idx_org_members_user_org';
END $$;

-- ============================================================================
-- CLEANUP: Remove duplicate idx_org_members_user_org_role if covering index exists
--
-- If both idx_org_members_user_org_role AND idx_org_members_user_org_role_covering exist,
-- the covering index supersedes the regular one.
-- ============================================================================

DO $$
BEGIN
  -- Check if both the regular and covering versions exist
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'organization_members' 
    AND indexname = 'idx_org_members_user_org_role'
  ) AND EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'organization_members' 
    AND indexname = 'idx_org_members_user_org_role_covering'
  ) THEN
    -- Drop the non-covering version since covering index is superior
    DROP INDEX IF EXISTS idx_org_members_user_org_role;
    RAISE NOTICE 'Dropped superseded index: idx_org_members_user_org_role (covered by idx_org_members_user_org_role_covering)';
  END IF;
END $$;

-- ============================================================================
-- POST-REMOVAL: Validation
-- ============================================================================

-- Verify indexes were removed
DO $$
DECLARE
  remaining_billing_idx BOOLEAN;
  remaining_org_members_idx BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_billing_events_stripe_event_id'
  ) INTO remaining_billing_idx;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_org_members_user_org'
  ) INTO remaining_org_members_idx;
  
  IF remaining_billing_idx THEN
    RAISE WARNING 'idx_billing_events_stripe_event_id was not removed';
  ELSE
    RAISE NOTICE 'Successfully removed idx_billing_events_stripe_event_id';
  END IF;
  
  IF remaining_org_members_idx THEN
    RAISE WARNING 'idx_org_members_user_org was not removed';
  ELSE
    RAISE NOTICE 'Successfully removed idx_org_members_user_org';
  END IF;
END $$;

-- Verify remaining indexes are still present
DO $$
BEGIN
  -- Verify billing_events still has its unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'billing_events'
    AND tc.constraint_type = 'UNIQUE'
  ) THEN
    RAISE WARNING 'billing_events unique constraint may be missing';
  ELSE
    RAISE NOTICE 'Verified: billing_events unique constraint is intact';
  END IF;
  
  -- Verify organization_members still has the covering index
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'organization_members' 
    AND indexname IN ('idx_org_members_user_org_role', 'idx_org_members_user_org_role_covering')
  ) THEN
    RAISE WARNING 'organization_members covering index may be missing';
  ELSE
    RAISE NOTICE 'Verified: organization_members covering index is intact';
  END IF;
END $$;

-- ============================================================================
-- POST-REMOVAL: Analyze tables to update statistics
-- ============================================================================

ANALYZE billing_events;
ANALYZE organization_members;

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 3 Complete: Duplicate indexes removed';
  RAISE NOTICE 'Removed: idx_billing_events_stripe_event_id (covered by unique constraint)';
  RAISE NOTICE 'Removed: idx_org_members_user_org (covered by idx_org_members_user_org_role*)';
  RAISE NOTICE 'Index definitions backed up to _index_backup table';
END $$;
