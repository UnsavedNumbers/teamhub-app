-- ============================================================================
-- CREATE PARENT/CHILD FEATURE HIERARCHY
-- ============================================================================
-- This migration creates parent features and child features with their
-- parent_feature_key relationships for the feature gate inheritance system.
--
-- Parent features: Logical groupings (e.g., 'reporting', 'facilities')
-- Child features: Specific features that inherit from parents (e.g., 'reports_overview')
--
-- After applying, run: npm run generate:feature-keys
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Parent Features
-- ============================================================================

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
    is_removable,
    parent_feature_key
)
VALUES
    -- Event Scheduling Parent
    ('event_scheduling', 'Event Scheduling', 'Operations', 'module', 'Calendar, events, and attendance management', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Reporting Parent
    ('reporting', 'Reporting', 'Analytics', 'module', 'Organization analytics and reporting', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Facilities Parent
    ('facilities', 'Facilities', 'Operations', 'module', 'Facilities list, detail, and schedule management', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Photos Parent
    ('photos', 'Photos', 'Content', 'module', 'Photo galleries and management', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Roster Management Parent
    ('roster_management', 'Roster Management', 'Operations', 'module', 'Athletes, guardians, and roster operations', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Payment Processing Parent (already exists, but ensure it's a parent)
    ('payment_processing', 'Payment Processing', 'Commerce', 'module', 'Payments and fees', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Travel Planning Parent
    ('travel_planning', 'Travel Planning', 'Operations', 'module', 'Travel plans and details', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Tryouts Parent
    ('tryouts', 'Tryouts', 'Operations', 'module', 'Tryout management', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Uniform Orders Parent (already exists, but ensure it's a parent)
    ('uniform_orders', 'Uniform Orders', 'Commerce', 'module', 'Uniform management', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Ticketing Parent (already exists, but ensure it's a parent)
    ('ticketing', 'Ticketing', 'Commerce', 'module', 'Ticketing events, orders, and scanner', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Announcements Parent (already exists, but ensure it's a parent)
    ('announcements', 'Announcements', 'Communication', 'module', 'Announcements and messaging', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Messaging Parent (already exists, but ensure it's a parent)
    ('messaging', 'Messaging', 'Communication', 'module', 'Huddles, chat, and notifications', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Fee Management Parent (already exists, but ensure it's a parent)
    ('fee_management', 'Fee Management', 'Commerce', 'module', 'Fee creation and assignment', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Team Management Parent (already exists, but ensure it's a parent)
    ('team_management', 'Team Management', 'Operations', 'module', 'Sports, programs, levels, teams, seasons', 'live', 'overlay', false, false, true, true, NULL),
    
    -- Invitations Parent
    ('invitations', 'Invitations', 'Operations', 'module', 'Invitation management', 'live', 'overlay', false, false, true, true, NULL)
ON CONFLICT (feature_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    category = EXCLUDED.category,
    feature_type = EXCLUDED.feature_type,
    description = EXCLUDED.description,
    rollout_status = EXCLUDED.rollout_status,
    unavailable_gate_action = EXCLUDED.unavailable_gate_action,
    parent_feature_key = NULL, -- Ensure parents have no parent
    updated_at = now();

-- ============================================================================
-- STEP 2: Create Report Child Features
-- ============================================================================

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
    is_removable,
    parent_feature_key
)
VALUES
    ('reports_overview', 'Reports Overview', 'Analytics', 'module', 'Organization analytics and reporting overview', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_builder', 'Report Builder', 'Analytics', 'module', 'Build custom reports', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_saved', 'Saved Reports', 'Analytics', 'module', 'View and manage saved reports', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_exports', 'Export History', 'Analytics', 'module', 'View export history', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_schedules', 'Scheduled Reports', 'Analytics', 'module', 'Manage scheduled reports', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_viewer', 'Report Viewer', 'Analytics', 'module', 'View report', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_ticketing', 'Ticketing & Gate Report', 'Analytics', 'module', 'Ticketing and gate analytics', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_registration', 'Registration Report', 'Analytics', 'module', 'Registration analytics', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_video', 'Video Report', 'Analytics', 'module', 'Video analytics', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_events', 'Events & Attendance Report', 'Analytics', 'module', 'Events and attendance analytics', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_errors', 'Errors Report', 'Analytics', 'module', 'System errors and issues', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_domain_participation', 'Participation Report', 'Analytics', 'module', 'Athlete participation analytics', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_domain_payments', 'Revenue & Payments Report', 'Analytics', 'module', 'Revenue and payment analytics', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_domain_scheduling', 'Scheduling Report', 'Analytics', 'module', 'Scheduling analytics', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_domain_travel', 'Travel Report', 'Analytics', 'module', 'Travel analytics', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_domain_uniforms', 'Uniforms Report', 'Analytics', 'module', 'Uniform analytics', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_domain_communications', 'Communications Report', 'Analytics', 'module', 'Communication analytics', 'live', 'overlay', false, false, true, true, 'reporting'),
    ('reports_domain_operations', 'Operations Report', 'Analytics', 'module', 'Operations analytics', 'live', 'overlay', false, false, true, true, 'reporting')
ON CONFLICT (feature_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    category = EXCLUDED.category,
    feature_type = EXCLUDED.feature_type,
    description = EXCLUDED.description,
    rollout_status = EXCLUDED.rollout_status,
    unavailable_gate_action = EXCLUDED.unavailable_gate_action,
    parent_feature_key = EXCLUDED.parent_feature_key,
    updated_at = now();

-- ============================================================================
-- STEP 3: Create Facilities Child Features
-- ============================================================================

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
    is_removable,
    parent_feature_key
)
VALUES
    ('facilities_list', 'Facilities List', 'Operations', 'module', 'Manage fields, courts, gyms, and availability', 'live', 'overlay', false, false, true, true, 'facilities'),
    ('facilities_detail', 'Facility Details', 'Operations', 'module', 'View facility details', 'live', 'overlay', false, false, true, true, 'facilities'),
    ('facilities_schedule', 'Facility Schedule', 'Operations', 'module', 'Facility scheduling calendar', 'live', 'overlay', false, false, true, true, 'facilities')
ON CONFLICT (feature_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    category = EXCLUDED.category,
    feature_type = EXCLUDED.feature_type,
    description = EXCLUDED.description,
    rollout_status = EXCLUDED.rollout_status,
    unavailable_gate_action = EXCLUDED.unavailable_gate_action,
    parent_feature_key = EXCLUDED.parent_feature_key,
    updated_at = now();

-- ============================================================================
-- STEP 4: Create Photos Child Features
-- ============================================================================

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
    is_removable,
    parent_feature_key
)
VALUES
    ('photos_list', 'Photos List', 'Content', 'module', 'Photo galleries', 'live', 'overlay', false, false, true, true, 'photos'),
    ('photos_create', 'Create Gallery', 'Content', 'module', 'Create new photo gallery', 'live', 'overlay', false, false, true, true, 'photos'),
    ('photos_detail', 'Gallery Detail', 'Content', 'module', 'View gallery details', 'live', 'overlay', false, false, true, true, 'photos'),
    ('photos_photo', 'Photo Detail', 'Content', 'module', 'View individual photo', 'live', 'overlay', false, false, true, true, 'photos'),
    ('photos_gallery', 'Photo Gallery', 'Content', 'module', 'View photo gallery', 'live', 'overlay', false, false, true, true, 'photos'),
    ('photos_gallery_manage', 'Manage Gallery', 'Content', 'module', 'Manage photo gallery', 'live', 'overlay', false, false, true, true, 'photos')
ON CONFLICT (feature_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    category = EXCLUDED.category,
    feature_type = EXCLUDED.feature_type,
    description = EXCLUDED.description,
    rollout_status = EXCLUDED.rollout_status,
    unavailable_gate_action = EXCLUDED.unavailable_gate_action,
    parent_feature_key = EXCLUDED.parent_feature_key,
    updated_at = now();

-- ============================================================================
-- STEP 5: Update Existing Features to Set Parent Relationships
-- ============================================================================
-- Update any existing features that should be children of parents

-- Travel details should be child of travel_planning
UPDATE feature_entitlements
SET parent_feature_key = 'travel_planning'
WHERE feature_key = 'travel_details'
  AND parent_feature_key IS NULL;

-- Ensure invitations feature exists and is a parent (not a child)
UPDATE feature_entitlements
SET parent_feature_key = NULL
WHERE feature_key = 'invitations'
  AND parent_feature_key IS NOT NULL;

-- ============================================================================
-- STEP 6: Validation
-- ============================================================================
-- Ensure all parent features exist before setting children
-- This will fail if a parent doesn't exist

DO $$
DECLARE
    missing_parent TEXT;
BEGIN
    -- Check for children with non-existent parents
    SELECT DISTINCT fe.parent_feature_key INTO missing_parent
    FROM feature_entitlements fe
    WHERE fe.parent_feature_key IS NOT NULL
      AND fe.archived_at IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM feature_entitlements parent
          WHERE parent.feature_key = fe.parent_feature_key
            AND parent.archived_at IS NULL
      )
    LIMIT 1;

    IF missing_parent IS NOT NULL THEN
        RAISE EXCEPTION 'Child feature references non-existent parent: %', missing_parent;
    END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- After applying this migration:
-- 1. Run: npm run generate:feature-keys
-- 2. Verify parent/child relationships in Platform Admin → Feature Catalog
-- 3. Assign parent features to license tiers (children will inherit)
-- 4. Optionally assign specific children to higher tiers for granular control
