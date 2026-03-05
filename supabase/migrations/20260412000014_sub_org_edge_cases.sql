-- ============================================
-- SUB-ORG EDGE CASES
-- ============================================
-- This migration adds functions and triggers to handle edge cases:
-- 1. Suspend sub-orgs when parent license expires
-- 2. Check max sub-org count before creation
-- ============================================

-- ============================================
-- FUNCTION: Suspend sub-orgs when parent license becomes inactive
-- ============================================

CREATE OR REPLACE FUNCTION public.suspend_sub_orgs_on_parent_license_expiry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_org_id UUID;
BEGIN
  -- Only run on org_licenses updates
  IF TG_TABLE_NAME != 'org_licenses' THEN
    RETURN NEW;
  END IF;

  v_parent_org_id := NEW.org_id;

  -- Check if license became inactive (trial ended, canceled, past_due beyond grace)
  -- Active states: 'active' with current_period_end > now, 'trial' with trial_ends_at > now, 'past_due' with grace_ends_at > now
  IF NEW.status IN ('canceled', 'past_due') THEN
    -- Check if grace period expired (for past_due) or subscription ended (for canceled)
    IF (NEW.status = 'past_due' AND (NEW.grace_ends_at IS NULL OR NEW.grace_ends_at < NOW())) OR
       (NEW.status = 'canceled' AND (NEW.current_period_end IS NULL OR NEW.current_period_end < NOW())) THEN
      
      -- Suspend all sub-orgs
      UPDATE public.sub_org_settings
      SET status = 'suspended',
          updated_at = NOW()
      WHERE sub_org_id IN (
        SELECT id FROM public.organizations WHERE parent_org_id = v_parent_org_id
      )
      AND status = 'active';
    END IF;
  END IF;

  -- If license becomes active again, reactivate sub-orgs (optional - can be manual)
  -- Uncomment if you want automatic reactivation:
  -- IF NEW.status = 'active' AND NEW.current_period_end > NOW() THEN
  --   UPDATE public.sub_org_settings
  --   SET status = 'active',
  --       updated_at = NOW()
  --   WHERE sub_org_id IN (
  --     SELECT id FROM public.organizations WHERE parent_org_id = v_parent_org_id
  --   )
  --   AND status = 'suspended';
  -- END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.suspend_sub_orgs_on_parent_license_expiry() IS 
'Trigger function that suspends all sub-organizations when parent license becomes inactive (expired/canceled).';

-- Create trigger
DROP TRIGGER IF EXISTS trigger_suspend_sub_orgs_on_parent_license_expiry ON public.org_licenses;
CREATE TRIGGER trigger_suspend_sub_orgs_on_parent_license_expiry
  AFTER UPDATE OF status, grace_ends_at, current_period_end
  ON public.org_licenses
  FOR EACH ROW
  WHEN (
    -- Only trigger if status changed or grace/period end changed
    (OLD.status IS DISTINCT FROM NEW.status) OR
    (OLD.grace_ends_at IS DISTINCT FROM NEW.grace_ends_at) OR
    (OLD.current_period_end IS DISTINCT FROM NEW.current_period_end)
  )
  EXECUTE FUNCTION public.suspend_sub_orgs_on_parent_license_expiry();

-- ============================================
-- FUNCTION: Check max sub-org count before creation
-- ============================================

CREATE OR REPLACE FUNCTION public.check_max_sub_org_count(p_parent_org_id UUID)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_max_count INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Get max count from parent org
  SELECT sub_org_max_count INTO v_max_count
  FROM public.organizations
  WHERE id = p_parent_org_id;

  -- If no limit set, allow creation
  IF v_max_count IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Count current sub-orgs
  SELECT COUNT(*) INTO v_current_count
  FROM public.organizations
  WHERE parent_org_id = p_parent_org_id;

  -- Allow if under limit
  RETURN v_current_count < v_max_count;
END;
$$;

COMMENT ON FUNCTION public.check_max_sub_org_count(UUID) IS 
'Checks if parent org has reached max sub-org count. Returns true if creation is allowed.';

GRANT EXECUTE ON FUNCTION public.check_max_sub_org_count(UUID) TO authenticated, anon;
