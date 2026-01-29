-- ============================================================================
-- Fix Feature Gate for NULL License Tier
-- ============================================================================
-- Fixes the get_feature_gate function to handle cases where the license_tier
-- record doesn't exist or is not active. Without this fix, if an org has a
-- license_plan (e.g., 'starter') but no matching license_tier record with 
-- status='active', all feature gates fail silently.
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

  -- =========================================================================
  -- FIX: Handle case where license tier record doesn't exist
  -- =========================================================================
  IF v_license_tier_id IS NULL THEN
    -- License tier not found in license_tiers table
    -- Platform admins can still access
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    END IF;
    
    -- For regular users, fail with informative reason
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
      'reason_code', 'license_tier_not_configured',
      'feature_key', p_feature_key,
      'tier_key', v_tier_key
    );
  END IF;

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
   Returns JSONB with allowed, gate_action, reason_code, and optional limit_value.
   Fixed to handle NULL license tier IDs when tier record does not exist.';
