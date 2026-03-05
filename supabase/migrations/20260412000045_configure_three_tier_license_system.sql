-- Migration: Configure Three-Tier License Entitlement System
-- Description: Updates tier1/tier2, creates tier3, creates missing feature entitlements,
--              and assigns features to tiers with proper limits and role visibility
-- Date: 2026-04-12

BEGIN;

-- ============================================================================
-- STEP 1: Update/Create License Tiers
-- ============================================================================

-- Handle stripe_price_id reassignment without violating NOT NULL constraint
-- Since stripe_price_id is NOT NULL, we use temporary placeholder values to avoid conflicts
-- Strategy: Assign temporary unique values first, then assign final values

-- Step 1a: Assign temporary placeholder values to any tiers that have our target price IDs
-- This prevents unique constraint violations when reassigning
UPDATE public.license_tiers
SET stripe_price_id = 'temp_swap_' || id::text
WHERE stripe_price_id IN (
    'price_1Srme7BXMnG6JKTvGvQ9eh1S',  -- Tier 1 price
    'price_1SrmeoBXMnG6JKTvnoqXq5QG',  -- Tier 2 price
    'price_1Srmf1BXMnG6JKTv1LtVYVPw'   -- Tier 3 price
)
AND tier_key NOT IN ('tier1', 'tier2', 'tier3');

-- Step 1b: Also handle case where tier1/tier2/tier3 might have wrong price IDs
-- Use temporary values for them too if they have conflicting assignments
UPDATE public.license_tiers
SET stripe_price_id = 'temp_swap_' || id::text
WHERE tier_key = 'tier1'
  AND stripe_price_id IN ('price_1SrmeoBXMnG6JKTvnoqXq5QG', 'price_1Srmf1BXMnG6JKTv1LtVYVPw');

UPDATE public.license_tiers
SET stripe_price_id = 'temp_swap_' || id::text
WHERE tier_key = 'tier2'
  AND stripe_price_id IN ('price_1Srme7BXMnG6JKTvGvQ9eh1S', 'price_1Srmf1BXMnG6JKTv1LtVYVPw');

-- For tier3, clear its price ID if it has any of the target price IDs (to avoid conflicts)
-- This ensures tier3 can be inserted/updated without unique constraint violations
UPDATE public.license_tiers
SET stripe_price_id = 'temp_swap_' || id::text
WHERE tier_key = 'tier3'
  AND stripe_price_id IN ('price_1Srme7BXMnG6JKTvGvQ9eh1S', 'price_1SrmeoBXMnG6JKTvnoqXq5QG', 'price_1Srmf1BXMnG6JKTv1LtVYVPw');

-- Step 1c: Now update tier1 with its correct price ID
UPDATE public.license_tiers
SET 
    tier_name = 'Starter',
    description = 'Single-team or small club operations. Basic scheduling, roster management, communication, and simple payments. Self-service focused.',
    stripe_price_id = 'price_1Srme7BXMnG6JKTvGvQ9eh1S',
    updated_at = now()
WHERE tier_key = 'tier1';

-- Validate Tier 1 update
DO $$
DECLARE
    v_tier1_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tier1_count
    FROM public.license_tiers
    WHERE tier_key = 'tier1' AND tier_name = 'Starter';
    
    IF v_tier1_count = 0 THEN
        RAISE EXCEPTION 'Failed to update tier1: tier not found or update failed';
    END IF;
END $$;

-- Step 1d: Update tier2 with its correct price ID
UPDATE public.license_tiers
SET 
    tier_name = 'Growth',
    description = 'Multi-team organizations with programs and seasons. Advanced reporting, integrations, custom forms, and more storage. Growing administrative needs.',
    stripe_price_id = 'price_1SrmeoBXMnG6JKTvnoqXq5QG',
    updated_at = now()
WHERE tier_key = 'tier2';

-- Validate Tier 2 update
DO $$
DECLARE
    v_tier2_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tier2_count
    FROM public.license_tiers
    WHERE tier_key = 'tier2' AND tier_name = 'Growth';
    
    IF v_tier2_count = 0 THEN
        RAISE EXCEPTION 'Failed to update tier2: tier not found or update failed';
    END IF;
END $$;

