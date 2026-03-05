-- Migration: Add min_roster_size to teams table
-- Description: Adds minimum roster size column to teams table to enforce minimum team size requirements
-- Date: 2026-04-22

BEGIN;

-- ============================================================================
-- STEP 1: Add min_roster_size column to teams table
-- ============================================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS min_roster_size INTEGER;

-- ============================================================================
-- STEP 2: Add check constraint to ensure min_roster_size is positive if set
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_teams_min_roster_size'
  ) THEN
    ALTER TABLE public.teams
      ADD CONSTRAINT check_teams_min_roster_size 
      CHECK (min_roster_size IS NULL OR min_roster_size > 0);
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add check constraint to ensure min_roster_size <= max_roster_size when both are set
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_teams_roster_size_range'
  ) THEN
    ALTER TABLE public.teams
      ADD CONSTRAINT check_teams_roster_size_range 
      CHECK (
        min_roster_size IS NULL 
        OR max_roster_size IS NULL 
        OR min_roster_size <= max_roster_size
      );
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Add column comment
-- ============================================================================

COMMENT ON COLUMN public.teams.min_roster_size IS 'Minimum number of players required on the team roster. NULL means no minimum enforced.';

-- ============================================================================
-- STEP 5: Migration verification
-- ============================================================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_constraint_exists BOOLEAN;
BEGIN
  -- Verify column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teams'
      AND column_name = 'min_roster_size'
  ) INTO v_column_exists;

  IF NOT v_column_exists THEN
    RAISE EXCEPTION 'Migration failed: min_roster_size column not created';
  END IF;

  -- Verify constraint exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_teams_min_roster_size'
  ) INTO v_constraint_exists;

  IF NOT v_constraint_exists THEN
    RAISE EXCEPTION 'Migration failed: min_roster_size constraint not created';
  END IF;

  RAISE NOTICE 'Migration successful: min_roster_size column added with constraints';
END $$;

COMMIT;
