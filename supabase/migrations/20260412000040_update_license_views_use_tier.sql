-- Phase 4: Update admin views to use current_tier_id instead of license_plan enum
-- This migration updates admin_license_tiers_list and admin_license_metrics views
-- to use current_tier_id for counting organizations, removing hardcoded tier buckets.

-- Update admin_license_tiers_list view
-- Note: Adding version column requires DROP + CREATE (cannot add columns in middle with CREATE OR REPLACE)
DROP VIEW IF EXISTS admin_license_tiers_list;
CREATE VIEW admin_license_tiers_list WITH (security_invoker='true') AS
SELECT 
  lt.id,
  lt.tier_key,
  lt.tier_name,
  lt.description,
  lt.stripe_price_id,
  lt.stripe_verified_at,
  lt.stripe_product_name,
  lt.stripe_amount_cents,
  lt.stripe_interval,
  lt.stripe_currency,
  lt.stripe_active,
  lt.status,
  lt.version,
  lt.created_at,
  lt.updated_at,
  (SELECT count(*) FROM tier_feature_assignments tfa
   WHERE tfa.license_tier_id = lt.id AND tfa.included = true) 
  AS included_features_count,
  (SELECT count(*) FROM organizations o
   WHERE o.current_tier_id = lt.id) 
  AS orgs_using_count
FROM license_tiers lt;

-- Update admin_license_metrics view (remove hardcoded tier buckets)
-- Note: Removing orgs_on_basic/orgs_on_power and adding orgs_with_tier changes column structure
-- Requires DROP + CREATE (cannot remove columns with CREATE OR REPLACE)
DROP VIEW IF EXISTS admin_license_metrics;
CREATE VIEW admin_license_metrics WITH (security_invoker='true') AS
SELECT 
  (SELECT count(*) FROM license_tiers WHERE status = 'active') AS active_tiers,
  (SELECT count(*) FROM feature_entitlements WHERE archived_at IS NULL) AS total_features,
  (SELECT count(*) FROM feature_entitlements WHERE archived_at IS NOT NULL) AS archived_features,
  -- REMOVED: orgs_on_basic, orgs_on_power (hardcoded tier buckets)
  -- Instead, use dynamic grouping: GROUP BY tier_id in application layer
  (SELECT count(*) FROM organizations WHERE current_tier_id IS NOT NULL) AS orgs_with_tier,
  (SELECT count(*) FROM entitlement_overrides
   WHERE revoked_at IS NULL 
     AND (expires_at IS NULL OR expires_at > now())) AS active_overrides,
  (SELECT count(*) FROM license_tiers
   WHERE stripe_price_id IS NULL OR stripe_price_id = '') AS tiers_missing_price_id,
  (SELECT count(*) FROM feature_entitlements fe
   WHERE fe.archived_at IS NULL 
     AND fe.is_system_feature = false 
     AND fe.platform_admin_only = false
     AND NOT EXISTS (
       SELECT 1 FROM tier_feature_assignments tfa
       WHERE tfa.feature_entitlement_id = fe.id AND tfa.included = true
     )) AS features_without_assignment,
  (SELECT count(DISTINCT lt.id) FROM license_tiers lt
   WHERE lt.status = 'active'
     AND EXISTS (
       SELECT 1 FROM tier_feature_assignments tfa
       JOIN feature_entitlements fe ON fe.id = tfa.feature_entitlement_id
       WHERE tfa.license_tier_id = lt.id 
         AND tfa.included = true 
         AND fe.archived_at IS NOT NULL
     )) AS tiers_with_archived_features;
