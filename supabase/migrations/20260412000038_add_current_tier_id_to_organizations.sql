-- Phase 1: Add current_tier_id column and backfill data
-- This migration adds the new current_tier_id column to organizations table,
-- backfills existing data using stripe_price_id lookup, and updates the
-- sync_org_license_summary function to set current_tier_id.

-- Add nullable column (non-blocking migration - Technical Risk #10)
ALTER TABLE organizations 
ADD COLUMN current_tier_id UUID REFERENCES public.license_tiers(id) ON DELETE SET NULL;

-- Create index for performance (Technical Risk #5)
-- Note: CONCURRENTLY requires PostgreSQL 12+ and may not be available in all environments
-- If CONCURRENTLY fails, remove it and create index normally
CREATE INDEX idx_organizations_current_tier_id 
ON organizations(current_tier_id)
WHERE current_tier_id IS NOT NULL;

-- Backfill existing data using stripe_price_id lookup (data-driven, no hardcoded mappings)
-- Step 1: Look up tier by organizations.stripe_price_id
UPDATE organizations o
SET current_tier_id = (
  SELECT lt.id
  FROM license_tiers lt
  WHERE lt.status = 'active'
    AND lt.stripe_price_id = o.stripe_price_id
  LIMIT 1
)
WHERE o.stripe_price_id IS NOT NULL
  AND o.current_tier_id IS NULL;

-- Step 2: For orgs without stripe_price_id but with license_plan,
-- try to match by existing org_licenses.stripe_price_id
UPDATE organizations o
SET current_tier_id = (
  SELECT lt.id
  FROM org_licenses ol
  JOIN license_tiers lt ON lt.stripe_price_id = ol.stripe_price_id
  WHERE ol.org_id = o.id
    AND lt.status = 'active'
  LIMIT 1
)
WHERE o.current_tier_id IS NULL
  AND EXISTS (SELECT 1 FROM org_licenses WHERE org_id = o.id);

-- Log any orgs that still don't have current_tier_id (Logistical Risk #3)
-- Run this query manually to identify orgs needing manual attention:
-- SELECT id, name, stripe_price_id, license_plan 
-- FROM organizations 
-- WHERE current_tier_id IS NULL AND license_plan IS NOT NULL;

-- Update sync_org_license_summary() to also set current_tier_id
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
    license_plan = lic.plan, -- Keep for now during transition (Logistical Risk #7)
    current_tier_id = COALESCE(v_tier_id, o.current_tier_id), -- Only update if tier found (Technical Risk #1)
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
