-- Create notification_types table - Central registry for all notification types
-- This table defines what notification types exist, which roles are eligible,
-- and default preferences for each type.

CREATE TABLE IF NOT EXISTS public.notification_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  eligible_roles TEXT[] NOT NULL DEFAULT '{}',
  default_in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  default_email_enabled BOOLEAN NOT NULL DEFAULT true,
  supports_in_app BOOLEAN NOT NULL DEFAULT true,
  supports_email BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_types_key ON public.notification_types(key);
CREATE INDEX IF NOT EXISTS idx_notification_types_category ON public.notification_types(category);
CREATE INDEX IF NOT EXISTS idx_notification_types_eligible_roles ON public.notification_types USING GIN(eligible_roles);
CREATE INDEX IF NOT EXISTS idx_notification_types_supports_email ON public.notification_types(supports_email) WHERE supports_email = true;

-- RLS Policies
ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;

-- Platform admin can manage all notification types
DROP POLICY IF EXISTS notification_types_platform_admin_all ON public.notification_types;
CREATE POLICY notification_types_platform_admin_all ON public.notification_types
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Users can read notification types (needed for settings UI)
DROP POLICY IF EXISTS notification_types_users_select ON public.notification_types;
CREATE POLICY notification_types_users_select ON public.notification_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_notification_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_types_updated_at ON public.notification_types;
CREATE TRIGGER update_notification_types_updated_at
  BEFORE UPDATE ON public.notification_types
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_types_updated_at();

COMMENT ON TABLE public.notification_types IS 'Central registry of notification types. Defines what notifications exist, which roles can receive them, and default preferences.';
COMMENT ON COLUMN public.notification_types.key IS 'Unique identifier matching NotificationAction values from TypeScript (e.g., "event_created", "announcement_published")';
COMMENT ON COLUMN public.notification_types.eligible_roles IS 'Array of roles that can receive this notification type (e.g., ["guardian", "coach", "org_admin"])';
COMMENT ON COLUMN public.notification_types.supports_email IS 'Whether this notification type can be delivered via email (requires active email template)';
COMMENT ON COLUMN public.notification_types.category IS 'Category for grouping in UI (e.g., "Communications", "Scheduling", "Billing")';
