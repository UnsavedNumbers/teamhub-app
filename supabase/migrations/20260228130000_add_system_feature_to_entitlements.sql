-- Migration: Add System Feature to Feature Entitlements
-- =============================================================
-- Adds is_system_feature so platform admins can mark a feature as
-- "always available for any license tier", including newly created tiers.
-- - New column on feature_entitlements
-- - Trigger on license_tiers INSERT to auto-assign system features to new tiers
-- - Admin view and metrics updated to include/exclude system features

-- ============================================================================
-- 1. Add is_system_feature to feature_entitlements
-- ============================================================================

ALTER TABLE feature_entitlements
  ADD COLUMN IF NOT EXISTS is_system_feature BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN feature_entitlements.is_system_feature IS
  'If true, feature is always available for every license tier; new tiers get it automatically.';

CREATE INDEX IF NOT EXISTS idx_feature_entitlements_is_system_feature
  ON feature_entitlements(is_system_feature)
  WHERE is_system_feature = true;

-- ============================================================================
-- 2. Mark existing core features as system features
-- ============================================================================

UPDATE feature_entitlements
SET is_system_feature = true
WHERE feature_key IN (
  'auth.login',
  'auth.signup',
  'auth.session',
  'users.profile',
  'organizations.basic'
);

-- ============================================================================
-- 3. Backfill tier_feature_assignments for system features on existing tiers
-- ============================================================================

INSERT INTO tier_feature_assignments (
  license_tier_id,
  feature_entitlement_id,
  included,
  role_admin,
  role_coach,
  role_parent
)
SELECT lt.id, fe.id, true, true, true, false
FROM license_tiers lt
CROSS JOIN feature_entitlements fe
WHERE fe.is_system_feature = true
  AND fe.archived_at IS NULL
ON CONFLICT (license_tier_id, feature_entitlement_id) DO NOTHING;

-- ============================================================================
-- 4. Trigger: assign system features to new license tiers
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_system_features_to_new_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO tier_feature_assignments (
    license_tier_id,
    feature_entitlement_id,
    included,
    role_admin,
    role_coach,
    role_parent
  )
  SELECT
    NEW.id,
    fe.id,
    true,
    true,
    true,
    false
  FROM feature_entitlements fe
  WHERE fe.is_system_feature = true
    AND fe.archived_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_system_features_to_new_tier ON license_tiers;
CREATE TRIGGER trigger_assign_system_features_to_new_tier
  AFTER INSERT ON license_tiers
  FOR EACH ROW
  EXECUTE FUNCTION assign_system_features_to_new_tier();

-- ============================================================================
-- 5. Recreate admin_feature_entitlements_list with is_system_feature
-- ============================================================================

DROP VIEW IF EXISTS admin_feature_entitlements_list CASCADE;

CREATE VIEW admin_feature_entitlements_list AS
SELECT
  fe.id,
  fe.feature_key,
  fe.display_name,
  fe.category,
  fe.feature_type,
  fe.description,
  fe.rollout_status,
  fe.created_at,
  fe.updated_at,
  fe.archived_at,
  fe.is_toggleable,
  fe.is_removable,
  fe.lock_reason,
  fe.is_system_feature,
  (SELECT COUNT(*)
   FROM tier_feature_assignments tfa
   WHERE tfa.feature_entitlement_id = fe.id
     AND tfa.included = true) AS tier_assignments_count,
  COALESCE(
    (SELECT array_agg(DISTINCT lt.tier_key)
     FROM tier_feature_assignments tfa
     JOIN license_tiers lt ON lt.id = tfa.license_tier_id
     WHERE tfa.feature_entitlement_id = fe.id
       AND tfa.included = true
       AND lt.status = 'active'),
    ARRAY[]::TEXT[]
  ) AS assigned_tier_keys,
  COALESCE(
    (SELECT bool_or(tfa.role_admin)
     FROM tier_feature_assignments tfa
     WHERE tfa.feature_entitlement_id = fe.id
       AND tfa.included = true),
    false
  ) AS visible_to_admin,
  COALESCE(
    (SELECT bool_or(tfa.role_coach)
     FROM tier_feature_assignments tfa
     WHERE tfa.feature_entitlement_id = fe.id
       AND tfa.included = true),
    false
  ) AS visible_to_coach,
  COALESCE(
    (SELECT bool_or(tfa.role_parent)
     FROM tier_feature_assignments tfa
     WHERE tfa.feature_entitlement_id = fe.id
       AND tfa.included = true),
    false
  ) AS visible_to_parent,
  COALESCE(
    (SELECT array_agg(DISTINCT fia.integration_name)
     FROM feature_integration_assignments fia
     WHERE fia.feature_entitlement_id = fe.id),
    ARRAY[]::TEXT[]
  ) AS integrations,
  COALESCE(
    (SELECT bool_or(tfa.limit_value IS NOT NULL)
     FROM tier_feature_assignments tfa
     WHERE tfa.feature_entitlement_id = fe.id
       AND tfa.included = true),
    false
  ) AS is_quantifiable,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM feature_discovery_cache fdc
      WHERE fdc.discovered_features::jsonb @>
        jsonb_build_array(jsonb_build_object('featureKey', fe.feature_key))
    ) THEN 'auto-discovered'
    WHEN fe.created_at = fe.updated_at THEN 'manually-created'
    ELSE 'override-custom'
  END AS discovery_source,
  (SELECT COUNT(*)
   FROM entitlement_overrides eo
   WHERE eo.feature_entitlement_id = fe.id
     AND eo.revoked_at IS NULL
     AND (eo.expires_at IS NULL OR eo.expires_at > NOW())) AS active_overrides_count
FROM feature_entitlements fe;

GRANT SELECT ON admin_feature_entitlements_list TO authenticated;

-- ============================================================================
-- 6. Update admin_license_metrics: exclude system features from "without assignment"
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
  (SELECT COUNT(*)
   FROM feature_entitlements fe
   WHERE fe.archived_at IS NULL
     AND fe.is_system_feature = false
     AND fe.id NOT IN (
       SELECT DISTINCT feature_entitlement_id
       FROM tier_feature_assignments
       WHERE included = true
     )) AS features_without_assignment,
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

GRANT SELECT ON admin_license_metrics TO authenticated;
