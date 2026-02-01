-- ============================================================================
-- Photo gallery storage limits by license plan
-- ============================================================================
-- Purpose: Provide storage limit in bytes per org for photo uploads.
-- Limits: starter/trial 1GB, standard 5GB, pro 20GB.
-- Used by checkStorageCap in galleryService.

CREATE OR REPLACE FUNCTION get_org_photo_storage_limit_bytes(p_org_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
BEGIN
  -- Prefer org_licenses.plan; fallback to organizations.license_plan
  SELECT COALESCE(ol.plan::text, o.license_plan::text)
  INTO v_plan
  FROM organizations o
  LEFT JOIN org_licenses ol ON ol.org_id = o.id
  WHERE o.id = p_org_id;

  -- Map plan to bytes: starter/trial/null = 1GB, standard = 5GB, pro = 20GB
  RETURN CASE
    WHEN v_plan = 'pro' THEN 20::BIGINT * 1024 * 1024 * 1024
    WHEN v_plan = 'standard' THEN 5::BIGINT * 1024 * 1024 * 1024
    ELSE 1::BIGINT * 1024 * 1024 * 1024
  END;
END;
$$;

COMMENT ON FUNCTION get_org_photo_storage_limit_bytes IS
  'Returns photo storage limit in bytes for an org based on license plan (org_licenses.plan or organizations.license_plan).';

GRANT EXECUTE ON FUNCTION get_org_photo_storage_limit_bytes(UUID) TO authenticated;
