-- =============================================================================
-- Venue-Normalized Seat Maps Migration
-- =============================================================================
-- Moves seat map ownership from event-scoped to venue + optional team context.
-- Adds draft/published versioning, fallback chain, and backfill from existing data.
--
-- Decision log:
--   Rollout: one-shot
--   Venue identity: unique (org_id, google_place_id)
--   Seat map ownership: venue + optional team context
--   Versioning: mutable draft + publish snapshot; events reference published version
--   Scope: all bulk tools + guardrail prompts in initial release
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. EXTEND VENUES TABLE
-- =============================================================================
-- Add Google Places identity + richer address fields to existing venues table.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS latitude numeric(10,8),
  ADD COLUMN IF NOT EXISTS longitude numeric(11,8),
  ADD COLUMN IF NOT EXISTS maps_url text,
  ADD COLUMN IF NOT EXISTS is_virtual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS virtual_link text,
  ADD COLUMN IF NOT EXISTS default_seat_map_id uuid;

-- Canonical venue identity: one venue per place per org
CREATE UNIQUE INDEX IF NOT EXISTS uq_venues_org_place_id
  ON public.venues (org_id, google_place_id)
  WHERE google_place_id IS NOT NULL;

-- Venues FK to organizations
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_org_id_fkey;
ALTER TABLE public.venues
  ADD CONSTRAINT venues_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.venues.google_place_id IS 'Google Places API place_id for canonical venue identity';
COMMENT ON COLUMN public.venues.default_seat_map_id IS 'Default seat map for this venue (resolved in fallback chain)';


-- =============================================================================
-- 2. RESTRUCTURE SEAT MAPS OWNERSHIP
-- =============================================================================
-- Move from event-scoped (ticketed_event_id NOT NULL) to venue-scoped
-- with optional team context.

-- 2a. Add new ownership columns
ALTER TABLE public.seat_maps
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS venue_id uuid,
  ADD COLUMN IF NOT EXISTS team_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_snapshot_id uuid;

-- Status check: draft or published
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'seat_maps'
      AND constraint_name = 'seat_maps_status_check'
  ) THEN
    ALTER TABLE public.seat_maps
      ADD CONSTRAINT seat_maps_status_check
      CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

-- 2b. Seat map snapshots table (immutable published versions)
CREATE TABLE IF NOT EXISTS public.seat_map_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_map_id uuid NOT NULL REFERENCES public.seat_maps(id) ON DELETE CASCADE,
  version integer NOT NULL,
  name text NOT NULL,
  chart_image_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  section_count integer NOT NULL DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_seat_map_snapshots_version
  ON public.seat_map_snapshots (seat_map_id, version);

CREATE INDEX IF NOT EXISTS idx_seat_map_snapshots_seat_map
  ON public.seat_map_snapshots (seat_map_id);

ALTER TABLE public.seat_map_snapshots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.seat_map_snapshots IS 'Immutable published snapshots of seat maps. Events reference these for ticket assignments.';
COMMENT ON COLUMN public.seat_map_snapshots.sections_data IS 'Full section/seat layout JSON at time of publish. Preserves seat IDs for assignment integrity.';


-- =============================================================================
-- 3. ADD FALLBACK CHAIN COLUMNS
-- =============================================================================

-- Events table: explicit seat map override
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_id uuid,
  ADD COLUMN IF NOT EXISTS seat_map_id uuid;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_venue_id_fkey;
ALTER TABLE public.events
  ADD CONSTRAINT events_venue_id_fkey
  FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_venue_id ON public.events (venue_id);

-- Teams: default seat map
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS default_seat_map_id uuid,
  ADD COLUMN IF NOT EXISTS home_venue_id uuid;

ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_home_venue_id_fkey;
ALTER TABLE public.teams
  ADD CONSTRAINT teams_home_venue_id_fkey
  FOREIGN KEY (home_venue_id) REFERENCES public.venues(id) ON DELETE SET NULL;

-- Organizations: org-level default seat map
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_seat_map_id uuid;

-- Ticketed Events: add seat map snapshot reference
ALTER TABLE public.ticketed_events
  ADD COLUMN IF NOT EXISTS seat_map_snapshot_id uuid;

ALTER TABLE public.ticketed_events DROP CONSTRAINT IF EXISTS ticketed_events_seat_map_snapshot_id_fkey;
ALTER TABLE public.ticketed_events
  ADD CONSTRAINT ticketed_events_seat_map_snapshot_id_fkey
  FOREIGN KEY (seat_map_snapshot_id) REFERENCES public.seat_map_snapshots(id) ON DELETE SET NULL;


