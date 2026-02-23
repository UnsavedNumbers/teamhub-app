-- Migration: Add transfer tracking columns to team_memberships
-- Description: Adds columns to track player transfers between teams (transferred_from_team_id, transferred_at, transfer_reason)
-- Date: 2026-04-22

BEGIN;

-- ============================================================================
-- STEP 1: Add transfer tracking columns to team_memberships table
-- ============================================================================

ALTER TABLE public.team_memberships
  ADD COLUMN IF NOT EXISTS transferred_from_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfer_reason TEXT;

-- ============================================================================
-- STEP 2: Add check constraint to ensure transferred_at is set when transferred_from_team_id is set
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_team_memberships_transfer_consistency'
  ) THEN
    ALTER TABLE public.team_memberships
      ADD CONSTRAINT check_team_memberships_transfer_consistency 
      CHECK (
        (transferred_from_team_id IS NULL AND transferred_at IS NULL) OR
        (transferred_from_team_id IS NOT NULL AND transferred_at IS NOT NULL)
      );
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add index for querying transfers
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_team_memberships_transferred_from_team 
  ON public.team_memberships(transferred_from_team_id) 
  WHERE transferred_from_team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_memberships_transferred_at 
  ON public.team_memberships(transferred_at) 
  WHERE transferred_at IS NOT NULL;

-- ============================================================================
-- STEP 4: Add column comments
-- ============================================================================

COMMENT ON COLUMN public.team_memberships.transferred_from_team_id IS 'ID of the team the player was transferred from. NULL means this membership was not a transfer.';
COMMENT ON COLUMN public.team_memberships.transferred_at IS 'Timestamp when the transfer occurred. Must be set if transferred_from_team_id is set.';
COMMENT ON COLUMN public.team_memberships.transfer_reason IS 'Optional reason for the transfer, provided by the administrator who performed the transfer.';

-- ============================================================================
-- STEP 5: Migration verification
-- ============================================================================

DO $$
DECLARE
  v_transferred_from_exists BOOLEAN;
  v_transferred_at_exists BOOLEAN;
  v_transfer_reason_exists BOOLEAN;
  v_constraint_exists BOOLEAN;
BEGIN
  -- Verify columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_memberships'
      AND column_name = 'transferred_from_team_id'
  ) INTO v_transferred_from_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_memberships'
      AND column_name = 'transferred_at'
  ) INTO v_transferred_at_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_memberships'
      AND column_name = 'transfer_reason'
  ) INTO v_transfer_reason_exists;

  IF NOT v_transferred_from_exists THEN
    RAISE EXCEPTION 'Migration failed: transferred_from_team_id column not created';
  END IF;

  IF NOT v_transferred_at_exists THEN
    RAISE EXCEPTION 'Migration failed: transferred_at column not created';
  END IF;

  IF NOT v_transfer_reason_exists THEN
    RAISE EXCEPTION 'Migration failed: transfer_reason column not created';
  END IF;

  -- Verify constraint exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_team_memberships_transfer_consistency'
  ) INTO v_constraint_exists;

  IF NOT v_constraint_exists THEN
    RAISE EXCEPTION 'Migration failed: transfer consistency constraint not created';
  END IF;

  RAISE NOTICE 'Migration successful: transfer tracking columns added to team_memberships';
END $$;

COMMIT;
