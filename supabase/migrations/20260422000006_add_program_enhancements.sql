-- Migration: Add program enhancement fields
-- Description: Adds visibility controls, activity dates, registration windows, metadata fields, and default location assignment to programs table
-- Date: 2026-04-22

BEGIN;

-- ============================================================================
-- STEP 1: Add program enhancement fields
-- ============================================================================

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS activity_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activity_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS program_code TEXT,
  ADD COLUMN IF NOT EXISTS sponsor TEXT,
  ADD COLUMN IF NOT EXISTS default_location_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 2: Create unique index for program code per org
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_org_code 
  ON public.programs(org_id, program_code) 
  WHERE program_code IS NOT NULL;

-- ============================================================================
-- STEP 3: Add check constraints for date ranges
-- ============================================================================

-- Check if constraint already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_activity_dates'
  ) THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT check_activity_dates 
      CHECK (
        activity_end_date IS NULL 
        OR activity_start_date IS NULL 
        OR activity_end_date >= activity_start_date
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_registration_dates'
  ) THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT check_registration_dates 
      CHECK (
        registration_end_date IS NULL 
        OR registration_start_date IS NULL 
        OR registration_end_date >= registration_start_date
      );
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Add column comments
-- ============================================================================

COMMENT ON COLUMN public.programs.is_public IS 'When true, program is visible in public listings';
COMMENT ON COLUMN public.programs.activity_start_date IS 'When the program activities begin';
COMMENT ON COLUMN public.programs.activity_end_date IS 'When the program activities end';
COMMENT ON COLUMN public.programs.registration_start_date IS 'Earliest date registrations are accepted';
COMMENT ON COLUMN public.programs.registration_end_date IS 'Latest date registrations are accepted';
COMMENT ON COLUMN public.programs.program_code IS 'Optional sortable identifier unique per organization';
COMMENT ON COLUMN public.programs.sponsor IS 'Optional sponsor name';
COMMENT ON COLUMN public.programs.default_location_id IS 'Default venue/facility for events in this program';

COMMIT;