-- =============================================================================
-- 4. BACKFILL: CREATE VENUES FROM EVENT LOCATIONS
-- =============================================================================
-- Deduplicate by (org_id, place_id) where place_id exists.
-- For ticketed events without place_id, use (org_id, venue_name, city, state).

-- 4a. From event_locations that have place_id
INSERT INTO public.venues (org_id, name, google_place_id, address_line1, address_line2, city, state, postal_code, country, latitude, longitude, maps_url)
SELECT DISTINCT ON (e.org_id, el.place_id)
  e.org_id,
  COALESCE(el.venue_name, 'Unnamed Venue'),
  el.place_id,
  el.address_line1,
  el.address_line2,
  el.city,
  el.state,
  el.postal_code,
  COALESCE(el.country, 'US'),
  el.latitude,
  el.longitude,
  el.maps_url
FROM public.event_locations el
JOIN public.events e ON e.id = el.event_id
WHERE el.place_id IS NOT NULL
  AND e.org_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.org_id = e.org_id AND v.google_place_id = el.place_id
  )
ORDER BY e.org_id, el.place_id, el.updated_at DESC NULLS LAST;

-- 4b. Link events to their new venue records
UPDATE public.events e
SET venue_id = v.id
FROM public.event_locations el
JOIN public.venues v ON v.google_place_id = el.place_id
WHERE el.event_id = e.id
  AND v.org_id = e.org_id
  AND el.place_id IS NOT NULL
  AND e.venue_id IS NULL;

-- 4c. For ticketed events: create venues from denormalized venue_ fields
-- Only where venue_id is still NULL and we have venue_name
INSERT INTO public.venues (org_id, name, city, state, address_line1)
SELECT DISTINCT ON (te.org_id, te.venue_name, te.venue_city, te.venue_state)
  te.org_id,
  te.venue_name,
  te.venue_city,
  te.venue_state,
  te.venue_address_line1
FROM public.ticketed_events te
WHERE te.venue_id IS NULL
  AND te.venue_name IS NOT NULL
  AND te.org_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.org_id = te.org_id
      AND LOWER(v.name) = LOWER(te.venue_name)
      AND COALESCE(LOWER(v.city), '') = COALESCE(LOWER(te.venue_city), '')
      AND COALESCE(LOWER(v.state), '') = COALESCE(LOWER(te.venue_state), '')
  )
ORDER BY te.org_id, te.venue_name, te.venue_city, te.venue_state, te.updated_at DESC NULLS LAST;

-- 4d. Link ticketed events to best matching venue
UPDATE public.ticketed_events te
SET venue_id = v.id
FROM public.venues v
WHERE te.venue_id IS NULL
  AND te.venue_name IS NOT NULL
  AND v.org_id = te.org_id
  AND LOWER(v.name) = LOWER(te.venue_name)
  AND COALESCE(LOWER(v.city), '') = COALESCE(LOWER(te.venue_city), '')
  AND COALESCE(LOWER(v.state), '') = COALESCE(LOWER(te.venue_state), '');


-- =============================================================================
-- 5. BACKFILL: MIGRATE SEAT MAPS TO VENUE OWNERSHIP
-- =============================================================================

-- 5a. Populate org_id and venue_id on existing seat maps from their ticketed event
UPDATE public.seat_maps sm
SET
  org_id   = te.org_id,
  venue_id = te.venue_id,
  team_id  = te.team_id
FROM public.ticketed_events te
WHERE te.id = sm.ticketed_event_id
  AND sm.org_id IS NULL;

-- 5b. Make ticketed_event_id nullable (no longer required)
ALTER TABLE public.seat_maps
  ALTER COLUMN ticketed_event_id DROP NOT NULL;

-- 5c. Add org_id NOT NULL after backfill (with safety default)
-- Only enforce if all rows have org_id after backfill
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count FROM public.seat_maps WHERE org_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.seat_maps ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

-- 5d. Add FKs for new columns
ALTER TABLE public.seat_maps DROP CONSTRAINT IF EXISTS seat_maps_org_id_fkey;
ALTER TABLE public.seat_maps
  ADD CONSTRAINT seat_maps_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.seat_maps DROP CONSTRAINT IF EXISTS seat_maps_venue_id_fkey;
ALTER TABLE public.seat_maps
  ADD CONSTRAINT seat_maps_venue_id_fkey
  FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL;

