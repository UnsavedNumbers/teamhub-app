-- ============================================
-- UPDATE get_feature_gate FOR SUB-ORGS
-- ============================================
-- This migration updates get_feature_gate to support sub-organizations:
-- 1. Resolve effective license org_id (parent if sub-org)
-- 2. Check sub_org_settings.enabled_features
-- 3. Check sub_org_settings.status (suspended = deny)
-- 4. Use parent's license tier as ceiling
-- ============================================

CREATE OR REPLACE FUNCTION public.get_feature_gate(p_org_id uuid, p_user_id uuid, p_feature_key text) 
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
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
  
  -- Hierarchy variables (for feature parent/child)
  v_parent_key TEXT;
  v_parent_result JSONB;
  v_depth INTEGER := 0;
  v_max_depth INTEGER := 10;
  v_checked_keys TEXT[] := ARRAY[]::TEXT[];
  
  -- Sub-org variables
  v_is_sub_org BOOLEAN := FALSE;
  v_effective_license_org_id UUID;
  v_sub_org_settings sub_org_settings%ROWTYPE;
  v_enabled_features_json jsonb;
BEGIN
  -- Check if user is platform admin
  SELECT EXISTS (
    SELECT 1 FROM platform_admins WHERE user_id = p_user_id
  ) INTO v_is_platform_admin;

  -- =========================================================================
  -- SUB-ORG CHECK: Resolve effective license org and check sub-org status
  -- =========================================================================
  IF p_org_id IS NOT NULL THEN
    -- Check if this is a sub-org and get effective license org_id
    SELECT 
      o.parent_org_id IS NOT NULL AS is_sub_org,
      public.get_effective_license_org_id(p_org_id) AS effective_license_org_id
    INTO v_is_sub_org, v_effective_license_org_id
    FROM public.organizations o
    WHERE o.id = p_org_id;

    -- If sub-org, check sub_org_settings
    IF v_is_sub_org THEN
      -- Get sub-org settings
      SELECT * INTO v_sub_org_settings
      FROM public.sub_org_settings
      WHERE sub_org_id = p_org_id;

      -- If sub-org is suspended, deny access (unless platform admin)
      IF v_sub_org_settings.id IS NOT NULL AND v_sub_org_settings.status = 'suspended' THEN
        IF NOT v_is_platform_admin THEN
          RETURN jsonb_build_object(
            'allowed', FALSE,
            'gate_action', 'overlay',
            'reason_code', 'sub_org_suspended',
            'feature_key', p_feature_key
          );
        END IF;
      END IF;

      -- Check if feature is enabled in sub_org_settings.enabled_features
      -- enabled_features is JSONB like: {"feature_key": true, "other_feature": false}
      IF v_sub_org_settings.id IS NOT NULL AND v_sub_org_settings.enabled_features IS NOT NULL THEN
        v_enabled_features_json := v_sub_org_settings.enabled_features;
        
        -- If feature key exists in enabled_features and is false, deny
        IF v_enabled_features_json ? p_feature_key THEN
          IF (v_enabled_features_json->>p_feature_key)::boolean = false THEN
            IF NOT v_is_platform_admin THEN
              RETURN jsonb_build_object(
                'allowed', FALSE,
                'gate_action', 'overlay',
                'reason_code', 'sub_org_feature_disabled',
                'feature_key', p_feature_key
              );
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  -- =========================================================================
  -- PARENT FEATURE HIERARCHY CHECK (Existing - for feature parent/child)
  -- Check ancestors iteratively to inherit denials
  -- Only run if we have an org context (skip for admin pages without org)
  -- =========================================================================
  IF p_org_id IS NOT NULL THEN
    v_parent_key := p_feature_key;
    
    LOOP
      -- Get parent of current feature
      SELECT parent_feature_key INTO v_parent_key
      FROM feature_entitlements
      WHERE feature_key = v_parent_key
        AND archived_at IS NULL;

      -- No parent found or reached root
      EXIT WHEN v_parent_key IS NULL;

    -- Prevent infinite loops (defensive check)
    IF v_parent_key = ANY(v_checked_keys) THEN
      RAISE WARNING 'Circular reference detected in feature hierarchy for %', p_feature_key;
      EXIT;
    END IF;
    v_checked_keys := array_append(v_checked_keys, v_parent_key);

    -- Depth limit check
    v_depth := v_depth + 1;
    EXIT WHEN v_depth >= v_max_depth;

    -- Use effective license org_id for tier lookup (parent if sub-org)
    SELECT 
      EXISTS(
        SELECT 1 
        FROM feature_entitlements fe
        LEFT JOIN tier_feature_assignments tfa 
          ON tfa.feature_entitlement_id = fe.id
          AND tfa.license_tier_id = (
            SELECT id FROM license_tiers 
            WHERE tier_key = (
              SELECT 
                CASE o.license_plan::text
                  WHEN 'starter' THEN 'basic'
                  WHEN 'standard' THEN 'power'
                  WHEN 'pro' THEN 'power'
                  ELSE o.license_plan::text
                END
              FROM organizations o
              WHERE o.id = COALESCE(v_effective_license_org_id, p_org_id)
            )
            AND status = 'active'
          )
        WHERE fe.feature_key = v_parent_key
          AND fe.archived_at IS NULL
          AND fe.is_system_feature = FALSE
          AND fe.platform_admin_only = FALSE
          AND (tfa.id IS NULL OR tfa.included = FALSE)
      ) INTO v_allowed;

    -- Parent is denied at tier level - inherit the denial
    IF v_allowed THEN
      SELECT fe.unavailable_gate_action INTO v_gate_action
      FROM feature_entitlements fe
      WHERE fe.feature_key = v_parent_key;

      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_gate_action, 'overlay'),
        'reason_code', 'parent_feature_unavailable',
        'feature_key', p_feature_key,
        'parent_feature_key', v_parent_key
      );
    END IF;
  END LOOP;
  END IF; -- End of p_org_id IS NOT NULL check


  -- =========================================================================
  -- EXISTING FEATURE GATE LOGIC (with sub-org support)
  -- =========================================================================
  
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

  -- Get org's license tier (use effective license org_id for sub-orgs)
  SELECT 
    CASE o.license_plan::text
      WHEN 'starter' THEN 'basic'
      WHEN 'standard' THEN 'power'
      WHEN 'pro' THEN 'power'
      ELSE o.license_plan::text
    END INTO v_tier_key
  FROM organizations o
  WHERE o.id = COALESCE(v_effective_license_org_id, p_org_id);

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

  -- Handle case where license tier record doesn't exist
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

  -- Check user override first (highest priority, bypasses parent hierarchy)
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

  -- Check org override (second priority, bypasses parent hierarchy)
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

COMMENT ON FUNCTION public.get_feature_gate(p_org_id uuid, p_user_id uuid, p_feature_key text) IS 
'Resolves whether a user can access a feature in an organization context. 
For sub-orgs: checks sub_org_settings.status and enabled_features, resolves license from parent.
Checks parent feature hierarchy first (child inherits parent denials), then platform admin status, 
system features, overrides, tier assignments, and roles.
Returns JSONB with allowed, gate_action, reason_code, and optional limit_value.';
