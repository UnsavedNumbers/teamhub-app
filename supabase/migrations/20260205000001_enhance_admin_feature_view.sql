-- Migration: Enhance admin_feature_entitlements_list View
-- =============================================================
-- Extends the admin view to include:
-- - License tier assignments (array of tier keys)
-- - Role visibility flags
-- - Integration assignments (array)
-- - Quantifiable flag
-- - Discovery source
-- - NULL-safe handling for all computed fields

-- ============================================================================
-- 1. Drop and Recreate Enhanced View
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
  -- Lock fields
  fe.is_toggleable,
  fe.is_removable,
  fe.lock_reason,
  -- Tier assignments count
  (SELECT COUNT(*) 
   FROM tier_feature_assignments tfa 
   WHERE tfa.feature_entitlement_id = fe.id 
     AND tfa.included = true) AS tier_assignments_count,
  -- Tier keys array (NULL-safe)
  COALESCE(
    (SELECT array_agg(DISTINCT lt.tier_key) 
     FROM tier_feature_assignments tfa
     JOIN license_tiers lt ON lt.id = tfa.license_tier_id
     WHERE tfa.feature_entitlement_id = fe.id 
       AND tfa.included = true
       AND lt.status = 'active'),
    ARRAY[]::TEXT[]
  ) AS assigned_tier_keys,
  -- Role visibility (from tier assignments, NULL-safe)
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
  -- Integrations array (NULL-safe)
  COALESCE(
    (SELECT array_agg(DISTINCT fia.integration_name) 
     FROM feature_integration_assignments fia
     WHERE fia.feature_entitlement_id = fe.id),
    ARRAY[]::TEXT[]
  ) AS integrations,
  -- Quantifiable flag (NULL-safe)
  COALESCE(
    (SELECT bool_or(tfa.limit_value IS NOT NULL) 
     FROM tier_feature_assignments tfa 
     WHERE tfa.feature_entitlement_id = fe.id),
    false
  ) AS is_quantifiable,
  -- Discovery source
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM feature_discovery_cache fdc 
      WHERE fdc.discovered_features::jsonb @> 
        jsonb_build_array(jsonb_build_object('featureKey', fe.feature_key))
    ) THEN 'auto-discovered'
    WHEN fe.created_at = fe.updated_at THEN 'manually-created'
    ELSE 'override-custom'
  END AS discovery_source,
  -- Overrides count
  (SELECT COUNT(*) 
   FROM entitlement_overrides eo 
   WHERE eo.feature_entitlement_id = fe.id 
     AND eo.revoked_at IS NULL 
     AND (eo.expires_at IS NULL OR eo.expires_at > NOW())) AS active_overrides_count
FROM feature_entitlements fe;

-- ============================================================================
-- 2. Grant Permissions
-- ============================================================================

GRANT SELECT ON admin_feature_entitlements_list TO authenticated;
