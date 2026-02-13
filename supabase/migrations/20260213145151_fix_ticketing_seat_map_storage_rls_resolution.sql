BEGIN;

CREATE OR REPLACE FUNCTION public.can_manage_seat_map_storage(
  check_user_id uuid,
  object_name text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  path_segments text[];
  segment text;
  segment_uuid uuid;
  candidate_ids uuid[] := ARRAY[]::uuid[];
  matched_map RECORD;
BEGIN
  IF check_user_id IS NULL OR object_name IS NULL OR btrim(object_name) = '' THEN
    RETURN false;
  END IF;

  path_segments := string_to_array(object_name, '/');

  FOREACH segment IN ARRAY path_segments LOOP
    segment_uuid := public.try_parse_uuid(segment);
    IF segment_uuid IS NOT NULL THEN
      candidate_ids := array_append(candidate_ids, segment_uuid);
    END IF;
  END LOOP;

  IF coalesce(array_length(candidate_ids, 1), 0) = 0 THEN
    RETURN false;
  END IF;

  FOR matched_map IN
    SELECT
      sm.id,
      sm.org_id,
      sm.team_id,
      sm.ticketed_event_id,
      te.org_id AS event_org_id,
      te.team_id AS event_team_id
    FROM public.seat_maps sm
    LEFT JOIN public.ticketed_events te ON te.id = sm.ticketed_event_id
    WHERE sm.id = ANY(candidate_ids)
  LOOP
    IF public.is_platform_admin(check_user_id) THEN
      RETURN true;
    END IF;

    IF matched_map.org_id IS NOT NULL AND public.user_is_org_admin(check_user_id, matched_map.org_id) THEN
      RETURN true;
    END IF;

    IF matched_map.team_id IS NOT NULL AND public.staff_can_access_team(check_user_id, matched_map.team_id) THEN
      RETURN true;
    END IF;

    IF matched_map.event_org_id IS NOT NULL AND public.user_is_org_admin(check_user_id, matched_map.event_org_id) THEN
      RETURN true;
    END IF;

    IF matched_map.event_team_id IS NOT NULL AND public.staff_can_access_team(check_user_id, matched_map.event_team_id) THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

DROP POLICY IF EXISTS ticketing_seat_maps_org_upload ON storage.objects;
CREATE POLICY ticketing_seat_maps_org_upload
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticketing-seat-maps'
  AND public.can_manage_seat_map_storage((SELECT auth.uid() AS uid), name)
);

DROP POLICY IF EXISTS ticketing_seat_maps_org_update ON storage.objects;
CREATE POLICY ticketing_seat_maps_org_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ticketing-seat-maps'
  AND public.can_manage_seat_map_storage((SELECT auth.uid() AS uid), name)
)
WITH CHECK (
  bucket_id = 'ticketing-seat-maps'
  AND public.can_manage_seat_map_storage((SELECT auth.uid() AS uid), name)
);

DROP POLICY IF EXISTS ticketing_seat_maps_org_delete ON storage.objects;
CREATE POLICY ticketing_seat_maps_org_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticketing-seat-maps'
  AND public.can_manage_seat_map_storage((SELECT auth.uid() AS uid), name)
);

COMMIT;
