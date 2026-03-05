-- Add push_enabled channel flag to relational user notification preferences

ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_notification_preferences.push_enabled
  IS 'Whether push delivery is enabled for this notification type.';
