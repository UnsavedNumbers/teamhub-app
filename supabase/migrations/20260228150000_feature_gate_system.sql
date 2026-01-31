-- ============================================================================
-- Feature Gate System Migration
-- ============================================================================
-- Adds unavailable_gate_action to feature_entitlements and creates
-- the get_feature_gate and get_feature_gates RPC functions to resolve
-- feature access based on org, user, role, tier, and overrides.
-- ============================================================================

-- ============================================================================
-- 1. Add unavailable_gate_action column
-- ============================================================================

ALTER TABLE feature_entitlements
  ADD COLUMN IF NOT EXISTS unavailable_gate_action TEXT 
  DEFAULT 'overlay'
  CHECK (unavailable_gate_action IN ('disable', 'overlay', 'hide', 'modal', 'paywall', 'custom'));

COMMENT ON COLUMN feature_entitlements.unavailable_gate_action IS
  'Behavior when feature is not available: disable (grayed out), overlay (visible but blocked), hide (not shown), modal (show explanation), paywall (redirect to upgrade), custom (app-specific)';

-- Set sensible defaults based on feature type
UPDATE feature_entitlements
SET unavailable_gate_action = 'hide'
WHERE platform_admin_only = true;

UPDATE feature_entitlements
SET unavailable_gate_action = 'overlay'
WHERE platform_admin_only = false AND is_system_feature = false;

-- System features are always available, so gate_action is null
UPDATE feature_entitlements
SET unavailable_gate_action = NULL
WHERE is_system_feature = true;

-- ============================================================================
-- 2. Create get_feature_gate RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION get_feature_gate(
  p_org_id UUID,
  p_user_id UUID,
  p_feature_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_feature_id UUID;
  v_feature feature_entitlements%ROWTYPE;
  v_tier_key TEXT;
  v_license_tier_id UUID;
  v_user_role TEXT := 'parent'; -- default
  v_is_platform_admin BOOLEAN := FALSE;
  v_tier_assignment tier_feature_assignments%ROWTYPE;
  v_org_override entitlement_overrides%ROWTYPE;
  v_user_override entitlement_overrides%ROWTYPE;
  v_allowed BOOLEAN := FALSE;
  v_gate_action TEXT;
  v_reason_code TEXT;
  v_limit_value INTEGER;
BEGIN
  -- Check if user is platform admin
  SELECT EXISTS (
    SELECT 1 FROM platform_admins WHERE user_id = p_user_id
  ) INTO v_is_platform_admin;

  -- Get feature details
  SELECT * INTO v_feature
  FROM feature_entitlements
  WHERE feature_key = p_feature_key
    AND archived_at IS NULL;

  -- Feature not found
  IF v_feature.id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'gate_action', 'hide',
      'reason_code', 'not_found',
      'feature_key', p_feature_key
    );
  END IF;

  -- Platform admin only feature
  IF v_feature.platform_admin_only = TRUE THEN
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'hide'),
        'reason_code', 'platform_admin_only',
        'feature_key', p_feature_key
      );
    END IF;
  END IF;

  -- System feature (always allowed)
  IF v_feature.is_system_feature = TRUE THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'gate_action', NULL,
      'reason_code', 'system_feature',
      'feature_key', p_feature_key
    );
  END IF;

  -- No org context - allow for platform admins browsing, deny for others
  IF p_org_id IS NULL THEN
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
        'reason_code', 'no_organization',
        'feature_key', p_feature_key
      );
    END IF;
  END IF;

  -- Get org's license tier (normalize plan names to tier keys)
  SELECT 
    CASE o.license_plan::text
      WHEN 'starter' THEN 'basic'
      WHEN 'standard' THEN 'power'
      WHEN 'pro' THEN 'power'
      ELSE o.license_plan::text
    END INTO v_tier_key
  FROM organizations o
  WHERE o.id = p_org_id;

  IF v_tier_key IS NULL THEN
    -- Org not found or no license plan
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
        'reason_code', 'no_organization',
        'feature_key', p_feature_key
      );
    END IF;
  END IF;

  -- Get license tier ID
  SELECT id INTO v_license_tier_id
  FROM license_tiers
  WHERE tier_key = v_tier_key AND status = 'active';

  -- Get user's role in org
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE org_id = p_org_id AND user_id = p_user_id;

  -- Default to parent if no membership found
  IF v_user_role IS NULL THEN
    -- Platform admins can still access
    IF v_is_platform_admin THEN
      v_user_role := 'org_admin'; -- Treat as admin for gate purposes
    ELSE
      v_user_role := 'parent';
    END IF;
  END IF;

  -- Check user override first (highest priority)
  SELECT * INTO v_user_override
  FROM entitlement_overrides
  WHERE target_type = 'user'
    AND target_id = p_user_id
    AND feature_entitlement_id = v_feature.id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_user_override.id IS NOT NULL THEN
    IF v_user_override.override_action = 'disable' THEN
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
        'reason_code', 'disabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_user_override.override_action = 'enable' THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'enabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_user_override.override_action = 'set_limit' THEN
      v_limit_value := v_user_override.limit_value;
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'limit_set_by_override',
        'feature_key', p_feature_key,
        'limit_value', v_limit_value
      );
    END IF;
  END IF;

  -- Check org override (second priority)
  SELECT * INTO v_org_override
  FROM entitlement_overrides
  WHERE target_type = 'organization'
    AND target_id = p_org_id
    AND feature_entitlement_id = v_feature.id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_org_override.id IS NOT NULL THEN
    IF v_org_override.override_action = 'disable' THEN
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
        'reason_code', 'disabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_org_override.override_action = 'enable' THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'enabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_org_override.override_action = 'set_limit' THEN
      v_limit_value := v_org_override.limit_value;
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'limit_set_by_override',
        'feature_key', p_feature_key,
        'limit_value', v_limit_value
      );
    END IF;
  END IF;

  -- Check tier + role assignment
  SELECT * INTO v_tier_assignment
  FROM tier_feature_assignments
  WHERE license_tier_id = v_license_tier_id
    AND feature_entitlement_id = v_feature.id
    AND included = TRUE;

  IF v_tier_assignment.id IS NULL THEN
    -- Not in tier, but platform admins can still access
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    END IF;
    
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
      'reason_code', 'license_tier',
      'feature_key', p_feature_key
    );
  END IF;

  -- Check role permission within tier assignment
  v_allowed := CASE v_user_role
    WHEN 'org_admin' THEN COALESCE(v_tier_assignment.role_admin, TRUE)
    WHEN 'coach' THEN COALESCE(v_tier_assignment.role_coach, TRUE)
    WHEN 'parent' THEN COALESCE(v_tier_assignment.role_parent, FALSE)
    ELSE FALSE
  END;

  IF NOT v_allowed THEN
    -- Platform admins bypass role restrictions
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    END IF;
    
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
      'reason_code', 'role',
      'feature_key', p_feature_key,
      'user_role', v_user_role
    );
  END IF;

  -- Feature is allowed by tier + role
  RETURN jsonb_build_object(
    'allowed', TRUE,
    'gate_action', NULL,
    'reason_code', 'tier_assignment',
    'feature_key', p_feature_key,
    'limit_value', v_tier_assignment.limit_value
  );