-- Create Tier 3 (Professional)
INSERT INTO public.license_tiers (
    tier_key,
    tier_name,
    description,
    stripe_price_id,
    status,
    version
)
VALUES (
    'tier3',
    'Professional',
    'Large clubs, academies, or multi-sport organizations. Full analytics, audit logging, compliance features, API access, and premium support. Enterprise-grade operations.',
    'price_1Srmf1BXMnG6JKTv1LtVYVPw',
    'active',
    1
)
ON CONFLICT (tier_key) DO UPDATE SET
    tier_name = EXCLUDED.tier_name,
    description = EXCLUDED.description,
    stripe_price_id = EXCLUDED.stripe_price_id,
    status = EXCLUDED.status,
    updated_at = now();

-- Validate all three tiers exist
DO $$
DECLARE
    v_tier_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tier_count
    FROM public.license_tiers
    WHERE tier_key IN ('tier1', 'tier2', 'tier3') AND status = 'active';
    
    IF v_tier_count < 3 THEN
        RAISE EXCEPTION 'Expected 3 active tiers (tier1, tier2, tier3), found %', v_tier_count;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create Missing Feature Entitlements
-- ============================================================================

-- Create missing feature entitlements that route registry expects but don't exist in CSV
-- Uses ON CONFLICT DO NOTHING to avoid errors if features already exist

INSERT INTO public.feature_entitlements (
    feature_key,
    display_name,
    category,
    feature_type,
    description,
    rollout_status,
    platform_admin_only
)
VALUES
    -- Facilities Features
    ('facilities_list', 'Facilities List', 'Support Tools', 'module', 'Facilities list view', 'live', false),
    ('facilities_detail', 'Facility Details', 'Support Tools', 'module', 'Facility detail page', 'live', false),
    ('facilities_schedule', 'Facility Schedule', 'Scheduling & Calendar', 'module', 'Facility scheduling', 'live', false),
    
    -- Ticketing
    ('ticketing', 'Ticketing', 'Payments', 'module', 'Ticketing feature', 'live', false),
    
    -- Reporting Features
    ('reports_builder', 'Report Builder', 'Support Tools', 'module', 'Report builder', 'live', false),
    ('reports_overview', 'Reports Overview', 'Support Tools', 'module', 'Reports overview', 'live', false),
    ('reports_saved', 'Saved Reports', 'Support Tools', 'module', 'Saved reports', 'live', false),
    ('reports_exports', 'Report Exports', 'Support Tools', 'module', 'Report exports', 'live', false),
    ('reports_schedules', 'Schedule Reports', 'Support Tools', 'module', 'Schedule reports', 'live', false),
    ('reports_viewer', 'Report Viewer', 'Support Tools', 'module', 'Report viewer', 'live', false),
    ('reports_ticketing', 'Ticketing Reports', 'Support Tools', 'module', 'Ticketing reports', 'live', false),
    ('reports_registration', 'Registration Reports', 'Support Tools', 'module', 'Registration reports', 'live', false),
    ('reports_video', 'Video Reports', 'Support Tools', 'module', 'Video reports', 'live', false),
    ('reports_events', 'Event Reports', 'Support Tools', 'module', 'Event reports', 'live', false),
    
    -- Photo Features
    ('photos_create', 'Create Photos', 'Support Tools', 'module', 'Create photos', 'live', false),
    ('photos_detail', 'Photo Details', 'Support Tools', 'module', 'Photo detail page', 'live', false),
    ('photos_gallery', 'Photo Gallery', 'Support Tools', 'module', 'Photo gallery', 'live', false),
    ('photos_gallery_manage', 'Manage Photo Gallery', 'Support Tools', 'module', 'Manage photo gallery', 'live', false),
    ('photos_list', 'Photo List', 'Support Tools', 'module', 'Photo list', 'live', false),
    ('photos_photo', 'Photo View', 'Support Tools', 'module', 'Individual photo view', 'live', false),
    
    -- Integration & Other Features
    ('stripe_integration', 'Stripe Integration', 'Payments', 'integration', 'Stripe integration', 'live', false),
    ('registration_forms', 'Registration Forms', 'Support Tools', 'module', 'Registration forms', 'live', false),
    ('invitations', 'Invitations', 'Support Tools', 'module', 'Invitations feature', 'live', false),
    ('multi_role_support', 'Multi-Role Support', 'Admin & Permissions', 'permission', 'Multi-role support', 'live', false),
    
    -- Route Registry Mappings (create if needed)
    ('event_scheduling', 'Event Scheduling', 'Scheduling & Calendar', 'module', 'Event scheduling', 'live', false),
    ('roster_management', 'Roster Management', 'Teams & Rosters', 'module', 'Roster management', 'live', false),
    ('team_management', 'Team Management', 'Teams & Rosters', 'module', 'Team management', 'live', false),
    ('messaging', 'Messaging', 'Messaging & Communication', 'module', 'Messaging', 'live', false),
    ('payment_processing', 'Payment Processing', 'Payments', 'module', 'Payment processing', 'live', false),
    ('fee_management', 'Fee Management', 'Payments', 'module', 'Fee management', 'live', false),
    
    -- Limit-Type Features (for tier quantity limits)
    ('max_teams', 'Max Teams', 'Support Tools', 'limit', 'Maximum number of teams allowed', 'live', false),
    ('max_athletes', 'Max Athletes', 'Support Tools', 'limit', 'Maximum number of athletes allowed', 'live', false),
    ('max_players_per_team', 'Max Players Per Team', 'Support Tools', 'limit', 'Maximum players per team', 'live', false),
    ('photo_storage_gb', 'Photo Storage (GB)', 'Support Tools', 'limit', 'Photo storage limit in GB', 'live', false),
    ('max_sub_orgs', 'Max Sub Organizations', 'Support Tools', 'limit', 'Maximum sub-organizations allowed', 'live', false)
