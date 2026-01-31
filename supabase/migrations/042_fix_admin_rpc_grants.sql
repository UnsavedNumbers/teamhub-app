-- ============================================================================
-- Fix Admin RPC Grants
-- ============================================================================
-- This migration ensures all admin RPC functions have proper GRANT permissions
-- to be accessible via the Supabase REST API.
-- ============================================================================

-- Grant execute on all admin functions
GRANT EXECUTE ON FUNCTION admin_activate_organization(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_suspend_organization(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_disable_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_enable_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_feature_flag(UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_add_platform_admin(TEXT, platform_admin_role, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_remove_platform_admin(UUID, TEXT) TO authenticated;

-- Also ensure log_event function is accessible (for RPC calls from triggers)
-- Note: log_event is called internally by triggers, so it doesn't need to be exposed via REST API
-- But we grant it anyway for consistency
GRANT EXECUTE ON FUNCTION log_event TO authenticated;

-- Verify functions exist and provide helpful error messages
DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  -- Check if admin_disable_user exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'admin_disable_user'
  ) INTO func_exists;
  
  IF NOT func_exists THEN
    RAISE WARNING 'Function admin_disable_user does not exist. Please run migration 041_update_admin_rpcs_for_event_logging.sql first.';
  ELSE
    RAISE NOTICE 'Function admin_disable_user exists';
  END IF;
  
  -- Check if log_event exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'log_event'
  ) INTO func_exists;
  
  IF NOT func_exists THEN
    RAISE WARNING 'Function log_event does not exist. Please run migration 039_global_event_logger.sql first.';
  ELSE
    RAISE NOTICE 'Function log_event exists';
  END IF;
  
  RAISE NOTICE 'Grant permissions applied. If functions do not exist, run migrations 039 and 041 first.';
END $$;
