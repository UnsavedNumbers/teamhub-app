-- Migration: Rename children table to athletes, child_guardians to athlete_guardians
-- ==================================================================================
-- This migration transforms the data model from family-centric to athlete-centric
-- by renaming core tables and updating all references.

-- Step 1: Rename children table to athletes
-- ==========================================
ALTER TABLE children RENAME TO athletes;

-- Rename indexes (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_children_family_id') THEN
    ALTER INDEX idx_children_family_id RENAME TO idx_athletes_family_id;
  END IF;
END $$;

-- Rename trigger
DROP TRIGGER IF EXISTS update_children_updated_at ON athletes;
CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON athletes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 2: Rename child_guardians table to athlete_guardians
-- ==========================================================
ALTER TABLE child_guardians RENAME TO athlete_guardians;

-- Rename column child_id to athlete_id
ALTER TABLE athlete_guardians RENAME COLUMN child_id TO athlete_id;

-- Rename indexes (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_child_guardians_child_user') THEN
    ALTER INDEX idx_child_guardians_child_user RENAME TO idx_athlete_guardians_athlete_user;
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_child_guardians_user_org') THEN
    ALTER INDEX idx_child_guardians_user_org RENAME TO idx_athlete_guardians_user_org;
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_child_guardians_org_child') THEN
    ALTER INDEX idx_child_guardians_org_child RENAME TO idx_athlete_guardians_org_athlete;
  END IF;
END $$;

-- Rename constraint (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'child_guardians_pkey') THEN
    ALTER TABLE athlete_guardians RENAME CONSTRAINT child_guardians_pkey TO athlete_guardians_pkey;
  END IF;
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'child_guardians_child_id_fkey') THEN
    ALTER TABLE athlete_guardians RENAME CONSTRAINT child_guardians_child_id_fkey TO athlete_guardians_athlete_id_fkey;
  END IF;
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'child_guardians_user_id_fkey') THEN
    ALTER TABLE athlete_guardians RENAME CONSTRAINT child_guardians_user_id_fkey TO athlete_guardians_user_id_fkey;
  END IF;
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'child_guardians_organization_id_fkey') THEN
    ALTER TABLE athlete_guardians RENAME CONSTRAINT child_guardians_organization_id_fkey TO athlete_guardians_organization_id_fkey;
  END IF;
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'child_guardians_child_id_user_id_organization_id_key') THEN
    ALTER TABLE athlete_guardians RENAME CONSTRAINT child_guardians_child_id_user_id_organization_id_key TO athlete_guardians_athlete_id_user_id_organization_id_key;
  END IF;
END $$;

-- Rename trigger
DROP TRIGGER IF EXISTS update_child_guardians_updated_at ON athlete_guardians;
CREATE TRIGGER update_athlete_guardians_updated_at
  BEFORE UPDATE ON athlete_guardians
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Rename enum type (only if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_type WHERE typname = 'child_guardian_status') THEN
    ALTER TYPE child_guardian_status RENAME TO athlete_guardian_status;
  END IF;
END $$;

-- Step 3: Update parent_invites table
-- ====================================
ALTER TABLE parent_invites RENAME COLUMN child_id TO athlete_id;

-- Rename indexes
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_parent_invites_child_id') THEN
    ALTER INDEX idx_parent_invites_child_id RENAME TO idx_parent_invites_athlete_id;
  END IF;
END $$;

-- Step 4: Update join_requests table
-- ===================================
ALTER TABLE join_requests RENAME COLUMN child_id TO athlete_id;

-- Rename indexes
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_join_requests_child_team') THEN
    ALTER INDEX idx_join_requests_child_team RENAME TO idx_join_requests_athlete_team;
  END IF;
END $$;

-- Step 5: Update child_claim_tokens table
-- ========================================
-- Check if child_claim_tokens exists and update if it does
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'child_claim_tokens'
  ) THEN
    ALTER TABLE child_claim_tokens RENAME COLUMN child_id TO athlete_id;
    
    -- Only rename index if it exists
    IF EXISTS (
      SELECT FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname = 'idx_child_claim_tokens_child'
    ) THEN
      ALTER INDEX idx_child_claim_tokens_child RENAME TO idx_child_claim_tokens_athlete;
    END IF;
  END IF;
END $$;

-- Step 6: Update team_memberships table
-- ======================================
ALTER TABLE team_memberships RENAME COLUMN child_id TO athlete_id;

