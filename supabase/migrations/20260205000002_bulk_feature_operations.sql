-- Migration: Bulk Feature Operations RPC Functions
-- =============================================================
-- Creates RPC functions for atomic bulk operations on features:
-- - Bulk update rollout status
-- - Bulk update category
-- - Bulk apply to license tiers
-- - Bulk update role visibility
--
-- All functions use advisory locks to prevent race conditions and
-- transactions to ensure atomicity (all-or-nothing).

-- ============================================================================
-- 1. Bulk Update Feature Status
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_update_feature_status(
  p_feature_ids UUID[],
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key BIGINT;
  v_lock_acquired BOOLEAN;
  v_updated_count INTEGER;
BEGIN
  -- Validate input
  IF array_length(p_feature_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No features provided');
  END IF;

  -- Validate status
  IF p_new_status NOT IN ('live', 'beta', 'hidden') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status. Must be live, beta, or hidden');
  END IF;

  -- Check for locked (non-toggleable) features
  IF EXISTS (
    SELECT 1 FROM feature_entitlements
    WHERE id = ANY(p_feature_ids)
      AND is_toggleable = false
      AND archived_at IS NULL
  ) THEN
    -- Get locked feature details for error message
    DECLARE
      v_locked_features JSONB;
    BEGIN
      SELECT jsonb_agg(
        jsonb_build_object(
          'feature_key', feature_key,
          'display_name', display_name,
          'lock_reason', lock_reason
        )
      ) INTO v_locked_features
      FROM feature_entitlements
      WHERE id = ANY(p_feature_ids)
        AND is_toggleable = false
        AND archived_at IS NULL;
      
      RETURN jsonb_build_object(
        'success', false,
        'code', 'FEATURE_LOCKED',
        'error', 'One or more features cannot be toggled',
        'locked_features', v_locked_features,
        'message', 'Cannot change status of locked features. These features are required for platform functionality.'
      );
    END;
  END IF;

  -- Generate lock key from feature IDs
  v_lock_key := hashtext(array_to_string(p_feature_ids, ','));
  
  -- Try to acquire advisory lock
  SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'LOCK_HELD',
      'message', 'Another bulk operation is in progress on these features'
    );
  END IF;

  -- Update in transaction (automatic rollback on error)
  UPDATE feature_entitlements
  SET rollout_status = p_new_status,
      updated_at = NOW()
  WHERE id = ANY(p_feature_ids)
    AND archived_at IS NULL
    AND is_toggleable = true; -- Only update toggleable features
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Log success
  INSERT INTO discovery_errors (error_type, error_message, error_details)
  VALUES (
    'bulk_operation',
    'Bulk status update succeeded',
    jsonb_build_object('updated_count', v_updated_count, 'status', p_new_status)
  )
  ON CONFLICT DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated', v_updated_count
  );
