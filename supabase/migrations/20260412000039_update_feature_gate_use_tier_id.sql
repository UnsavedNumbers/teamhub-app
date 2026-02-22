-- Phase 3: Update get_feature_gate function to use current_tier_id instead of plan→tier mapping
-- This migration replaces the CASE statement mapping logic with direct current_tier_id lookup
-- and adds fallback logic during transition period.

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
  
  -- Child inheritance variables
  v_parent_feature feature_entitlements%ROWTYPE;
  v_parent_tier_assignment tier_feature_assignments%ROWTYPE;
  v_parent_allowed BOOLEAN;
  v_child_tier_assignment tier_feature_assignments%ROWTYPE;
  v_child_explicitly_allowed BOOLEAN;
  v_child_explicitly_denied BOOLEAN;
  v_child_has_assignment BOOLEAN;
  
  -- Tier validation variable
  v_tier_exists INTEGER;
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
    -- UPDATED: Use current_tier_id directly instead of plan→tier mapping
    SELECT 
      EXISTS(
        SELECT 1 
        FROM feature_entitlements fe
        LEFT JOIN tier_feature_assignments tfa 
          ON tfa.feature_entitlement_id = fe.id
          AND tfa.license_tier_id = (
            SELECT o.current_tier_id
            FROM organizations o
            WHERE o.id = COALESCE(v_effective_license_org_id, p_org_id)
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

  -- UPDATED: Get org's license tier directly from current_tier_id (no hardcoded mapping)
  SELECT current_tier_id INTO v_license_tier_id
  FROM organizations o
  WHERE o.id = COALESCE(v_effective_license_org_id, p_org_id);

  -- Fallback to license_plan mapping during transition (Technical Risk #7)
  IF v_license_tier_id IS NULL THEN
    -- Fallback: try to get tier from license_plan (for orgs not yet migrated)
    SELECT 
      lt.id INTO v_license_tier_id
    FROM organizations o
    LEFT JOIN license_tiers lt ON (
      (o.license_plan::text = 'starter' AND lt.tier_key = 'basic')
      OR (o.license_plan::text IN ('standard', 'pro') AND lt.tier_key = 'power')
      OR (o.license_plan::text = lt.tier_key)
    )
    WHERE o.id = COALESCE(v_effective_license_org_id, p_org_id)
      AND lt.status = 'active'
    LIMIT 1;
  END IF;

  -- Validate tier exists and is active (data-driven check)
  IF v_license_tier_id IS NOT NULL THEN
    SELECT 1 INTO v_tier_exists
    FROM license_tiers
    WHERE id = v_license_tier_id AND status = 'active';
    
    IF v_tier_exists IS NULL THEN
      v_license_tier_id := NULL; -- Tier was archived or doesn't exist (Technical Risk #3)
    END IF;
  END IF;

  IF v_license_tier_id IS NULL THEN
    -- Org not found or no license tier
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

  -- =========================================================================
  -- CHECK USER OVERRIDE (highest priority)
  -- =========================================================================
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
      -- Child override enables, but check parent first (parent denial always blocks)
      IF v_feature.parent_feature_key IS NOT NULL AND p_org_id IS NOT NULL THEN
        -- Get parent feature details
        SELECT * INTO v_parent_feature
        FROM feature_entitlements
        WHERE feature_key = v_feature.parent_feature_key
          AND archived_at IS NULL;

        IF v_parent_feature.id IS NOT NULL THEN
          -- Check parent's system/override status first (bypasses tier check)
          IF v_is_platform_admin THEN
            v_parent_allowed := TRUE;
          ELSIF v_parent_feature.is_system_feature = TRUE THEN
            v_parent_allowed := TRUE;
          ELSE
            -- Check parent's tier assignment
            SELECT * INTO v_parent_tier_assignment
            FROM tier_feature_assignments
            WHERE license_tier_id = v_license_tier_id
              AND feature_entitlement_id = v_parent_feature.id
              AND included = TRUE;

            -- Check if parent is allowed (has tier assignment and role visibility)
            IF v_parent_tier_assignment.id IS NOT NULL THEN
              v_parent_allowed := CASE v_user_role
                WHEN 'org_admin' THEN COALESCE(v_parent_tier_assignment.role_admin, TRUE)
                WHEN 'coach' THEN COALESCE(v_parent_tier_assignment.role_coach, TRUE)
                WHEN 'parent' THEN COALESCE(v_parent_tier_assignment.role_parent, FALSE)
                ELSE FALSE
              END;
            ELSE
              -- Parent has no tier assignment → not allowed
              v_parent_allowed := FALSE;
            END IF;
          END IF;

          -- If parent is denied, deny child (parent gate overrides child override)
          IF NOT v_parent_allowed THEN
            RETURN jsonb_build_object(
              'allowed', FALSE,
              'gate_action', COALESCE(v_parent_feature.unavailable_gate_action, 'overlay'),
              'reason_code', 'parent_feature_unavailable',
              'feature_key', p_feature_key,
              'parent_feature_key', v_feature.parent_feature_key
            );
          END IF;
        END IF;
      END IF;
      -- Parent allowed (or not a child) → allow via override
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'enabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_user_override.override_action = 'set_limit' THEN
      v_limit_value := v_user_override.limit_value;
      -- Child override sets limit, but check parent first (parent denial always blocks)
      IF v_feature.parent_feature_key IS NOT NULL AND p_org_id IS NOT NULL THEN
        -- Get parent feature details
        SELECT * INTO v_parent_feature
        FROM feature_entitlements
        WHERE feature_key = v_feature.parent_feature_key
          AND archived_at IS NULL;

        IF v_parent_feature.id IS NOT NULL THEN
          -- Check parent's system/override status first
          IF v_is_platform_admin THEN
            v_parent_allowed := TRUE;
          ELSIF v_parent_feature.is_system_feature = TRUE THEN
            v_parent_allowed := TRUE;
          ELSE
            -- Check parent's tier assignment
            SELECT * INTO v_parent_tier_assignment
            FROM tier_feature_assignments
            WHERE license_tier_id = v_license_tier_id
              AND feature_entitlement_id = v_parent_feature.id
              AND included = TRUE;

            IF v_parent_tier_assignment.id IS NOT NULL THEN
              v_parent_allowed := CASE v_user_role
                WHEN 'org_admin' THEN COALESCE(v_parent_tier_assignment.role_admin, TRUE)
                WHEN 'coach' THEN COALESCE(v_parent_tier_assignment.role_coach, TRUE)
                WHEN 'parent' THEN COALESCE(v_parent_tier_assignment.role_parent, FALSE)
                ELSE FALSE
              END;
            ELSE
              v_parent_allowed := FALSE;
            END IF;
          END IF;

          -- If parent is denied, deny child
          IF NOT v_parent_allowed THEN
            RETURN jsonb_build_object(
              'allowed', FALSE,
              'gate_action', COALESCE(v_parent_feature.unavailable_gate_action, 'overlay'),
              'reason_code', 'parent_feature_unavailable',
              'feature_key', p_feature_key,
              'parent_feature_key', v_feature.parent_feature_key
            );
          END IF;
        END IF;
      END IF;
      -- Parent allowed (or not a child) → allow via override with limit
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'limit_set_by_override',
        'feature_key', p_feature_key,
        'limit_value', v_limit_value
      );
    END IF;
  END IF;

  -- =========================================================================
  -- CHECK ORG OVERRIDE (second priority)
  -- =========================================================================
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
      -- Child override enables, but check parent first (parent denial always blocks)
      IF v_feature.parent_feature_key IS NOT NULL AND p_org_id IS NOT NULL THEN
        -- Get parent feature details
        SELECT * INTO v_parent_feature
        FROM feature_entitlements
        WHERE feature_key = v_feature.parent_feature_key
          AND archived_at IS NULL;

        IF v_parent_feature.id IS NOT NULL THEN
          -- Check parent's system/override status first
          IF v_is_platform_admin THEN
            v_parent_allowed := TRUE;
          ELSIF v_parent_feature.is_system_feature = TRUE THEN
            v_parent_allowed := TRUE;
          ELSE
            -- Check parent's tier assignment
            SELECT * INTO v_parent_tier_assignment
            FROM tier_feature_assignments
            WHERE license_tier_id = v_license_tier_id
              AND feature_entitlement_id = v_parent_feature.id
              AND included = TRUE;

            IF v_parent_tier_assignment.id IS NOT NULL THEN
              v_parent_allowed := CASE v_user_role
                WHEN 'org_admin' THEN COALESCE(v_parent_tier_assignment.role_admin, TRUE)
                WHEN 'coach' THEN COALESCE(v_parent_tier_assignment.role_coach, TRUE)
                WHEN 'parent' THEN COALESCE(v_parent_tier_assignment.role_parent, FALSE)
                ELSE FALSE
              END;
            ELSE
              v_parent_allowed := FALSE;
            END IF;
          END IF;

          -- If parent is denied, deny child
          IF NOT v_parent_allowed THEN
            RETURN jsonb_build_object(
              'allowed', FALSE,
              'gate_action', COALESCE(v_parent_feature.unavailable_gate_action, 'overlay'),
              'reason_code', 'parent_feature_unavailable',
              'feature_key', p_feature_key,
              'parent_feature_key', v_feature.parent_feature_key
            );
          END IF;
        END IF;
      END IF;
      -- Parent allowed (or not a child) → allow via override
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'enabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_org_override.override_action = 'set_limit' THEN
      v_limit_value := v_org_override.limit_value;
      -- Child override sets limit, but check parent first
      IF v_feature.parent_feature_key IS NOT NULL AND p_org_id IS NOT NULL THEN
        -- Get parent feature details
        SELECT * INTO v_parent_feature
        FROM feature_entitlements
        WHERE feature_key = v_feature.parent_feature_key
          AND archived_at IS NULL;

        IF v_parent_feature.id IS NOT NULL THEN
          -- Check parent's system/override status first
          IF v_is_platform_admin THEN
            v_parent_allowed := TRUE;
          ELSIF v_parent_feature.is_system_feature = TRUE THEN
            v_parent_allowed := TRUE;
          ELSE
            -- Check parent's tier assignment
            SELECT * INTO v_parent_tier_assignment
            FROM tier_feature_assignments
            WHERE license_tier_id = v_license_tier_id
              AND feature_entitlement_id = v_parent_feature.id
              AND included = TRUE;

            IF v_parent_tier_assignment.id IS NOT NULL THEN
              v_parent_allowed := CASE v_user_role
                WHEN 'org_admin' THEN COALESCE(v_parent_tier_assignment.role_admin, TRUE)
                WHEN 'coach' THEN COALESCE(v_parent_tier_assignment.role_coach, TRUE)
                WHEN 'parent' THEN COALESCE(v_parent_tier_assignment.role_parent, FALSE)
                ELSE FALSE
              END;
            ELSE
              v_parent_allowed := FALSE;
            END IF;
          END IF;

          -- If parent is denied, deny child
          IF NOT v_parent_allowed THEN
            RETURN jsonb_build_object(
              'allowed', FALSE,
              'gate_action', COALESCE(v_parent_feature.unavailable_gate_action, 'overlay'),
              'reason_code', 'parent_feature_unavailable',
              'feature_key', p_feature_key,
              'parent_feature_key', v_feature.parent_feature_key
            );
          END IF;
        END IF;
      END IF;
      -- Parent allowed (or not a child) → allow via override with limit
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'limit_set_by_override',
        'feature_key', p_feature_key,
        'limit_value', v_limit_value
      );
    END IF;
  END IF;

  -- =========================================================================
  -- CHECK TIER + ROLE ASSIGNMENT (with child inheritance logic)
  -- =========================================================================
  
  -- Check child's tier assignment (if any)
  SELECT * INTO v_child_tier_assignment
  FROM tier_feature_assignments
  WHERE license_tier_id = v_license_tier_id
    AND feature_entitlement_id = v_feature.id;

  -- Determine child's explicit status
  v_child_has_assignment := (v_child_tier_assignment.id IS NOT NULL);
  v_child_explicitly_denied := (v_child_has_assignment AND v_child_tier_assignment.included = FALSE);
  v_child_explicitly_allowed := (v_child_has_assignment AND v_child_tier_assignment.included = TRUE);

  -- If child is explicitly denied, deny immediately (child gate)
  IF v_child_explicitly_denied THEN
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

  -- If child is a child feature, check parent before allowing
  IF v_feature.parent_feature_key IS NOT NULL THEN
    -- Get parent feature details
    SELECT * INTO v_parent_feature
    FROM feature_entitlements
    WHERE feature_key = v_feature.parent_feature_key
      AND archived_at IS NULL;

    IF v_parent_feature.id IS NOT NULL THEN
      -- Check parent's system/override status first (bypasses tier check)
      IF v_is_platform_admin THEN
        -- Parent accessible to platform admin, continue
        v_parent_allowed := TRUE;
      ELSIF v_parent_feature.is_system_feature = TRUE THEN
        -- Parent is system feature, allowed
        v_parent_allowed := TRUE;
      ELSE
        -- Check parent's tier assignment
        SELECT * INTO v_parent_tier_assignment
        FROM tier_feature_assignments
        WHERE license_tier_id = v_license_tier_id
          AND feature_entitlement_id = v_parent_feature.id
          AND included = TRUE;

        -- Check if parent is allowed (has tier assignment and role visibility)
        IF v_parent_tier_assignment.id IS NOT NULL THEN
          v_parent_allowed := CASE v_user_role
            WHEN 'org_admin' THEN COALESCE(v_parent_tier_assignment.role_admin, TRUE)
            WHEN 'coach' THEN COALESCE(v_parent_tier_assignment.role_coach, TRUE)
            WHEN 'parent' THEN COALESCE(v_parent_tier_assignment.role_parent, FALSE)
            ELSE FALSE
          END;
        ELSE
          -- Parent has no tier assignment → not allowed
          v_parent_allowed := FALSE;
        END IF;
      END IF;

      -- If parent is denied, deny child (parent gate overrides child allowance)
      IF NOT v_parent_allowed THEN
        RETURN jsonb_build_object(
          'allowed', FALSE,
          'gate_action', COALESCE(v_parent_feature.unavailable_gate_action, 'overlay'),
          'reason_code', 'parent_feature_unavailable',
          'feature_key', p_feature_key,
          'parent_feature_key', v_feature.parent_feature_key
        );
      END IF;
    END IF;
  END IF;

  -- Child passed parent check (or is not a child)
  -- If child has explicit assignment, check role visibility
  IF v_child_explicitly_allowed THEN
    v_allowed := CASE v_user_role
      WHEN 'org_admin' THEN COALESCE(v_child_tier_assignment.role_admin, TRUE)
      WHEN 'coach' THEN COALESCE(v_child_tier_assignment.role_coach, TRUE)
      WHEN 'parent' THEN COALESCE(v_child_tier_assignment.role_parent, FALSE)
      ELSE FALSE
    END;

    IF NOT v_allowed THEN
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

    -- Child explicitly allowed and parent allowed
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'gate_action', NULL,
      'reason_code', 'tier_assignment',
      'feature_key', p_feature_key,
      'limit_value', v_child_tier_assignment.limit_value
    );
  END IF;

  -- Child has no explicit assignment but parent is allowed (inherited)
  IF v_feature.parent_feature_key IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'gate_action', NULL,
      'reason_code', 'parent_inherited',
      'feature_key', p_feature_key,
      'parent_feature_key', v_feature.parent_feature_key
    );
  END IF;

  -- No tier assignment and not a child (shouldn't happen, but handle gracefully)
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
system features, overrides (with parent check for children), tier assignments, and roles.
Child features: if explicitly denied → deny; if explicitly allowed or no assignment → check parent;
if parent denied → deny; if parent allowed → allow (inherit or use child assignment).
Uses current_tier_id directly (no plan→tier mapping). Falls back to license_plan mapping during transition.
Returns JSONB with allowed, gate_action, reason_code, and optional limit_value.';
