-- ============================================================================
-- Fix Uniforms Feature Gating
-- ============================================================================
-- This migration ensures the uniforms feature is properly gated:
-- 1. Sets unavailable_gate_action to 'hide' so it doesn't show in navigation
-- 2. Removes it from all license tier assignments
-- 3. Ensures it exists in feature_entitlements if it doesn't
-- ============================================================================

-- Ensure uniform_orders feature exists
INSERT INTO feature_entitlements (
    feature_key,
    display_name,
    category,
    feature_type,
    description,
    rollout_status,
    unavailable_gate_action,
    platform_admin_only,
    is_system_feature,
    is_toggleable,
    is_removable
)
VALUES (
    'uniform_orders',
    'Uniform Orders',
    'Uniforms & Gear',
    'module',
    'Manage uniform kits and orders',
    'hidden', -- Hidden from public catalog
    'hide', -- IMPORTANT: Hide from navigation when not available
    false,
    false,
    true,
    true
)
ON CONFLICT (feature_key) 
DO UPDATE SET
    unavailable_gate_action = 'hide', -- Update to hide
    rollout_status = 'hidden', -- Mark as hidden
    updated_at = now();

-- Remove uniform_orders from ALL license tier assignments
DELETE FROM tier_feature_assignments
WHERE feature_entitlement_id = (
    SELECT id FROM feature_entitlements WHERE feature_key = 'uniform_orders'
);

-- Add comment explaining the configuration
COMMENT ON COLUMN feature_entitlements.unavailable_gate_action IS 
'Action to take when feature is not available: hide (remove from nav), disable (show but disabled), overlay (show with upgrade prompt), modal (show modal), paywall (redirect to billing)';
