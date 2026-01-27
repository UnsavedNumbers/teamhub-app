-- =====================================================================
-- Migration: Huddles Stream Chat Integration
-- Description: Integrate Stream Chat for team/org messaging
-- Archive old messages table, create new Stream Chat metadata tables
-- =====================================================================

-- =====================================================================
-- 1. Archive old messages table
-- =====================================================================

-- Rename messages table to messages_archive for historical reference
ALTER TABLE IF EXISTS messages RENAME TO messages_archive;

-- Add comment explaining archival
COMMENT ON TABLE messages_archive IS 'Archived messages from pre-Stream Chat implementation. Read-only for historical access.';

-- =====================================================================
-- 2. Stream Channels Table
-- Maps Stream Chat channel IDs to org/team/DM relationships
-- =====================================================================

CREATE TABLE stream_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_channel_id TEXT UNIQUE NOT NULL,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL CHECK (channel_type IN ('team', 'org', 'dm')),
    user_id_1 UUID REFERENCES users(id) ON DELETE CASCADE,
    user_id_2 UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT team_channels_have_team_id CHECK (
        channel_type != 'team' OR team_id IS NOT NULL
    ),
    CONSTRAINT org_channels_no_team_id CHECK (
        channel_type != 'org' OR team_id IS NULL
    ),
    CONSTRAINT dm_channels_have_users CHECK (
        channel_type != 'dm' OR (user_id_1 IS NOT NULL AND user_id_2 IS NOT NULL)
    ),
    CONSTRAINT dm_users_ordered CHECK (
        channel_type != 'dm' OR user_id_1 < user_id_2
    )
);

-- Indexes
CREATE INDEX idx_stream_channels_org ON stream_channels(org_id);
CREATE INDEX idx_stream_channels_team ON stream_channels(team_id);
CREATE INDEX idx_stream_channels_type ON stream_channels(channel_type);
CREATE INDEX idx_stream_channels_dm_users ON stream_channels(user_id_1, user_id_2) WHERE channel_type = 'dm';

-- Updated timestamp trigger
CREATE TRIGGER set_stream_channels_updated_at
    BEFORE UPDATE ON stream_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE stream_channels IS 'Maps Stream Chat channels to YouthSports entities (teams, orgs, DMs)';

-- =====================================================================
-- 3. Stream Channel Metadata Table
-- Extended metadata for channels (pinned messages, event links, etc.)
-- =====================================================================

CREATE TABLE stream_channel_metadata (
    channel_id UUID PRIMARY KEY REFERENCES stream_channels(id) ON DELETE CASCADE,
    name TEXT,
    description TEXT,
    avatar_url TEXT,
    last_activity_at TIMESTAMPTZ,
    pinned_message_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stream_metadata_event ON stream_channel_metadata(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_stream_metadata_activity ON stream_channel_metadata(last_activity_at);

-- Updated timestamp trigger
CREATE TRIGGER set_stream_metadata_updated_at
    BEFORE UPDATE ON stream_channel_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE stream_channel_metadata IS 'Extended metadata for Stream Chat channels including pinned messages and event links';

-- =====================================================================
-- 4. Huddle Notification Preferences Table
-- Per-user, per-channel notification settings
-- =====================================================================

CREATE TABLE huddle_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES stream_channels(id) ON DELETE CASCADE,
    muted BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    push_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One preference row per user per channel
    UNIQUE(user_id, channel_id)
);

-- Indexes
CREATE INDEX idx_huddle_prefs_user ON huddle_notification_preferences(user_id);
CREATE INDEX idx_huddle_prefs_channel ON huddle_notification_preferences(channel_id);
CREATE INDEX idx_huddle_prefs_muted ON huddle_notification_preferences(user_id) WHERE muted = TRUE;

-- Updated timestamp trigger
CREATE TRIGGER set_huddle_prefs_updated_at
    BEFORE UPDATE ON huddle_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE huddle_notification_preferences IS 'Per-user, per-channel notification preferences for huddles';

-- =====================================================================
-- 5. Huddle Reports Table
-- Message reporting system for moderation
-- =====================================================================

CREATE TABLE huddle_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stream_message_id TEXT NOT NULL,
    stream_channel_id TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_huddle_reports_reporter ON huddle_reports(reported_by_user_id);
CREATE INDEX idx_huddle_reports_status ON huddle_reports(status);
CREATE INDEX idx_huddle_reports_message ON huddle_reports(stream_message_id);
CREATE INDEX idx_huddle_reports_channel ON huddle_reports(stream_channel_id);

-- Updated timestamp trigger
CREATE TRIGGER set_huddle_reports_updated_at
    BEFORE UPDATE ON huddle_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-set reviewed_at when status changes to reviewed/dismissed
CREATE OR REPLACE FUNCTION set_huddle_report_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('reviewed', 'dismissed') AND OLD.status = 'pending' THEN
        NEW.reviewed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_report_reviewed_at
    BEFORE UPDATE ON huddle_reports
    FOR EACH ROW
    WHEN (NEW.status != OLD.status)
    EXECUTE FUNCTION set_huddle_report_reviewed_at();

COMMENT ON TABLE huddle_reports IS 'Message reports for moderation and safety';

-- =====================================================================
-- 6. Huddle Audit Log Table
-- Immutable audit log for message actions (platform admin only)
-- =====================================================================

CREATE TABLE huddle_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    stream_message_id TEXT,
    stream_channel_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_huddle_audit_user ON huddle_audit_log(user_id);
CREATE INDEX idx_huddle_audit_action ON huddle_audit_log(action);
CREATE INDEX idx_huddle_audit_created ON huddle_audit_log(created_at DESC);
CREATE INDEX idx_huddle_audit_message ON huddle_audit_log(stream_message_id);

COMMENT ON TABLE huddle_audit_log IS 'Immutable audit log for message moderation actions (platform admin only)';

-- =====================================================================
-- 7. RLS Policies
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE stream_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_channel_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE huddle_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE huddle_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE huddle_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- stream_channels policies
-- =====================================================================

-- Users can view channels they're members of (team/org membership)
CREATE POLICY "Users can view their team channels"
    ON stream_channels FOR SELECT
    USING (
        channel_type = 'team' AND
        team_id IN (
            SELECT DISTINCT t.id
            FROM teams t
            LEFT JOIN team_memberships tm ON tm.team_id = t.id
            LEFT JOIN athletes a ON a.id = tm.athlete_id
            LEFT JOIN athlete_guardians ag ON ag.athlete_id = a.id AND ag.status = 'active'
            LEFT JOIN organization_members om ON om.org_id = t.org_id AND om.user_id = auth.uid()
            WHERE 
                ag.user_id = auth.uid() OR
                (om.role IN ('coach', 'org_admin'))
        )
    );

CREATE POLICY "Users can view their org channels"
    ON stream_channels FOR SELECT
    USING (
        channel_type = 'org' AND
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid() AND role = 'org_admin'
        )
    );

