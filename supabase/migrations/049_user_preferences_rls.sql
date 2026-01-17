-- User Preferences RLS Policies
-- ===============================
-- Ensures users can read and update their own preferences JSONB column

-- The existing "Users can update own profile" policy (from 003_users.sql)
-- already covers UPDATE operations on the preferences column.
-- However, we add an explicit policy for clarity and to ensure JSONB updates work correctly.

-- Note: The preferences column is part of the users table, so existing RLS policies apply.
-- This migration ensures preferences can be updated via JSONB operations.

-- Verify preferences column exists (added in 016_settings_and_preferences.sql)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'preferences'
  ) THEN
    ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index for preferences if it doesn't exist (from 016)
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING gin (preferences);

-- The existing RLS policy "Users can update own profile" already allows:
--   UPDATE users SET preferences = ... WHERE id = auth.uid()
--
-- No additional policies needed. The JSONB column is updated like any other column.
--
-- However, we document the expected behavior:
-- 1. Users can SELECT their own preferences (via "Users can view own profile")
-- 2. Users can UPDATE their own preferences (via "Users can update own profile")
-- 3. Admins can view/update preferences for users in their org (via existing admin policies)

-- Add a comment for documentation
COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSONB. Includes theme, language, notifications, and other user settings. Users can only update their own preferences.';