ON CONFLICT (feature_key) DO NOTHING;

-- Validate missing features were created (or already existed)
DO $$
DECLARE
    v_missing_count INTEGER;
    v_expected_features TEXT[] := ARRAY[
        'facilities_list', 'facilities_detail', 'facilities_schedule',
        'ticketing',
        'reports_builder', 'reports_overview', 'reports_saved', 'reports_exports', 
        'reports_schedules', 'reports_viewer', 'reports_ticketing', 'reports_registration', 
        'reports_video', 'reports_events',
        'photos_create', 'photos_detail', 'photos_gallery', 'photos_gallery_manage', 
        'photos_list', 'photos_photo',
        'stripe_integration', 'registration_forms', 'invitations', 'multi_role_support',
        'event_scheduling', 'roster_management', 'team_management', 'messaging',
        'payment_processing', 'fee_management',
        'max_teams', 'max_athletes', 'max_players_per_team', 'photo_storage_gb', 'max_sub_orgs'
    ];
BEGIN
    SELECT COUNT(*) INTO v_missing_count
    FROM unnest(v_expected_features) AS f(feature_key)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.feature_entitlements fe
        WHERE fe.feature_key = f.feature_key AND fe.archived_at IS NULL
    );
    
    IF v_missing_count > 0 THEN
        RAISE NOTICE 'Warning: % features from expected list not found after creation', v_missing_count;
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Clear Existing Assignments (Optional - for clean slate)
-- ============================================================================

-- Delete existing tier_feature_assignments for customer tiers to ensure clean state
-- This is safe because we'll recreate all assignments in subsequent steps
DELETE FROM public.tier_feature_assignments tfa
USING public.license_tiers lt
WHERE tfa.license_tier_id = lt.id
  AND lt.tier_key IN ('tier1', 'tier2', 'tier3');

-- ============================================================================
-- STEP 4: Assign Tier 1 (Starter) Features to All Three Tiers
-- ============================================================================

-- Tier 1 features are core features available to all tiers (inheritance)
-- Assign to tier1, tier2, and tier3

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
    NULL AS limit_value,  -- Limits assigned separately in Step 7
    CASE 
        -- Admin role: true for most features
        WHEN fe.category IN ('Admin & Permissions', 'Support Tools', 'Teams & Rosters', 
                             'Scheduling & Calendar', 'Payments', 'Uniforms & Gear', 
                             'Travel', 'Tryouts', 'Messaging & Communication') THEN true
        ELSE true
    END AS role_admin,
    CASE 
        -- Coach role: true for operational features
        WHEN fe.category IN ('Teams & Rosters', 'Scheduling & Calendar', 'Payments', 
                             'Uniforms & Gear', 'Travel', 'Tryouts') THEN true
        WHEN fe.feature_key IN ('calendar', 'attendance', 'event_attendance', 'rsvp', 
                                'event_rsvps', 'eventdetail', 'events', 'event_scheduling',
                                'roster', 'athletes', 'roster_management', 'teams', 
                                'teamsmanagement', 'team_management', 'messages', 'messaging',
                                'announcements', 'announcementdetail', 'athletephoto',
                                'onboarding', 'join', 'forms') THEN true
        ELSE false
    END AS role_coach,
    CASE 
        -- Parent role: true only for fan-facing features
        WHEN fe.category IN ('Messaging & Communication') THEN true
        WHEN fe.feature_key IN ('calendar', 'join', 'athletephoto', 'announcements', 
                                'announcementdetail', 'messages', 'messaging') THEN true
        ELSE false
    END AS role_parent