CREATE POLICY "Users can view their DM channels"
    ON stream_channels FOR SELECT
    USING (
        channel_type = 'dm' AND
        (user_id_1 = auth.uid() OR user_id_2 = auth.uid())
    );

-- Org admins can insert channels
CREATE POLICY "Org admins can create channels"
    ON stream_channels FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid() AND role = 'org_admin'
        )
    );

-- =====================================================================
-- stream_channel_metadata policies
-- =====================================================================

CREATE POLICY "Users can view metadata for their channels"
    ON stream_channel_metadata FOR SELECT
    USING (
        channel_id IN (SELECT id FROM stream_channels)
    );

CREATE POLICY "Org admins and coaches can update metadata"
    ON stream_channel_metadata FOR UPDATE
    USING (
        channel_id IN (
            SELECT sc.id FROM stream_channels sc
            LEFT JOIN organization_members om ON om.org_id = sc.org_id
            WHERE 
                om.user_id = auth.uid() AND
                om.role IN ('coach', 'org_admin')
        )
    );

-- =====================================================================
-- huddle_notification_preferences policies
-- =====================================================================

CREATE POLICY "Users can view their own notification preferences"
    ON huddle_notification_preferences FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences"
    ON huddle_notification_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
    ON huddle_notification_preferences FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification preferences"
    ON huddle_notification_preferences FOR DELETE
    USING (user_id = auth.uid());

-- =====================================================================
-- huddle_reports policies
-- =====================================================================

CREATE POLICY "Users can view their own reports"
    ON huddle_reports FOR SELECT
    USING (reported_by_user_id = auth.uid());

CREATE POLICY "Org admins can view all reports in their org"
    ON huddle_reports FOR SELECT
    USING (
        stream_channel_id IN (
            SELECT stream_channel_id FROM stream_channels sc
            INNER JOIN organization_members om ON om.org_id = sc.org_id
            WHERE om.user_id = auth.uid() AND om.role = 'org_admin'
        )
    );

CREATE POLICY "Users can create reports"
    ON huddle_reports FOR INSERT
    WITH CHECK (reported_by_user_id = auth.uid());

CREATE POLICY "Org admins can update reports in their org"
    ON huddle_reports FOR UPDATE
    USING (
        stream_channel_id IN (
            SELECT stream_channel_id FROM stream_channels sc
            INNER JOIN organization_members om ON om.org_id = sc.org_id
            WHERE om.user_id = auth.uid() AND om.role = 'org_admin'
        )
    );

-- =====================================================================
-- huddle_audit_log policies
-- =====================================================================

-- Only platform admins can view audit log
CREATE POLICY "Platform admins can view audit log"
    ON huddle_audit_log FOR SELECT
    USING (is_platform_admin(auth.uid()));

-- Only platform admins can insert audit log
CREATE POLICY "Platform admins can insert audit log"
    ON huddle_audit_log FOR INSERT
    WITH CHECK (is_platform_admin(auth.uid()));

-- =====================================================================
-- 8. Helper Functions
-- =====================================================================

