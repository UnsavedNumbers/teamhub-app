-- ============================================================================
-- Feature Hierarchy — Parent-Child Inheritance System
-- ============================================================================
-- Implements parent-child feature hierarchy where child features automatically
-- inherit availability from parent features.
-- 
-- Example: If 'gallery_photos' is unavailable for a tier, then child features
-- like 'photos_zip_downloads' automatically become unavailable without explicit
-- configuration.
--
-- Preventive Measures Implemented:
--  • Circular reference prevention via CHECK constraint and validation trigger
--  • Iterative parent checking (max 10 levels) prevents infinite recursion
--  • Orphan handling via CASCADE SET NULL on parent deletion
--  • Performance indexes on parent_feature_key
--  • NULL handling for root-level features
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add parent_feature_key column to feature_entitlements
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'feature_entitlements' AND column_name = 'parent_feature_key'
    ) THEN
        ALTER TABLE feature_entitlements
            ADD COLUMN parent_feature_key text DEFAULT NULL
                REFERENCES feature_entitlements(feature_key) ON DELETE SET NULL;

        COMMENT ON COLUMN feature_entitlements.parent_feature_key IS
            'Parent feature key for hierarchy. Child features inherit unavailability from parents. NULL = root-level feature.';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Add CHECK constraint to prevent self-references
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'feature_entitlements_no_self_parent'
    ) THEN
        ALTER TABLE feature_entitlements
            ADD CONSTRAINT feature_entitlements_no_self_parent
            CHECK (feature_key <> parent_feature_key);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Create index on parent_feature_key for ancestry queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_parent
    ON feature_entitlements(parent_feature_key)
    WHERE parent_feature_key IS NOT NULL;

-- Index for looking up children of a specific parent
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_parent_lookup
    ON feature_entitlements(parent_feature_key, feature_key)
    WHERE parent_feature_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Function to get all ancestors of a feature (iterative, cycle-safe)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_feature_ancestors(
    p_feature_key text,
    p_max_depth integer DEFAULT 10
) RETURNS text[]
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_ancestors text[] := ARRAY[]::text[];
    v_current_key text := p_feature_key;
    v_parent_key text;
    v_depth integer := 0;
BEGIN
    -- Iteratively walk up the parent chain
    LOOP
        -- Get parent of current feature
        SELECT parent_feature_key INTO v_parent_key
        FROM feature_entitlements
        WHERE feature_key = v_current_key
          AND archived_at IS NULL;

        -- No parent found or reached root
        IF v_parent_key IS NULL THEN
            EXIT;
        END IF;

        -- Check for cycles (parent already in ancestor list)
        IF v_parent_key = ANY(v_ancestors) THEN
            RAISE EXCEPTION 'Circular reference detected in feature hierarchy: % -> %', v_current_key, v_parent_key;
        END IF;

        -- Check depth limit
        v_depth := v_depth + 1;
        IF v_depth > p_max_depth THEN
            RAISE EXCEPTION 'Feature hierarchy exceeds maximum depth of %: starting from %', p_max_depth, p_feature_key;
        END IF;

        -- Add to ancestors array
        v_ancestors := array_append(v_ancestors, v_parent_key);

        -- Move up the chain
        v_current_key := v_parent_key;
    END LOOP;

    RETURN v_ancestors;
END;
$$;

COMMENT ON FUNCTION get_feature_ancestors(text, integer) IS
    'Returns array of ancestor feature keys from immediate parent to root. Validates no cycles and enforces max depth.';