FROM public.license_tiers lt
CROSS JOIN public.feature_entitlements fe
WHERE lt.tier_key IN ('tier1', 'tier2', 'tier3')
  AND fe.feature_key IN (
    -- Tier 1 Core Features (all 58 features from categorized doc + created features)
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
    -- Commerce
    'payments', 'payment_processing',
    'paymentsuccess', 'paymentdetail',
    'fees', 'fee_management', 'fee_assignments',
    'planselection',
    'checkoutsuccess',
    'paymentsettings',
    'org_payment_policies',
    'payment_allocations',
    -- Organization & Settings
    'organization_settings', 'organizationsettings',
    'base',
    'settings',
    'organization_sports',
    'organization_attendance_settings',
    'organization_notification_settings',
    'organization_invites',
    'organization_members',
    -- Teams & Rosters
    'team_seasons', 'team_seasons_view',
    'team_memberships',
    'athlete_sports', 'athletesports',
    'athlete_guardians',
    'athlete_imports',
    'import',
    'createathlete',
    'requestattachment',
    'guardian_attachment_requests',
    'guardianrequests',
    -- Seasons & Programs
    'seasons', 'seasondetail',
    'programs',
    'sports', 'sportsprograms',
    'levels',
    -- Family & Guardians
    'family', 'families',
    'family_members',
    'parent_invites',
    'child_claim_tokens',
    -- Join & Onboarding
    'join', 'join_links', 'join_requests',
    'onboarding',
    -- Other Tier 1 Features
    'preferences',
    'attendance_settings',
    'forms',
    'athletephoto',
    'uniform_orders'  -- Core commerce feature available to all tiers
  )
  AND fe.platform_admin_only = false
  AND fe.archived_at IS NULL
  AND fe.feature_type != 'limit'  -- Limit features assigned separately
ON CONFLICT (license_tier_id, feature_entitlement_id) 
DO UPDATE SET
    included = EXCLUDED.included,
    limit_value = EXCLUDED.limit_value,
    role_admin = EXCLUDED.role_admin,
    role_coach = EXCLUDED.role_coach,
    role_parent = EXCLUDED.role_parent,
    updated_at = now();

-- ============================================================================
-- STEP 5: Assign Tier 2 (Growth) Only Features to tier2 and tier3
-- ============================================================================

-- Tier 2 features are Growth features (Tier 2 and Tier 3 only)
-- These are advanced features beyond Tier 1

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
    CASE 
        WHEN fe.category IN ('Admin & Permissions', 'Support Tools', 'Teams & Rosters', 
                             'Scheduling & Calendar', 'Payments', 'Uniforms & Gear', 
                             'Travel', 'Tryouts', 'Messaging & Communication') THEN true
        ELSE true
    END AS role_admin,
    CASE 
        WHEN fe.category IN ('Teams & Rosters', 'Scheduling & Calendar', 'Payments', 
                             'Uniforms & Gear', 'Travel', 'Tryouts') THEN true
        WHEN fe.feature_key IN ('travel', 'traveldetail', 'travel_plans', 'edit',
                                'tryouts', 'tryoutdetail', 'tryout_registrations',
                                'uniform_kits', 'uniformkitdetail',
                                'uniforms', 'uniform_kit_items', 'uniform_submissions',
                                'uniform_submission_items', 'huddles', 'huddle_reports',
                                'dashboard', 'reports_builder', 'reports_overview',
                                'reports_saved', 'reports_exports', 'reports_schedules',
                                'reports_viewer', 'reports_ticketing', 'reports_registration',
                                'reports_video', 'reports_events', 'huddle_reports',
                                'photos_create', 'photos_detail', 'photos_gallery',
                                'photos_gallery_manage', 'photos_list', 'photos_photo',
                                'ticketing', 'facilities_list', 'facilities_detail',
                                'facilities_schedule', 'stripe_integration',
                                'registration_forms', 'invitations') THEN true
        ELSE false
    END AS role_coach,
    CASE 
        WHEN fe.feature_key IN ('photos_create', 'photos_detail', 'photos_gallery',
                                'photos_list', 'photos_photo', 'athletephoto') THEN true
        ELSE false
    END AS role_parent