-- Function to get channel members for permission checking
CREATE OR REPLACE FUNCTION get_channel_members(channel_uuid UUID)
RETURNS TABLE (user_id UUID, role TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        COALESCE(om.user_id, ag.user_id) AS user_id,
        CASE
            WHEN om.role = 'coach' THEN 'coach'
            WHEN om.role = 'org_admin' THEN 'org_admin'
            WHEN ag.user_id IS NOT NULL THEN 'guardian'
            ELSE 'unknown'
        END AS role
    FROM stream_channels sc
    LEFT JOIN teams t ON t.id = sc.team_id
    LEFT JOIN team_memberships tm ON tm.team_id = t.id
    LEFT JOIN athletes a ON a.id = tm.athlete_id
    LEFT JOIN athlete_guardians ag ON ag.athlete_id = a.id AND ag.status = 'active'
    LEFT JOIN organization_members om ON om.org_id = sc.org_id
    WHERE sc.id = channel_uuid
    AND (
        (sc.channel_type = 'team' AND (ag.user_id IS NOT NULL OR om.role IN ('coach', 'org_admin'))) OR
        (sc.channel_type = 'org' AND om.role = 'org_admin') OR
        (sc.channel_type = 'dm' AND (sc.user_id_1 = auth.uid() OR sc.user_id_2 = auth.uid()))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_channel_members IS 'Returns all members of a Stream channel with their roles for permission checking';

-- =====================================================================
-- 9. Database Triggers for Auto-Channel Creation
-- =====================================================================

-- Auto-create team channel when team is created
CREATE OR REPLACE FUNCTION create_team_stream_channel()
RETURNS TRIGGER AS $$
DECLARE
    channel_id TEXT;
BEGIN
    -- Generate Stream channel ID
    channel_id := 'team:' || NEW.id::TEXT;
    
    -- Insert stream_channels record
    INSERT INTO stream_channels (
        stream_channel_id,
        org_id,
        team_id,
        channel_type
    ) VALUES (
        channel_id,
        NEW.org_id,
        NEW.id,
        'team'
    );
    
    -- Insert metadata
    INSERT INTO stream_channel_metadata (
        channel_id,
        name,
        description
    ) VALUES (
        (SELECT id FROM stream_channels WHERE stream_channel_id = channel_id),
        NEW.name,
        'Team huddle for ' || NEW.name
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_team_channel
    AFTER INSERT ON teams
    FOR EACH ROW
    EXECUTE FUNCTION create_team_stream_channel();

COMMENT ON FUNCTION create_team_stream_channel IS 'Auto-creates a Stream channel when a team is created';

-- Auto-create org channel when organization is created
CREATE OR REPLACE FUNCTION create_org_stream_channel()
RETURNS TRIGGER AS $$
DECLARE
    channel_id TEXT;
BEGIN
    -- Generate Stream channel ID
    channel_id := 'org:' || NEW.id::TEXT;
    
    -- Insert stream_channels record
    INSERT INTO stream_channels (
        stream_channel_id,
        org_id,
        channel_type
    ) VALUES (
        channel_id,
        NEW.id,
        'org'
    );
    
    -- Insert metadata
    INSERT INTO stream_channel_metadata (
        channel_id,
        name,
        description
    ) VALUES (
        (SELECT id FROM stream_channels WHERE stream_channel_id = channel_id),
        NEW.name || ' Organization',
        'Organization-wide huddle for ' || NEW.name
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_org_channel
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION create_org_stream_channel();

COMMENT ON FUNCTION create_org_stream_channel IS 'Auto-creates a Stream channel when an organization is created';

-- =====================================================================
-- 10. Create channels for existing teams and orgs
-- =====================================================================

-- Create channels for existing organizations (if not already created)
INSERT INTO stream_channels (stream_channel_id, org_id, channel_type)
SELECT 
    'org:' || id::TEXT,
    id,
    'org'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM stream_channels
    WHERE stream_channel_id = 'org:' || organizations.id::TEXT
);

-- Create metadata for new org channels
INSERT INTO stream_channel_metadata (channel_id, name, description)
SELECT 
    sc.id,
    o.name || ' Organization',
    'Organization-wide huddle for ' || o.name
FROM stream_channels sc
INNER JOIN organizations o ON o.id = sc.org_id
WHERE sc.channel_type = 'org'
AND NOT EXISTS (
    SELECT 1 FROM stream_channel_metadata
    WHERE channel_id = sc.id
);

-- Create channels for existing teams (if not already created)
INSERT INTO stream_channels (stream_channel_id, org_id, team_id, channel_type)
SELECT 
    'team:' || id::TEXT,
    org_id,
    id,
    'team'
FROM teams
WHERE NOT EXISTS (
    SELECT 1 FROM stream_channels
    WHERE stream_channel_id = 'team:' || teams.id::TEXT
);

-- Create metadata for new team channels
INSERT INTO stream_channel_metadata (channel_id, name, description)
SELECT 
    sc.id,
    t.name,
    'Team huddle for ' || t.name
FROM stream_channels sc
INNER JOIN teams t ON t.id = sc.team_id
WHERE sc.channel_type = 'team'
AND NOT EXISTS (
    SELECT 1 FROM stream_channel_metadata
    WHERE channel_id = sc.id
);