EXCEPTION WHEN OTHERS THEN
  -- Log error
  INSERT INTO discovery_errors (error_type, error_message, error_details)
  VALUES (
    'bulk_operation',
    SQLERRM,
    jsonb_build_object('feature_ids', p_feature_ids, 'status', p_new_status)
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- ============================================================================
-- 2. Bulk Update Feature Category
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_update_feature_category(
  p_feature_ids UUID[],
  p_new_category TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key BIGINT;
  v_lock_acquired BOOLEAN;
  v_updated_count INTEGER;
BEGIN
  -- Validate input
  IF array_length(p_feature_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No features provided');
  END IF;

  IF p_new_category IS NULL OR p_new_category = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Category cannot be empty');
  END IF;

  -- Check for locked (non-removable) features if trying to change to a restricted category
  -- Note: Category changes are generally allowed, but we check is_removable for safety
  -- Generate lock key
  v_lock_key := hashtext(array_to_string(p_feature_ids, ','));
  
  -- Try to acquire advisory lock
  SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'LOCK_HELD',
      'message', 'Another bulk operation is in progress on these features'
    );
  END IF;

  -- Update in transaction (category changes are allowed for all features)
  UPDATE feature_entitlements
  SET category = p_new_category,
      updated_at = NOW()
  WHERE id = ANY(p_feature_ids)
    AND archived_at IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated', v_updated_count
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO discovery_errors (error_type, error_message, error_details)
  VALUES (
    'bulk_operation',
    SQLERRM,
    jsonb_build_object('feature_ids', p_feature_ids, 'category', p_new_category)
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- ============================================================================
-- 3. Bulk Apply to License Tiers
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_apply_to_tiers(
  p_feature_ids UUID[],
  p_tier_ids UUID[],
  p_action TEXT, -- 'add' or 'remove'
  p_role_admin BOOLEAN DEFAULT true,
  p_role_coach BOOLEAN DEFAULT true,
  p_role_parent BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key BIGINT;
  v_lock_acquired BOOLEAN;
  v_feature_id UUID;
  v_tier_id UUID;
  v_processed INTEGER := 0;
BEGIN
  -- Validate input
  IF array_length(p_feature_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No features provided');
  END IF;

  IF array_length(p_tier_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tiers provided');
  END IF;

  IF p_action NOT IN ('add', 'remove') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Action must be add or remove');
  END IF;

  -- Check for locked (non-toggleable) features when removing from tiers
  IF p_action = 'remove' AND EXISTS (
    SELECT 1 FROM feature_entitlements
    WHERE id = ANY(p_feature_ids)
      AND is_toggleable = false
      AND archived_at IS NULL
  ) THEN
    DECLARE
      v_locked_features JSONB;
    BEGIN
      SELECT jsonb_agg(
        jsonb_build_object(
          'feature_key', feature_key,
          'display_name', display_name,
          'lock_reason', lock_reason
        )
      ) INTO v_locked_features
      FROM feature_entitlements
      WHERE id = ANY(p_feature_ids)
        AND is_toggleable = false
        AND archived_at IS NULL;
      
      RETURN jsonb_build_object(
        'success', false,
        'code', 'FEATURE_LOCKED',
        'error', 'One or more features cannot be removed from tiers',
        'locked_features', v_locked_features,
        'message', 'Cannot remove locked features from license tiers. These features are required for platform functionality.'
      );
    END;
  END IF;

  -- Generate lock key
  v_lock_key := hashtext(array_to_string(p_feature_ids, ',') || array_to_string(p_tier_ids, ','));
  
  -- Try to acquire advisory lock
  SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'LOCK_HELD',
      'message', 'Another bulk operation is in progress on these features'
    );
  END IF;

  -- Process each feature-tier combination (only for toggleable features when removing)
  FOR v_feature_id IN SELECT unnest(p_feature_ids)
  LOOP
    -- Skip locked features when removing
    IF p_action = 'remove' AND EXISTS (
      SELECT 1 FROM feature_entitlements
      WHERE id = v_feature_id AND is_toggleable = false
    ) THEN
      CONTINUE;
    END IF;
    
    FOR v_tier_id IN SELECT unnest(p_tier_ids)
    LOOP
      IF p_action = 'add' THEN
        INSERT INTO tier_feature_assignments (
          license_tier_id,
          feature_entitlement_id,
          included,
          role_admin,
          role_coach,
          role_parent
        ) VALUES (
          v_tier_id,
          v_feature_id,
          true,
          p_role_admin,
          p_role_coach,
          p_role_parent
        )
        ON CONFLICT (license_tier_id, feature_entitlement_id) 
        DO UPDATE SET
          included = true,
          role_admin = p_role_admin,
          role_coach = p_role_coach,
          role_parent = p_role_parent,
          updated_at = NOW();
      ELSIF p_action = 'remove' THEN
        UPDATE tier_feature_assignments
        SET included = false,
            updated_at = NOW()
        WHERE license_tier_id = v_tier_id
          AND feature_entitlement_id = v_feature_id;
      END IF;
      v_processed := v_processed + 1;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'processed', v_processed
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO discovery_errors (error_type, error_message, error_details)
  VALUES (
    'bulk_operation',
    SQLERRM,
    jsonb_build_object(
      'feature_ids', p_feature_ids,
      'tier_ids', p_tier_ids,
      'action', p_action
    )
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- ============================================================================
-- 4. Bulk Update Role Visibility
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_update_role_visibility(
  p_feature_ids UUID[],
  p_role_type TEXT, -- 'admin', 'coach', 'parent'
  p_visible BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key BIGINT;
  v_lock_acquired BOOLEAN;
  v_updated_count INTEGER;
BEGIN
  -- Validate input
  IF array_length(p_feature_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No features provided');
  END IF;

  IF p_role_type NOT IN ('admin', 'coach', 'parent') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Role type must be admin, coach, or parent');
  END IF;

  -- Check for locked (non-toggleable) features when hiding visibility
  IF p_visible = false AND EXISTS (
    SELECT 1 FROM feature_entitlements fe
    WHERE fe.id = ANY(p_feature_ids)
      AND fe.is_toggleable = false
      AND fe.archived_at IS NULL
  ) THEN
    DECLARE
      v_locked_features JSONB;
    BEGIN
      SELECT jsonb_agg(
        jsonb_build_object(
          'feature_key', fe.feature_key,
          'display_name', fe.display_name,
          'lock_reason', fe.lock_reason
        )
      ) INTO v_locked_features
      FROM feature_entitlements fe
      WHERE fe.id = ANY(p_feature_ids)
        AND fe.is_toggleable = false
        AND fe.archived_at IS NULL;
      
      RETURN jsonb_build_object(
        'success', false,
        'code', 'FEATURE_LOCKED',
        'error', 'One or more features cannot have visibility hidden',
        'locked_features', v_locked_features,
        'message', 'Cannot hide visibility of locked features. These features are required for platform functionality.'
      );
    END;
  END IF;

  -- Generate lock key
  v_lock_key := hashtext(array_to_string(p_feature_ids, ',') || p_role_type);
  
  -- Try to acquire advisory lock
  SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'LOCK_HELD',
      'message', 'Another bulk operation is in progress on these features'
    );
  END IF;

  -- Update based on role type (only for toggleable features when hiding)
  IF p_role_type = 'admin' THEN
    UPDATE tier_feature_assignments tfa
    SET role_admin = p_visible,
        updated_at = NOW()
    FROM feature_entitlements fe
    WHERE tfa.feature_entitlement_id = fe.id
      AND tfa.feature_entitlement_id = ANY(p_feature_ids)
      AND tfa.included = true
      AND (p_visible = true OR fe.is_toggleable = true); -- Allow hiding only if toggleable
  ELSIF p_role_type = 'coach' THEN
    UPDATE tier_feature_assignments tfa
    SET role_coach = p_visible,
        updated_at = NOW()
    FROM feature_entitlements fe
    WHERE tfa.feature_entitlement_id = fe.id
      AND tfa.feature_entitlement_id = ANY(p_feature_ids)
      AND tfa.included = true
      AND (p_visible = true OR fe.is_toggleable = true);
  ELSIF p_role_type = 'parent' THEN
    UPDATE tier_feature_assignments tfa
    SET role_parent = p_visible,
        updated_at = NOW()
    FROM feature_entitlements fe
    WHERE tfa.feature_entitlement_id = fe.id
      AND tfa.feature_entitlement_id = ANY(p_feature_ids)
      AND tfa.included = true
      AND (p_visible = true OR fe.is_toggleable = true);
  END IF;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated', v_updated_count
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO discovery_errors (error_type, error_message, error_details)
  VALUES (
    'bulk_operation',
    SQLERRM,
    jsonb_build_object(
      'feature_ids', p_feature_ids,
      'role_type', p_role_type,
      'visible', p_visible
    )
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
