-- Seed notification_types table with all NotificationActions from TypeScript
-- Maps each action to a notification type with eligible roles, defaults, and categories

-- Helper function to determine if an action supports email (based on notificationJobMapper)
-- Actions that map to a notification_job_type support email
CREATE OR REPLACE FUNCTION notification_action_supports_email(action_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN action_key IN (
    -- Events
    'event_created', 'event_updated', 'event_rescheduled', 'event_canceled',
    'event_rsvp_required', 'event_weather_alert',
    -- Travel
    'travel_created', 'travel_updated', 'travel_canceled', 'travel_dates_changed',
    'travel_location_changed', 'travel_lodging_added', 'travel_transport_added',
    -- Payments
    'fee_assigned', 'fee_overdue', 'fee_payment_completed', 'fee_payment_failed',
    -- Athletes
    'athlete_added_to_team', 'athlete_removed_from_team', 'guardian_attached',
    -- Announcements
    'announcement_created', 'announcement_urgent',
    -- Messages
    'message_sent', 'user_mentioned', 'message_pinned',
    -- Invites
    'invite_sent', 'invite_accepted'
  );
END;
$$ LANGUAGE plpgsql;

-- Insert all notification types
INSERT INTO public.notification_types (key, display_name, description, eligible_roles, supports_email, category, default_in_app_enabled, default_email_enabled) VALUES
-- Calendar & Events
('event_created', 'Event Created', 'Notification when a new event is created', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Scheduling', true, true),
('event_updated', 'Event Updated', 'Notification when an event is updated', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Scheduling', true, true),
('event_rescheduled', 'Event Rescheduled', 'Notification when an event is rescheduled', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Scheduling', true, true),
('event_canceled', 'Event Canceled', 'Notification when an event is canceled', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Scheduling', true, true),
('event_location_updated', 'Event Location Updated', 'Notification when an event location changes', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], false, 'Scheduling', true, true),
('event_time_changed', 'Event Time Changed', 'Notification when an event time changes', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], false, 'Scheduling', true, true),
('event_rsvp_required', 'RSVP Required', 'Notification when RSVP is required for an event', ARRAY['guardian', 'org_admin', 'athlete'], true, 'Scheduling', true, true),
('event_rsvp_updated', 'RSVP Updated', 'Notification when an RSVP status is updated', ARRAY['coach', 'org_admin', 'team_manager'], false, 'Scheduling', true, false),
('event_attendance_updated', 'Attendance Updated', 'Notification when attendance is marked', ARRAY['coach', 'org_admin', 'team_manager'], false, 'Attendance', true, false),
('event_weather_alert', 'Weather Alert', 'Notification for weather-related event alerts', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Scheduling', true, true),

-- Travel
('travel_created', 'Travel Created', 'Notification when a travel plan is created', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Scheduling', true, true),
('travel_updated', 'Travel Updated', 'Notification when a travel plan is updated', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Scheduling', true, true),
('travel_canceled', 'Travel Canceled', 'Notification when a travel plan is canceled', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Scheduling', true, true),
('travel_dates_changed', 'Travel Dates Changed', 'Notification when travel dates change', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Scheduling', true, true),
('travel_location_changed', 'Travel Location Changed', 'Notification when travel location changes', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Scheduling', true, true),
('travel_lodging_added', 'Travel Lodging Added', 'Notification when lodging is added to travel plan', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Scheduling', true, true),
('travel_transport_added', 'Travel Transport Added', 'Notification when transportation is added', ARRAY['coach', 'org_admin', 'team_manager', 'staff'], true, 'Scheduling', true, true),
('travel_overlap_detected', 'Travel Overlap Detected', 'Notification when travel plan overlaps are detected', ARRAY['coach', 'org_admin', 'team_manager', 'staff'], false, 'Scheduling', true, false),

-- Payments & Billing
('fee_created', 'Fee Created', 'Notification when a fee is created', ARRAY['org_admin'], false, 'Billing', true, false),
('fee_assigned', 'Fee Assigned', 'Notification when a fee is assigned to you', ARRAY['guardian', 'org_admin'], true, 'Billing', true, true),
('fee_updated', 'Fee Updated', 'Notification when a fee is updated', ARRAY['org_admin'], false, 'Billing', true, false),
('fee_removed', 'Fee Removed', 'Notification when a fee is removed', ARRAY['org_admin'], false, 'Billing', true, false),
('fee_payment_partial', 'Partial Payment Received', 'Notification when a partial payment is received', ARRAY['guardian', 'org_admin'], false, 'Billing', true, false),
('fee_payment_completed', 'Payment Completed', 'Notification when a fee payment is completed', ARRAY['guardian', 'org_admin'], true, 'Billing', true, true),
('fee_payment_failed', 'Payment Failed', 'Notification when a payment fails', ARRAY['org_admin'], true, 'Billing', true, true),
('fee_overdue', 'Fee Overdue', 'Notification when a fee becomes overdue', ARRAY['guardian', 'org_admin'], true, 'Billing', true, true),
('payout_account_connected', 'Payout Account Connected', 'Notification when payout account is connected', ARRAY['org_admin'], false, 'Billing', true, false),
('payout_account_issue', 'Payout Account Issue', 'Notification when there is an issue with payout account', ARRAY['org_admin'], false, 'Billing', true, false),
('payout_processed', 'Payout Processed', 'Notification when a payout is processed', ARRAY['org_admin'], false, 'Billing', true, false),

-- Athletes & Guardians
('athlete_created', 'Athlete Created', 'Notification when an athlete is created', ARRAY['org_admin'], false, 'Athlete Management', true, false),
('athlete_updated', 'Athlete Updated', 'Notification when an athlete profile is updated', ARRAY['org_admin'], false, 'Athlete Management', true, false),
('athlete_removed', 'Athlete Removed', 'Notification when an athlete is removed', ARRAY['org_admin'], false, 'Athlete Management', true, false),
('athlete_added_to_team', 'Athlete Added to Team', 'Notification when an athlete is added to a team', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'], true, 'Athlete Management', true, true),
('athlete_removed_from_team', 'Athlete Removed from Team', 'Notification when an athlete is removed from a team', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'], true, 'Athlete Management', true, true),
('guardian_attached', 'Guardian Attached', 'Notification when a guardian is attached to an athlete', ARRAY['guardian', 'org_admin'], true, 'Athlete Management', true, true),
('guardian_detached', 'Guardian Detached', 'Notification when a guardian is detached from an athlete', ARRAY['guardian', 'org_admin'], false, 'Athlete Management', true, false),

-- Teams, Programs, Levels
('team_created', 'Team Created', 'Notification when a team is created', ARRAY['org_admin'], false, 'Team Management', true, false),
('team_updated', 'Team Updated', 'Notification when a team is updated', ARRAY['org_admin'], false, 'Team Management', true, false),
('team_archived', 'Team Archived', 'Notification when a team is archived', ARRAY['org_admin'], false, 'Team Management', true, false),
('program_created', 'Program Created', 'Notification when a program is created', ARRAY['org_admin'], false, 'Team Management', true, false),
('program_updated', 'Program Updated', 'Notification when a program is updated', ARRAY['org_admin'], false, 'Team Management', true, false),
('program_removed', 'Program Removed', 'Notification when a program is removed', ARRAY['org_admin'], false, 'Team Management', true, false),
('level_created', 'Level Created', 'Notification when a level is created', ARRAY['org_admin'], false, 'Team Management', true, false),
('level_updated', 'Level Updated', 'Notification when a level is updated', ARRAY['org_admin'], false, 'Team Management', true, false),
('level_removed', 'Level Removed', 'Notification when a level is removed', ARRAY['org_admin'], false, 'Team Management', true, false),

-- Uniforms
('uniform_size_requested', 'Uniform Size Requested', 'Notification when uniform size is requested', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'], false, 'Uniforms', true, false),
('uniform_size_submitted', 'Uniform Size Submitted', 'Notification when uniform size is submitted', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'], false, 'Uniforms', true, false),
('uniform_order_opened', 'Uniform Order Opened', 'Notification when uniform order opens', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'], false, 'Uniforms', true, false),
('uniform_order_updated', 'Uniform Order Updated', 'Notification when uniform order is updated', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'], false, 'Uniforms', true, false),
('uniform_order_closed', 'Uniform Order Closed', 'Notification when uniform order closes', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'], false, 'Uniforms', true, false),
('uniform_missing_info', 'Uniform Missing Info', 'Notification when uniform order is missing information', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'], false, 'Uniforms', true, false),

-- Announcements
('announcement_created', 'Announcement Published', 'Notification when an announcement is published', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Communications', true, true),
('announcement_updated', 'Announcement Updated', 'Notification when an announcement is updated', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], false, 'Communications', true, false),
('announcement_deleted', 'Announcement Deleted', 'Notification when an announcement is deleted', ARRAY['org_admin'], false, 'Communications', true, false),
('announcement_urgent', 'Urgent Announcement', 'Notification for urgent announcements', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Communications', true, true),

-- Messaging
('huddle_created', 'Huddle Created', 'Notification when a huddle (group chat) is created', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], false, 'Communications', true, false),
('message_sent', 'Message Received', 'Notification when a message is sent to you', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Communications', true, true),
('message_edited', 'Message Edited', 'Notification when a message is edited', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], false, 'Communications', true, false),
('message_deleted', 'Message Deleted', 'Notification when a message is deleted', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], false, 'Communications', true, false),
('message_pinned', 'Message Pinned', 'Notification when a message is pinned', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Communications', true, true),
('message_reported', 'Message Reported', 'Notification when a message is reported', ARRAY['org_admin', 'platform_admin'], false, 'Communications', true, false),
('user_mentioned', 'User Mentioned', 'Notification when you are mentioned in a message', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Communications', true, true),

-- Invitations & Access
('role_assigned', 'Role Assigned', 'Notification when a role is assigned', ARRAY['org_admin'], false, 'Invites/Onboarding', true, false),
('role_removed', 'Role Removed', 'Notification when a role is removed', ARRAY['org_admin'], false, 'Invites/Onboarding', true, false),
('access_revoked', 'Access Revoked', 'Notification when access is revoked', ARRAY['org_admin'], false, 'Invites/Onboarding', true, false),
('invite_sent', 'Invite Sent', 'Notification when an invite is sent', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Invites/Onboarding', true, true),
('invite_accepted', 'Invite Accepted', 'Notification when an invite is accepted', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], true, 'Invites/Onboarding', true, true),
('invite_expired', 'Invite Expired', 'Notification when an invite expires', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'], false, 'Invites/Onboarding', true, false),

-- System & Platform
('license_activated', 'License Activated', 'Notification when a license is activated', ARRAY['org_admin', 'platform_admin'], false, 'System', true, false),
('license_expiring', 'License Expiring', 'Notification when a license is expiring soon', ARRAY['org_admin', 'platform_admin'], false, 'System', true, false),
('license_expired', 'License Expired', 'Notification when a license expires', ARRAY['org_admin', 'platform_admin'], false, 'System', true, false),
('license_upgraded', 'License Upgraded', 'Notification when a license is upgraded', ARRAY['org_admin', 'platform_admin'], false, 'System', true, false),
('feature_enabled', 'Feature Enabled', 'Notification when a feature is enabled', ARRAY['org_admin', 'platform_admin'], false, 'System', true, false),
('feature_disabled', 'Feature Disabled', 'Notification when a feature is disabled', ARRAY['org_admin', 'platform_admin'], false, 'System', true, false),
('system_generated_notice', 'System Notice', 'General system-generated notification', ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff', 'platform_admin'], false, 'System', true, false)
ON CONFLICT (key) DO NOTHING;

-- Drop helper function
DROP FUNCTION IF EXISTS notification_action_supports_email(TEXT);

COMMENT ON TABLE public.notification_types IS 'Seeded with all NotificationActions from TypeScript. Each type defines eligible roles, default preferences, and whether email delivery is supported.';
