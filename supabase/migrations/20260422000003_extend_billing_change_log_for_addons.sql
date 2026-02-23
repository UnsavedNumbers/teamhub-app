-- Migration: Extend billing_change_log for Add-On Actions
-- Description: Adds columns to license_change_log table to support add-on lifecycle tracking
-- Date: 2026-04-22

BEGIN;

-- ============================================================================
-- STEP 1: Add add-on specific columns to license_change_log
-- ============================================================================

ALTER TABLE public.license_change_log
  ADD COLUMN IF NOT EXISTS feature_key text REFERENCES public.feature_entitlements(feature_key) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_item_id text;

-- ============================================================================
-- STEP 2: Update result_status check constraint to include add-on actions
-- ============================================================================

-- Note: We cannot modify CHECK constraints directly, so we need to drop and recreate
-- First, check if constraint exists and get its definition
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.license_change_log
    DROP CONSTRAINT IF EXISTS license_change_log_result_status_check;
  
  -- Recreate with expanded values (keeping original values + add-on specific)
  ALTER TABLE public.license_change_log
    ADD CONSTRAINT license_change_log_result_status_check
    CHECK (
      result_status IN (
        'pending', 'succeeded', 'failed',
        'addon_add_requested', 'addon_add_succeeded', 'addon_add_failed',
        'addon_remove_requested', 'addon_remove_succeeded', 'addon_remove_failed',
        'addon_removed_tier_upgrade'
      )
    );
END $$;

-- ============================================================================
-- STEP 3: Create index for add-on queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_license_change_log_feature_key
  ON public.license_change_log(feature_key)
  WHERE feature_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_license_change_log_subscription_item_id
  ON public.license_change_log(stripe_subscription_item_id)
  WHERE stripe_subscription_item_id IS NOT NULL;

-- ============================================================================
-- STEP 4: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.license_change_log.feature_key IS 
  'Feature key for add-on related actions. NULL for tier upgrade actions.';

COMMENT ON COLUMN public.license_change_log.stripe_subscription_item_id IS 
  'Stripe subscription item ID for add-on related actions. NULL for tier upgrade actions.';

COMMIT;