FROM public.license_tiers lt
CROSS JOIN public.feature_entitlements fe
WHERE lt.tier_key IN ('tier2', 'tier3')
  AND fe.feature_key IN (
    -- Tier 2 Growth Features (not in Tier 1)
    'event_change_history',
    'leveldetail',
    'bysport',
    'paymentcancel',
    'uniformkitdetail',
    'uniform_kits',
    -- Note: uniform_orders is assigned in Tier 1, so already available to Tier 2+
    'installment_plans',
    'installment_schedules',
    'organization_sport_customizations',
    'waivers',
    'travel', 'traveldetail', 'travel_plans', 'edit',
    'huddle_audit_log',
    'notification_jobs',
    'trialexpired',
    'checkoutcancel',
    'checkout_sessions',
    'guardian',
    'discount_redemptions',
    'discount_codes',
    'tryouts', 'tryoutdetail',
    'tryout_registration_staff_notes',
    'tryout_scores',
    'tryout_registrations',
    'tryout_registration_documents',
    'tryout_required_documents',
    'huddles',
    'venueinsights',
    'venue_nearby_places',
    'venue_nearby_amenities_summaries',
    'venue_insights',
    'billing_events',
    'refunds',
    'checkout_session_items',
    'admin_fees_status',
    'uniform_submission_items',
    'offline_payments',
    'stream_channel_metadata',
    'programdetail',
    'organization_registration_settings',
    'organization_defaults',
    'payment_events',
    'huddle_notification_preferences',
    'organization_visibility_settings',
    'event_logs',
    'installments',
    'messages_archive',
    'org_licenses',
    'organization_advanced_settings',
    'uniforms',
    'uniform_kit_items',
    'scholarship_awards',
    'uniform_kits',
    'uniform_submissions',
    'offline_payment_allocations',
    'sportdetail',
    'scholarship_programs',
    'update',
    'huddle_reports',
    'nearbyamenities',
    'charges',
    'stream_channels',
    -- Created features for Tier 2
    'ticketing',
    'reports_builder', 'reports_overview', 'reports_saved', 'reports_exports',
    'reports_schedules', 'reports_viewer', 'reports_ticketing', 'reports_registration',
    'reports_video', 'reports_events',
    'photos_create', 'photos_detail', 'photos_gallery', 'photos_gallery_manage',
    'photos_list', 'photos_photo',
    'facilities_list', 'facilities_detail', 'facilities_schedule',
    'stripe_integration',
    'registration_forms',
    'invitations',
    'dashboard'
  )
  AND fe.platform_admin_only = false
  AND fe.archived_at IS NULL
  AND fe.feature_type != 'limit'
ON CONFLICT (license_tier_id, feature_entitlement_id) 
DO UPDATE SET
    included = EXCLUDED.included,
    limit_value = EXCLUDED.limit_value,
    role_admin = EXCLUDED.role_admin,
    role_coach = EXCLUDED.role_coach,
    role_parent = EXCLUDED.role_parent,
    updated_at = now();

-- ============================================================================
-- STEP 6: Assign Tier 3 (Professional) Only Features to tier3
-- ============================================================================

-- Tier 3 features are Professional/Enterprise features (Tier 3 only)
-- These are advanced analytics, audit logging, compliance, API access, etc.

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
    true AS role_admin,  -- Professional features are admin-focused
    false AS role_coach,  -- Coaches typically don't need enterprise features
    false AS role_parent
FROM public.license_tiers lt
CROSS JOIN public.feature_entitlements fe
WHERE lt.tier_key = 'tier3'
  AND fe.feature_key IN (
    -- Tier 3 Professional Features (not in Tier 1 or Tier 2)
    -- Note: Most advanced features are already in Tier 2
    -- Tier 3 adds: multi_role_support, advanced analytics, audit logging
    'multi_role_support'
    -- Additional Tier 3 features can be added here as they are created
  )
  AND fe.platform_admin_only = false
  AND fe.archived_at IS NULL
  AND fe.feature_type != 'limit'
ON CONFLICT (license_tier_id, feature_entitlement_id) 
DO UPDATE SET
    included = EXCLUDED.included,
    limit_value = EXCLUDED.limit_value,
    role_admin = EXCLUDED.role_admin,
    role_coach = EXCLUDED.role_coach,
    role_parent = EXCLUDED.role_parent,
    updated_at = now();

-- ============================================================================
-- STEP 7: Assign Limit Features with limit_value
-- ============================================================================

