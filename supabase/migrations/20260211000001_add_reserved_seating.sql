BEGIN;

CREATE TABLE IF NOT EXISTS public.seat_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticketed_event_id uuid NOT NULL REFERENCES public.ticketed_events(id) ON DELETE CASCADE,
  name text NOT NULL,
  chart_image_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seat_maps_ticketed_event_id ON public.seat_maps(ticketed_event_id);

CREATE TABLE IF NOT EXISTS public.seat_map_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_map_id uuid NOT NULL REFERENCES public.seat_maps(id) ON DELETE CASCADE,
  section_name text NOT NULL,
  row_identifier text NOT NULL,
  seat_identifier text NOT NULL,
  position_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  seat_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_seat_map_sections_key
  ON public.seat_map_sections(seat_map_id, section_name, row_identifier, seat_identifier);

CREATE INDEX IF NOT EXISTS idx_seat_map_sections_lookup
  ON public.seat_map_sections(seat_map_id, section_name, row_identifier, seat_identifier);

CREATE INDEX IF NOT EXISTS idx_seat_map_sections_seat_attributes
  ON public.seat_map_sections USING GIN(seat_attributes);

CREATE TABLE IF NOT EXISTS public.seat_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  seat_map_section_id uuid NOT NULL REFERENCES public.seat_map_sections(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_seat_assignments_ticket_id ON public.seat_assignments(ticket_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_seat_assignments_seat_map_section_id ON public.seat_assignments(seat_map_section_id);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_ticket_id ON public.seat_assignments(ticket_id);

CREATE TABLE IF NOT EXISTS public.seat_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_map_section_id uuid NOT NULL REFERENCES public.seat_map_sections(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.ticket_orders(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seat_holds_expires_within_window CHECK (expires_at <= created_at + interval '15 minutes')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_seat_holds_seat_map_section_id ON public.seat_holds(seat_map_section_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_expires_at ON public.seat_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_seat_holds_order_id ON public.seat_holds(order_id);

ALTER TABLE public.ticket_types
  ADD COLUMN IF NOT EXISTS seating_mode varchar(20) NOT NULL DEFAULT 'general_admission',
  ADD COLUMN IF NOT EXISTS seat_map_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'ticket_types'
      AND constraint_name = 'ticket_types_seating_mode_check'
  ) THEN
    ALTER TABLE public.ticket_types
      ADD CONSTRAINT ticket_types_seating_mode_check
      CHECK (seating_mode IN ('general_admission', 'reserved_seating'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'ticket_types'
      AND constraint_name = 'ticket_types_reserved_requires_seat_map'
  ) THEN
    ALTER TABLE public.ticket_types
      ADD CONSTRAINT ticket_types_reserved_requires_seat_map
      CHECK (seating_mode <> 'reserved_seating' OR seat_map_id IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'ticket_types'
      AND constraint_name = 'ticket_types_seat_map_id_fkey'
  ) THEN
    ALTER TABLE public.ticket_types
      ADD CONSTRAINT ticket_types_seat_map_id_fkey
      FOREIGN KEY (seat_map_id) REFERENCES public.seat_maps(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS seat_assignment_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND constraint_name = 'tickets_seat_assignment_id_fkey'
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_seat_assignment_id_fkey
      FOREIGN KEY (seat_assignment_id) REFERENCES public.seat_assignments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tickets_seat_assignment_id ON public.tickets(seat_assignment_id);

CREATE OR REPLACE FUNCTION public.update_reserved_capacity_from_seats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_seat_map_id uuid;
  v_total_available integer;
  v_sold_count integer;
BEGIN
  v_seat_map_id := COALESCE(NEW.seat_map_id, OLD.seat_map_id);

  IF v_seat_map_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*)::integer
    INTO v_total_available
  FROM public.seat_map_sections sms
  WHERE sms.seat_map_id = v_seat_map_id
    AND sms.is_available = true;

  SELECT COUNT(*)::integer
    INTO v_sold_count
  FROM public.seat_assignments sa
  JOIN public.seat_map_sections sms ON sms.id = sa.seat_map_section_id
  WHERE sms.seat_map_id = v_seat_map_id;

  UPDATE public.ticket_types tt
  SET
    capacity_total = v_total_available,
    capacity_remaining = GREATEST(v_total_available - v_sold_count, 0),
    updated_at = now()
  WHERE tt.seating_mode = 'reserved_seating'
    AND tt.seat_map_id = v_seat_map_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_reserved_capacity_from_seats ON public.seat_map_sections;
CREATE TRIGGER update_reserved_capacity_from_seats
AFTER INSERT OR UPDATE OR DELETE ON public.seat_map_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_reserved_capacity_from_seats();

CREATE OR REPLACE FUNCTION public.lock_and_hold_reserved_seats(
  p_order_id uuid,
  p_seat_ids uuid[],
  p_expires_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_requested_count integer;
  v_locked_count integer;
BEGIN
  v_requested_count := COALESCE(array_length(p_seat_ids, 1), 0);

  IF v_requested_count = 0 THEN
    RAISE EXCEPTION 'No seats selected';
  END IF;

  IF p_expires_at > now() + interval '15 minutes' THEN
    RAISE EXCEPTION 'Seat hold window cannot exceed 15 minutes';
  END IF;

  DELETE FROM public.seat_holds
  WHERE seat_map_section_id = ANY(p_seat_ids)
    AND expires_at <= now();

  WITH locked AS (
    SELECT id
    FROM public.seat_map_sections
    WHERE id = ANY(p_seat_ids)
      AND is_available = true
    FOR UPDATE SKIP LOCKED
  )
  SELECT COUNT(*)::integer INTO v_locked_count FROM locked;

  IF v_locked_count <> v_requested_count THEN
    RAISE EXCEPTION 'Seats no longer available';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.seat_assignments
    WHERE seat_map_section_id = ANY(p_seat_ids)
  ) THEN
    RAISE EXCEPTION 'Seats no longer available';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.seat_holds
    WHERE seat_map_section_id = ANY(p_seat_ids)
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Seats no longer available';
  END IF;

  INSERT INTO public.seat_holds (seat_map_section_id, order_id, expires_at)
  SELECT seat_id, p_order_id, p_expires_at
  FROM unnest(p_seat_ids) AS seat_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_seat_holds()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  DELETE FROM public.seat_holds
  WHERE expires_at < now();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

ALTER TABLE public.seat_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_map_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seat_maps_select_policy ON public.seat_maps;
CREATE POLICY seat_maps_select_policy
ON public.seat_maps
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin((SELECT auth.uid() AS uid))
  OR EXISTS (
    SELECT 1
    FROM public.ticketed_events te
    WHERE te.id = seat_maps.ticketed_event_id
      AND (
        public.user_is_org_admin((SELECT auth.uid() AS uid), te.org_id)
        OR public.staff_can_access_team((SELECT auth.uid() AS uid), te.team_id)
      )
  )
);

DROP POLICY IF EXISTS seat_maps_write_policy ON public.seat_maps;
CREATE POLICY seat_maps_write_policy
ON public.seat_maps
FOR ALL
TO authenticated
USING (
  public.is_platform_admin((SELECT auth.uid() AS uid))
  OR EXISTS (
    SELECT 1
    FROM public.ticketed_events te
    WHERE te.id = seat_maps.ticketed_event_id
      AND (
        public.user_is_org_admin((SELECT auth.uid() AS uid), te.org_id)
        OR public.staff_can_access_team((SELECT auth.uid() AS uid), te.team_id)
      )
  )
)
WITH CHECK (
  public.is_platform_admin((SELECT auth.uid() AS uid))
  OR EXISTS (
    SELECT 1
    FROM public.ticketed_events te
    WHERE te.id = seat_maps.ticketed_event_id
      AND (
        public.user_is_org_admin((SELECT auth.uid() AS uid), te.org_id)
        OR public.staff_can_access_team((SELECT auth.uid() AS uid), te.team_id)
      )
  )
);

DROP POLICY IF EXISTS seat_map_sections_select_policy ON public.seat_map_sections;
CREATE POLICY seat_map_sections_select_policy
ON public.seat_map_sections
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1
    FROM public.seat_maps sm
    JOIN public.ticketed_events te ON te.id = sm.ticketed_event_id
    WHERE sm.id = seat_map_sections.seat_map_id
      AND (
        te.status = 'published'
        OR public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), te.org_id)
        OR public.staff_can_access_team((SELECT auth.uid() AS uid), te.team_id)
      )
  )
);

