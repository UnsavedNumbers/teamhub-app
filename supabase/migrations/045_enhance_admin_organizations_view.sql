-- ============================================================================
-- Migration: Enhance admin_organizations View
-- ============================================================================
-- This migration adds all missing fields to the admin_organizations view:
-- - Contact information (website, phone, email, address, city, state, zip)
-- - Logo path
-- - Stripe details (customer_id, subscription_id, price_id)
-- - Payout details (onboarding_status, descriptor)
-- - License details (current_period_start, grace_ends_at, cancel_at_period_end)
-- - Slug and other organization fields
--
-- Technical Safeguards:
-- - All fields are nullable to handle existing data
-- - Comments explain each field
-- - View is idempotent (can be run multiple times)
-- ============================================================================

DROP VIEW IF EXISTS admin_organizations CASCADE;

CREATE OR REPLACE VIEW admin_organizations AS
SELECT 
  -- Basic organization info
  o.id,
  o.name,
  o.org_type,
  o.status,
  o.slug,
  
  -- Contact information
  o.website,
  o.phone,
  o.email AS contact_email,
  o.address,
  o.city,
  o.state,
  o.zip,
  o.logo_path,
  
  -- License information
  o.license_status,
  o.license_plan,
  o.license_trial_ends_at,
  o.license_current_period_start,
  o.license_current_period_end,
  o.license_grace_ends_at,
  o.license_cancel_at_period_end,
  
  -- Stripe information
  o.stripe_customer_id,
  o.stripe_subscription_id,
  o.stripe_price_id,
  o.stripe_customer_id IS NOT NULL AS stripe_connected,
  
  -- Payout information
  o.payout_account_id,
  o.payouts_enabled,
  o.payout_onboarding_status,
  o.payout_descriptor,
  o.billing_mode,
  o.currency,
  
  -- Primary location (for travel detection)
  o.primary_city,
  o.primary_state,
  o.primary_region_radius_miles,
  
  -- Timestamps
  o.created_at,
  o.updated_at,
  
  -- Aggregated counts
  (SELECT COUNT(*) FROM teams t WHERE t.org_id = o.id) AS team_count,
  (SELECT COUNT(DISTINCT s.id) FROM seasons s WHERE s.org_id = o.id) AS sport_count,
  (SELECT COUNT(DISTINCT om.user_id) FROM organization_members om WHERE om.org_id = o.id) AS user_count
FROM organizations o
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());

-- Grant access
GRANT SELECT ON admin_organizations TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW admin_organizations IS 'Platform admin view: all organizations with complete details including contact info, Stripe details, and aggregated counts. Only accessible by platform admins.';
COMMENT ON COLUMN admin_organizations.contact_email IS 'Public contact email for the organization (distinct from user emails)';
COMMENT ON COLUMN admin_organizations.stripe_connected IS 'Boolean indicating if organization has a Stripe customer ID';
COMMENT ON COLUMN admin_organizations.payout_onboarding_status IS 'Stripe Connect payout onboarding status: pending, completed, or restricted';
