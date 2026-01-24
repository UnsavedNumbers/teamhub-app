-- Migration: Recreate admin_license_metrics View
-- =============================================================
-- This migration ensures the admin_license_metrics view exists and includes
-- all required fields for the licenses overview dashboard.
--
-- The view was missing, causing errors on the /platform-admin/licenses page.

-- ============================================================================
-- Recreate admin_license_metrics view
-- ============================================================================

DROP VIEW IF EXISTS admin_license_metrics CASCADE;

CREATE VIEW admin_license_metrics AS
SELECT
  (SELECT COUNT(*) FROM license_tiers WHERE status = 'active') AS active_tiers,
  (SELECT COUNT(*) FROM feature_entitlements WHERE archived_at IS NULL) AS total_features,
  (SELECT COUNT(*) FROM feature_entitlements WHERE archived_at IS NOT NULL) AS archived_features,
  (SELECT COUNT(*) FROM organizations WHERE license_plan::text IN ('basic', 'starter')) AS orgs_on_basic,
  (SELECT COUNT(*) FROM organizations WHERE license_plan::text IN ('power', 'standard', 'pro')) AS orgs_on_power,
  (SELECT COUNT(*) FROM entitlement_overrides WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())) AS active_overrides,
  (SELECT COUNT(*) FROM license_tiers WHERE stripe_price_id IS NULL OR stripe_price_id = '') AS tiers_missing_price_id,
  (SELECT COUNT(*) FROM feature_entitlements WHERE archived_at IS NULL AND id NOT IN (SELECT DISTINCT feature_entitlement_id FROM tier_feature_assignments WHERE included = true)) AS features_without_assignment,
  (
    SELECT COUNT(DISTINCT lt.id)
    FROM license_tiers lt
    WHERE lt.status = 'active'
      AND EXISTS (
        SELECT 1
        FROM tier_feature_assignments tfa
        JOIN feature_entitlements fe ON fe.id = tfa.feature_entitlement_id
        WHERE tfa.license_tier_id = lt.id
          AND tfa.included = true
          AND fe.archived_at IS NOT NULL
      )
  ) AS tiers_with_archived_features;

-- Grant permissions
GRANT SELECT ON admin_license_metrics TO authenticated;

-- ============================================================================
-- Notes
-- ============================================================================
-- This view provides aggregated metrics for the licenses overview dashboard.
-- Views inherit RLS from their underlying tables, so no RLS policies should
-- be created directly on this view.
