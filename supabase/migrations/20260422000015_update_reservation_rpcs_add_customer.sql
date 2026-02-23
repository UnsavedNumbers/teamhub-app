-- Update reservation RPCs to support customer_id
-- Adds customer_id and cancellation_reason parameters.
-- Drop existing overloads first so CREATE OR REPLACE replaces them (avoids ambiguous COMMENT ON FUNCTION).

-- ============================================================================
-- DROP EXISTING OVERLOADS (exact signatures from 20260412000035_facilities_conflict_rpc.sql)
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_reservation(uuid, uuid, uuid, text, timestamptz, timestamptz, text, text, uuid, uuid, uuid, uuid, text, boolean, boolean);

DROP FUNCTION IF EXISTS public.update_reservation(uuid, uuid, text, text, timestamptz, timestamptz, text, text, boolean, boolean);

-- ============================================================================
-- UPDATE create_reservation RPC
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
    p_customer_id uuid DEFAULT NULL,
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

    -- Validate customer belongs to org (if provided)
    IF p_customer_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.customers
            WHERE id = p_customer_id
            AND org_id = p_org_id
        ) THEN
            RAISE EXCEPTION 'Customer does not belong to organization';
        END IF;
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
        customer_id,
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
        p_customer_id,
        p_notes,
        v_user_id
    )
    RETURNING id INTO v_reservation_id;

    RETURN v_reservation_id;
END;
$$;

COMMENT ON FUNCTION public.create_reservation(uuid, uuid, uuid, text, timestamptz, timestamptz, text, text, uuid, uuid, uuid, uuid, uuid, text, boolean, boolean) IS 'Creates a reservation with conflict checking. Returns reservation ID or raises exception on conflict. Supports customer_id parameter.';

-- ============================================================================
-- UPDATE update_reservation RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_reservation(
    p_reservation_id uuid,
    p_resource_id uuid DEFAULT NULL,
    p_reservation_type text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_start_at timestamptz DEFAULT NULL,
    p_end_at timestamptz DEFAULT NULL,
    p_title text DEFAULT NULL,
    p_customer_id uuid DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_cancellation_reason text DEFAULT NULL,
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

    -- Validate customer belongs to org (if provided)
    IF p_customer_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.customers
            WHERE id = p_customer_id
            AND org_id = v_reservation.org_id
        ) THEN
            RAISE EXCEPTION 'Customer does not belong to organization';
        END IF;
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
        customer_id = COALESCE(p_customer_id, customer_id),
        notes = COALESCE(p_notes, notes),
        cancellation_reason = COALESCE(p_cancellation_reason, cancellation_reason),
        updated_at = now()
    WHERE id = p_reservation_id;

    RETURN p_reservation_id;
END;
$$;

COMMENT ON FUNCTION public.update_reservation(uuid, uuid, text, text, timestamptz, timestamptz, text, uuid, text, text, boolean, boolean) IS 'Updates a reservation with conflict checking. Returns reservation ID or raises exception on conflict. Supports customer_id and cancellation_reason parameters.';
