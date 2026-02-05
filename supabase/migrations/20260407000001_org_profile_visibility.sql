-- Add profile_visible_to_fans column to organizations table
-- This allows organizations to control whether their profile is visible in the public fan portal

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS profile_visible_to_fans BOOLEAN DEFAULT false;

-- Add index for performance when filtering visible organizations
CREATE INDEX IF NOT EXISTS idx_organizations_profile_visible
ON organizations(id, profile_visible_to_fans)
WHERE profile_visible_to_fans = true;

-- Add comment for documentation
COMMENT ON COLUMN organizations.profile_visible_to_fans IS 'Controls whether the organization profile is visible to fans in the public portal';
