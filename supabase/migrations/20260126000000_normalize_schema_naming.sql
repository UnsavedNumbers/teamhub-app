-- Migration: Normalize Schema Naming
-- ===================================
-- This migration renames all organization_id columns to org_id across all tables
-- to enforce canonical naming conventions. This must run BEFORE migrations that
-- reference org_id (like 20260127000001_fix_auth_rls_initplan.sql).

-- ============================================================================
-- Rename organization_id to org_id in all tables
-- ============================================================================

-- organization_members
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_members'
    AND column_name = 'organization_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_members'
    AND column_name = 'org_id'
  ) THEN
    ALTER TABLE organization_members RENAME COLUMN organization_id TO org_id;
    
    -- Rename constraints
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'organization_members'::regclass
      AND conname LIKE '%organization_id%'
    ) THEN
      ALTER TABLE organization_members RENAME CONSTRAINT organization_members_organization_id_fkey TO organization_members_org_id_fkey;
    END IF;
    
    -- Rename indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_org_members_organization_id') THEN
      ALTER INDEX idx_org_members_organization_id RENAME TO idx_org_members_org_id;
    END IF;
  END IF;
END $$;

-- organization_invites
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_invites'
    AND column_name = 'organization_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_invites'
    AND column_name = 'org_id'
  ) THEN
    ALTER TABLE organization_invites RENAME COLUMN organization_id TO org_id;
    
    -- Rename constraints
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'organization_invites'::regclass
      AND conname LIKE '%organization_id%'
    ) THEN
      ALTER TABLE organization_invites RENAME CONSTRAINT organization_invites_organization_id_fkey TO organization_invites_org_id_fkey;
    END IF;
    
    -- Rename indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_org_invites_organization_id') THEN
      ALTER INDEX idx_org_invites_organization_id RENAME TO idx_org_invites_org_id;
    END IF;
  END IF;
END $$;

-- join_links
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'join_links'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE join_links RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- join_requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'join_requests'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE join_requests RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- seasons
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'seasons'
    AND column_name = 'organization_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'seasons'
    AND column_name = 'org_id'
  ) THEN
    ALTER TABLE seasons RENAME COLUMN organization_id TO org_id;
    
    -- Rename constraints
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'seasons'::regclass
      AND conname LIKE '%organization_id%'
    ) THEN
      ALTER TABLE seasons RENAME CONSTRAINT seasons_organization_id_fkey TO seasons_org_id_fkey;
    END IF;
    
    -- Rename indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_seasons_organization_id') THEN
      ALTER INDEX idx_seasons_organization_id RENAME TO idx_seasons_org_id;
    END IF;
  END IF;
END $$;

-- fee_assignments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'fee_assignments'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE fee_assignments RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- installment_plans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'installment_plans'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE installment_plans RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- fees
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'fees'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE fees RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- charges
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'charges'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE charges RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- checkout_sessions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'checkout_sessions'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE checkout_sessions RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- payments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'payments'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE payments RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- offline_payments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'offline_payments'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE offline_payments RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- discount_codes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'discount_codes'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE discount_codes RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- waivers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'waivers'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE waivers RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- scholarship_programs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'scholarship_programs'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE scholarship_programs RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- scholarship_awards
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'scholarship_awards'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE scholarship_awards RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- refunds
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'refunds'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE refunds RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- org_payment_policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'org_payment_policies'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE org_payment_policies RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- payment_events
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'payment_events'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE payment_events RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- org_licenses
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'org_licenses'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE org_licenses RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- billing_events
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'billing_events'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE billing_events RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- feature_flags
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'feature_flags'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE feature_flags RENAME COLUMN organization_id TO org_id;
    
    -- Rename unique constraint
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'feature_flags'::regclass
      AND conname LIKE '%organization_id%'
    ) THEN
      ALTER TABLE feature_flags DROP CONSTRAINT IF EXISTS feature_flags_organization_id_key;
      ALTER TABLE feature_flags ADD CONSTRAINT feature_flags_org_id_key UNIQUE (org_id, feature_key);
    END IF;
  END IF;
END $$;

-- organization_brand_settings (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_brand_settings'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE organization_brand_settings RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- organization_notification_settings (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_notification_settings'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE organization_notification_settings RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- organization_feature_settings (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_feature_settings'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE organization_feature_settings RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- organization_settings (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_settings'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE organization_settings RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- organization_defaults (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_defaults'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE organization_defaults RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- organization_attendance_settings (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_attendance_settings'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE organization_attendance_settings RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- organization_registration_settings (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_registration_settings'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE organization_registration_settings RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- organization_sports (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_sports'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE organization_sports RENAME COLUMN organization_id TO org_id;
    
    -- Rename unique constraint
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'organization_sports'::regclass
      AND conname LIKE '%organization_id%'
    ) THEN
      ALTER TABLE organization_sports DROP CONSTRAINT IF EXISTS organization_sports_organization_id_sport_id_key;
      ALTER TABLE organization_sports ADD CONSTRAINT organization_sports_org_id_sport_id_key UNIQUE (org_id, sport_id);
    END IF;
  END IF;
END $$;

-- parent_invites (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'parent_invites'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE parent_invites RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- child_claim_tokens (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'child_claim_tokens'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE child_claim_tokens RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- ============================================================================
-- Update indexes that reference organization_id
-- ============================================================================

-- Rename any remaining indexes
DO $$
DECLARE
  idx_record RECORD;
  new_index_name TEXT;
BEGIN
  FOR idx_record IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE '%organization_id%'
  LOOP
    new_index_name := replace(idx_record.indexname, 'organization_id', 'org_id');
    -- Only rename if the new index name doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname = new_index_name
    ) THEN
      EXECUTE format('ALTER INDEX IF EXISTS %I RENAME TO %I',
        idx_record.indexname,
        new_index_name
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN organization_members.org_id IS 'Canonical organization ID column (renamed from organization_id)';
COMMENT ON COLUMN organization_invites.org_id IS 'Canonical organization ID column (renamed from organization_id)';