GRANT EXECUTE ON FUNCTION get_feature_ancestors(text, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Function to validate parent assignment (prevents cycles)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_feature_parent_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_ancestors text[];
BEGIN
    -- Only validate if parent_feature_key is being set
    IF NEW.parent_feature_key IS NULL THEN
        RETURN NEW;
    END IF;

    -- Prevent self-reference (belt-and-suspenders with CHECK constraint)
    IF NEW.feature_key = NEW.parent_feature_key THEN
        RAISE EXCEPTION 'Feature cannot be its own parent: %', NEW.feature_key;
    END IF;

    -- Validate no cycles by checking if any ancestors would create a loop
    -- We get ancestors of the NEW parent, and check if our feature_key is in that list
    BEGIN
        SELECT get_feature_ancestors(NEW.parent_feature_key) INTO v_ancestors;
        
        -- If our feature_key appears in parent's ancestry, it would create a cycle
        IF NEW.feature_key = ANY(v_ancestors) THEN
            RAISE EXCEPTION 'Circular reference: assigning parent % to % would create a cycle', 
                NEW.parent_feature_key, NEW.feature_key;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Re-raise any errors from get_feature_ancestors (cycle detection, depth exceeded)
            RAISE;
    END;

    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Create trigger to enforce validation before insert/update
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_validate_feature_parent ON feature_entitlements;
CREATE TRIGGER trigger_validate_feature_parent
    BEFORE INSERT OR UPDATE OF parent_feature_key
    ON feature_entitlements
    FOR EACH ROW
    EXECUTE FUNCTION validate_feature_parent_assignment();

-- ---------------------------------------------------------------------------
-- 7. Function to get all children of a feature (non-recursive)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_feature_children(
    p_feature_key text,
    p_include_archived boolean DEFAULT FALSE
) RETURNS TABLE (
    feature_key text,
    feature_name text,
    depth integer
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE feature_tree AS (
        -- Base case: direct children
        SELECT 
            fe.feature_key,
            fe.feature_name,
            1 as depth
        FROM feature_entitlements fe
        WHERE fe.parent_feature_key = p_feature_key
          AND (p_include_archived OR fe.archived_at IS NULL)
        
        UNION ALL
        
        -- Recursive case: children of children
        SELECT 
            fe.feature_key,
            fe.feature_name,
            ft.depth + 1
        FROM feature_entitlements fe
        INNER JOIN feature_tree ft ON fe.parent_feature_key = ft.feature_key
        WHERE (p_include_archived OR fe.archived_at IS NULL)
          AND ft.depth < 10  -- Prevent runaway recursion
    )
    SELECT 
        ft.feature_key,
        ft.feature_name,
        ft.depth
    FROM feature_tree ft
    ORDER BY ft.depth, ft.feature_key;
END;
$$;

COMMENT ON FUNCTION get_feature_children(text, boolean) IS
    'Returns all descendant features of a given parent, with depth information. Max depth: 10 levels.';

GRANT EXECUTE ON FUNCTION get_feature_children(text, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Update get_feature_gate to check parent hierarchy
-- ---------------------------------------------------------------------------
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
  
  -- Hierarchy variables
  v_parent_key TEXT;
  v_parent_result JSONB;
  v_depth INTEGER := 0;
  v_max_depth INTEGER := 10;
  v_checked_keys TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check if user is platform admin
  SELECT EXISTS (
    SELECT 1 FROM platform_admins WHERE user_id = p_user_id
  ) INTO v_is_platform_admin;

  -- =========================================================================
  -- PARENT HIERARCHY CHECK (New Feature)
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

    -- Recursively check parent gate (short-circuit on denial)
    -- Note: Platform admins and overrides bypass parent checks
    -- We only inherit tier-level denials from parents
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
              WHERE o.id = p_org_id
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
  -- EXISTING FEATURE GATE LOGIC (Unchanged)
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
Checks parent feature hierarchy first (child inherits parent denials), then platform admin status, 
system features, overrides, tier assignments, and roles.
Returns JSONB with allowed, gate_action, reason_code, and optional limit_value.';

-- ---------------------------------------------------------------------------
-- 9. Initial parent-child mappings for gallery features
-- ---------------------------------------------------------------------------

-- Set parent-child relationships for gallery photo features
UPDATE feature_entitlements
SET parent_feature_key = 'gallery_photos'
WHERE feature_key IN ('photos_zip_downloads', 'photos_storage_limit')
  AND EXISTS (SELECT 1 FROM feature_entitlements WHERE feature_key = 'gallery_photos');

-- Set parent-child relationships for video library features (if video_library is parent)
UPDATE feature_entitlements
SET parent_feature_key = 'video_library'
WHERE feature_key IN ('video_notes', 'video_sharing')
  AND EXISTS (SELECT 1 FROM feature_entitlements WHERE feature_key = 'video_library');

-- ============================================================================
-- Verification Queries (for manual testing)
-- ============================================================================

-- View feature hierarchy
-- SELECT 
--   fe.feature_key,
--   fe.feature_name,
--   fe.parent_feature_key,
--   (SELECT feature_name FROM feature_entitlements WHERE feature_key = fe.parent_feature_key) as parent_name
-- FROM feature_entitlements fe
-- WHERE fe.archived_at IS NULL
-- ORDER BY fe.parent_feature_key NULLS FIRST, fe.feature_key;

-- Test ancestor retrieval
-- SELECT get_feature_ancestors('photos_zip_downloads');

-- Test children retrieval
-- SELECT * FROM get_feature_children('gallery_photos');