-- Assign limit-type features to tiers with appropriate limit_value set
-- NULL limit_value means unlimited

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
    CASE 
        -- Tier 1 limits
        WHEN lt.tier_key = 'tier1' AND fe.feature_key = 'max_teams' THEN 5
        WHEN lt.tier_key = 'tier1' AND fe.feature_key = 'max_athletes' THEN 100
        WHEN lt.tier_key = 'tier1' AND fe.feature_key = 'max_players_per_team' THEN 25
        WHEN lt.tier_key = 'tier1' AND fe.feature_key = 'photo_storage_gb' THEN 5
        WHEN lt.tier_key = 'tier1' AND fe.feature_key = 'max_sub_orgs' THEN 0
        
        -- Tier 2 limits
        WHEN lt.tier_key = 'tier2' AND fe.feature_key = 'max_teams' THEN 25
        WHEN lt.tier_key = 'tier2' AND fe.feature_key = 'max_athletes' THEN 500
        WHEN lt.tier_key = 'tier2' AND fe.feature_key = 'max_players_per_team' THEN 50
        WHEN lt.tier_key = 'tier2' AND fe.feature_key = 'photo_storage_gb' THEN 50
        WHEN lt.tier_key = 'tier2' AND fe.feature_key = 'max_sub_orgs' THEN 5
        
        -- Tier 3 limits (NULL = unlimited for most)
        WHEN lt.tier_key = 'tier3' AND fe.feature_key = 'max_teams' THEN NULL
        WHEN lt.tier_key = 'tier3' AND fe.feature_key = 'max_athletes' THEN NULL
        WHEN lt.tier_key = 'tier3' AND fe.feature_key = 'max_players_per_team' THEN NULL
        WHEN lt.tier_key = 'tier3' AND fe.feature_key = 'photo_storage_gb' THEN 500
        WHEN lt.tier_key = 'tier3' AND fe.feature_key = 'max_sub_orgs' THEN NULL
        
        ELSE NULL
    END AS limit_value,
    true AS role_admin,   -- Limits are admin-controlled
    false AS role_coach,  -- Coaches don't control limits
    false AS role_parent -- Parents don't control limits
FROM public.license_tiers lt
CROSS JOIN public.feature_entitlements fe
WHERE lt.tier_key IN ('tier1', 'tier2', 'tier3')
  AND fe.feature_type = 'limit'
  AND fe.feature_key IN ('max_teams', 'max_athletes', 'max_players_per_team', 'photo_storage_gb', 'max_sub_orgs')
  AND fe.platform_admin_only = false
  AND fe.archived_at IS NULL
ON CONFLICT (license_tier_id, feature_entitlement_id) 
DO UPDATE SET
    included = EXCLUDED.included,
    limit_value = EXCLUDED.limit_value,
    role_admin = EXCLUDED.role_admin,
    role_coach = EXCLUDED.role_coach,
    role_parent = EXCLUDED.role_parent,
    updated_at = now();

-- ============================================================================
-- STEP 8: Exclude Platform Admin Features from Customer Tiers
-- ============================================================================

-- Ensure platform admin features are NOT assigned to customer tiers
-- This runs AFTER all assignments to clean up any platform admin features that were accidentally included

DELETE FROM public.tier_feature_assignments tfa
USING public.feature_entitlements fe
WHERE tfa.feature_entitlement_id = fe.id
  AND (
    fe.platform_admin_only = true
    OR fe.feature_key LIKE 'admin_%'
    OR fe.feature_key IN (
        'features', 'featuredetail', 'overrides', 'overridecreate', 'overridedetail',
        'tiers', 'license_tiers', 'tierdetail', 'tier_feature_assignments',
        'structure', 'admin_structure', 'feature_entitlements',
        'admin_license_tiers_list', 'admin_license_metrics',
        'overview', 'billing',
        'featurebulkoperations', 'feature_discovery_hints', 'feature_discovery_cache',
        'feature_discovery_corrections', 'feature_flags', 'featureflags',
        'feature_flag_user_overrides', 'feature_flag_platform_defaults',
        'feature_flag_org_overrides', 'feature_flag_audit_log',
        'feature_integrations', 'feature_integration_assignments',
        'feature_dependency_cycles', 'admin_feature_flags',
        'admin_feature_entitlements_list', 'platform_admins', 'platformadmins',
        'admins', 'admin_users', 'list', 'detail', 'create', 'roleselection',
        'admin_organizations', 'admin_platform_health', 'admin_audit_log',
        'admin_event_logs', 'audit', 'audit_logs_old', 'entitlement_overrides',
        'admin_entitlement_overrides_list', 'migration_errors', 'discovery_errors',
        'rls_validation_results', 'rls_policy_backup', 'index_backup',
        'emailpreview', 'queryhelpers', 'index', 'responsehelpers',
        'event_logs_archive', 'policy_consolidation_log'
    )
    OR fe.description LIKE 'Database table: admin_%'
    OR fe.description LIKE 'Service Module: admin%'
    OR fe.description LIKE 'Service Module: platformAdmins%'
  )
  AND tfa.license_tier_id IN (
    SELECT id FROM public.license_tiers WHERE tier_key IN ('tier1', 'tier2', 'tier3')
  );

