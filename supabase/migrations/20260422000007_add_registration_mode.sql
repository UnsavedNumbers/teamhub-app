-- Migration: Add registration mode to programs
-- Description: Adds registration_mode enum and column to programs table to control
--              whether programs allow individual registration, team registration, or both
-- Date: 2026-04-22

BEGIN;

-- ============================================================================
-- STEP 1: Create registration_mode enum type
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_mode') THEN
    CREATE TYPE public.registration_mode AS ENUM ('individual_only', 'team_only', 'both');
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add registration_mode column to programs table
-- ============================================================================

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS registration_mode public.registration_mode DEFAULT 'both' NOT NULL;

-- ============================================================================
-- STEP 3: Add column comment
-- ============================================================================

COMMENT ON COLUMN public.programs.registration_mode IS 'Controls registration type: individual_only (no team registration), team_only (team registration only), both (allows both individual and team registration)';

-- ============================================================================
-- STEP 4: Migration verification
-- ============================================================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_default_value TEXT;
BEGIN
  -- Verify column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'programs'
      AND column_name = 'registration_mode'
  ) INTO v_column_exists;

  IF NOT v_column_exists THEN
    RAISE EXCEPTION 'Migration failed: registration_mode column not created';
  END IF;

  -- Verify default value
  SELECT column_default INTO v_default_value
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'programs'
    AND column_name = 'registration_mode';

  IF v_default_value IS NULL OR v_default_value NOT LIKE '%both%' THEN
    RAISE EXCEPTION 'Migration failed: registration_mode default value incorrect';
  END IF;

  RAISE NOTICE 'Migration successful: registration_mode column added with default value ''both''';
END $$;

COMMIT;
