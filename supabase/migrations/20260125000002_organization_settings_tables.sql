-- Phase 14: Organization Settings Tables
-- ===========================================
-- Create dedicated tables for organization-wide configuration
-- Based on organizationSettingsService.ts

-- 1. General Settings (extends organizations table conceptually but 1:1)
CREATE TABLE IF NOT EXISTS organization_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    organization_name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    default_language TEXT DEFAULT 'en',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Defaults Settings
CREATE TABLE IF NOT EXISTS organization_defaults (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    default_season_id UUID, -- FK to seasons added later if needed or loose coupling
    default_sport_id UUID,
    default_program_id UUID,
    default_level_id UUID,
    default_event_types TEXT[] DEFAULT ARRAY['practice', 'game', 'meeting'],
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Attendance Settings
CREATE TABLE IF NOT EXISTS organization_attendance_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    required_for_practice BOOLEAN DEFAULT false,
    required_for_game BOOLEAN DEFAULT true,
    required_for_meeting BOOLEAN DEFAULT false,
    submission_deadline_hours INTEGER DEFAULT 24,
    lock_after_days INTEGER,
    allow_admin_override BOOLEAN DEFAULT true,
    enable_coach_reminders BOOLEAN DEFAULT false,
    parent_visibility JSONB DEFAULT '{"can_view_own_child": true, "can_view_team_attendance": false, "can_submit_attendance": false}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Registration Settings
CREATE TABLE IF NOT EXISTS organization_registration_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    required_fields TEXT[] DEFAULT ARRAY['first_name', 'last_name', 'date_of_birth', 'email'],
    allow_players_without_guardians BOOLEAN DEFAULT false,
    allow_guardian_self_invite BOOLEAN DEFAULT true,
    medical_form_required BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Visibility Settings
CREATE TABLE IF NOT EXISTS organization_visibility_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    role_permissions JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Notification Settings
CREATE TABLE IF NOT EXISTS organization_notification_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    default_channels TEXT[] DEFAULT ARRAY['email', 'in_app'],
    attendance_reminders_enabled BOOLEAN DEFAULT true,
    schedule_change_alerts_enabled BOOLEAN DEFAULT true,
    payment_reminder_behavior TEXT DEFAULT 'immediate',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Advanced Settings
CREATE TABLE IF NOT EXISTS organization_advanced_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    data_retention_days INTEGER,
    enable_api_access BOOLEAN DEFAULT false,
    api_rate_limit INTEGER DEFAULT 1000,
    allow_data_export BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_registration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_visibility_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_advanced_settings ENABLE ROW LEVEL SECURITY;

-- Create Policies (Generic Org Admin access)
-- Note: Simplified for brevity, typically we check organization_members
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'organization_settings',
    'organization_defaults',
    'organization_attendance_settings',
    'organization_registration_settings',
    'organization_visibility_settings',
    'organization_notification_settings',
    'organization_advanced_settings'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- SELECT: Member can read
    EXECUTE format('
      CREATE POLICY "Member View %s" ON %I
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = %I.org_id
          AND om.user_id = auth.uid()
        )
      )
    ', t, t, t);

    -- UPDATE: Org Admin can update
    EXECUTE format('
      CREATE POLICY "Admin Update %s" ON %I
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = %I.org_id
          AND om.user_id = auth.uid()
          AND om.role = ''org_admin''
        )
      )
    ', t, t, t);
    
    -- INSERT: Org Admin can insert (usually created on org creation, but lazy init allowed)
     EXECUTE format('
      CREATE POLICY "Admin Insert %s" ON %I
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = %I.org_id
          AND om.user_id = auth.uid()
          AND om.role = ''org_admin''
        )
      )
    ', t, t, t);
  END LOOP;
END $$;
