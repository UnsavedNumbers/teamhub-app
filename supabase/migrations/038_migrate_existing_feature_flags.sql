-- ============================================================================
-- Migration: Existing Feature Flags to New System
-- ============================================================================
-- Migrates existing org-scoped boolean feature flags to the new system.
-- Preserves all flags as organization overrides in the 'prod' environment.
-- ============================================================================

-- ============================================================================
-- 1. Validation: Count existing flags
-- ============================================================================

DO $$
DECLARE
  v_old_count INTEGER;
  v_new_count INTEGER;
BEGIN
  -- Count flags in old table
  SELECT COUNT(*) INTO v_old_count
  FROM feature_flags
  WHERE organization_id IS NOT NULL;
  
  RAISE NOTICE 'Found % existing feature flags to migrate', v_old_count;
  
  -- Migration will happen below
  -- After migration, we'll validate counts match
END $$;

-- ============================================================================
-- 2. Migrate Feature Flags
-- ============================================================================

-- Insert flag definitions for each unique feature_key
-- Use 'prod' environment (existing flags are production)
INSERT INTO feature_flags (key, value_type, description, environment)
SELECT DISTINCT
  feature_key AS key,
  'boolean'::feature_flag_value_type AS value_type,
  'Migrated from legacy feature_flags table' AS description,
  'prod'::feature_flag_environment AS environment
FROM feature_flags
WHERE organization_id IS NOT NULL
  AND feature_key IS NOT NULL
  AND feature_key != ''
ON CONFLICT (key, environment) WHERE deleted_at IS NULL DO NOTHING;

-- ============================================================================
-- 3. Set Platform Defaults (for flags used by multiple orgs)
-- ============================================================================

-- For flags used by 3+ orgs, set as platform default (most common value)
INSERT INTO feature_flag_platform_defaults (
  feature_flag_id,
  environment,
  value_boolean,
  version
)
SELECT
  ff.id,
  'prod'::feature_flag_environment,
  -- Use most common value (mode)
  (SELECT enabled FROM feature_flags old
   WHERE old.feature_key = ff.key
   GROUP BY enabled
   ORDER BY COUNT(*) DESC
   LIMIT 1) AS value_boolean,
  1 AS version
FROM feature_flags ff
WHERE ff.environment = 'prod'
  AND ff.deleted_at IS NULL
  AND (
    SELECT COUNT(DISTINCT organization_id)
    FROM feature_flags old
    WHERE old.feature_key = ff.key
      AND old.organization_id IS NOT NULL
  ) >= 3
ON CONFLICT (feature_flag_id, environment) DO NOTHING;

-- ============================================================================
-- 4. Create Organization Overrides
-- ============================================================================

-- Insert org overrides for all flags
INSERT INTO feature_flag_org_overrides (
  feature_flag_id,
  org_id,
  environment,
  value_boolean,
  version
)
SELECT
  ff.id,
  old.organization_id,
  'prod'::feature_flag_environment,
  old.enabled,
  1 AS version
FROM feature_flags old
JOIN feature_flags ff ON ff.key = old.feature_key
  AND ff.environment = 'prod'
  AND ff.deleted_at IS NULL
WHERE old.organization_id IS NOT NULL
  AND old.feature_key IS NOT NULL
  AND old.feature_key != ''
ON CONFLICT (feature_flag_id, org_id, environment) DO NOTHING;

-- ============================================================================
-- 5. Validation: Verify Migration
-- ============================================================================

DO $$
DECLARE
  v_old_count INTEGER;
  v_new_override_count INTEGER;
  v_new_default_count INTEGER;
  v_total_new_count INTEGER;
BEGIN
  -- Count flags in old table
  SELECT COUNT(*) INTO v_old_count
  FROM feature_flags
  WHERE organization_id IS NOT NULL;
  
  -- Count overrides in new system
  SELECT COUNT(*) INTO v_new_override_count
  FROM feature_flag_org_overrides
  WHERE environment = 'prod';
  
  -- Count platform defaults
  SELECT COUNT(*) INTO v_new_default_count
  FROM feature_flag_platform_defaults
  WHERE environment = 'prod';
  
  -- Total should match (each old flag becomes an override)
  v_total_new_count := v_new_override_count;
  
  RAISE NOTICE 'Migration validation:';
  RAISE NOTICE '  Old flags: %', v_old_count;
  RAISE NOTICE '  New overrides: %', v_new_override_count;
  RAISE NOTICE '  New defaults: %', v_new_default_count;
  
  IF v_old_count != v_new_override_count THEN
    RAISE WARNING 'Count mismatch: old flags (%) != new overrides (%)', v_old_count, v_new_override_count;
  ELSE
    RAISE NOTICE 'Migration successful: all flags migrated';
  END IF;
END $$;

-- ============================================================================
-- 6. Comments
-- ============================================================================

COMMENT ON FUNCTION update_updated_at_column() IS 'Helper function for updated_at triggers. Used by feature flags system.';

-- ============================================================================
-- Notes
-- ============================================================================
-- 
-- This migration:
-- 1. Creates flag definitions for each unique feature_key in 'prod' environment
-- 2. Sets platform defaults for flags used by 3+ organizations (using mode)
-- 3. Creates org overrides for all existing flags
-- 4. Validates that all flags were migrated
--
-- The old feature_flags table is NOT dropped - it can be removed in a future
-- migration after verifying the new system works correctly.
--
-- To rollback:
-- 1. Delete all rows from feature_flag_org_overrides where environment = 'prod'
-- 2. Delete all rows from feature_flag_platform_defaults where environment = 'prod'
-- 3. Delete all rows from feature_flags where environment = 'prod' and description = 'Migrated from legacy feature_flags table'
--
-- ============================================================================