EXCEPTION WHEN OTHERS THEN
  -- Fail open with overlay on any error for non-critical features
  -- Log the error for debugging
  RAISE WARNING 'get_feature_gate error for % : %', p_feature_key, SQLERRM;
  RETURN jsonb_build_object(
    'allowed', FALSE,
    'gate_action', 'overlay',
    'reason_code', 'error',
    'feature_key', p_feature_key,
    'error', SQLERRM
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_feature_gate(UUID, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION get_feature_gate IS 
  'Resolves whether a user can access a feature in an organization context. 
   Checks platform admin status, system features, overrides, tier assignments, and roles.
   Returns JSONB with allowed, gate_action, reason_code, and optional limit_value.';

-- ============================================================================
-- 3. Create get_feature_gates Batch RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION get_feature_gates(
  p_org_id UUID,
  p_user_id UUID,
  p_feature_keys TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB := '{}'::JSONB;
  v_key TEXT;
  v_gate JSONB;
BEGIN
  -- Handle null or empty array
  IF p_feature_keys IS NULL OR array_length(p_feature_keys, 1) IS NULL THEN
    RETURN v_result;
  END IF;

  -- Resolve each feature key
  FOREACH v_key IN ARRAY p_feature_keys
  LOOP
    v_gate := get_feature_gate(p_org_id, p_user_id, v_key);
    v_result := v_result || jsonb_build_object(v_key, v_gate);
  END LOOP;
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  -- On any error, return partial results
  RAISE WARNING 'get_feature_gates error: %', SQLERRM;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_feature_gates(UUID, UUID, TEXT[]) TO authenticated;

COMMENT ON FUNCTION get_feature_gates IS 
  'Batch version of get_feature_gate. Resolves multiple feature keys in one call.
   Returns JSONB object with feature_key as keys and gate results as values.';

-- ============================================================================
-- 4. Create index for faster override lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_entitlement_overrides_active_target
  ON entitlement_overrides(target_type, target_id, feature_entitlement_id)
  WHERE revoked_at IS NULL;

-- ============================================================================
-- 5. Update admin_feature_entitlements_list view to include gate_action
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
  fe.unavailable_gate_action,
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
