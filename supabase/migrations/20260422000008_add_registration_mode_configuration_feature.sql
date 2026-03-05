-- Migration: Add registration_mode_configuration feature entitlement
-- Description: Creates feature entitlement for program registration mode configuration
-- Date: 2026-04-22

BEGIN;

-- ============================================================================
-- STEP 1: UPSERT the feature entitlement
-- ============================================================================

INSERT INTO public.feature_entitlements (
    feature_key,
    display_name,
    description,
    category,
    feature_type,
    unavailable_gate_action,
    rollout_status
)
VALUES (
    'registration_mode_configuration',
    'Registration Mode Configuration',
    'Allows organizations to configure whether programs allow individual registration, team registration, or both.',
    'management',
    'module',
    'disable',
    'live'
)
ON CONFLICT (feature_key) DO UPDATE SET
    display_name            = EXCLUDED.display_name,
    description             = EXCLUDED.description,
    category                = EXCLUDED.category,
    feature_type            = EXCLUDED.feature_type,
    unavailable_gate_action = EXCLUDED.unavailable_gate_action,
    rollout_status          = EXCLUDED.rollout_status,
    updated_at              = now();

-- ============================================================================
-- STEP 2: Assign to license tiers (Tier 1+)
-- ============================================================================

INSERT INTO public.tier_feature_assignments (
    license_tier_id,
    feature_entitlement_id,
    included,
    role_admin,
    role_coach,
    role_parent
)
SELECT 
    lt.id,
    fe.id,
    true AS included,
    true AS role_admin,
    false AS role_coach,
    false AS role_parent
FROM public.license_tiers lt
CROSS JOIN public.feature_entitlements fe
WHERE lt.tier_key IN ('tier1', 'tier2', 'tier3')
  AND lt.status = 'active'
  AND fe.feature_key = 'registration_mode_configuration'
  AND fe.archived_at IS NULL
ON CONFLICT (license_tier_id, feature_entitlement_id) DO UPDATE SET
    included = true,
    role_admin = true,
    role_coach = false,
    role_parent = false,
    updated_at = now();

-- ============================================================================
-- STEP 3: Migration verification
-- ============================================================================

DO $$
DECLARE
  v_feature_exists BOOLEAN;
  v_assignment_count INTEGER;
BEGIN
  -- Verify feature exists
  SELECT EXISTS (
    SELECT 1 FROM public.feature_entitlements
    WHERE feature_key = 'registration_mode_configuration'
      AND archived_at IS NULL
  ) INTO v_feature_exists;

  IF NOT v_feature_exists THEN
    RAISE EXCEPTION 'Migration failed: registration_mode_configuration feature not created';
  END IF;

  -- Verify tier assignments
  SELECT COUNT(*) INTO v_assignment_count
  FROM public.tier_feature_assignments tfa
  JOIN public.feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
  WHERE fe.feature_key = 'registration_mode_configuration';

  IF v_assignment_count = 0 THEN
    RAISE EXCEPTION 'Migration failed: No tier assignments created for registration_mode_configuration';
  END IF;

  RAISE NOTICE 'Migration successful: registration_mode_configuration feature created and assigned to % tier(s)', v_assignment_count;
END $$;

COMMIT;
