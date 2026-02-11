-- ============================================================================
-- Feature Gate System — Database Constraints & Feature Ownership
-- ============================================================================
-- Plan steps 2, 7, and 10:
--   • NOT NULL + CHECK constraints on feature_entitlements
--   • feature_dependencies junction table
--   • owner_team column for feature ownership
--   • Validation function for dependency checks
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Backfill NULLs before adding constraint
-- ---------------------------------------------------------------------------
UPDATE feature_entitlements
SET unavailable_gate_action = 'overlay'
WHERE unavailable_gate_action IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Add NOT NULL constraint on gate action with default
-- ---------------------------------------------------------------------------
ALTER TABLE feature_entitlements
    ALTER COLUMN unavailable_gate_action SET DEFAULT 'overlay',
    ALTER COLUMN unavailable_gate_action SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. CHECK constraint: gate action must be a known value
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'feature_entitlements_gate_action_valid'
    ) THEN
        ALTER TABLE feature_entitlements
            ADD CONSTRAINT feature_entitlements_gate_action_valid
            CHECK (unavailable_gate_action IN ('disable', 'overlay', 'hide', 'modal', 'paywall', 'custom'));
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. CHECK constraint: feature_key must be lowercase + underscores only
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'feature_entitlements_key_format'
    ) THEN
        ALTER TABLE feature_entitlements
            ADD CONSTRAINT feature_entitlements_key_format
            CHECK (feature_key ~ '^[a-z][a-z0-9_]*$');
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Add owner_team column for feature ownership tracking
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'feature_entitlements' AND column_name = 'owner_team'
    ) THEN
        ALTER TABLE feature_entitlements
            ADD COLUMN owner_team text DEFAULT NULL;

        COMMENT ON COLUMN feature_entitlements.owner_team IS
            'Team or squad that owns this feature (e.g. payments, rostering, platform). NULL = unassigned.';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Feature dependencies junction table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_dependencies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    feature_key text NOT NULL REFERENCES feature_entitlements(feature_key) ON DELETE CASCADE,
    depends_on_key text NOT NULL REFERENCES feature_entitlements(feature_key) ON DELETE CASCADE,
    dependency_type text NOT NULL DEFAULT 'required'
        CHECK (dependency_type IN ('required', 'recommended')),
    created_at timestamptz DEFAULT now(),

    -- Prevent duplicate edges
    CONSTRAINT feature_dependencies_unique UNIQUE (feature_key, depends_on_key),
    -- Prevent self-loops
    CONSTRAINT feature_dependencies_no_self CHECK (feature_key <> depends_on_key)
);

COMMENT ON TABLE feature_dependencies IS
    'Tracks which features depend on other features. Used to prevent disabling a feature that others require.';

-- Index for reverse look-ups ("who depends on me?")
CREATE INDEX IF NOT EXISTS idx_feature_dependencies_depends_on
    ON feature_dependencies(depends_on_key);

-- ---------------------------------------------------------------------------
-- 7. RPC: validate_feature_dependencies
--    Returns JSON { valid: bool, blocking_features: text[] }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_feature_dependencies(
    p_feature_key text,
    p_action text  -- 'disable' | 'archive'
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    v_blockers text[];
BEGIN
    -- Find features that have a 'required' dependency on this feature
    SELECT ARRAY_AGG(fd.feature_key)
    INTO v_blockers
    FROM feature_dependencies fd
    JOIN feature_entitlements fe ON fe.feature_key = fd.feature_key
    WHERE fd.depends_on_key = p_feature_key
      AND fd.dependency_type = 'required'
      AND fe.archived_at IS NULL;

    IF v_blockers IS NULL OR array_length(v_blockers, 1) IS NULL THEN
        RETURN jsonb_build_object('valid', true, 'blocking_features', '[]'::jsonb);
    END IF;

    RETURN jsonb_build_object(
        'valid', false,
        'blocking_features', to_jsonb(v_blockers)
    );
END;
$$;

COMMENT ON FUNCTION validate_feature_dependencies(text, text) IS
    'Check whether a feature can be safely disabled or archived by looking for required dependants.';

-- Grant to authenticated users (admin UI needs this)
GRANT EXECUTE ON FUNCTION validate_feature_dependencies(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. RLS on feature_dependencies — read-only for authenticated
-- ---------------------------------------------------------------------------
ALTER TABLE feature_dependencies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'feature_deps_select' AND tablename = 'feature_dependencies'
    ) THEN
        CREATE POLICY feature_deps_select ON feature_dependencies FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'feature_deps_all_service' AND tablename = 'feature_dependencies'
    ) THEN
        CREATE POLICY feature_deps_all_service ON feature_dependencies FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
