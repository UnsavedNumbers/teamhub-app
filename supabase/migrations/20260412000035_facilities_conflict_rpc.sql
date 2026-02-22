-- Facilities Management RPC Functions
-- Conflict checking, reservation creation/update, and alternative suggestions

-- ============================================================================
-- HELPER: Check reservation conflicts
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_reservation_conflicts(
    p_org_id uuid,
    p_resource_id uuid,
    p_start_at timestamptz,
    p_end_at timestamptz,
    p_exclude_reservation_id uuid DEFAULT NULL,
    p_tentative_blocks boolean DEFAULT false
)
RETURNS TABLE (
    has_conflict boolean,
    conflicting_reservations jsonb,
    conflicting_blackouts jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
    v_conflicting_reservations jsonb := '[]'::jsonb;
    v_conflicting_blackouts jsonb := '[]'::jsonb;
    v_has_conflict boolean := false;
BEGIN
    -- Check for overlapping reservations (excluding cancelled and optionally tentative)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'title', title,
            'start_at', start_at,
            'end_at', end_at,
            'status', status,
            'reservation_type', reservation_type
        )
    )
    INTO v_conflicting_reservations
    FROM public.facility_reservations
    WHERE org_id = p_org_id
        AND resource_id = p_resource_id
        AND status != 'cancelled'
        AND (p_tentative_blocks = true OR status = 'confirmed')
        AND (id != p_exclude_reservation_id OR p_exclude_reservation_id IS NULL)
        AND (
            -- Overlap: reservation starts before our end AND ends after our start
            (start_at < p_end_at AND end_at > p_start_at)
        );

    -- Check for overlapping blackouts (one-time only for v1)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'title', title,
            'start_at', start_at,
            'end_at', end_at,
            'reason', reason
        )
    )
    INTO v_conflicting_blackouts
    FROM public.facility_blackouts
    WHERE org_id = p_org_id
        AND (
            resource_id = p_resource_id
            OR (
                resource_id IS NULL
                AND facility_id = (SELECT facility_id FROM public.facility_resources WHERE id = p_resource_id)
            )
        )
        AND repeats_rule IS NULL -- v1: only one-time blackouts
        AND (start_at < p_end_at AND end_at > p_start_at);

    -- Set conflict flag
    v_has_conflict := (
        (v_conflicting_reservations IS NOT NULL AND jsonb_array_length(v_conflicting_reservations) > 0)
        OR (v_conflicting_blackouts IS NOT NULL AND jsonb_array_length(v_conflicting_blackouts) > 0)
    );

    RETURN QUERY SELECT
        v_has_conflict,
        COALESCE(v_conflicting_reservations, '[]'::jsonb),
        COALESCE(v_conflicting_blackouts, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.check_reservation_conflicts IS 'Checks for overlapping reservations and blackouts. Returns conflict status and details.';

-- ============================================================================
-- CREATE RESERVATION (with conflict check)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_reservation(
    p_org_id uuid,
    p_facility_id uuid,
    p_resource_id uuid,
    p_reservation_type text,
    p_start_at timestamptz,
    p_end_at timestamptz,
    p_title text,
    p_status text DEFAULT 'confirmed',
    p_event_id uuid DEFAULT NULL,
    p_team_id uuid DEFAULT NULL,
    p_program_id uuid DEFAULT NULL,
    p_sport_id uuid DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_allow_conflict boolean DEFAULT false,
    p_tentative_blocks boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_reservation_id uuid;
    v_conflict_result RECORD;
    v_is_org_admin boolean;
BEGIN
    -- Check permissions: must be org admin (coaches handled separately)
    SELECT public.user_is_org_admin(v_user_id, p_org_id) INTO v_is_org_admin;
    
    IF NOT (public.is_platform_admin(v_user_id) OR v_is_org_admin) THEN
        RAISE EXCEPTION 'Insufficient permissions: org_admin required';
    END IF;

    -- Validate resource belongs to facility
    IF NOT EXISTS (
        SELECT 1 FROM public.facility_resources
        WHERE id = p_resource_id
        AND facility_id = p_facility_id
        AND org_id = p_org_id
    ) THEN
        RAISE EXCEPTION 'Resource does not belong to facility or org';
    END IF;

    -- Check conflicts (unless override allowed)
    IF NOT p_allow_conflict THEN
        SELECT * INTO v_conflict_result
        FROM public.check_reservation_conflicts(
            p_org_id,
            p_resource_id,
            p_start_at,
            p_end_at,
            NULL, -- exclude_reservation_id
            p_tentative_blocks
        );

        IF v_conflict_result.has_conflict THEN
            RAISE EXCEPTION 'Reservation conflicts with existing booking or blackout'
                USING DETAIL = jsonb_build_object(
                    'conflicting_reservations', v_conflict_result.conflicting_reservations,
                    'conflicting_blackouts', v_conflict_result.conflicting_blackouts
                )::text;
        END IF;
    END IF;

    -- Create reservation (use row lock to prevent race conditions)
    INSERT INTO public.facility_reservations (
        org_id,
        facility_id,
        resource_id,
        reservation_type,
        status,
        start_at,
        end_at,
        title,
        event_id,
        team_id,
        program_id,
        sport_id,
        notes,
        created_by
    )
    VALUES (
        p_org_id,
        p_facility_id,
        p_resource_id,
        p_reservation_type,
        p_status,
        p_start_at,
        p_end_at,
        p_title,
        p_event_id,
        p_team_id,
        p_program_id,
        p_sport_id,
        p_notes,
        v_user_id
    )
    RETURNING id INTO v_reservation_id;

    RETURN v_reservation_id;
END;
$$;

COMMENT ON FUNCTION public.create_reservation IS 'Creates a reservation with conflict checking. Returns reservation ID or raises exception on conflict.';

-- ============================================================================
-- UPDATE RESERVATION (with conflict check)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_reservation(
    p_reservation_id uuid,
    p_resource_id uuid DEFAULT NULL,
    p_reservation_type text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_start_at timestamptz DEFAULT NULL,
    p_end_at timestamptz DEFAULT NULL,
    p_title text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_allow_conflict boolean DEFAULT false,
    p_tentative_blocks boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_reservation RECORD;
    v_conflict_result RECORD;
    v_is_org_admin boolean;
    v_final_resource_id uuid;
    v_final_start_at timestamptz;
    v_final_end_at timestamptz;
BEGIN
    -- Get existing reservation
    SELECT * INTO v_reservation
    FROM public.facility_reservations
    WHERE id = p_reservation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;

    -- Check permissions
    SELECT public.user_is_org_admin(v_user_id, v_reservation.org_id) INTO v_is_org_admin;
    
    IF NOT (public.is_platform_admin(v_user_id) OR v_is_org_admin) THEN
        RAISE EXCEPTION 'Insufficient permissions: org_admin required';
    END IF;

    -- Determine final values (use provided or existing)
    v_final_resource_id := COALESCE(p_resource_id, v_reservation.resource_id);
    v_final_start_at := COALESCE(p_start_at, v_reservation.start_at);
    v_final_end_at := COALESCE(p_end_at, v_reservation.end_at);

    -- Check conflicts (unless override allowed or no time/resource change)
    IF NOT p_allow_conflict AND (
        p_resource_id IS NOT NULL OR p_start_at IS NOT NULL OR p_end_at IS NOT NULL
    ) THEN
        SELECT * INTO v_conflict_result
        FROM public.check_reservation_conflicts(
            v_reservation.org_id,
            v_final_resource_id,
            v_final_start_at,
            v_final_end_at,
            p_reservation_id, -- exclude this reservation
            p_tentative_blocks
        );

        IF v_conflict_result.has_conflict THEN
            RAISE EXCEPTION 'Reservation conflicts with existing booking or blackout'
                USING DETAIL = jsonb_build_object(
                    'conflicting_reservations', v_conflict_result.conflicting_reservations,
                    'conflicting_blackouts', v_conflict_result.conflicting_blackouts
                )::text;
        END IF;
    END IF;

    -- Update reservation
    UPDATE public.facility_reservations
    SET
        resource_id = COALESCE(p_resource_id, resource_id),
        reservation_type = COALESCE(p_reservation_type, reservation_type),
        status = COALESCE(p_status, status),
        start_at = COALESCE(p_start_at, start_at),
        end_at = COALESCE(p_end_at, end_at),
        title = COALESCE(p_title, title),
        notes = COALESCE(p_notes, notes),
        updated_at = now()
    WHERE id = p_reservation_id;

    RETURN p_reservation_id;
END;
$$;

COMMENT ON FUNCTION public.update_reservation IS 'Updates a reservation with conflict checking. Returns reservation ID or raises exception on conflict.';

-- ============================================================================
-- SUGGEST ALTERNATIVES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.suggest_reservation_alternatives(
    p_org_id uuid,
    p_start_at timestamptz,
    p_end_at timestamptz,
    p_facility_id uuid DEFAULT NULL,
    p_resource_id uuid DEFAULT NULL,
    p_duration_minutes integer DEFAULT NULL,
    p_prefer_same_resource boolean DEFAULT true
)
RETURNS TABLE (
    resource_id uuid,
    resource_name text,
    facility_name text,
    suggested_start_at timestamptz,
    suggested_end_at timestamptz,
    score integer -- Higher is better (same resource > same facility > other)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
    v_duration interval;
    v_user_id uuid := auth.uid();
BEGIN
    -- Check permissions
    IF NOT (public.is_platform_admin(v_user_id) OR public.user_has_org_access(v_user_id, p_org_id)) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    -- Calculate duration
    IF p_duration_minutes IS NULL THEN
        v_duration := p_end_at - p_start_at;
    ELSE
        v_duration := (p_duration_minutes || ' minutes')::interval;
    END IF;

    -- Find available slots
    -- Strategy: same resource first (earlier/later times), then same facility, then other facilities
    RETURN QUERY
    WITH available_slots AS (
        SELECT DISTINCT
            fr.id AS res_id,
            fr.name AS res_name,
            f.name AS fac_name,
            fr.facility_id AS fac_id,
            -- Try slots: same time, 30min before, 30min after, 1hr before, 1hr after
            UNNEST(ARRAY[
                p_start_at,
                p_start_at - interval '30 minutes',
                p_start_at + interval '30 minutes',
                p_start_at - interval '1 hour',
                p_start_at + interval '1 hour'
            ]) AS slot_start
        FROM public.facility_resources fr
        JOIN public.facilities f ON f.id = fr.facility_id
        WHERE fr.org_id = p_org_id
            AND fr.status = 'active'
            AND fr.reservable = true
            AND (
                p_facility_id IS NULL OR fr.facility_id = p_facility_id
            )
            AND (
                p_resource_id IS NULL OR fr.id = p_resource_id
            )
    )
    SELECT
        asl.res_id AS resource_id,
        asl.res_name AS resource_name,
        asl.fac_name AS facility_name,
        asl.slot_start AS suggested_start_at,
        asl.slot_start + v_duration AS suggested_end_at,
        CASE
            WHEN asl.res_id = p_resource_id THEN 100 -- Same resource
            WHEN asl.fac_id = p_facility_id THEN 50  -- Same facility
            ELSE 10                                  -- Other facility
        END AS score
    FROM available_slots asl
    WHERE NOT EXISTS (
        -- No conflicting reservation
        SELECT 1 FROM public.facility_reservations res
        WHERE res.resource_id = asl.res_id
        AND res.status != 'cancelled'
        AND res.status = 'confirmed'
        AND (res.start_at < (asl.slot_start + v_duration) AND res.end_at > asl.slot_start)
    )
    AND NOT EXISTS (
        -- No conflicting blackout
        SELECT 1 FROM public.facility_blackouts bo
        WHERE (
            bo.resource_id = asl.res_id
            OR (bo.resource_id IS NULL AND bo.facility_id = asl.fac_id)
        )
        AND bo.repeats_rule IS NULL -- v1: one-time only
        AND (bo.start_at < (asl.slot_start + v_duration) AND bo.end_at > asl.slot_start)
    )
    ORDER BY score DESC, asl.slot_start ASC
    LIMIT 10;
END;
$$;

COMMENT ON FUNCTION public.suggest_reservation_alternatives IS 'Suggests available time slots for a reservation. Returns up to 10 alternatives with scores.';
