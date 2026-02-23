-- Migration: Add feature entitlements for player transfer and roster audit logging
-- Description: Creates feature entitlements to gate player transfer functionality and roster audit logging
-- Date: 2026-04-22

BEGIN;

-- ============================================================================
-- STEP 1: Create feature entitlement for player_transfer
-- ============================================================================

INSERT INTO public.feature_entitlements (
  feature_key,
  display_name,
  description,
  category,
  feature_type,
  unavailable_gate_action,
  rollout_status
) VALUES (
  'player_transfer',
  'Player Transfer Between Teams',
  'Allows administrators to transfer players between teams within the same organization',
  'Teams & Rosters',
  'module',
  'disable',
  'live'
) ON CONFLICT (feature_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  feature_type = EXCLUDED.feature_type,
  unavailable_gate_action = EXCLUDED.unavailable_gate_action,
  rollout_status = EXCLUDED.rollout_status,
  updated_at = NOW();

-- ============================================================================
-- STEP 2: Create feature entitlement for roster_audit_logging
-- ============================================================================

INSERT INTO public.feature_entitlements (
  feature_key,
  display_name,
  description,
  category,
  feature_type,
  unavailable_gate_action,
  rollout_status
) VALUES (
  'roster_audit_logging',
  'Roster Audit Logging',
  'Enables comprehensive audit logging for all roster changes, including transfers, additions, and removals',
  'Teams & Rosters',
  'module',
  'disable',
  'live'
) ON CONFLICT (feature_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  feature_type = EXCLUDED.feature_type,
  unavailable_gate_action = EXCLUDED.unavailable_gate_action,
  rollout_status = EXCLUDED.rollout_status,
  updated_at = NOW();

-- ============================================================================
-- STEP 3: Assign player_transfer to license tiers
-- ============================================================================

-- Assign to tier1, tier2, and tier3 (all tiers)
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
  AND fe.feature_key = 'player_transfer'
  AND fe.archived_at IS NULL
ON CONFLICT (license_tier_id, feature_entitlement_id) DO UPDATE SET
    included = true,
    role_admin = true,
    role_coach = false,
    role_parent = false,
    updated_at = now();

-- ============================================================================
-- STEP 4: Assign roster_audit_logging to license tiers
-- ============================================================================

-- Assign to tier2 and tier3 (not tier1)
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
WHERE lt.tier_key IN ('tier2', 'tier3')
  AND lt.status = 'active'
  AND fe.feature_key = 'roster_audit_logging'
  AND fe.archived_at IS NULL
ON CONFLICT (license_tier_id, feature_entitlement_id) DO UPDATE SET
    included = true,
    role_admin = true,
    role_coach = false,
    role_parent = false,
    updated_at = now();

-- ============================================================================
-- STEP 5: Migration verification
-- ============================================================================

DO $$
DECLARE
  v_player_transfer_exists BOOLEAN;
  v_roster_audit_exists BOOLEAN;
  v_player_transfer_assignments INTEGER;
  v_roster_audit_assignments INTEGER;
BEGIN
  -- Verify feature entitlements exist
  SELECT EXISTS (
    SELECT 1 FROM public.feature_entitlements
    WHERE feature_key = 'player_transfer'
      AND archived_at IS NULL
  ) INTO v_player_transfer_exists;

  SELECT EXISTS (
    SELECT 1 FROM public.feature_entitlements
    WHERE feature_key = 'roster_audit_logging'
      AND archived_at IS NULL
  ) INTO v_roster_audit_exists;

  IF NOT v_player_transfer_exists THEN
    RAISE EXCEPTION 'Migration failed: player_transfer feature entitlement not created';
  END IF;

  IF NOT v_roster_audit_exists THEN
    RAISE EXCEPTION 'Migration failed: roster_audit_logging feature entitlement not created';
  END IF;

  -- Verify tier assignments
  SELECT COUNT(*) INTO v_player_transfer_assignments
  FROM public.tier_feature_assignments tfa
  JOIN public.feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
  WHERE fe.feature_key = 'player_transfer';

  SELECT COUNT(*) INTO v_roster_audit_assignments
  FROM public.tier_feature_assignments tfa
  JOIN public.feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
  WHERE fe.feature_key = 'roster_audit_logging';

  IF v_player_transfer_assignments = 0 THEN
    RAISE EXCEPTION 'Migration failed: No tier assignments created for player_transfer';
  END IF;

  IF v_roster_audit_assignments = 0 THEN
    RAISE EXCEPTION 'Migration failed: No tier assignments created for roster_audit_logging';
  END IF;

  RAISE NOTICE 'Migration successful: player_transfer and roster_audit_logging feature entitlements created';
END $$;

COMMIT;
