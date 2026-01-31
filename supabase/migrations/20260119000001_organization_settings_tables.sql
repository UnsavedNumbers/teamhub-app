-- Organization Settings Tables Migration
-- Creates tables for organization-wide configuration

-- ============================================================================
-- organization_settings - Core organization configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    organization_name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    default_language TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at timestamp
CREATE TRIGGER organization_settings_updated_at
    BEFORE UPDATE ON organization_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_settings_select ON organization_settings
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY organization_settings_update ON organization_settings
    FOR UPDATE USING (
        org_id IN (
            SELECT org_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY organization_settings_insert ON organization_settings
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT org_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- organization_defaults - Default values for new entities
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_defaults (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    default_season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
    default_sport_id UUID REFERENCES sports(id) ON DELETE SET NULL,
    default_program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    default_level_id UUID REFERENCES levels(id) ON DELETE SET NULL,
    default_event_types JSONB DEFAULT '["practice", "game", "meeting"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organization_defaults_updated_at
    BEFORE UPDATE ON organization_defaults
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE organization_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_defaults_select ON organization_defaults
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY organization_defaults_update ON organization_defaults
    FOR UPDATE USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY organization_defaults_insert ON organization_defaults
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- organization_attendance_settings - Attendance rules and visibility
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_attendance_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    required_for_practice BOOLEAN NOT NULL DEFAULT false,
    required_for_game BOOLEAN NOT NULL DEFAULT true,
    required_for_meeting BOOLEAN NOT NULL DEFAULT false,
    submission_deadline_hours INTEGER NOT NULL DEFAULT 24 CHECK (submission_deadline_hours >= 0 AND submission_deadline_hours <= 168),
    lock_after_days INTEGER CHECK (lock_after_days IS NULL OR lock_after_days > 0),
    allow_admin_override BOOLEAN NOT NULL DEFAULT true,
    enable_coach_reminders BOOLEAN NOT NULL DEFAULT false,
    parent_visibility JSONB DEFAULT '{
        "can_view_own_child": true,
        "can_view_team_attendance": false,
        "can_submit_attendance": false
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organization_attendance_settings_updated_at
    BEFORE UPDATE ON organization_attendance_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE organization_attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_attendance_settings_select ON organization_attendance_settings
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY organization_attendance_settings_update ON organization_attendance_settings
    FOR UPDATE USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY organization_attendance_settings_insert ON organization_attendance_settings
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- organization_registration_settings - Registration and form requirements
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_registration_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    required_fields JSONB DEFAULT '["first_name", "last_name", "date_of_birth", "email"]'::jsonb,
    allow_players_without_guardians BOOLEAN NOT NULL DEFAULT false,
    allow_guardian_self_invite BOOLEAN NOT NULL DEFAULT true,
    medical_form_required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organization_registration_settings_updated_at
    BEFORE UPDATE ON organization_registration_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE organization_registration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_registration_settings_select ON organization_registration_settings
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY organization_registration_settings_update ON organization_registration_settings
    FOR UPDATE USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY organization_registration_settings_insert ON organization_registration_settings
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- organization_visibility_settings - Role-based visibility controls
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_visibility_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    role_permissions JSONB DEFAULT '{
        "admin": {
            "can_view_roster": true,
            "can_view_schedule": true,
            "can_view_attendance": true,
            "can_view_payments": true,
            "can_view_messages": true,
            "can_edit": true
        },
        "coach": {
            "can_view_roster": true,
            "can_view_schedule": true,
            "can_view_attendance": true,
            "can_view_payments": false,
            "can_view_messages": true,
            "can_edit": false
        },
        "parent": {
            "can_view_roster": false,
            "can_view_schedule": true,
            "can_view_attendance": true,
            "can_view_payments": true,
            "can_view_messages": true,
            "can_edit": false
        }
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organization_visibility_settings_updated_at
    BEFORE UPDATE ON organization_visibility_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE organization_visibility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_visibility_settings_select ON organization_visibility_settings
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY organization_visibility_settings_update ON organization_visibility_settings
    FOR UPDATE USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY organization_visibility_settings_insert ON organization_visibility_settings
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- organization_notification_settings - Notification preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_notification_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    default_channels JSONB DEFAULT '["email", "in_app"]'::jsonb,
    attendance_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
    schedule_change_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    payment_reminder_behavior TEXT NOT NULL DEFAULT 'immediate' CHECK (payment_reminder_behavior IN ('immediate', 'daily_digest')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organization_notification_settings_updated_at
    BEFORE UPDATE ON organization_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE organization_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_notification_settings_select ON organization_notification_settings
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY organization_notification_settings_update ON organization_notification_settings
    FOR UPDATE USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY organization_notification_settings_insert ON organization_notification_settings
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- organization_advanced_settings - Advanced features
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_advanced_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    data_retention_days INTEGER CHECK (data_retention_days IS NULL OR data_retention_days > 0),
    enable_api_access BOOLEAN NOT NULL DEFAULT false,
    api_rate_limit INTEGER CHECK (api_rate_limit IS NULL OR api_rate_limit > 0),
    allow_data_export BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organization_advanced_settings_updated_at
    BEFORE UPDATE ON organization_advanced_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE organization_advanced_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_advanced_settings_select ON organization_advanced_settings
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY organization_advanced_settings_update ON organization_advanced_settings
    FOR UPDATE USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY organization_advanced_settings_insert ON organization_advanced_settings
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_defaults_org_id ON organization_defaults(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_attendance_settings_org_id ON organization_attendance_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_registration_settings_org_id ON organization_registration_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_visibility_settings_org_id ON organization_visibility_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_notification_settings_org_id ON organization_notification_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_advanced_settings_org_id ON organization_advanced_settings(org_id);


