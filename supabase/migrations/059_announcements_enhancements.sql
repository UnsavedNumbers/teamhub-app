-- Enhance Announcements: Add type enum and support org-wide announcements
-- ======================================================================

-- Create announcement type enum
CREATE TYPE announcement_type AS ENUM (
  'general',
  'reminder',
  'schedule_change',
  'urgent',
  'payment',
  'travel'
);

-- Make team_id nullable to support org-wide announcements
ALTER TABLE announcements 
  ALTER COLUMN team_id DROP NOT NULL;

-- Add type column with default
ALTER TABLE announcements 
  ADD COLUMN IF NOT EXISTS type announcement_type NOT NULL DEFAULT 'general';

-- Add org_id column to track which organization the announcement belongs to
-- This is needed for org-wide announcements that don't have a team_id
ALTER TABLE announcements 
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Update existing announcements to set org_id from their team
-- Only update announcements that have a team_id (team-specific announcements)
UPDATE announcements a
SET org_id = t.org_id
FROM teams t
WHERE a.team_id = t.id AND a.org_id IS NULL;

-- Delete any orphaned announcements without a team (shouldn't exist, but safety check)
-- These would be announcements where team was deleted but announcement wasn't cascade deleted
DELETE FROM announcements 
WHERE team_id IS NOT NULL 
  AND org_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = announcements.team_id);

-- Create index on org_id for efficient org-wide queries
CREATE INDEX IF NOT EXISTS idx_announcements_org_id ON announcements(org_id);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);

-- Add constraint: org_id must be set (either from team or explicitly for org-wide)
-- Only add constraint if all existing rows have org_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM announcements WHERE org_id IS NULL
  ) THEN
    ALTER TABLE announcements 
      ADD CONSTRAINT announcements_org_id_required 
      CHECK (org_id IS NOT NULL);
  END IF;
END $$;

-- Update RLS policies to handle org-wide announcements
-- The existing policies in 017_deferred_rls_policies.sql will need to be updated
-- to allow viewing org-wide announcements (where team_id IS NULL)

-- Add comment
COMMENT ON COLUMN announcements.team_id IS 'NULL for organization-wide announcements, otherwise the team ID';
COMMENT ON COLUMN announcements.org_id IS 'Organization ID - required for all announcements';
COMMENT ON COLUMN announcements.type IS 'Type of announcement (general, reminder, schedule_change, urgent, payment, travel)';
