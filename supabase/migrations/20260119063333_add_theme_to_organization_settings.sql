-- Add theme_id column to organization_settings table
-- Themes are defined in code (src/config/themes.ts), not in database
-- This allows platform admins to add themes without database migrations

ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS theme_id TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN organization_settings.theme_id IS 'Theme ID from themes.ts config file. NULL means use platform default.';