-- Add facilities_customers feature entitlement
-- Registers customer management feature and assigns to appropriate license tiers

BEGIN;

-- ============================================================================
-- STEP 1: Register feature entitlement
-- ============================================================================

-- Check constraint feature_entitlements_addon_required_fields_check requires:
-- when available_as_addon = true then addon_stripe_price_id AND addon_external_name must be NOT NULL.
-- addon_stripe_price_id must match ^price_[a-zA-Z0-9_]+$ (feature_entitlements_addon_stripe_price_id_format_check).
INSERT INTO public.feature_entitlements (
    feature_key,
    display_name,
    description,
    category,
    feature_type,
    unavailable_gate_action,
    rollout_status,
    is_toggleable,
    is_system_feature,
    platform_admin_only,
    available_as_addon,
    addon_stripe_price_id,
    addon_external_name,
    addon_external_description
)
VALUES (
    'facilities_customers',
    'Customer Management for Facilities',
    'Manage external customers for facility rentals',
    'Facilities',
    'module',
    'overlay',
    'beta',
    true,
    false,
    false,
    true,
    'price_placeholder_facilities_customers',
    'Customer Management',
    'Track external customers and link them to facility bookings'
)
ON CONFLICT (feature_key) DO UPDATE SET
    display_name = 'Customer Management for Facilities',
    description = 'Manage external customers for facility rentals',
    category = 'Facilities',
    feature_type = 'module',
    unavailable_gate_action = 'overlay',
    rollout_status = 'beta',
    available_as_addon = true,
    addon_stripe_price_id = EXCLUDED.addon_stripe_price_id,
    addon_external_name = 'Customer Management',
    addon_external_description = 'Track external customers and link them to facility bookings',
    updated_at = now();

-- ============================================================================
-- STEP 2: Assign to license tiers
-- ============================================================================

-- Assign to tier2 (Growth/Power) and tier3 (Professional/Enterprise) - included
INSERT INTO public.tier_feature_assignments (
    license_tier_id,
    feature_entitlement_id,
    included,
    limit_value,
    role_admin,
    role_coach,
    role_parent
)
SELECT 
    lt.id,
    fe.id,
    true AS included,
    NULL AS limit_value,
    true AS role_admin,
    false AS role_coach,
    false AS role_parent
FROM public.license_tiers lt
CROSS JOIN public.feature_entitlements fe
WHERE lt.tier_key IN ('tier2', 'tier3')
  AND fe.feature_key = 'facilities_customers'
ON CONFLICT (license_tier_id, feature_entitlement_id) DO UPDATE SET
    included = true,
    role_admin = true,
    role_coach = false,
    role_parent = false;

-- Note: tier1 (Starter/Basic) does NOT get this feature included
-- It is available as an add-on only (configured via available_as_addon = true above)

COMMIT;
