-- Phase 6: Update get_org_photo_storage_limit_bytes() to use current_tier_id instead of plan
-- This migration updates the function to look up tier by current_tier_id and use tier_key
-- for storage limit mapping. Falls back to license_plan mapping during transition.

CREATE OR REPLACE FUNCTION public.get_org_photo_storage_limit_bytes(p_org_id uuid) 
RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tier_key TEXT;
  v_effective_license_org_id UUID;
  v_current_tier_id UUID;
BEGIN
  -- Get effective license org_id (parent if sub-org, self if parent)
  SELECT public.get_effective_license_org_id(p_org_id) INTO v_effective_license_org_id;

  -- Get tier_key from current_tier_id (preferred method)
  SELECT o.current_tier_id, lt.tier_key
  INTO v_current_tier_id, v_tier_key
  FROM organizations o
  LEFT JOIN license_tiers lt ON o.current_tier_id = lt.id AND lt.status = 'active'
  WHERE o.id = v_effective_license_org_id;

  -- Fallback to license_plan mapping during transition (Technical Risk #7)
  IF v_tier_key IS NULL THEN
    SELECT 
      CASE o.license_plan::text
        WHEN 'starter' THEN 'basic'
        WHEN 'standard' THEN 'power'
        WHEN 'pro' THEN 'power'
        ELSE o.license_plan::text
      END INTO v_tier_key
    FROM organizations o
    WHERE o.id = v_effective_license_org_id;
  END IF;

  -- Map tier_key to bytes: basic = 1GB, power = 20GB (or use tier-specific limits if available)
  -- TODO: Consider adding storage_limit_bytes column to license_tiers table for data-driven limits
  RETURN CASE
    WHEN v_tier_key = 'power' THEN 20::BIGINT * 1024 * 1024 * 1024
    WHEN v_tier_key = 'basic' THEN 1::BIGINT * 1024 * 1024 * 1024
    ELSE 1::BIGINT * 1024 * 1024 * 1024  -- Default to 1GB for unknown tiers
  END;
END;
$$;

COMMENT ON FUNCTION public.get_org_photo_storage_limit_bytes(uuid) IS 
'Returns photo storage limit in bytes for an org based on license tier (current_tier_id).
For sub-orgs, uses parent organization''s license tier via get_effective_license_org_id.
Falls back to license_plan mapping during transition period.';
