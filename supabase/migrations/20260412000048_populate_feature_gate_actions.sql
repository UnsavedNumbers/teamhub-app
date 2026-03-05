-- Migration: Populate Feature Gate Actions Based on UI/UX Best Practices
-- Description: Sets unavailable_gate_action for all features based on their type, category, and UI/UX considerations
-- Date: 2026-04-12
--
-- Gate Action Strategy:
-- - 'hide': Remove from UI entirely (for platform admin only, internal features)
-- - 'disable': Show but grayed out (for features users should see but can't use)
-- - 'overlay': Show with upgrade overlay/tooltip (default for most premium features)
-- - 'modal': Show but trigger modal on interaction (for features needing explanation)
-- - 'paywall': Redirect to billing/upgrade page (for critical monetization features)
-- - 'custom': Custom app-specific handling (for complex features)
-- - 'hide': For system features (always available, gate action never evaluated)

BEGIN;

-- ============================================================================
-- STEP 1: Set Gate Actions for Platform Admin Only Features
-- ============================================================================

-- Platform admin only features should be hidden from regular users
UPDATE public.feature_entitlements
SET unavailable_gate_action = 'hide'
WHERE platform_admin_only = true
  AND unavailable_gate_action IS NULL;

-- ============================================================================
-- STEP 2: Set Gate Actions for System Features
-- ============================================================================

-- System features are always available, so gate_action doesn't apply
-- However, unavailable_gate_action is NOT NULL, so use 'hide' as a valid default
-- (System features are always allowed, so the gate action is never evaluated)
UPDATE public.feature_entitlements
SET unavailable_gate_action = 'hide'
WHERE is_system_feature = true;

-- ============================================================================
-- STEP 3: Set Gate Actions for Limit-Type Features
-- ============================================================================

-- Limit features (max_teams, max_athletes, etc.) should use 'overlay' to show upgrade prompt
-- when limits are reached
UPDATE public.feature_entitlements
SET unavailable_gate_action = 'overlay'
WHERE feature_type = 'limit'
  AND unavailable_gate_action IS NULL;

-- ============================================================================
-- STEP 4: Set Gate Actions for Premium/Advanced Features (Tier 2+)
-- ============================================================================

-- Premium features that are core to higher tiers should use 'overlay' to encourage upgrades
UPDATE public.feature_entitlements
SET unavailable_gate_action = 'overlay'
WHERE feature_key IN (
    -- Reporting Features (Tier 2+) - excluding reports_builder and reports_exports (handled in Step 9)
    'reports_overview', 'reports_saved',
    'reports_schedules', 'reports_viewer', 'reports_ticketing', 'reports_registration',
    'reports_video', 'reports_events',
    'reports_domain_participation', 'reports_domain_payments', 'reports_domain_scheduling',
    'reports_domain_travel', 'reports_domain_uniforms', 'reports_domain_communications',
    'reports_domain_operations',
    
    -- Photo Features (Tier 2+)
    'photos_create', 'photos_detail', 'photos_gallery', 'photos_gallery_manage',
    'photos_list', 'photos_photo',
    
    -- Facilities Features (Tier 2+) - excluding facilities_schedule (handled in Step 9)
    'facilities_list', 'facilities_detail',
    
    -- Advanced Integrations (Tier 2+) - excluding stripe_integration (handled in Step 8)
    'registration_forms',
    
    -- Advanced Features - excluding multi_role_support (handled in Step 9)
    'travel_planning', 'travel_details',
    'tryouts',
    'uniform_orders',
    'invitations'
)
AND unavailable_gate_action IS NULL
AND platform_admin_only = false
AND is_system_feature = false;

-- ============================================================================
-- STEP 5: Set Gate Actions for Core Features (Tier 1)
-- ============================================================================

-- Core features that are in Tier 1 should use 'overlay' to show upgrade prompt
-- These are features users might expect but need to upgrade for
UPDATE public.feature_entitlements
SET unavailable_gate_action = 'overlay'
WHERE feature_key IN (
    -- Core Operations
    'teamsmanagement', 'teams', 'team_management',
    'roster', 'athletes', 'roster_management',
    'events', 'event_scheduling',
    'calendar',
    'eventdetail',
    'rsvp', 'event_rsvps', 'event_general_rsvps',
    'attendance', 'event_attendance',
    'recurring_event_patterns', 'recurring_event_instances',
    'event_locations',
    'valid_event_types',
    
    -- Communication
    'announcements', 'announcementdetail',
    'messages', 'messaging',
    
    -- Commerce (excluding payment_processing and fee_management - handled in Step 8)
    'payments',
    'paymentsuccess', 'paymentdetail',
    'fees', 'fee_assignments',
    'planselection',
    'checkoutsuccess',
    'paymentsettings',
    'org_payment_policies',
    'payment_allocations'
)
AND unavailable_gate_action IS NULL
AND platform_admin_only = false
AND is_system_feature = false;

-- ============================================================================
-- STEP 6: Set Gate Actions for Navigation/Menu Features
-- ============================================================================

-- Navigation features should use 'hide' to remove from menu when unavailable
-- This provides cleaner UI experience
UPDATE public.feature_entitlements
SET unavailable_gate_action = 'hide'
WHERE feature_key IN (
    -- Support/Admin Tools (should be hidden if not available)
    'organization_settings', 'organizationsettings',
    'base',
    'settings',
    'organization_sports',
    'organization_attendance_settings',
    'organization_notification_settings',
    'organization_invites',
    'organization_members',
    
    -- Detail/View Pages (hide from navigation)
    'eventdetail',
    'announcementdetail',
    'paymentdetail',
    'leveldetail',
    'sportdetail',
    'uniformkitdetail',
    'checkoutsuccess',
    'checkoutcancel',
    'paymentcancel',
    'trialexpired',
    'planselection'
)
AND unavailable_gate_action IS NULL
AND platform_admin_only = false
AND is_system_feature = false;

-- ============================================================================
-- STEP 7: Set Gate Actions for Action/Button Features
-- ============================================================================

-- Action features (create, edit, delete) should use 'disable' to show button
-- but grayed out, so users understand the action exists but can't use it
UPDATE public.feature_entitlements
SET unavailable_gate_action = 'disable'
WHERE feature_key IN (
    -- Creation Actions
    'createathlete',
    'import',
    'athlete_imports',
    
    -- Request Actions
    'requestattachment',
    'guardian_attachment_requests',
    'guardianrequests',
    
    -- Form/Input Features
    'forms',
    'registration_forms'
)
AND unavailable_gate_action IS NULL
AND platform_admin_only = false
AND is_system_feature = false;

-- ============================================================================
-- STEP 8: Set Gate Actions for Critical Monetization Features
-- ============================================================================

-- Critical monetization features should use 'paywall' to redirect to upgrade
UPDATE public.feature_entitlements
SET unavailable_gate_action = 'paywall'
WHERE feature_key IN (
    -- Payment Processing (critical for revenue)
    'payment_processing',
    'fee_management',
    'stripe_integration',
    
    -- Ticketing (revenue-generating)
    'ticketing'
)
AND unavailable_gate_action IS NULL
AND platform_admin_only = false
AND is_system_feature = false;

-- ============================================================================
-- STEP 9: Set Gate Actions for Enterprise Features (Tier 3)
-- ============================================================================

-- Enterprise features should use 'modal' to explain value proposition
UPDATE public.feature_entitlements
SET unavailable_gate_action = 'modal'
WHERE feature_key IN (
    -- Enterprise/Professional Features
    'multi_role_support',
    'reports_builder',  -- Advanced reporting needs explanation
    'reports_exports',  -- Export capabilities need explanation
    'facilities_schedule'  -- Facility scheduling needs explanation
)
AND unavailable_gate_action IS NULL
AND platform_admin_only = false
AND is_system_feature = false;

-- ============================================================================
-- STEP 10: Set Default Gate Action for Remaining Features
-- ============================================================================

-- For any remaining features without a gate action, use 'overlay' as default
-- This provides a consistent upgrade experience
UPDATE public.feature_entitlements
SET unavailable_gate_action = 'overlay'
WHERE unavailable_gate_action IS NULL
  AND platform_admin_only = false
  AND is_system_feature = false;

-- ============================================================================
-- STEP 11: Validation
-- ============================================================================

-- Validate that all non-system, non-platform-admin features have gate actions set
DO $$
DECLARE
    v_missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_missing_count
    FROM public.feature_entitlements
    WHERE unavailable_gate_action IS NULL
      AND platform_admin_only = false
      AND is_system_feature = false
      AND archived_at IS NULL;
    
    IF v_missing_count > 0 THEN
        RAISE WARNING 'Warning: % features still missing gate_action after migration', v_missing_count;
    END IF;
END $$;

-- Validate gate action values are valid
DO $$
DECLARE
    v_invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_invalid_count
    FROM public.feature_entitlements
    WHERE unavailable_gate_action IS NOT NULL
      AND unavailable_gate_action NOT IN ('hide', 'disable', 'overlay', 'modal', 'paywall', 'custom')
      AND archived_at IS NULL;
    
    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'Invalid gate_action values found: % features have invalid gate_action', v_invalid_count;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary:
-- - Set 'hide' for platform admin only features
-- - Set NULL for system features (always available)
-- - Set 'overlay' for limit-type features
-- - Set 'overlay' for premium/advanced features (Tier 2+)
-- - Set 'overlay' for core features (Tier 1)
-- - Set 'hide' for navigation/menu features
-- - Set 'disable' for action/button features
-- - Set 'paywall' for critical monetization features
-- - Set 'modal' for enterprise features (Tier 3)
-- - Set 'overlay' as default for remaining features
-- - Validated all features have appropriate gate actions
--
-- Gate Action Usage:
-- - 'hide': Removes feature from UI (cleaner navigation)
-- - 'disable': Shows feature but grayed out (users see it exists)
-- - 'overlay': Shows feature with upgrade overlay (encourages upgrade)
-- - 'modal': Shows feature but triggers modal on interaction (explains value)
-- - 'paywall': Redirects to billing/upgrade page (direct monetization)
-- - 'custom': Custom app-specific handling (complex features)
-- - NULL: System features always available
