-- ============================================================================
-- TEMPLATE: Add / Update a Feature Entitlement
-- ============================================================================
-- Copy this file, rename with a proper timestamp prefix, and fill in the values.
--
-- Naming convention:
--   YYYYMMDDHHMMSS_add_<feature_key>_entitlement.sql
--   e.g. 20260501000001_add_locker_room_entitlement.sql
--
-- IMPORTANT:
--   - feature_key must be lowercase a-z, digits, underscores, start with a letter
--   - unavailable_gate_action must be one of: hide, disable, overlay, modal, paywall, custom
--   - rollout_status must be one of: active, beta, hidden, deprecated
--   - After applying, run: npm run generate:feature-keys
-- ============================================================================

-- Step 1: UPSERT the feature entitlement
INSERT INTO public.feature_entitlements (
    feature_key,
    feature_name,
    description,
    category,
    unavailable_gate_action,
    rollout_status,
    owner_team
)
VALUES (
    'your_feature_key',         -- REQUIRED: snake_case, e.g. 'locker_room'
    'Your Feature Name',        -- REQUIRED: human-readable name
    'Description of what this feature does.',  -- Optional
    'core',                     -- Category: core, communication, management, analytics, commerce, content, platform
    'overlay',                  -- Gate action when denied: hide | disable | overlay | modal | paywall | custom
    'active',                   -- Rollout: active | beta | hidden | deprecated
    NULL                        -- Owner team (optional): e.g. 'platform', 'growth'
)
ON CONFLICT (feature_key) DO UPDATE SET
    feature_name            = EXCLUDED.feature_name,
    description             = EXCLUDED.description,
    category                = EXCLUDED.category,
    unavailable_gate_action = EXCLUDED.unavailable_gate_action,
    rollout_status          = EXCLUDED.rollout_status,
    owner_team              = EXCLUDED.owner_team,
    updated_at              = now();

-- Step 2: Assign to license tiers
-- Repeat this block for each tier that should have access.
-- Remove tiers that should NOT have access.
--
-- Available tiers (check license_tiers table for current list):
--   starter, essentials, professional, elite, enterprise, trial

INSERT INTO public.tier_feature_assignments (license_tier_id, feature_entitlement_id)
SELECT lt.id, fe.id
FROM public.license_tiers lt
CROSS JOIN public.feature_entitlements fe
WHERE lt.tier_key IN ('essentials', 'professional', 'elite', 'enterprise')
  AND fe.feature_key = 'your_feature_key'
ON CONFLICT (license_tier_id, feature_entitlement_id) DO NOTHING;

-- Step 3 (optional): Remove from specific tiers if narrowing access
-- DELETE FROM public.tier_feature_assignments
-- WHERE feature_entitlement_id = (
--     SELECT id FROM public.feature_entitlements WHERE feature_key = 'your_feature_key'
-- )
-- AND license_tier_id IN (
--     SELECT id FROM public.license_tiers WHERE tier_key IN ('starter', 'trial')
-- );

-- Step 4 (optional): Add feature dependency
-- INSERT INTO public.feature_dependencies (feature_key, depends_on_key, dependency_type)
-- VALUES ('your_feature_key', 'some_parent_feature', 'required')
-- ON CONFLICT (feature_key, depends_on_key) DO NOTHING;

-- ============================================================================
-- AFTER APPLYING:
-- 1. Run: npm run generate:feature-keys
-- 2. Add route-to-feature mapping in src/lib/featureGate/registry.ts
-- 3. Wrap route with <FeatureGateRoute routeKey="..."> in App.tsx
-- 4. Add nav item gating in the relevant nav config
-- ============================================================================
