-- Notification actions and enriched user_notifications schema
-- Keeps existing uniform notification support while enforcing typed actions.

-- 1) ENUM: notification_action (stable, auditable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'notification_action'
  ) THEN
    CREATE TYPE notification_action AS ENUM (
      -- Calendar & Events
      'event_created',
      'event_updated',
      'event_rescheduled',
      'event_canceled',
      'event_location_updated',
      'event_time_changed',
      'event_rsvp_required',
      'event_rsvp_updated',
      'event_attendance_updated',
      'event_weather_alert',
      -- Travel
      'travel_created',
      'travel_updated',
      'travel_canceled',
      'travel_dates_changed',
      'travel_location_changed',
      'travel_lodging_added',
      'travel_transport_added',
      'travel_overlap_detected',
      -- Payments & Billing
      'fee_created',
      'fee_assigned',
      'fee_updated',
      'fee_removed',
      'fee_payment_partial',
      'fee_payment_completed',
      'fee_payment_failed',
      'fee_overdue',
      'payout_account_connected',
      'payout_account_issue',
      'payout_processed',
      -- Athletes & Guardians
      'athlete_created',
      'athlete_updated',
      'athlete_removed',
      'athlete_added_to_team',
      'athlete_removed_from_team',
      'guardian_attached',
      'guardian_detached',
      -- Teams, Programs, Levels
      'team_created',
      'team_updated',
      'team_archived',
      'program_created',
      'program_updated',
      'program_removed',
      'level_created',
      'level_updated',
      'level_removed',
      -- Uniforms
      'uniform_size_requested',
      'uniform_size_submitted',
      'uniform_order_opened',
      'uniform_order_updated',
      'uniform_order_closed',
      'uniform_missing_info',
      -- Announcements
      'announcement_created',
      'announcement_updated',
      'announcement_deleted',
      'announcement_urgent',
      -- Messaging
      'huddle_created',
      'message_sent',
      'message_edited',
      'message_deleted',
      'message_pinned',
      'message_reported',
      'user_mentioned',
      -- Invitations & Access
      'role_assigned',
      'role_removed',
      'access_revoked',
      'invite_sent',
      'invite_accepted',
      'invite_expired',
      -- System & Platform
      'license_activated',
      'license_expiring',
      'license_expired',
      'license_upgraded',
      'feature_enabled',
      'feature_disabled',
      'system_generated_notice'
    );
  END IF;
END $$;

-- 2) Support presentation type separate from action
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'notification_presentation'
  ) THEN
    CREATE TYPE notification_presentation AS ENUM ('info', 'warning', 'urgent');
  END IF;
END $$;

-- 3) Enrich user_notifications schema with action + context columns
-- Create table if it does not exist (idempotent for environments missing 036_uniform_notifications.sql)
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  -- legacy columns kept for backward compatibility
  type TEXT NOT NULL DEFAULT 'system_generated_notice',
  kit_id UUID REFERENCES public.uniform_kits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB,
  dedupe_key TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS action notification_action NOT NULL DEFAULT 'system_generated_notice',
  ADD COLUMN IF NOT EXISTS presentation_type notification_presentation NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS role_context TEXT NOT NULL DEFAULT 'guardian' CHECK (role_context IN ('guardian', 'coach', 'org_admin')),
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS link_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS actor_id UUID;

-- 4) Indexes for queryability
CREATE INDEX IF NOT EXISTS idx_user_notifications_action ON public.user_notifications(action);
CREATE INDEX IF NOT EXISTS idx_user_notifications_role_ctx ON public.user_notifications(role_context);
CREATE INDEX IF NOT EXISTS idx_user_notifications_entity ON public.user_notifications(entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_user_dedupe ON public.user_notifications(user_id, dedupe_key);

COMMENT ON COLUMN public.user_notifications.action IS 'Typed source action that generated this notification';
COMMENT ON COLUMN public.user_notifications.presentation_type IS 'How to render the notification (info|warning|urgent)';
COMMENT ON COLUMN public.user_notifications.role_context IS 'Role lens for this notification (guardian|coach|org_admin)';
COMMENT ON COLUMN public.user_notifications.entity_type IS 'Domain entity type related to the notification (event, travel, fee, announcement, etc.)';
COMMENT ON COLUMN public.user_notifications.entity_id IS 'Domain entity ID related to the notification';
COMMENT ON COLUMN public.user_notifications.link_url IS 'Deep link for the notification';
COMMENT ON COLUMN public.user_notifications.metadata IS 'Structured metadata for client rendering';
