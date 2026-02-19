-- Fan Visibility Toggle Implementation
-- Add visibility columns to teams, announcements, and organization_visibility_settings

-- 1. Add visible_to_fans to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS visible_to_fans BOOLEAN DEFAULT false;

COMMENT ON COLUMN teams.visible_to_fans IS 'When true, this team appears in the public fan portal and is discoverable by supporters';

-- 2. Add visible_to_fans to announcements table
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS visible_to_fans BOOLEAN DEFAULT false;

COMMENT ON COLUMN announcements.visible_to_fans IS 'When true, this announcement is visible to fans in the public fan portal';

-- 3. Add fan_visibility_defaults to organization_visibility_settings
-- This stores default visibility settings per event type
ALTER TABLE organization_visibility_settings
ADD COLUMN IF NOT EXISTS fan_visibility_defaults JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN organization_visibility_settings.fan_visibility_defaults IS 'Default fan visibility by event type, e.g. {"practice": true, "game": true}';

-- 4. Create index for fan-visible teams queries
CREATE INDEX IF NOT EXISTS idx_teams_visible_to_fans 
ON teams(org_id, visible_to_fans) 
WHERE visible_to_fans = true;

-- 5. Create index for fan-visible announcements queries
CREATE INDEX IF NOT EXISTS idx_announcements_visible_to_fans 
ON announcements(org_id, visible_to_fans) 
WHERE visible_to_fans = true;

-- Note: events.visibility already exists as an enum ('public' | 'unlisted' | 'members' | 'ticket_holders' | 'private')
-- We will use 'public' for fan-visible events and 'private' for organization-only events
-- No migration needed for events table

-- Note: galleries already have visibility column ('public' | 'team' | 'private')
-- We will use 'public' for fan-visible galleries
-- No migration needed for galleries table
