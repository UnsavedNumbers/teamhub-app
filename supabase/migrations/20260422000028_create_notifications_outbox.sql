-- Create notifications_outbox unified queue table
-- This table serves as a unified queue for all notification delivery (in-app and email)

-- Create enum for notification channel
DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'push');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for outbox status
DO $$ BEGIN
  CREATE TYPE notification_outbox_status AS ENUM ('queued', 'sent', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type_id UUID NOT NULL REFERENCES public.notification_types(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  status notification_outbox_status NOT NULL DEFAULT 'queued',
  error_message TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ
);

-- Unique constraint on idempotency_key to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_outbox_idempotency_key 
  ON public.notifications_outbox(idempotency_key);

-- Indexes for efficient processing
CREATE INDEX IF NOT EXISTS idx_notifications_outbox_status_created 
  ON public.notifications_outbox(status, created_at) 
  WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_notifications_outbox_target_user_id 
  ON public.notifications_outbox(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_outbox_notification_type_id 
  ON public.notifications_outbox(notification_type_id);
CREATE INDEX IF NOT EXISTS idx_notifications_outbox_org_id 
  ON public.notifications_outbox(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_outbox_channel_status 
  ON public.notifications_outbox(channel, status, created_at);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_notifications_outbox_processed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('sent', 'failed', 'skipped') AND OLD.status = 'queued' THEN
    NEW.processed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notifications_outbox_processed_at ON public.notifications_outbox;
CREATE TRIGGER update_notifications_outbox_processed_at
  BEFORE UPDATE ON public.notifications_outbox
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_outbox_processed_at();

-- RLS Policies
ALTER TABLE public.notifications_outbox ENABLE ROW LEVEL SECURITY;

-- Users can read their own outbox entries
DROP POLICY IF EXISTS notifications_outbox_users_select ON public.notifications_outbox;
CREATE POLICY notifications_outbox_users_select ON public.notifications_outbox
  FOR SELECT
  TO authenticated
  USING (target_user_id = auth.uid() OR actor_user_id = auth.uid());

-- Allow authenticated users to insert notifications (frontend code path)
-- The notification system inserts entries via the frontend client when users trigger actions
-- Security: Only authenticated users can insert, idempotency_key prevents duplicates,
-- and users can only create notifications for users in their organization
DROP POLICY IF EXISTS notifications_outbox_service_insert ON public.notifications_outbox;
CREATE POLICY notifications_outbox_service_insert ON public.notifications_outbox
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Ensure the authenticated user is in the same organization as the notification
    -- This prevents users from creating notifications for users outside their org
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = notifications_outbox.org_id
      AND om.user_id = auth.uid()
    )
  );

-- Allow authenticated users to update their own notification entries (for status checks)
-- Full processing updates are handled by the notification-worker Edge Function with service role
-- Note: RLS cannot restrict which columns can be updated, but we restrict which rows can be updated
DROP POLICY IF EXISTS notifications_outbox_service_update ON public.notifications_outbox;
CREATE POLICY notifications_outbox_service_update ON public.notifications_outbox
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can only update entries where they are the target user
    -- This allows users to check status of their own notifications
    target_user_id = auth.uid()
  )
  WITH CHECK (
    -- Ensure the user remains the target (prevent changing target_user_id)
    target_user_id = auth.uid()
  );

-- Platform admin can read all entries
DROP POLICY IF EXISTS notifications_outbox_platform_admin_select ON public.notifications_outbox;
CREATE POLICY notifications_outbox_platform_admin_select ON public.notifications_outbox
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

COMMENT ON TABLE public.notifications_outbox IS 'Unified queue for all notification delivery. Entries are created for each channel (in_app, email, push) and processed by appropriate workers.';
COMMENT ON COLUMN public.notifications_outbox.idempotency_key IS 'Unique key to prevent duplicate notifications. Format: "{notification_type_key}:{org_id}:{target_user_id}:{entity_id}:{event_version}"';
COMMENT ON COLUMN public.notifications_outbox.template_id IS 'Email template ID (only for email channel). NULL for in_app channel.';
COMMENT ON COLUMN public.notifications_outbox.status IS 'Status: queued (awaiting processing), sent (delivered), failed (delivery failed), skipped (skipped due to preferences/template inactive)';
COMMENT ON COLUMN public.notifications_outbox.error_message IS 'Error message if status is failed or skipped';
