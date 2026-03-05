-- ============================================
-- UPDATE get_org_photo_storage_limit_bytes FOR SUB-ORGS
-- ============================================
-- This migration updates get_org_photo_storage_limit_bytes to use
-- effective license org_id for sub-orgs (parent's license).
-- ============================================

CREATE OR REPLACE FUNCTION public.get_org_photo_storage_limit_bytes(p_org_id uuid) 
RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan TEXT;
  v_effective_license_org_id UUID;
BEGIN
  -- Get effective license org_id (parent if sub-org, self if parent)
  SELECT public.get_effective_license_org_id(p_org_id) INTO v_effective_license_org_id;

  -- Prefer org_licenses.plan; fallback to organizations.license_plan
  -- Use effective license org_id for sub-orgs
  SELECT COALESCE(ol.plan::text, o.license_plan::text)
  INTO v_plan
  FROM organizations o
  LEFT JOIN org_licenses ol ON ol.org_id = o.id
  WHERE o.id = v_effective_license_org_id;

  -- Map plan to bytes: starter/trial/null = 1GB, standard = 5GB, pro = 20GB
  RETURN CASE
    WHEN v_plan = 'pro' THEN 20::BIGINT * 1024 * 1024 * 1024
    WHEN v_plan = 'standard' THEN 5::BIGINT * 1024 * 1024 * 1024
    ELSE 1::BIGINT * 1024 * 1024 * 1024
  END;
END;
$$;

COMMENT ON FUNCTION public.get_org_photo_storage_limit_bytes(uuid) IS 
'Returns photo storage limit in bytes for an org based on license plan. 
For sub-orgs, uses parent organization''s license plan via get_effective_license_org_id.';