-- ============================================================================
-- STEP 9: Validation Queries
-- ============================================================================

-- Validate tier existence and names
DO $$
DECLARE
    v_tier1_name TEXT;
    v_tier2_name TEXT;
    v_tier3_name TEXT;
BEGIN
    SELECT tier_name INTO v_tier1_name FROM public.license_tiers WHERE tier_key = 'tier1';
    SELECT tier_name INTO v_tier2_name FROM public.license_tiers WHERE tier_key = 'tier2';
    SELECT tier_name INTO v_tier3_name FROM public.license_tiers WHERE tier_key = 'tier3';
    
    IF v_tier1_name != 'Starter' THEN
        RAISE EXCEPTION 'Tier 1 name mismatch: expected Starter, found %', v_tier1_name;
    END IF;
    
    IF v_tier2_name != 'Growth' THEN
        RAISE EXCEPTION 'Tier 2 name mismatch: expected Growth, found %', v_tier2_name;
    END IF;
    
    IF v_tier3_name != 'Professional' THEN
        RAISE EXCEPTION 'Tier 3 name mismatch: expected Professional, found %', v_tier3_name;
    END IF;
END $$;

-- Validate feature assignment counts per tier
DO $$
DECLARE
    v_tier1_count INTEGER;
    v_tier2_count INTEGER;
    v_tier3_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tier1_count
    FROM public.tier_feature_assignments tfa
    JOIN public.license_tiers lt ON tfa.license_tier_id = lt.id
    WHERE lt.tier_key = 'tier1' AND tfa.included = true;
    
    SELECT COUNT(*) INTO v_tier2_count
    FROM public.tier_feature_assignments tfa
    JOIN public.license_tiers lt ON tfa.license_tier_id = lt.id
    WHERE lt.tier_key = 'tier2' AND tfa.included = true;
    
    SELECT COUNT(*) INTO v_tier3_count
    FROM public.tier_feature_assignments tfa
    JOIN public.license_tiers lt ON tfa.license_tier_id = lt.id
    WHERE lt.tier_key = 'tier3' AND tfa.included = true;
    
    -- Tier 1 should have ~40-50 features
    IF v_tier1_count < 30 THEN
        RAISE WARNING 'Tier 1 has only % feature assignments (expected ~40-50)', v_tier1_count;
    END IF;
    
    -- Tier 2 should have Tier 1 + ~30-40 additional features (~70-90 total)
    IF v_tier2_count < v_tier1_count THEN
        RAISE EXCEPTION 'Tier 2 has fewer features (%) than Tier 1 (%)', v_tier2_count, v_tier1_count;
    END IF;
    
    -- Tier 3 should have Tier 2 + additional features
    IF v_tier3_count < v_tier2_count THEN
        RAISE EXCEPTION 'Tier 3 has fewer features (%) than Tier 2 (%)', v_tier3_count, v_tier2_count;
    END IF;
    
    RAISE NOTICE 'Feature assignment counts: Tier 1: %, Tier 2: %, Tier 3: %', 
        v_tier1_count, v_tier2_count, v_tier3_count;
END $$;

-- Validate limit assignments
DO $$
DECLARE
    v_limit_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_limit_count
    FROM public.tier_feature_assignments tfa
    JOIN public.feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
    JOIN public.license_tiers lt ON tfa.license_tier_id = lt.id
    WHERE lt.tier_key IN ('tier1', 'tier2', 'tier3')
      AND fe.feature_type = 'limit'
      AND fe.feature_key IN ('max_teams', 'max_athletes', 'max_players_per_team', 'photo_storage_gb', 'max_sub_orgs')
      AND tfa.included = true;
    
    -- Should have 5 limit features × 3 tiers = 15 limit assignments
    IF v_limit_count < 15 THEN
        RAISE WARNING 'Expected 15 limit assignments (5 limits × 3 tiers), found %', v_limit_count;
    END IF;
END $$;

