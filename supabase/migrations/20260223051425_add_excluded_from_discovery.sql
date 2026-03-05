-- Migration: Add excluded_from_discovery field to feature_entitlements
-- Description: Adds field to mark features as "not a feature" so they are excluded
--              from discovery sync and won't reappear after sync operations
-- Date: 2026-02-23

BEGIN;

-- ============================================================================
-- STEP 1: Add excluded_from_discovery column
-- ============================================================================

ALTER TABLE public.feature_entitlements
  ADD COLUMN IF NOT EXISTS excluded_from_discovery boolean NOT NULL DEFAULT false;

-- ============================================================================
-- STEP 2: Create index for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feature_entitlements_excluded_from_discovery
  ON public.feature_entitlements(excluded_from_discovery)
  WHERE excluded_from_discovery = true;

-- ============================================================================
-- STEP 3: Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN public.feature_entitlements.excluded_from_discovery IS 
  'If true, this feature is excluded from discovery sync. Features marked as "not a feature" will not be re-discovered or re-synced.';

-- ============================================================================
-- STEP 4: Update sync_discovered_features function to skip excluded features
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_discovered_features(p_discovered_features jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_lock_key BIGINT := 5001; -- Arbitrary lock ID for feature discovery
  v_lock_acquired BOOLEAN;
  v_result JSONB;
  v_feature JSONB;
  v_key TEXT;
  v_synced_count INT := 0;
  v_failed_count INT := 0;
  v_errors JSONB := '[]'::JSONB;
  v_error_msg TEXT;
  v_is_excluded BOOLEAN;
BEGIN
  -- Attempt to acquire advisory lock (transaction level)
  SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Discovery sync is already in progress by another process.',
      'code', 'LOCK_HELD'
    );
  END IF;

  -- Validate input
  IF p_discovered_features IS NULL OR jsonb_typeof(p_discovered_features) != 'array' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid input: p_discovered_features must be a JSONB array',
      'code', 'INVALID_INPUT'
    );
  END IF;

  -- Process each feature
  FOR v_feature IN SELECT * FROM jsonb_array_elements(p_discovered_features)
  LOOP
    BEGIN
      v_key := v_feature ->> 'featureKey';
      
      -- Validate required fields
      IF v_key IS NULL OR v_key = '' THEN
        v_failed_count := v_failed_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'key', COALESCE(v_key, 'unknown'),
          'error', 'Missing or empty featureKey'
        );
        CONTINUE;
      END IF;
      
      -- Check if feature is excluded from discovery
      SELECT COALESCE(excluded_from_discovery, false) INTO v_is_excluded
      FROM feature_entitlements
      WHERE feature_key = v_key;
      
      -- Skip excluded features (they won't be synced)
      IF v_is_excluded THEN
        CONTINUE;
      END IF;
      
      -- Upsert feature (columns are TEXT, not enums)
      INSERT INTO feature_entitlements (
        feature_key,
        display_name,
        category,
        feature_type,
        description,
        rollout_status
      ) VALUES (
        v_key,
        COALESCE(v_feature ->> 'displayName', v_key),
        COALESCE(v_feature ->> 'category', 'Support Tools'),
        COALESCE(v_feature ->> 'featureType', 'module'),
        v_feature ->> 'description',
        COALESCE(v_feature ->> 'rolloutStatus', 'live')
      )
      ON CONFLICT (feature_key) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, feature_entitlements.display_name),
        description = COALESCE(EXCLUDED.description, feature_entitlements.description),
        updated_at = NOW()
      WHERE feature_entitlements.excluded_from_discovery = false;

      v_synced_count := v_synced_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      v_error_msg := SQLERRM;
      
      -- Log error to discovery_errors table
      INSERT INTO discovery_errors (feature_key, error_type, error_message, error_details)
      VALUES (
        COALESCE(v_key, 'unknown'),
        'sync_error',
        v_error_msg,
        jsonb_build_object('feature', v_feature)
      );
      
      v_errors := v_errors || jsonb_build_object(
        'key', COALESCE(v_key, 'unknown'),
        'error', v_error_msg
      );
    END;
  END LOOP;
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'synced', v_synced_count,
    'failed', v_failed_count,
    'errors', v_errors
  );
  
  RETURN v_result;
END;
$$;

COMMIT;
