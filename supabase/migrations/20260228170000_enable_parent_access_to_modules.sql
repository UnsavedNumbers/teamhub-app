-- ============================================================================
-- Enable Parent/Guardian Access to Modules
-- ============================================================================
-- Updates tier_feature_assignments to enable role_parent=true for features
-- that guardians should be able to access (travel, calendar, uniforms, etc.)
-- This fixes the issue where org admins could access modules but guardians
-- who have athletes in the organization could not.
-- ============================================================================

-- Update tier_feature_assignments to enable parent access for appropriate features
UPDATE tier_feature_assignments tfa
SET role_parent = true,
    updated_at = NOW()
FROM feature_entitlements fe
WHERE tfa.feature_entitlement_id = fe.id
  AND tfa.included = true
  AND fe.feature_key IN (
    -- Travel features
    'travel',
    'travel_planning',
    'travel_details',
    'travel_notifications',
    
    -- Tryouts features
    'tryouts',
    
    -- Event and calendar features
    'event_scheduling',
    'event_rsvp',
    
    -- Uniform features
    'uniform_orders',
    
    -- Messaging features (already enabled but included for completeness)
    'messaging',
    'announcements',
    
    -- Payment features (guardians need to see what they owe)
    'payment_processing',
    'fee_management',
    
    -- Roster management (guardians need to see rosters)
    'roster_management',
    'team_management',
    
    -- Calendar and attendance (guardians need to see schedules)
    'attendance_tracking',
    'calendar_view',
    
    -- Reports (guardians should see their athlete's reports)
    'basic_reports'
  );

-- Log the update
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % tier_feature_assignments to enable parent access', v_updated_count;
END $$;
