-- Travel notifications outbox + triggers
-- =====================================
-- Enqueue emails for publish/update/cancel; an Edge Function processes the outbox.

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
  attempt_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  event_type TEXT NOT NULL, -- travel_published | travel_updated | travel_cancelled
  dedupe_key TEXT NOT NULL,
  travel_plan_id UUID NOT NULL REFERENCES public.travel_plans(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  payload JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_outbox_dedupe_key ON public.notification_outbox(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status ON public.notification_outbox(status);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_created_at ON public.notification_outbox(created_at);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- Only allow admins to read outbox rows (Edge Function uses service role).
DROP POLICY IF EXISTS "Admins can read notification outbox" ON public.notification_outbox;
CREATE POLICY "Admins can read notification outbox" ON public.notification_outbox
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  );

-- Recipient resolution for Travel emails (used by Edge Function)
-- Returns distinct parent emails for active team members on the given team.
CREATE OR REPLACE FUNCTION public.travel_recipient_emails(team_id_in UUID)
RETURNS TABLE(email TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT u.email
  FROM public.users u
  JOIN public.athletes c ON c.family_id = u.family_id
  JOIN public.team_memberships tm ON tm.athlete_id = c.id
  WHERE u.role = 'parent'
    AND tm.team_id = team_id_in
    AND tm.status = 'active'
    AND u.email IS NOT NULL
    AND u.email <> '';
$$;

-- Trigger function to enqueue travel notifications
CREATE OR REPLACE FUNCTION public.enqueue_travel_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_dedupe_key TEXT;
  v_should_update BOOLEAN := FALSE;
BEGIN
  -- Publish
  IF TG_OP = 'UPDATE' AND OLD.status <> 'published' AND NEW.status = 'published' THEN
    v_event_type := 'travel_published';
    v_dedupe_key := 'travel:' || NEW.id::text || ':published:' || COALESCE(NEW.updated_at::text, now()::text);
  -- Cancel
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    v_event_type := 'travel_cancelled';
    v_dedupe_key := 'travel:' || NEW.id::text || ':cancelled:' || COALESCE(NEW.updated_at::text, now()::text);
  -- Update (only when published and relevant fields changed)
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'published' THEN
    v_should_update :=
      (COALESCE(OLD.title,'') <> COALESCE(NEW.title,'')) OR
      (COALESCE(OLD.location,'') <> COALESCE(NEW.location,'')) OR
      (OLD.start_date <> NEW.start_date) OR
      (OLD.end_date <> NEW.end_date) OR
      (COALESCE(OLD.venue_name,'') <> COALESCE(NEW.venue_name,'')) OR
      (COALESCE(OLD.venue_address,'') <> COALESCE(NEW.venue_address,'')) OR
      (COALESCE(OLD.hotel_name,'') <> COALESCE(NEW.hotel_name,'')) OR
      (COALESCE(OLD.hotel_address,'') <> COALESCE(NEW.hotel_address,'')) OR
      (COALESCE(OLD.hotel_phone,'') <> COALESCE(NEW.hotel_phone,'')) OR
      (COALESCE(OLD.hotel_confirmation,'') <> COALESCE(NEW.hotel_confirmation,'')) OR
      (COALESCE(OLD.maps_url,'') <> COALESCE(NEW.maps_url,'')) OR
      (COALESCE(OLD.itinerary_file_path,'') <> COALESCE(NEW.itinerary_file_path,'')) OR
      (COALESCE(OLD.meeting_locations::text,'') <> COALESCE(NEW.meeting_locations::text,''));

    IF v_should_update THEN
      v_event_type := 'travel_updated';
      v_dedupe_key := 'travel:' || NEW.id::text || ':updated:' || COALESCE(NEW.updated_at::text, now()::text);
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_outbox (event_type, dedupe_key, travel_plan_id, team_id, season_id, payload)
  VALUES (
    v_event_type,
    v_dedupe_key,
    NEW.id,
    NEW.team_id,
    NEW.season_id,
    jsonb_build_object(
      'title', NEW.title,
      'location', NEW.location,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'status', NEW.status
    )
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_travel_notification ON public.travel_plans;
CREATE TRIGGER trg_enqueue_travel_notification
  AFTER UPDATE ON public.travel_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_travel_notification();