ALTER TABLE public.seat_maps DROP CONSTRAINT IF EXISTS seat_maps_team_id_fkey;
ALTER TABLE public.seat_maps
  ADD CONSTRAINT seat_maps_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- Deferred: venue default FK (after seat maps exist)
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_default_seat_map_id_fkey;
ALTER TABLE public.venues
  ADD CONSTRAINT venues_default_seat_map_id_fkey
  FOREIGN KEY (default_seat_map_id) REFERENCES public.seat_maps(id) ON DELETE SET NULL;

ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_default_seat_map_id_fkey;
ALTER TABLE public.teams
  ADD CONSTRAINT teams_default_seat_map_id_fkey
  FOREIGN KEY (default_seat_map_id) REFERENCES public.seat_maps(id) ON DELETE SET NULL;

ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_default_seat_map_id_fkey;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_default_seat_map_id_fkey
  FOREIGN KEY (default_seat_map_id) REFERENCES public.seat_maps(id) ON DELETE SET NULL;

-- New indexes
CREATE INDEX IF NOT EXISTS idx_seat_maps_org_id ON public.seat_maps (org_id);
CREATE INDEX IF NOT EXISTS idx_seat_maps_venue_id ON public.seat_maps (venue_id);
CREATE INDEX IF NOT EXISTS idx_seat_maps_team_id ON public.seat_maps (team_id);
CREATE INDEX IF NOT EXISTS idx_seat_maps_status ON public.seat_maps (status);

-- 5e. Create initial published snapshots for all existing seat maps
INSERT INTO public.seat_map_snapshots (seat_map_id, version, name, chart_image_url, metadata, sections_data, section_count, published_at)
SELECT
  sm.id,
  1,
  sm.name,
  sm.chart_image_url,
  sm.metadata,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', sms.id,
      'section_name', sms.section_name,
      'row_identifier', sms.row_identifier,
      'seat_identifier', sms.seat_identifier,
      'position_metadata', sms.position_metadata,
      'seat_attributes', sms.seat_attributes,
      'is_available', sms.is_available
    ) ORDER BY sms.section_name, sms.row_identifier, sms.seat_identifier)
    FROM public.seat_map_sections sms
    WHERE sms.seat_map_id = sm.id
  ), '[]'::jsonb),
  (SELECT COUNT(*) FROM public.seat_map_sections sms WHERE sms.seat_map_id = sm.id),
  now()
FROM public.seat_maps sm;

-- Update seat maps with published snapshot reference and status
UPDATE public.seat_maps sm
SET
  status = 'published',
  published_at = now(),
  published_snapshot_id = snap.id
FROM public.seat_map_snapshots snap
WHERE snap.seat_map_id = sm.id
  AND snap.version = 1;


-- =============================================================================
-- 6. SEAT MAP RESOLUTION FUNCTION (fallback chain)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resolve_seat_map_for_event(
  p_event_id uuid,
  p_team_id uuid DEFAULT NULL,
  p_venue_id uuid DEFAULT NULL,
  p_org_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_seat_map_id uuid;
  v_venue_id uuid;
  v_team_id uuid;
  v_org_id uuid;
BEGIN
  -- 1. Explicit event override
  SELECT e.seat_map_id, e.venue_id, e.team_id, e.org_id
    INTO v_seat_map_id, v_venue_id, v_team_id, v_org_id
  FROM public.events e
  WHERE e.id = p_event_id;

  -- Use params as fallbacks for NULLs
  v_venue_id := COALESCE(v_venue_id, p_venue_id);
  v_team_id  := COALESCE(v_team_id, p_team_id);
  v_org_id   := COALESCE(v_org_id, p_org_id);

  IF v_seat_map_id IS NOT NULL THEN
    RETURN v_seat_map_id;
  END IF;

  -- 2. Team default
  IF v_team_id IS NOT NULL THEN
    SELECT t.default_seat_map_id INTO v_seat_map_id
    FROM public.teams t
    WHERE t.id = v_team_id;

    IF v_seat_map_id IS NOT NULL THEN
      RETURN v_seat_map_id;
    END IF;
  END IF;

  -- 3. Venue default
  IF v_venue_id IS NOT NULL THEN
    SELECT vn.default_seat_map_id INTO v_seat_map_id
    FROM public.venues vn
    WHERE vn.id = v_venue_id;

    IF v_seat_map_id IS NOT NULL THEN
      RETURN v_seat_map_id;
    END IF;
  END IF;

  -- 4. Org default
  IF v_org_id IS NOT NULL THEN
    SELECT o.default_seat_map_id INTO v_seat_map_id
    FROM public.organizations o
    WHERE o.id = v_org_id;

    RETURN v_seat_map_id; -- may be NULL
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.resolve_seat_map_for_event IS 'Fallback chain: event override → team default → venue default → org default';


-- =============================================================================
-- 7. PUBLISH SEAT MAP FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.publish_seat_map(p_seat_map_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_version integer;
  v_snapshot_id uuid;
  v_section_count integer;
BEGIN
  -- Calculate next version
  SELECT COALESCE(MAX(version), 0) + 1
    INTO v_next_version
  FROM public.seat_map_snapshots
  WHERE seat_map_id = p_seat_map_id;

  -- Count sections
  SELECT COUNT(*)
    INTO v_section_count
  FROM public.seat_map_sections
  WHERE seat_map_id = p_seat_map_id;

  -- Create immutable snapshot
  INSERT INTO public.seat_map_snapshots (
    seat_map_id, version, name, chart_image_url, metadata,
    sections_data, section_count, published_at
  )
  SELECT
    sm.id,
    v_next_version,
    sm.name,
    sm.chart_image_url,
    sm.metadata,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sms.id,
        'section_name', sms.section_name,
        'row_identifier', sms.row_identifier,
        'seat_identifier', sms.seat_identifier,
        'position_metadata', sms.position_metadata,
        'seat_attributes', sms.seat_attributes,
        'is_available', sms.is_available
      ) ORDER BY sms.section_name, sms.row_identifier, sms.seat_identifier)
      FROM public.seat_map_sections sms
      WHERE sms.seat_map_id = sm.id
    ), '[]'::jsonb),
    v_section_count,
    now()
  FROM public.seat_maps sm
  WHERE sm.id = p_seat_map_id
  RETURNING id INTO v_snapshot_id;

  -- Update seat map status
  UPDATE public.seat_maps
  SET
    status = 'published',
    version = v_next_version,
    published_at = now(),
    published_snapshot_id = v_snapshot_id,
    updated_at = now()
  WHERE id = p_seat_map_id;

  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION public.publish_seat_map IS 'Creates an immutable snapshot of the current seat map state and marks it as published.';