-- Rename indexes
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_team_memberships_child_team') THEN
    ALTER INDEX idx_team_memberships_child_team RENAME TO idx_team_memberships_athlete_team;
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_team_memberships_child_team_season') THEN
    ALTER INDEX idx_team_memberships_child_team_season RENAME TO idx_team_memberships_athlete_team_season;
  END IF;
END $$;

-- Step 7: Update attendance table
-- ================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'attendance'
    AND column_name = 'child_id'
  ) THEN
    ALTER TABLE attendance RENAME COLUMN child_id TO athlete_id;
  END IF;
END $$;

-- Step 8: Update payments table
-- ==============================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'payments'
    AND column_name = 'child_id'
  ) THEN
    ALTER TABLE payments RENAME COLUMN child_id TO athlete_id;
  END IF;
END $$;

-- Step 9: Update uniform_orders table
-- ====================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'uniform_orders'
    AND column_name = 'child_id'
  ) THEN
    ALTER TABLE uniform_orders RENAME COLUMN child_id TO athlete_id;
  END IF;
END $$;

-- Step 10: Update tryout_registrations table
-- ===========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'tryout_registrations'
    AND column_name = 'child_id'
  ) THEN
    ALTER TABLE tryout_registrations RENAME COLUMN child_id TO athlete_id;
  END IF;
END $$;

-- Step 11: Update athlete_imports table
-- ======================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'athlete_imports'
    AND column_name = 'child_id'
  ) THEN
    ALTER TABLE athlete_imports RENAME COLUMN child_id TO athlete_id;
  END IF;
END $$;

-- Step 12: Update event_rsvps table
-- ==================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'event_rsvps'
    AND column_name = 'child_id'
  ) THEN
    ALTER TABLE event_rsvps RENAME COLUMN child_id TO athlete_id;
    
    -- Update foreign key constraint if it exists
    IF EXISTS (
      SELECT FROM pg_constraint 
      WHERE conrelid = 'event_rsvps'::regclass 
      AND conname LIKE '%child_id%'
    ) THEN
      -- Rename the foreign key constraint
      ALTER TABLE event_rsvps RENAME CONSTRAINT event_rsvps_child_id_fkey TO event_rsvps_athlete_id_fkey;
    END IF;
    
    -- Update unique constraint if it exists
    IF EXISTS (
      SELECT FROM pg_constraint 
      WHERE conrelid = 'event_rsvps'::regclass 
      AND conname LIKE '%event_id%child_id%' OR conname LIKE '%child_id%event_id%'
    ) THEN
      -- Drop and recreate with new column name
      ALTER TABLE event_rsvps DROP CONSTRAINT IF EXISTS event_rsvps_event_id_child_id_key;
      ALTER TABLE event_rsvps ADD CONSTRAINT event_rsvps_event_id_athlete_id_key UNIQUE(event_id, athlete_id);
    END IF;
    
    -- Rename index if it exists
    IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_event_rsvps_child_id') THEN
      ALTER INDEX idx_event_rsvps_child_id RENAME TO idx_event_rsvps_athlete_id;
    END IF;
  END IF;
END $$;

-- Step 13: Update fee_assignments table
-- ======================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'fee_assignments'
    AND column_name = 'child_id'
  ) THEN
    ALTER TABLE fee_assignments RENAME COLUMN child_id TO athlete_id;
    
    -- Update foreign key constraint if it exists
    IF EXISTS (
      SELECT FROM pg_constraint 
      WHERE conrelid = 'fee_assignments'::regclass 
      AND conname LIKE '%child_id%'
    ) THEN
      ALTER TABLE fee_assignments RENAME CONSTRAINT fee_assignments_child_id_fkey TO fee_assignments_athlete_id_fkey;
    END IF;
    
    -- Rename index if it exists
    IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_fee_assignments_child_id') THEN
      ALTER INDEX idx_fee_assignments_child_id RENAME TO idx_fee_assignments_athlete_id;
    END IF;
  END IF;
END $$;

-- Step 14: Add comments for documentation
-- ========================================
COMMENT ON TABLE athletes IS 'Athletes in the system. Each athlete can have multiple guardians via athlete_guardians. Families are derived from shared guardian relationships.';
COMMENT ON TABLE athlete_guardians IS 'Links athletes to their guardians (parents/legal guardians). Multiple athletes sharing guardians form a family.';
COMMENT ON COLUMN athletes.family_id IS 'Legacy field - nullable. Families are now derived from athlete_guardians relationships.';
