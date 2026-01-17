-- Uniform notifications outbox + in-app notifications
-- ==================================================
-- Enqueue kit events (created/locked). Edge Functions process the outbox:
-- - create in-app notifications for recipients
-- - send email notifications

-- ============================================
-- 1) Outbox table (processed by Edge Function)
-- ============================================
CREATE TABLE IF NOT EXISTS public.uniform_notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
  attempt_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  event_type TEXT NOT NULL, -- uniform_kit_created | uniform_kit_locked | uniform_kit_deadline_reminder
  dedupe_key TEXT NOT NULL,
  kit_id UUID NOT NULL REFERENCES public.uniform_kits(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  payload JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_uniform_notification_outbox_dedupe_key
  ON public.uniform_notification_outbox(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_uniform_notification_outbox_status
  ON public.uniform_notification_outbox(status);
CREATE INDEX IF NOT EXISTS idx_uniform_notification_outbox_created_at
  ON public.uniform_notification_outbox(created_at);

ALTER TABLE public.uniform_notification_outbox ENABLE ROW LEVEL SECURITY;

-- Only allow admins/org_admins to read outbox rows (Edge Function uses service role).
DROP POLICY IF EXISTS "Admins can read uniform notification outbox" ON public.uniform_notification_outbox;
CREATE POLICY "Admins can read uniform notification outbox" ON public.uniform_notification_outbox
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = uniform_notification_outbox.team_id
        AND user_is_org_admin(auth.uid(), t.org_id)
    )
  );

-- ============================================
-- 2) In-app notifications (per-user, deduped)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- uniform_kit_created | uniform_kit_locked | uniform_kit_deadline_reminder
  kit_id UUID REFERENCES public.uniform_kits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB,
  dedupe_key TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_user_dedupe
  ON public.user_notifications(user_id, dedupe_key);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at
  ON public.user_notifications(created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON public.user_notifications;
CREATE POLICY "Users can view their notifications" ON public.user_notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can mark their own notifications read
DROP POLICY IF EXISTS "Users can update their notifications" ON public.user_notifications;
CREATE POLICY "Users can update their notifications" ON public.user_notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 3) Trigger to enqueue uniform kit events
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_uniform_kit_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_dedupe_key TEXT;
  v_team_id UUID;
  v_season_id UUID;
BEGIN
  v_team_id := NEW.team_id;
  v_season_id := NEW.season_id;

  IF TG_OP = 'INSERT' THEN
    v_event_type := 'uniform_kit_created';
    v_dedupe_key := 'uniform:kit:' || NEW.id::text || ':created:' || COALESCE(NEW.created_at::text, now()::text);
  ELSIF TG_OP = 'UPDATE' AND OLD.locked_at IS NULL AND NEW.locked_at IS NOT NULL THEN
    v_event_type := 'uniform_kit_locked';
    v_dedupe_key := 'uniform:kit:' || NEW.id::text || ':locked:' || COALESCE(NEW.locked_at::text, now()::text);
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.uniform_notification_outbox (event_type, dedupe_key, kit_id, team_id, season_id, payload)
  VALUES (
    v_event_type,
    v_dedupe_key,
    NEW.id,
    v_team_id,
    v_season_id,
    jsonb_build_object(
      'kit_name', NEW.name,
      'deadline_at', NEW.deadline_at,
      'locked_at', NEW.locked_at
    )
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_uniform_kit_notification ON public.uniform_kits;
CREATE TRIGGER trg_enqueue_uniform_kit_notification
  AFTER INSERT OR UPDATE ON public.uniform_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_uniform_kit_notification();