DROP POLICY IF EXISTS seat_map_sections_write_policy ON public.seat_map_sections;
CREATE POLICY seat_map_sections_write_policy
ON public.seat_map_sections
FOR ALL
TO authenticated
USING (
  public.is_platform_admin((SELECT auth.uid() AS uid))
  OR EXISTS (
    SELECT 1
    FROM public.seat_maps sm
    JOIN public.ticketed_events te ON te.id = sm.ticketed_event_id
    WHERE sm.id = seat_map_sections.seat_map_id
      AND (
        public.user_is_org_admin((SELECT auth.uid() AS uid), te.org_id)
        OR public.staff_can_access_team((SELECT auth.uid() AS uid), te.team_id)
      )
  )
)
WITH CHECK (
  public.is_platform_admin((SELECT auth.uid() AS uid))
  OR EXISTS (
    SELECT 1
    FROM public.seat_maps sm
    JOIN public.ticketed_events te ON te.id = sm.ticketed_event_id
    WHERE sm.id = seat_map_sections.seat_map_id
      AND (
        public.user_is_org_admin((SELECT auth.uid() AS uid), te.org_id)
        OR public.staff_can_access_team((SELECT auth.uid() AS uid), te.team_id)
      )
  )
);

DROP POLICY IF EXISTS seat_assignments_select_policy ON public.seat_assignments;
CREATE POLICY seat_assignments_select_policy
ON public.seat_assignments
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1
    FROM public.tickets tk
    JOIN public.ticketed_events te ON te.id = tk.ticketed_event_id
    LEFT JOIN public.ticket_orders o ON o.id = tk.order_id
    WHERE tk.id = seat_assignments.ticket_id
      AND (
        te.status = 'published'
        OR public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), te.org_id)
        OR public.staff_can_access_team((SELECT auth.uid() AS uid), te.team_id)
        OR o.purchaser_user_id = (SELECT auth.uid() AS uid)
        OR o.purchaser_email = (
          SELECT u.email
          FROM public.users u
          WHERE u.id = (SELECT auth.uid() AS uid)
        )
      )
  )
);

