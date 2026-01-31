-- Migration: Fix sync_discovered_features RPC Function
-- =============================================================
-- This migration fixes the sync_discovered_features function to:
-- 1. Remove invalid enum casts (columns are TEXT with CHECK constraints)
-- 2. Fix default rollout_status to 'live' instead of 'private'
-- 3. Add better error handling and logging
-- 4. Ensure proper data mapping from DiscoveredFeature JSONB structure

-- ============================================================================
-- 1. Drop and Recreate sync_discovered_features Function
-- ============================================================================

DROP FUNCTION IF EXISTS sync_discovered_features(JSONB);

CREATE OR REPLACE FUNCTION sync_discovered_features(
  p_discovered_features JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
        updated_at = NOW();

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
    'errors', v_errors,
    'total', v_synced_count + v_failed_count
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 2. Grant Execute Permission
-- ============================================================================

GRANT EXECUTE ON FUNCTION sync_discovered_features(JSONB) TO authenticated;