-- =============================================================================
-- 8. CLONE SEAT MAP FUNCTION (for event overrides / season copy)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.clone_seat_map(
  p_source_seat_map_id uuid,
  p_new_name text DEFAULT NULL,
  p_target_venue_id uuid DEFAULT NULL,
  p_target_team_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_map_id uuid;
  v_source_map public.seat_maps;
BEGIN
  SELECT * INTO v_source_map FROM public.seat_maps WHERE id = p_source_seat_map_id;

  IF v_source_map IS NULL THEN
    RAISE EXCEPTION 'Source seat map not found';
  END IF;

  -- Create a new draft copy
  INSERT INTO public.seat_maps (
    org_id, venue_id, team_id, ticketed_event_id,
    name, chart_image_url, metadata, status, version
  ) VALUES (
    v_source_map.org_id,
    COALESCE(p_target_venue_id, v_source_map.venue_id),
    COALESCE(p_target_team_id, v_source_map.team_id),
    NULL,  -- clones are not event-scoped
    COALESCE(p_new_name, v_source_map.name || ' (Copy)'),
    v_source_map.chart_image_url,
    v_source_map.metadata,
    'draft',
    1
  )
  RETURNING id INTO v_new_map_id;

  -- Clone all sections
  INSERT INTO public.seat_map_sections (
    seat_map_id, section_name, row_identifier, seat_identifier,
    position_metadata, seat_attributes, is_available
  )
  SELECT
    v_new_map_id,
    sms.section_name,
    sms.row_identifier,
    sms.seat_identifier,
    sms.position_metadata,
    sms.seat_attributes,
    sms.is_available
  FROM public.seat_map_sections sms
  WHERE sms.seat_map_id = p_source_seat_map_id;

  RETURN v_new_map_id;
END;
$$;

COMMENT ON FUNCTION public.clone_seat_map IS 'Deep-clones a seat map and its sections into a new draft, optionally retargeting venue/team.';


-- =============================================================================
-- 9. UPDATE RLS POLICIES
-- =============================================================================
-- Seat maps now belong to org directly; RLS keys through org_id.

-- Seat maps: SELECT
DROP POLICY IF EXISTS seat_maps_select_policy ON public.seat_maps;
CREATE POLICY seat_maps_select_policy
ON public.seat_maps
FOR SELECT
TO authenticated, anon
USING (
  -- Published maps visible to anyone (public seat selection)
  status = 'published'
  OR public.is_platform_admin((SELECT auth.uid() AS uid))
  OR public.user_is_org_admin((SELECT auth.uid() AS uid), org_id)
  OR (team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), team_id))
);

