-- Migration: Add check_trial_eligibility RPC function
-- Description: Creates RPC function for checking trial eligibility (used by UI and edge functions)
-- Date: 2026-02-22

BEGIN;

-- ============================================================================
-- STEP 1: Create check_trial_eligibility RPC function
-- ============================================================================

CREATE OR REPLACE FUNCTION check_trial_eligibility(p_org_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_trial_used_at timestamp with time zone;
BEGIN
  -- Check if org has already used a trial
  SELECT trial_used_at INTO v_trial_used_at
  FROM organizations
  WHERE id = p_org_id;
  
  -- If org not found, return not eligible
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'Organization not found'
    );
  END IF;
  
  -- Eligible if trial_used_at is NULL (org has never used a trial)
  -- Not eligible if trial_used_at exists (org has used trial before)
  IF v_trial_used_at IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', true,
      'reason', NULL
    );
  ELSE
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'Organization has already used a free trial'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_trial_eligibility(uuid) IS 'Checks if an organization is eligible for a free trial. Returns eligible=true if trial_used_at is NULL, eligible=false otherwise. Policy: one trial per organization.';

COMMIT;
