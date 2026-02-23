-- Migration: get_features_not_in_org RPC
-- Description: Returns feature_entitlements that are NOT accessible to a given org,
--              based on tier comparison. Tier3 orgs get an empty result set.
--              Used by the "Request a feature not in our plan" flow.
-- Date: 2026-04-12

BEGIN;

CREATE OR REPLACE FUNCTION public.get_features_not_in_org(p_org_id uuid)
RETURNS TABLE (
  feature_key        text,
  display_name       text,
  description        text,
  recommended_action text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_tier_rank integer := 0;
BEGIN
  -- -------------------------------------------------------------------------
  -- Resolve the org's current tier rank (tier1=1, tier2=2, tier3=3).
  -- Defaults to 0 (no tier) if org has no current_tier_id.
  -- Sub-orgs inherit their parent's license; resolve via get_effective_license_org_id.
  -- -------------------------------------------------------------------------
  SELECT
    CASE lt.tier_key
      WHEN 'tier1' THEN 1
      WHEN 'tier2' THEN 2
      WHEN 'tier3' THEN 3
      ELSE 0
    END
  INTO v_tier_rank
  FROM public.organizations o
  LEFT JOIN public.license_tiers lt ON lt.id = o.current_tier_id
  WHERE o.id = public.get_effective_license_org_id(p_org_id);

  -- -------------------------------------------------------------------------
  -- Tier3 orgs (or unresolvable orgs) get an empty list.
  -- -------------------------------------------------------------------------
  IF COALESCE(v_tier_rank, 0) >= 3 THEN
    RETURN;
  END IF;

  -- -------------------------------------------------------------------------
  -- Return features that:
  --   1. Are assigned (included=true) to a tier HIGHER than the org's current tier
  --   2. Are not platform-admin-only and not archived and not hidden
  --   3. Are not already enabled for this org via an entitlement_override
  -- DISTINCT to collapse duplicate rows when a feature is in multiple higher tiers.
  -- -------------------------------------------------------------------------
  RETURN QUERY
  SELECT DISTINCT
    fe.feature_key,
    fe.display_name,
    COALESCE(fe.description, '') AS description,
    'upgrade_plan'::text         AS recommended_action
  FROM public.feature_entitlements fe
  INNER JOIN public.tier_feature_assignments tfa
    ON tfa.feature_entitlement_id = fe.id
    AND tfa.included = true
  INNER JOIN public.license_tiers lt
    ON lt.id = tfa.license_tier_id
  WHERE
    -- Feature must be in a tier the org doesn't have yet
    CASE lt.tier_key
      WHEN 'tier1' THEN 1
      WHEN 'tier2' THEN 2
      WHEN 'tier3' THEN 3
      ELSE 0
    END > COALESCE(v_tier_rank, 0)
    -- Only guardian/athlete-facing features
    AND fe.platform_admin_only = false
    -- Not archived
    AND fe.archived_at IS NULL
    -- Not hidden from public rollout
    AND COALESCE(fe.rollout_status, 'live') <> 'hidden'
    -- Not already enabled for this org via an active entitlement override
    AND NOT EXISTS (
      SELECT 1
      FROM public.entitlement_overrides eo
      WHERE eo.target_type   = 'organization'
        AND eo.target_id     = p_org_id
        AND eo.feature_entitlement_id = fe.id
        AND eo.override_action = 'enable'
        AND eo.revoked_at IS NULL
        AND (eo.expires_at IS NULL OR eo.expires_at > now())
    )
  ORDER BY fe.display_name;
END;
$$;

COMMENT ON FUNCTION public.get_features_not_in_org(uuid) IS
  'Returns features not accessible to the org based on its current license tier. '
  'Used to populate the "Request a feature not in our plan" list for guardians/athletes. '
  'Returns empty set for tier3 orgs (they already have everything).';

-- Grant execute to authenticated users (RLS on the underlying tables still applies).
GRANT EXECUTE ON FUNCTION public.get_features_not_in_org(uuid) TO authenticated;

COMMIT;