DROP POLICY IF EXISTS seat_holds_select_policy ON public.seat_holds;
CREATE POLICY seat_holds_select_policy
ON public.seat_holds
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1
    FROM public.ticket_orders o
    JOIN public.ticketed_events te ON te.id = o.ticketed_event_id
    WHERE o.id = seat_holds.order_id
      AND (
        te.status = 'published'
        OR public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), te.org_id)
        OR public.staff_can_access_team((SELECT auth.uid() AS uid), te.team_id)
      )
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('ticketing-seat-maps', 'ticketing-seat-maps', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS ticketing_seat_maps_public_read ON storage.objects;
CREATE POLICY ticketing_seat_maps_public_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'ticketing-seat-maps');

DROP POLICY IF EXISTS ticketing_seat_maps_org_upload ON storage.objects;
CREATE POLICY ticketing_seat_maps_org_upload
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticketing-seat-maps'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  AND EXISTS (
    SELECT 1
    FROM public.seat_maps sm
    JOIN public.ticketed_events te ON te.id = sm.ticketed_event_id
    WHERE sm.id = ((storage.foldername(name))[1])::uuid
      AND (
        public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), te.org_id)
        OR public.staff_can_access_team((SELECT auth.uid() AS uid), te.team_id)
      )
  )
);

DROP POLICY IF EXISTS ticketing_seat_maps_org_update ON storage.objects;
CREATE POLICY ticketing_seat_maps_org_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ticketing-seat-maps'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  AND EXISTS (
    SELECT 1
    FROM public.seat_maps sm
    JOIN public.ticketed_events te ON te.id = sm.ticketed_event_id
    WHERE sm.id = ((storage.foldername(name))[1])::uuid
      AND (
        public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), te.org_id)
        OR public.staff_can_access_team((SELECT auth.uid() AS uid), te.team_id)
      )
  )
)
WITH CHECK (
  bucket_id = 'ticketing-seat-maps'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  AND EXISTS (
    SELECT 1
    FROM public.seat_maps sm
    JOIN public.ticketed_events te ON te.id = sm.ticketed_event_id
    WHERE sm.id = ((storage.foldername(name))[1])::uuid
      AND (
        public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), te.org_id)
        OR public.staff_can_access_team((SELECT auth.uid() AS uid), te.team_id)
      )
  )
);

DROP POLICY IF EXISTS ticketing_seat_maps_org_delete ON storage.objects;
CREATE POLICY ticketing_seat_maps_org_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticketing-seat-maps'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  AND EXISTS (
    SELECT 1
    FROM public.seat_maps sm
    JOIN public.ticketed_events te ON te.id = sm.ticketed_event_id
    WHERE sm.id = ((storage.foldername(name))[1])::uuid
      AND (
        public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), te.org_id)
        OR public.staff_can_access_team((SELECT auth.uid() AS uid), te.team_id)
      )
  )
);

COMMIT;

