-- Fix feature flag audit trigger to fire AFTER INSERT instead of BEFORE
-- This ensures the feature_flag.id is generated before the audit log tries to reference it

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_log_feature_flag_changes ON public.feature_flags;

-- Recreate the trigger to fire AFTER INSERT/UPDATE/DELETE instead of BEFORE
CREATE TRIGGER trigger_log_feature_flag_changes 
  AFTER INSERT OR UPDATE OR DELETE 
  ON public.feature_flags 
  FOR EACH ROW 
  EXECUTE FUNCTION public.log_feature_flag_change();

-- Note: The other triggers (for override tables) can remain BEFORE since they don't auto-generate IDs