-- Validate platform admin features are excluded
DO $$
DECLARE
    v_platform_admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_platform_admin_count
    FROM public.tier_feature_assignments tfa
    JOIN public.feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
    JOIN public.license_tiers lt ON tfa.license_tier_id = lt.id
    WHERE lt.tier_key IN ('tier1', 'tier2', 'tier3')
      AND (
        fe.platform_admin_only = true
        OR fe.feature_key LIKE 'admin_%'
      )
      AND tfa.included = true;
    
    IF v_platform_admin_count > 0 THEN
        RAISE WARNING 'Found % platform admin features assigned to customer tiers (should be 0)', v_platform_admin_count;
    END IF;
END $$;

-- Validate limit values are set correctly
DO $$
DECLARE
    v_tier1_teams INTEGER;
    v_tier1_athletes INTEGER;
    v_tier2_teams INTEGER;
    v_tier2_athletes INTEGER;
    v_tier3_storage INTEGER;
BEGIN
    SELECT tfa.limit_value INTO v_tier1_teams
    FROM public.tier_feature_assignments tfa
    JOIN public.feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
    JOIN public.license_tiers lt ON tfa.license_tier_id = lt.id
    WHERE lt.tier_key = 'tier1' AND fe.feature_key = 'max_teams';
    
    SELECT tfa.limit_value INTO v_tier1_athletes
    FROM public.tier_feature_assignments tfa
    JOIN public.feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
    JOIN public.license_tiers lt ON tfa.license_tier_id = lt.id
    WHERE lt.tier_key = 'tier1' AND fe.feature_key = 'max_athletes';
    
    SELECT tfa.limit_value INTO v_tier2_teams
    FROM public.tier_feature_assignments tfa
    JOIN public.feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
    JOIN public.license_tiers lt ON tfa.license_tier_id = lt.id
    WHERE lt.tier_key = 'tier2' AND fe.feature_key = 'max_teams';
    
    SELECT tfa.limit_value INTO v_tier2_athletes
    FROM public.tier_feature_assignments tfa
    JOIN public.feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
    JOIN public.license_tiers lt ON tfa.license_tier_id = lt.id
    WHERE lt.tier_key = 'tier2' AND fe.feature_key = 'max_athletes';
    
    SELECT tfa.limit_value INTO v_tier3_storage
    FROM public.tier_feature_assignments tfa
    JOIN public.feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
    JOIN public.license_tiers lt ON tfa.license_tier_id = lt.id
    WHERE lt.tier_key = 'tier3' AND fe.feature_key = 'photo_storage_gb';
    
    IF v_tier1_teams != 5 THEN
        RAISE WARNING 'Tier 1 max_teams limit is % (expected 5)', v_tier1_teams;
    END IF;
    
    IF v_tier1_athletes != 100 THEN
        RAISE WARNING 'Tier 1 max_athletes limit is % (expected 100)', v_tier1_athletes;
    END IF;
    
    IF v_tier2_teams != 25 THEN
        RAISE WARNING 'Tier 2 max_teams limit is % (expected 25)', v_tier2_teams;
    END IF;
    
    IF v_tier2_athletes != 500 THEN
        RAISE WARNING 'Tier 2 max_athletes limit is % (expected 500)', v_tier2_athletes;
    END IF;
    
    IF v_tier3_storage != 500 THEN
        RAISE WARNING 'Tier 3 photo_storage_gb limit is % (expected 500)', v_tier3_storage;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary:
-- - Updated tier1 (Starter) and tier2 (Growth) with names and Stripe price IDs
-- - Created tier3 (Professional) with Stripe price ID
-- - Created ~30+ missing feature entitlements (facilities, ticketing, reports, photos, etc.)
-- - Created 5 limit-type features (max_teams, max_athletes, max_players_per_team, photo_storage_gb, max_sub_orgs)
-- - Assigned Tier 1 features to all three tiers (inheritance)
-- - Assigned Tier 2-only features to tier2 and tier3
-- - Assigned Tier 3-only features to tier3
-- - Assigned limit features with limit_value per tier
-- - Excluded platform admin features from customer tiers
-- - Validated tier names, feature counts, limit values, and platform admin exclusion
--
-- Next Steps:
-- 1. Verify tier assignments in database
-- 2. Update application logic to check tier limits from tier_feature_assignments
-- 3. Implement ticket fee logic based on tier (not stored as limit feature)
-- 4. Test feature gating for each tier
-- 5. Update UI to show tier-appropriate features
--
-- Note: Ticket fees are NOT stored as limit features. They are calculated in
-- billing/checkout logic based on tier:
-- - Tier 1: 0% ticket fee
-- - Tier 2: 2.5% ticket fee
-- - Tier 3: 0% ticket fee