-- Seat maps: WRITE
DROP POLICY IF EXISTS seat_maps_write_policy ON public.seat_maps;
CREATE POLICY seat_maps_write_policy
ON public.seat_maps
FOR ALL
TO authenticated
USING (
  public.is_platform_admin((SELECT auth.uid() AS uid))
  OR public.user_is_org_admin((SELECT auth.uid() AS uid), org_id)
  OR (team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), team_id))
)
WITH CHECK (
  public.is_platform_admin((SELECT auth.uid() AS uid))
  OR public.user_is_org_admin((SELECT auth.uid() AS uid), org_id)
  OR (team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), team_id))
);

-- Seat map sections: SELECT (join through seat_maps.org_id)
DROP POLICY IF EXISTS seat_map_sections_select_policy ON public.seat_map_sections;
CREATE POLICY seat_map_sections_select_policy
ON public.seat_map_sections
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.seat_maps sm
    WHERE sm.id = seat_map_sections.seat_map_id
      AND (
        sm.status = 'published'
        OR public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
        OR (sm.team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), sm.team_id))
      )
  )
);

-- Seat map sections: WRITE
DROP POLICY IF EXISTS seat_map_sections_write_policy ON public.seat_map_sections;
CREATE POLICY seat_map_sections_write_policy
ON public.seat_map_sections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.seat_maps sm
    WHERE sm.id = seat_map_sections.seat_map_id
      AND (
        public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
        OR (sm.team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), sm.team_id))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.seat_maps sm
    WHERE sm.id = seat_map_sections.seat_map_id
      AND (
        public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
        OR (sm.team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), sm.team_id))
      )
  )
);

-- Seat map snapshots: SELECT
CREATE POLICY seat_map_snapshots_select_policy
ON public.seat_map_snapshots
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.seat_maps sm
    WHERE sm.id = seat_map_snapshots.seat_map_id
      AND (
        sm.status = 'published'
        OR public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
        OR (sm.team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), sm.team_id))
      )
  )
);

-- Seat map snapshots: WRITE (only by admins)
CREATE POLICY seat_map_snapshots_write_policy
ON public.seat_map_snapshots
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.seat_maps sm
    WHERE sm.id = seat_map_snapshots.seat_map_id
      AND (
        public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.seat_maps sm
    WHERE sm.id = seat_map_snapshots.seat_map_id
      AND (
        public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
      )
  )
);

-- Venues: SELECT (any authenticated user in the org)
DROP POLICY IF EXISTS venues_select_policy ON public.venues;
CREATE POLICY venues_select_policy
ON public.venues
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin((SELECT auth.uid() AS uid))
  OR public.user_is_org_admin((SELECT auth.uid() AS uid), org_id)
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = (SELECT auth.uid() AS uid)
      AND u.org_id = venues.org_id
  )
);

-- Venues: WRITE (org admins only)
DROP POLICY IF EXISTS venues_write_policy ON public.venues;
CREATE POLICY venues_write_policy
ON public.venues
FOR ALL
TO authenticated
USING (
  public.is_platform_admin((SELECT auth.uid() AS uid))
  OR public.user_is_org_admin((SELECT auth.uid() AS uid), org_id)
)
WITH CHECK (
  public.is_platform_admin((SELECT auth.uid() AS uid))
  OR public.user_is_org_admin((SELECT auth.uid() AS uid), org_id)
);


-- =============================================================================
-- 10. UPDATE STORAGE POLICIES
-- =============================================================================
-- Storage now checks seat_maps.org_id directly instead of through ticketed_events.

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
    WHERE sm.id = ((storage.foldername(name))[1])::uuid
      AND (
        public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
        OR (sm.team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), sm.team_id))
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
    WHERE sm.id = ((storage.foldername(name))[1])::uuid
      AND (
        public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
        OR (sm.team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), sm.team_id))
      )
  )
)
WITH CHECK (
  bucket_id = 'ticketing-seat-maps'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  AND EXISTS (
    SELECT 1
    FROM public.seat_maps sm
    WHERE sm.id = ((storage.foldername(name))[1])::uuid
      AND (
        public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
        OR (sm.team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), sm.team_id))
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
    WHERE sm.id = ((storage.foldername(name))[1])::uuid
      AND (
        public.is_platform_admin((SELECT auth.uid() AS uid))
        OR public.user_is_org_admin((SELECT auth.uid() AS uid), sm.org_id)
        OR (sm.team_id IS NOT NULL AND public.staff_can_access_team((SELECT auth.uid() AS uid), sm.team_id))
      )
  )
);

COMMIT;
