-- ============================================================================
-- License Entitlements Seed Data
-- ============================================================================
-- This migration seeds initial license tiers and common features

-- Insert Basic and Power license tiers
INSERT INTO license_tiers (tier_key, tier_name, description, stripe_price_id, status) VALUES
('basic', 'Basic License', 'Essential features for youth sports organizations', 'price_basic_placeholder', 'active'),
('power', 'Power License', 'Advanced features including travel, tryouts, and analytics', 'price_power_placeholder', 'active')
ON CONFLICT (tier_key) DO NOTHING;

-- Insert common features
INSERT INTO feature_entitlements (feature_key, display_name, category, feature_type, description, rollout_status) VALUES
-- Scheduling & Calendar
('event_scheduling', 'Event Scheduling', 'Scheduling & Calendar', 'module', 'Create and manage events', 'live'),
('recurring_events', 'Recurring Events', 'Scheduling & Calendar', 'module', 'Create recurring event series', 'live'),
('event_rsvp', 'Event RSVP', 'Scheduling & Calendar', 'module', 'Allow attendees to RSVP to events', 'live'),
('calendar_sync', 'Calendar Sync', 'Scheduling & Calendar', 'integration', 'Sync events with external calendars', 'live'),

-- Teams & Rosters
('team_management', 'Team Management', 'Teams & Rosters', 'module', 'Create and manage teams', 'live'),
('roster_management', 'Roster Management', 'Teams & Rosters', 'module', 'Manage team rosters and player assignments', 'live'),
('max_teams', 'Maximum Teams', 'Teams & Rosters', 'limit', 'Maximum number of teams per organization', 'live'),
('max_players_per_team', 'Max Players Per Team', 'Teams & Rosters', 'limit', 'Maximum players allowed per team', 'live'),

-- Messaging & Communication
('messaging', 'Messaging', 'Messaging & Communication', 'module', 'Send messages to team members', 'live'),
('announcements', 'Announcements', 'Messaging & Communication', 'module', 'Post team announcements', 'live'),
('email_notifications', 'Email Notifications', 'Messaging & Communication', 'module', 'Send email notifications', 'live'),

-- Payments
('payment_processing', 'Payment Processing', 'Payments', 'module', 'Collect payments from families', 'live'),
('fee_management', 'Fee Management', 'Payments', 'module', 'Create and manage fees', 'live'),
('payment_reports', 'Payment Reports', 'Payments', 'module', 'View payment and fee reports', 'live'),

-- Registration & Forms
('registration_forms', 'Registration Forms', 'Registration & Forms', 'module', 'Create custom registration forms', 'live'),
('document_uploads', 'Document Uploads', 'Registration & Forms', 'module', 'Allow document uploads during registration', 'live'),

-- Tryouts
('tryouts', 'Tryouts', 'Tryouts', 'module', 'Manage tryout sessions and registrations', 'live'),
('tryout_scoring', 'Tryout Scoring', 'Tryouts', 'module', 'Score and evaluate tryout participants', 'live'),
('tryout_decisions', 'Tryout Decisions', 'Tryouts', 'module', 'Make tryout acceptance/rejection decisions', 'live'),

-- Travel
('travel_planning', 'Travel Planning', 'Travel', 'module', 'Create and manage travel plans', 'live'),
('travel_details', 'Travel Details', 'Travel', 'module', 'Access detailed travel information and itineraries', 'live'),
('travel_notifications', 'Travel Notifications', 'Travel', 'module', 'Send travel-related notifications', 'live'),

-- Uniforms & Gear
('uniform_orders', 'Uniform Orders', 'Uniforms & Gear', 'module', 'Manage uniform orders and inventory', 'live'),
('gear_management', 'Gear Management', 'Uniforms & Gear', 'module', 'Track and manage team gear', 'live'),

-- Reporting & Analytics
('basic_reports', 'Basic Reports', 'Reporting & Analytics', 'module', 'View basic attendance and roster reports', 'live'),
('analytics_dashboard', 'Analytics Dashboard', 'Reporting & Analytics', 'module', 'View advanced analytics and insights', 'live'),
('export_data', 'Data Export', 'Reporting & Analytics', 'module', 'Export data to CSV/Excel', 'live'),

-- Admin & Permissions
('multi_role_support', 'Multi-Role Support', 'Admin & Permissions', 'module', 'Users can have multiple roles across organizations', 'live'),
('custom_permissions', 'Custom Permissions', 'Admin & Permissions', 'permission', 'Configure custom role permissions', 'live'),

-- Integrations
('stripe_integration', 'Stripe Integration', 'Integrations', 'integration', 'Full Stripe payment integration', 'live'),
('google_calendar', 'Google Calendar', 'Integrations', 'integration', 'Sync with Google Calendar', 'live'),

-- Security & Compliance
('audit_logging', 'Audit Logging', 'Security & Compliance', 'module', 'View detailed audit logs', 'live'),
('data_encryption', 'Data Encryption', 'Security & Compliance', 'module', 'Enhanced data encryption', 'live'),

-- Support Tools
('support_tickets', 'Support Tickets', 'Support Tools', 'module', 'Create and manage support tickets', 'live'),
('help_documentation', 'Help Documentation', 'Support Tools', 'visibility', 'Access to help documentation', 'live')
ON CONFLICT (feature_key) DO NOTHING;

-- Assign features to Basic tier (essential features)
INSERT INTO tier_feature_assignments (license_tier_id, feature_entitlement_id, included, role_admin, role_coach, role_parent)
SELECT 
  lt.id,
  fe.id,
  true,
  true,
  true,
  false
FROM license_tiers lt
CROSS JOIN feature_entitlements fe
WHERE lt.tier_key = 'basic'
  AND fe.feature_key IN (
    'event_scheduling',
    'team_management',
    'roster_management',
    'messaging',
    'announcements',
    'payment_processing',
    'fee_management',
    'basic_reports',
    'max_teams',
    'max_players_per_team'
  )
ON CONFLICT (license_tier_id, feature_entitlement_id) DO NOTHING;

-- Assign features to Power tier (all features)
INSERT INTO tier_feature_assignments (license_tier_id, feature_entitlement_id, included, role_admin, role_coach, role_parent)
SELECT 
  lt.id,
  fe.id,
  true,
  true,
  true,
  CASE 
    WHEN fe.feature_key IN ('messaging', 'announcements', 'event_rsvp') THEN true
    ELSE false
  END
FROM license_tiers lt
CROSS JOIN feature_entitlements fe
WHERE lt.tier_key = 'power'
ON CONFLICT (license_tier_id, feature_entitlement_id) DO NOTHING;

-- Set limits for Power tier
UPDATE tier_feature_assignments
SET limit_value = CASE
  WHEN feature_entitlement_id = (SELECT id FROM feature_entitlements WHERE feature_key = 'max_teams') THEN 100
  WHEN feature_entitlement_id = (SELECT id FROM feature_entitlements WHERE feature_key = 'max_players_per_team') THEN 50
  ELSE NULL
END
WHERE license_tier_id = (SELECT id FROM license_tiers WHERE tier_key = 'power');

-- Set limits for Basic tier
UPDATE tier_feature_assignments
SET limit_value = CASE
  WHEN feature_entitlement_id = (SELECT id FROM feature_entitlements WHERE feature_key = 'max_teams') THEN 10
  WHEN feature_entitlement_id = (SELECT id FROM feature_entitlements WHERE feature_key = 'max_players_per_team') THEN 25
  ELSE NULL
END
WHERE license_tier_id = (SELECT id FROM license_tiers WHERE tier_key = 'basic');
