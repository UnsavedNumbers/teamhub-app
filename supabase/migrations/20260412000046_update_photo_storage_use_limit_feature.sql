-- Migration: Update get_org_photo_storage_limit_bytes to use photo_storage_gb limit feature
-- Description: Replaces hardcoded tier_key mapping with data-driven limit from tier_feature_assignments
-- Date: 2026-04-12

BEGIN;

-- Update get_org_photo_storage_limit_bytes() to use photo_storage_gb limit feature
-- This function now queries tier_feature_assignments for the photo_storage_gb limit_value
-- instead of using hardcoded tier_key values

CREATE OR REPLACE FUNCTION public.get_org_photo_storage_limit_bytes(p_org_id uuid) 
RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_effective_license_org_id UUID;
  v_current_tier_id UUID;
  v_limit_gb INTEGER;
BEGIN
  -- Get effective license org_id (parent if sub-org, self if parent)
  SELECT public.get_effective_license_org_id(p_org_id) INTO v_effective_license_org_id;

  -- Get current_tier_id from organization
  SELECT o.current_tier_id
  INTO v_current_tier_id
  FROM organizations o
  WHERE o.id = v_effective_license_org_id;

  -- If no tier is set, return default 1GB (fallback)
  IF v_current_tier_id IS NULL THEN
    RETURN 1::BIGINT * 1024 * 1024 * 1024;
  END IF;

  -- Get photo_storage_gb limit_value from tier_feature_assignments
  SELECT tfa.limit_value
  INTO v_limit_gb
  FROM tier_feature_assignments tfa
  INNER JOIN feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
  WHERE tfa.license_tier_id = v_current_tier_id
    AND fe.feature_key = 'photo_storage_gb'
    AND fe.feature_type = 'limit'
    AND tfa.included = true
    AND fe.archived_at IS NULL;

  -- If limit_value is NULL, it means unlimited (Tier 3), return a very large number
  -- Otherwise convert GB to bytes
  IF v_limit_gb IS NULL THEN
    -- Unlimited storage (effectively 1TB for practical purposes)
    RETURN 1024::BIGINT * 1024 * 1024 * 1024;
  END IF;

  -- Convert GB to bytes
  RETURN v_limit_gb::BIGINT * 1024 * 1024 * 1024;
END;
$$;

COMMENT ON FUNCTION public.get_org_photo_storage_limit_bytes(uuid) IS 
'Returns photo storage limit in bytes for an org based on photo_storage_gb limit feature from tier_feature_assignments.
For sub-orgs, uses parent organization''s license tier via get_effective_license_org_id.
NULL limit_value means unlimited (returns 1TB). Defaults to 1GB if tier not configured.';

COMMIT;
