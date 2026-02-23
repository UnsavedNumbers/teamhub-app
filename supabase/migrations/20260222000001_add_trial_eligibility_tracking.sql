-- Migration: Add trial eligibility tracking fields
-- Description: Adds trial_used_at to organizations and trial_start to org_licenses for free trial eligibility enforcement
-- Date: 2026-02-22

BEGIN;

-- ============================================================================
-- STEP 1: Add trial_start to org_licenses table
-- ============================================================================

-- Add trial_start column to track when current trial started (for audit/logging)
ALTER TABLE public.org_licenses
ADD COLUMN IF NOT EXISTS trial_start timestamp with time zone;

COMMENT ON COLUMN public.org_licenses.trial_start IS 'Timestamp when the current trial period started. Set when subscription enters trialing status.';

-- ============================================================================
-- STEP 2: Add trial_used_at to organizations table
-- ============================================================================

-- Add trial_used_at column to track when org first used a trial (for eligibility enforcement)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS trial_used_at timestamp with time zone;

COMMENT ON COLUMN public.organizations.trial_used_at IS 'Timestamp when organization first used a free trial. Used to enforce one-trial-per-org policy. Set when subscription enters trialing status.';

-- ============================================================================
-- STEP 3: Add license_trial_start to organizations table (for syncing)
-- ============================================================================

-- Add license_trial_start column for denormalized summary field (synced from org_licenses.trial_start)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS license_trial_start timestamp with time zone;

COMMENT ON COLUMN public.organizations.license_trial_start IS 'Synced from org_licenses.trial_start. Denormalized summary field for fast queries.';

COMMIT;
