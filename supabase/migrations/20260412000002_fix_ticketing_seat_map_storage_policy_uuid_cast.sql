BEGIN;

-- Safely parse UUID strings without raising 22P02.
CREATE OR REPLACE FUNCTION public.try_parse_uuid(value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN NULL;
  END IF;

  RETURN value::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ticketing-seat-maps', 'ticketing-seat-maps', true)
ON CONFLICT (id) DO NOTHING;

-- Backfill org ownership on legacy seat maps so org-admin storage policies evaluate correctly.
UPDATE public.seat_maps sm
SET
  org_id = te.org_id,
  team_id = COALESCE(sm.team_id, te.team_id)
FROM public.ticketed_events te
WHERE sm.org_id IS NULL
  AND sm.ticketed_event_id = te.id;

UPDATE public.seat_maps sm
SET org_id = tm.org_id
FROM public.teams tm
WHERE sm.org_id IS NULL
  AND sm.team_id = tm.id;

UPDATE public.seat_maps sm
SET org_id = v.org_id
FROM public.venues v
WHERE sm.org_id IS NULL
  AND sm.venue_id = v.id;

-- Clean up any historical ticketing-seat-maps policies so stale UUID casts
-- cannot break uploads in environments with policy drift.
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        coalesce(qual::text, '') ILIKE '%ticketing-seat-maps%'
        OR coalesce(with_check::text, '') ILIKE '%ticketing-seat-maps%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
  END LOOP;
END
$$;

CREATE POLICY ticketing_seat_maps_public_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'ticketing-seat-maps');

CREATE POLICY ticketing_seat_maps_org_upload
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticketing-seat-maps'
  AND EXISTS (
    SELECT 1
    FROM public.seat_maps sm
    WHERE sm.id = ANY (
      ARRAY[
        public.try_parse_uuid((storage.foldername(name))[1]),
        public.try_parse_uuid((storage.foldername(name))[2]),
        public.try_parse_uuid((storage.foldername(name))[3])
      ]
    )
    AND (
      public.is_platform_admin((SELECT auth.uid() AS uid))
      OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
      OR (sm.team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), sm.team_id))
    )
  )
);

CREATE POLICY ticketing_seat_maps_org_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ticketing-seat-maps'
  AND EXISTS (
    SELECT 1
    FROM public.seat_maps sm
    WHERE sm.id = ANY (
      ARRAY[
        public.try_parse_uuid((storage.foldername(name))[1]),
        public.try_parse_uuid((storage.foldername(name))[2]),
        public.try_parse_uuid((storage.foldername(name))[3])
      ]
    )
    AND (
      public.is_platform_admin((SELECT auth.uid() AS uid))
      OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
      OR (sm.team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), sm.team_id))
    )
  )
)
WITH CHECK (
  bucket_id = 'ticketing-seat-maps'
  AND EXISTS (
    SELECT 1
    FROM public.seat_maps sm
    WHERE sm.id = ANY (
      ARRAY[
        public.try_parse_uuid((storage.foldername(name))[1]),
        public.try_parse_uuid((storage.foldername(name))[2]),
        public.try_parse_uuid((storage.foldername(name))[3])
      ]
    )
    AND (
      public.is_platform_admin((SELECT auth.uid() AS uid))
      OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
      OR (sm.team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), sm.team_id))
    )
  )
);

CREATE POLICY ticketing_seat_maps_org_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticketing-seat-maps'
  AND EXISTS (
    SELECT 1
    FROM public.seat_maps sm
    WHERE sm.id = ANY (
      ARRAY[
        public.try_parse_uuid((storage.foldername(name))[1]),
        public.try_parse_uuid((storage.foldername(name))[2]),
        public.try_parse_uuid((storage.foldername(name))[3])
      ]
    )
    AND (
      public.is_platform_admin((SELECT auth.uid() AS uid))
      OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
      OR (sm.team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), sm.team_id))
    )
  )
);

COMMIT;
