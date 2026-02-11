-- ============================================================================
-- CONSOLIDATED FEATURE ENTITLEMENTS CONFIGURATION
-- Ensures all features have correct gate actions, rollout status, and tier assignments
-- ============================================================================
-- This migration:
-- 1. Updates all feature records with correct unavailable_gate_action
-- 2. Sets appropriate rollout_status values
-- 3. Removes incorrect tier assignments
-- 4. Uses UPSERT to ensure idempotent behavior
-- ============================================================================

-- START TRANSACTION
BEGIN;

-- ============================================================================
-- 1. UPDATE ALL CORE FEATURES WITH CORRECT GATE ACTIONS
-- ============================================================================

-- Event Scheduling - show but disabled when not available
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
    platform_admin_only
)
VALUES (
    'event_scheduling',
    'Event Scheduling',
    'Create and manage events, attendance tracking',
    'Scheduling & Calendar',
    'module',
    'disable',
    'live',
    true,
    false,
    false
)
ON CONFLICT (feature_key) DO UPDATE SET
    unavailable_gate_action = 'disable',
    rollout_status = 'live',
    updated_at = now();

-- Roster Management - show but disabled when not available
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
    platform_admin_only
)
VALUES (
    'roster_management',
    'Roster Management',
    'Manage athletes, guardians, and rosters',
    'Teams & Rosters',
    'module',
    'disable',
    'live',
    true,
    false,
    false
)
ON CONFLICT (feature_key) DO UPDATE SET
    unavailable_gate_action = 'disable',
    rollout_status = 'live',
    updated_at = now();

-- Payment Processing - show but disabled when not available
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
    platform_admin_only
)
VALUES (
    'payment_processing',
    'Payment Processing',
    'Collect and manage payments',
    'Payments',
    'module',
    'disable',
    'live',
    true,
    false,
    false
)
ON CONFLICT (feature_key) DO UPDATE SET
    unavailable_gate_action = 'disable',
    rollout_status = 'live',
    updated_at = now();

-- Team Management - show but disabled when not available
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
    platform_admin_only
)
VALUES (
    'team_management',
    'Team Management',
    'Create and manage teams, programs, levels, seasons',
    'Teams & Rosters',
    'module',
    'disable',
    'live',
    true,
    false,
    false
)
ON CONFLICT (feature_key) DO UPDATE SET
    unavailable_gate_action = 'disable',
    rollout_status = 'live',
    updated_at = now();

-- Messaging - show but disabled when not available
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
    platform_admin_only
)
VALUES (
    'messaging',
    'Messaging',
    'Team communication and announcements',
    'Messaging & Communication',
    'module',
    'disable',
    'live',
    true,
    false,
    false
)
ON CONFLICT (feature_key) DO UPDATE SET
    unavailable_gate_action = 'disable',
    rollout_status = 'live',
    updated_at = now();

-- Announcements - show but disabled when not available
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
    platform_admin_only
)
VALUES (
    'announcements',
    'Announcements',
    'Post team announcements and notifications',
    'Messaging & Communication',
    'module',
    'disable',
    'live',
    true,
    false,
    false
)
ON CONFLICT (feature_key) DO UPDATE SET
    unavailable_gate_action = 'disable',
    rollout_status = 'live',
    updated_at = now();

-- Ticketing - show but disabled when not available
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
    platform_admin_only
)
VALUES (
    'ticketing',
    'Ticketing',
    'Manage event tickets and sales',
    'Payments',
    'module',
    'disable',
    'live',
    true,
    false,
    false
)
ON CONFLICT (feature_key) DO UPDATE SET
    unavailable_gate_action = 'disable',
    rollout_status = 'live',
    updated_at = now();

-- Tryouts - show but disabled when not available
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
    platform_admin_only
)
VALUES (
    'tryouts',
    'Tryouts',
    'Manage tryouts and evaluations',
    'Tryouts',
    'module',
    'disable',
    'live',
    true,
    false,
    false
)
ON CONFLICT (feature_key) DO UPDATE SET
    unavailable_gate_action = 'disable',
    rollout_status = 'live',
    updated_at = now();

-- Travel Planning - show but disabled when not available
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
    platform_admin_only
)
VALUES (
    'travel_planning',
    'Travel Planning',
    'Plan and manage team travel',
    'Travel',
    'module',
    'disable',
    'live',
    true,
    false,
    false
)
ON CONFLICT (feature_key) DO UPDATE SET
    unavailable_gate_action = 'disable',
    rollout_status = 'live',
    updated_at = now();

-- Travel Details - show but disabled when not available
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
    platform_admin_only
)
VALUES (
    'travel_details',
    'Travel Details',
    'View detailed travel information',
    'Travel',
    'module',
    'disable',
    'live',
    true,
    false,
    false
)
ON CONFLICT (feature_key) DO UPDATE SET
    unavailable_gate_action = 'disable',
    rollout_status = 'live',
    updated_at = now();

-- Fee Management - show but disabled when not available
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
    platform_admin_only
)
VALUES (
    'fee_management',
    'Fee Management',
    'Create and manage fees',
    'Payments',
    'module',
    'disable',
    'live',
    true,
    false,
    false
)
ON CONFLICT (feature_key) DO UPDATE SET
    unavailable_gate_action = 'disable',
    rollout_status = 'live',
    updated_at = now();

-- Uniform Orders - HIDDEN when not available (should not show in nav)
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
    platform_admin_only
)
VALUES (
    'uniform_orders',
    'Uniform Orders',
    'Manage uniform kits and orders',
    'Uniforms & Gear',
    'module',
    'hide',
    'hidden',
    true,
    false,
    false
)
ON CONFLICT (feature_key) DO UPDATE SET
    unavailable_gate_action = 'hide',
    rollout_status = 'hidden',
    updated_at = now();

-- ============================================================================
-- 2. ENSURE TIER ASSIGNMENTS ARE CORRECT
-- ============================================================================
-- Remove uniform_orders from all tier assignments (it's disabled)
DELETE FROM public.tier_feature_assignments
WHERE feature_entitlement_id = (
    SELECT id FROM public.feature_entitlements WHERE feature_key = 'uniform_orders'
);

-- ============================================================================
-- 3. VERIFY INDEXES ON FEATURE ENTITLEMENTS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_key ON public.feature_entitlements(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_rollout_status ON public.feature_entitlements(rollout_status);
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_gate_action ON public.feature_entitlements(unavailable_gate_action);

-- ============================================================================
-- 4. LOG COMPLETION
-- ============================================================================
-- Insert a record noting this migration ran
INSERT INTO public.feature_entitlements (feature_key, display_name, category, feature_type, rollout_status)
SELECT 'migration_consolidated_config', 'Migration: Consolidated Feature Configuration', 'System', 'module', 'hidden'
WHERE NOT EXISTS (SELECT 1 FROM public.feature_entitlements WHERE feature_key = 'migration_consolidated_config');

-- COMMIT TRANSACTION
COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run manually after migration)
-- ============================================================================
-- SELECT 
--   feature_key,
--   display_name,
--   unavailable_gate_action,
--   rollout_status,
--   is_toggleable
-- FROM feature_entitlements
-- ORDER BY feature_key;
--
-- SELECT 
--   fe.feature_key,
--   lt.tier_name,
--   COUNT(*) as assignment_count
-- FROM tier_feature_assignments tfa
-- JOIN feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
-- JOIN license_tiers lt ON tfa.tier_id = lt.id
-- GROUP BY fe.feature_key, lt.tier_name
-- ORDER BY fe.feature_key, lt.tier_name;
