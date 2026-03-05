-- Create user_notification_preferences table
-- Relational table for storing user notification preferences per org/role/notification_type
-- Note: An older table with the same name exists for fan preferences (different schema)
-- We'll rename the old table and create the new relational structure

-- Check if old table exists and rename it if needed
DO $$
BEGIN
  -- Check if table exists with old schema (has push_enabled column but no org_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_notification_preferences' 
    AND column_name = 'push_enabled'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_notification_preferences' 
      AND column_name = 'org_id'
    )
  ) THEN
    -- Rename old table to preserve fan preferences
    ALTER TABLE public.user_notification_preferences 
    RENAME TO user_notification_preferences_legacy;
    
    -- Drop old RLS policies
    DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON public.user_notification_preferences_legacy;
    
    RAISE NOTICE 'Renamed old user_notification_preferences table to user_notification_preferences_legacy';
  END IF;
END $$;

-- Create new relational notification preferences table
-- Drop first if it exists with wrong schema (shouldn't happen after rename, but safe)
DO $$
BEGIN
  -- If table exists but doesn't have org_id column, drop it (shouldn't happen after rename)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_notification_preferences'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_notification_preferences' 
      AND column_name = 'org_id'
    )
  ) THEN
    DROP TABLE public.user_notification_preferences CASCADE;
    RAISE NOTICE 'Dropped user_notification_preferences table with incorrect schema';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('org_admin', 'coach', 'guardian', 'athlete', 'staff', 'fan')),
  notification_type_id UUID NOT NULL REFERENCES public.notification_types(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one preference per user/org/role/notification_type
  CONSTRAINT user_notification_preferences_unique 
    UNIQUE (user_id, org_id, role, notification_type_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id 
  ON public.user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_org_id 
  ON public.user_notification_preferences(org_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_role 
  ON public.user_notification_preferences(role);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_notification_type_id 
  ON public.user_notification_preferences(notification_type_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_org_role 
  ON public.user_notification_preferences(user_id, org_id, role);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON public.user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_notification_preferences_updated_at();

-- RLS Policies
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
DROP POLICY IF EXISTS user_notification_preferences_users_select ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_users_select ON public.user_notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own preferences
DROP POLICY IF EXISTS user_notification_preferences_users_insert ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_users_insert ON public.user_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
DROP POLICY IF EXISTS user_notification_preferences_users_update ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_users_update ON public.user_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own preferences
DROP POLICY IF EXISTS user_notification_preferences_users_delete ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_users_delete ON public.user_notification_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Platform admin can manage all preferences (for support/debugging)
DROP POLICY IF EXISTS user_notification_preferences_platform_admin_all ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_platform_admin_all ON public.user_notification_preferences
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

COMMENT ON TABLE public.user_notification_preferences IS 'User notification preferences per organization, role, and notification type. Replaces JSONB preferences in users.preferences.';
COMMENT ON COLUMN public.user_notification_preferences.org_id IS 'Organization ID. NULL for global preferences (future use).';
COMMENT ON COLUMN public.user_notification_preferences.role IS 'Role context (org_admin, coach, guardian, athlete, staff, fan).';
COMMENT ON COLUMN public.user_notification_preferences.email_enabled IS 'Whether email notifications are enabled. Only meaningful if notification_type supports_email and active template exists.';
