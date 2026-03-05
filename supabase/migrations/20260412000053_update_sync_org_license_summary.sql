-- Migration: Update sync_org_license_summary to always sync current_tier_id
-- Description: Ensures sync_org_license_summary always updates current_tier_id from stripe_price_id
-- Date: 2026-04-12

BEGIN;

-- ============================================================================
-- STEP 1: Update sync_org_license_summary function
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_org_license_summary(org_id uuid) 
RETURNS void AS $$
DECLARE
  lic record;
  v_tier_id uuid;
BEGIN
  SELECT * INTO lic
  FROM org_licenses l
  WHERE l.org_id = sync_org_license_summary.org_id;
  
  IF lic IS NULL THEN RETURN; END IF;
  
  -- Look up tier by stripe_price_id
  SELECT id INTO v_tier_id
  FROM license_tiers
  WHERE stripe_price_id = lic.stripe_price_id
    AND status = 'active'
  LIMIT 1;
  
  UPDATE organizations o
  SET
    license_status = lic.status,
    current_tier_id = v_tier_id, -- Always update tier_id from price_id
    license_current_period_start = lic.current_period_start,
    license_current_period_end = lic.current_period_end,
    license_trial_ends_at = lic.trial_ends_at,
    license_grace_ends_at = lic.grace_ends_at,
    license_cancel_at_period_end = lic.cancel_at_period_end,
    stripe_customer_id = lic.stripe_customer_id,
    stripe_subscription_id = lic.stripe_subscription_id,
    stripe_price_id = lic.stripe_price_id,
    updated_at = now()
  WHERE o.id = sync_org_license_summary.org_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
