-- Migration: Add Platform Admin Only (Not Available for Users) to Feature Entitlements
-- =============================================================
-- Adds platform_admin_only so platform admins can mark a feature as
-- "not available for org users" (platform admin only). When true, the feature
-- is only for platform admin use and is not exposed to org admins/coaches/parents.

-- ============================================================================
-- 1. Add platform_admin_only to feature_entitlements
-- ============================================================================

ALTER TABLE feature_entitlements
  ADD COLUMN IF NOT EXISTS platform_admin_only BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN feature_entitlements.platform_admin_only IS
  'If true, feature is not available to org users; only platform admins can use it.';

CREATE INDEX IF NOT EXISTS idx_feature_entitlements_platform_admin_only
  ON feature_entitlements(platform_admin_only)
  WHERE platform_admin_only = true;

-- ============================================================================
-- 2. Mark system features (always on for all tiers)
-- ============================================================================

UPDATE feature_entitlements
SET is_system_feature = true
WHERE feature_key IN (
  'organization',
  'organizations',
  'base',
  'settings',
  'users',
  'join'
);

-- ============================================================================
-- 3. Mark platform-admin-only features
-- ============================================================================

UPDATE feature_entitlements
SET platform_admin_only = true
WHERE feature_key IN (
  -- License / tier management
  'tiers', 'license_tiers', 'tierdetail', 'tier_feature_assignments',
  'admin_license_tiers_list', 'admin_license_metrics', 'overview', 'billing',
  -- Feature catalog & entitlements
  'features', 'featuredetail', 'feature_entitlements', 'featurebulkoperations',
  'feature_discovery_hints', 'feature_discovery_cache', 'feature_discovery_corrections',
  'feature_flags', 'featureflags', 'feature_flag_user_overrides',
  'feature_flag_platform_defaults', 'feature_flag_org_overrides', 'feature_flag_audit_log',
  'feature_integrations', 'feature_integration_assignments', 'feature_dependency_cycles',
  'admin_feature_flags', 'admin_feature_entitlements_list',
  -- Platform admin & users
  'platform_admins', 'platformadmins', 'admins', 'admin_users',
  'list', 'detail', 'create', 'roleselection',
  -- Structure / schema / admin views
  'structure', 'admin_structure', 'dashboard', 'admin_organizations',
  'admin_platform_health', 'admin_audit_log', 'admin_event_logs', 'audit', 'audit_logs_old',
  -- Entitlement overrides
  'entitlement_overrides', 'overrides', 'overridecreate', 'overridedetail',
  'admin_entitlement_overrides_list',
  -- Internal / dev tools
  'migration_errors', 'discovery_errors', 'rls_validation_results', 'rls_policy_backup',
  'index_backup', 'queryhelpers', 'index', 'responsehelpers', 'event_logs_archive',
  'policy_consolidation_log', 'emailpreview'
);

-- ============================================================================
-- 4. Backfill tier assignments for system features (all active tiers)
-- ============================================================================

INSERT INTO tier_feature_assignments (
  license_tier_id, feature_entitlement_id, included, role_admin, role_coach, role_parent
)
SELECT lt.id, fe.id, true, true, true, false
FROM license_tiers lt
CROSS JOIN feature_entitlements fe
WHERE fe.is_system_feature = true
  AND fe.archived_at IS NULL
  AND lt.status = 'active'
ON CONFLICT (license_tier_id, feature_entitlement_id) DO NOTHING;

-- ============================================================================
-- 5. Backfill Basic tier with Tier 1 features
-- ============================================================================

INSERT INTO tier_feature_assignments (
  license_tier_id, feature_entitlement_id, included, role_admin, role_coach, role_parent
)
SELECT 
  lt.id, fe.id, true, true, true,
  CASE WHEN fe.feature_key IN ('event_rsvps', 'announcements', 'messages', 'announcementdetail') THEN true ELSE false END
FROM license_tiers lt
CROSS JOIN feature_entitlements fe
WHERE lt.tier_key = 'basic' AND lt.status = 'active'
  AND fe.archived_at IS NULL AND fe.platform_admin_only = false
  AND fe.feature_key IN (
    'recurring_event_patterns', 'payments', 'eventdetail', 'athletes', 'organization_settings',
    'planselection', 'checkoutsuccess', 'fees', 'team_memberships', 'event_general_rsvps',
    'announcements', 'team_seasons_view', 'preferences', 'seasons', 'family_members',
    'requestattachment', 'paymentsettings', 'valid_event_types', 'guardian_attachment_requests',
    'athlete_sports', 'import', 'seasondetail', 'join_links', 'families', 'organization_sports',
    'team_seasons', 'attendance_settings', 'event_locations', 'family', 'event_attendance',
    'attendance', 'child_claim_tokens', 'onboarding', 'roster', 'org_payment_policies',
    'event_rsvps', 'organization_attendance_settings', 'organizationsettings', 'payment_allocations',
    'guardianrequests', 'parent_invites', 'join_requests', 'athlete_imports', 'calendar',
    'createathlete', 'programs', 'organization_notification_settings', 'athletesports', 'sports',
    'paymentsuccess', 'rsvp', 'sportsprograms', 'recurring_event_instances', 'teams', 'levels',
    'organization_members', 'fee_assignments', 'announcementdetail', 'organization_invites',
    'athlete_guardians', 'events', 'teamsmanagement', 'paymentdetail', 'messages'
  )
ON CONFLICT (license_tier_id, feature_entitlement_id) DO NOTHING;

-- ============================================================================
-- 6. Backfill Power tier with all non-platform-admin features (Tier 1 + Tier 2)
-- ============================================================================

INSERT INTO tier_feature_assignments (
  license_tier_id, feature_entitlement_id, included, role_admin, role_coach, role_parent
)
SELECT 
  lt.id, fe.id, true, true, true,
  CASE WHEN fe.feature_key IN ('event_rsvps', 'announcements', 'messages', 'announcementdetail') THEN true ELSE false END
FROM license_tiers lt
CROSS JOIN feature_entitlements fe
WHERE lt.tier_key = 'power' AND lt.status = 'active'
  AND fe.archived_at IS NULL AND fe.platform_admin_only = false
ON CONFLICT (license_tier_id, feature_entitlement_id) DO NOTHING;

-- ============================================================================
-- 7. Recreate admin_feature_entitlements_list with platform_admin_only
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
  fe.platform_admin_only,
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
-- 8. Update admin_license_metrics: exclude platform_admin_only from features_without_assignment
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
     AND fe.platform_admin_only = false
     AND fe.id NOT IN (
       SELECT DISTINCT feature_entitlement_id FROM tier_feature_assignments WHERE included = true
     )) AS features_without_assignment,
  (SELECT COUNT(DISTINCT lt.id)
   FROM license_tiers lt
   WHERE lt.status = 'active'
     AND EXISTS (
       SELECT 1 FROM tier_feature_assignments tfa
       JOIN feature_entitlements fe ON fe.id = tfa.feature_entitlement_id
       WHERE tfa.license_tier_id = lt.id AND tfa.included = true AND fe.archived_at IS NOT NULL
     )) AS tiers_with_archived_features;

GRANT SELECT ON admin_license_metrics TO authenticated;
