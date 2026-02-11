-- Check if uniform_orders feature exists and its configuration
SELECT 
    id,
    feature_key,
    display_name,
    category,
    feature_type,
    rollout_status,
    unavailable_gate_action,
    platform_admin_only,
    archived_at
FROM feature_entitlements
WHERE feature_key = 'uniform_orders';

-- Check tier assignments for uniform_orders
SELECT 
    tfa.id,
    lt.tier_key,
    lt.tier_name,
    tfa.included,
    tfa.role_admin,
    tfa.role_coach,
    tfa.role_parent
FROM tier_feature_assignments tfa
JOIN license_tiers lt ON tfa.license_tier_id = lt.id
JOIN feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
WHERE fe.feature_key = 'uniform_orders';
