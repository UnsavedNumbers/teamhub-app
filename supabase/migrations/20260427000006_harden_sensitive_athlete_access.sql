-- Harden sensitive athlete access across frontend-facing RPCs and RLS.
-- This removes permissive athlete reads, fixes org membership helpers,
-- and centralizes medical/PII authorization around explicit linkage checks.

-- ---------------------------------------------------------------------------
-- Staff permissions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_default_staff_permissions()
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN jsonb_build_object(
    'can_scan_tickets', true,
    'can_view_attendees', true,
    'can_manage_events', false,
    'can_view_financials', false,
    'can_manage_roster', false,
    'can_send_notifications', false,
    'can_manage_staff', false,
    'can_view_pii', false,
    'can_view_medical', false
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Membership helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_has_any_org_roles(check_user_id uuid, check_org_id uuid, check_roles public.org_member_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT
    is_platform_admin(check_user_id) OR
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = check_user_id
        AND om.org_id = check_org_id
        AND om.role = ANY(check_roles)
        AND COALESCE(om.is_active, true)
    );
$$;

CREATE OR REPLACE FUNCTION public.user_has_org_access(check_user_id uuid, check_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT
    is_platform_admin(check_user_id) OR
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = check_user_id
        AND om.org_id = check_org_id
        AND COALESCE(om.is_active, true)
    );
$$;

CREATE OR REPLACE FUNCTION public.user_has_org_role(check_user_id uuid, check_org_id uuid, check_role public.org_member_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT
    is_platform_admin(check_user_id) OR
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = check_user_id
        AND om.org_id = check_org_id
        AND om.role = check_role
        AND COALESCE(om.is_active, true)
    );
$$;

CREATE OR REPLACE FUNCTION public.staff_has_permission(p_user_id uuid, p_org_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = p_user_id
      AND om.org_id = p_org_id
      AND om.role = 'staff'
      AND COALESCE(om.is_active, true)
      AND COALESCE((om.permissions ->> p_permission_key)::boolean, false)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_athlete_of_record(p_user_id uuid, p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.athlete_messaging_preferences amp
    WHERE amp.athlete_id = p_athlete_id
      AND amp.athlete_user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_team_link_to_athlete(p_user_id uuid, p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    INNER JOIN public.team_coaches tc ON tc.team_id = tm.team_id
    WHERE tm.athlete_id = p_athlete_id
      AND tm.deleted_at IS NULL
      AND tc.coach_user_id = p_user_id
      AND tc.status = 'active'
      AND (tc.start_at IS NULL OR tc.start_at <= now())
      AND (tc.end_at IS NULL OR tc.end_at >= now())
  );
$$;

CREATE OR REPLACE FUNCTION public.coach_has_sensitive_access(p_athlete_id uuid, p_user_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.athletes a
    LEFT JOIN public.organization_visibility_settings ovs ON ovs.org_id = a.org_id
    WHERE a.id = p_athlete_id
      AND public.user_has_org_role(p_user_id, a.org_id, 'coach')
      AND public.user_has_team_link_to_athlete(p_user_id, p_athlete_id)
      AND COALESCE((ovs.role_permissions -> 'coach' ->> p_permission_key)::boolean, false)
  );
$$;

-- ---------------------------------------------------------------------------
-- Centralized sensitive access
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_sensitive_athlete_data(
  p_athlete_id uuid,
  p_user_id uuid DEFAULT auth.uid(),
  p_data_kind text DEFAULT 'pii'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_kind text;
BEGIN
  IF p_athlete_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  v_kind := lower(COALESCE(p_data_kind, ''));
  IF v_kind NOT IN ('pii', 'medical') THEN
    RETURN false;
  END IF;

  SELECT a.org_id
  INTO v_org_id
  FROM public.athletes a
  WHERE a.id = p_athlete_id
    AND a.deleted_at IS NULL;

  IF v_org_id IS NULL OR NOT public.user_has_org_access(p_user_id, v_org_id) THEN
    RETURN false;
  END IF;

  IF public.is_platform_admin(p_user_id) OR public.user_is_org_admin(p_user_id, v_org_id) THEN
    RETURN true;
  END IF;

  IF public.user_is_guardian_of_child(p_user_id, p_athlete_id) THEN
    RETURN true;
  END IF;

  IF public.user_is_athlete_of_record(p_user_id, p_athlete_id) THEN
    RETURN true;
  END IF;

  IF v_kind = 'medical' THEN
    RETURN public.coach_has_sensitive_access(p_athlete_id, p_user_id, 'can_view_medical');
  END IF;

  RETURN public.coach_has_sensitive_access(p_athlete_id, p_user_id, 'can_view_pii');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_update_athlete_medical(
  p_athlete_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF p_athlete_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT a.org_id
  INTO v_org_id
  FROM public.athletes a
  WHERE a.id = p_athlete_id
    AND a.deleted_at IS NULL;

  IF v_org_id IS NULL OR NOT public.user_has_org_access(p_user_id, v_org_id) THEN
    RETURN false;
  END IF;

  RETURN public.is_platform_admin(p_user_id)
    OR public.user_is_org_admin(p_user_id, v_org_id)
    OR public.is_parent_of_athlete(p_athlete_id, p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_athlete_sensitive_access(
  p_athlete_id uuid,
  p_org_id uuid DEFAULT NULL
)
RETURNS TABLE(
  athlete_id uuid,
  org_id uuid,
  org_membership_verified boolean,
  team_linked boolean,
  guardian_linked boolean,
  athlete_linked boolean,
  org_admin boolean,
  staff_can_view_pii boolean,
  staff_can_view_medical boolean,
  coach_can_view_pii boolean,
  coach_can_view_medical boolean,
  can_view_pii boolean,
  can_view_medical boolean,
  can_update_medical boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
BEGIN
  IF p_athlete_id IS NULL OR v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT a.org_id
  INTO v_org_id
  FROM public.athletes a
  WHERE a.id = p_athlete_id
    AND a.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  IF p_org_id IS NOT NULL AND p_org_id <> v_org_id THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p_athlete_id,
    v_org_id,
    public.user_has_org_access(v_user_id, v_org_id) AS org_membership_verified,
    public.user_has_team_link_to_athlete(v_user_id, p_athlete_id) AS team_linked,
    public.user_is_guardian_of_child(v_user_id, p_athlete_id) AS guardian_linked,
    public.user_is_athlete_of_record(v_user_id, p_athlete_id) AS athlete_linked,
    (public.is_platform_admin(v_user_id) OR public.user_is_org_admin(v_user_id, v_org_id)) AS org_admin,
    public.staff_has_permission(v_user_id, v_org_id, 'can_view_pii') AS staff_can_view_pii,
    public.staff_has_permission(v_user_id, v_org_id, 'can_view_medical') AS staff_can_view_medical,
    public.coach_has_sensitive_access(p_athlete_id, v_user_id, 'can_view_pii') AS coach_can_view_pii,
    public.coach_has_sensitive_access(p_athlete_id, v_user_id, 'can_view_medical') AS coach_can_view_medical,
    public.can_access_sensitive_athlete_data(p_athlete_id, v_user_id, 'pii') AS can_view_pii,
    public.can_access_sensitive_athlete_data(p_athlete_id, v_user_id, 'medical') AS can_view_medical,
    public.can_update_athlete_medical(p_athlete_id, v_user_id) AS can_update_medical;
END;
$$;

COMMENT ON FUNCTION public.get_athlete_sensitive_access(uuid, uuid) IS
  'Returns the server-verified sensitive-access snapshot for a single athlete. Frontend should mirror this decision and fail closed when absent.';

-- ---------------------------------------------------------------------------
-- Athlete visibility and medical helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.athlete_is_visible_to_user(check_user_id uuid, check_athlete_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF check_user_id IS NULL OR check_athlete_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_platform_admin(check_user_id) THEN
    RETURN true;
  END IF;

  SELECT a.org_id
  INTO v_org_id
  FROM public.athletes a
  WHERE a.id = check_athlete_id
    AND a.deleted_at IS NULL;

  IF v_org_id IS NULL OR NOT public.user_has_org_access(check_user_id, v_org_id) THEN
    RETURN false;
  END IF;

  RETURN public.user_is_org_admin(check_user_id, v_org_id)
    OR public.user_is_guardian_of_child(check_user_id, check_athlete_id)
    OR public.user_is_athlete_of_record(check_user_id, check_athlete_id)
    OR public.user_has_team_link_to_athlete(check_user_id, check_athlete_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.coach_has_medical_access(athlete_id_param uuid, user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT public.can_access_sensitive_athlete_data(athlete_id_param, user_id_param, 'medical');
$$;

-- ---------------------------------------------------------------------------
-- Sensitive RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.find_guardian_by_email(p_email text, p_org_id uuid)
RETURNS TABLE(user_id uuid, email text, display_name text, phone text, linked_athletes jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_normalized_email text;
BEGIN
  IF auth.uid() IS NULL OR p_org_id IS NULL OR NOT public.user_is_org_admin(auth.uid(), p_org_id) THEN
    RETURN;
  END IF;

  v_normalized_email := normalize_email(p_email);

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email,
    u.display_name,
    u.phone,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'first_name', a.first_name,
          'last_name', a.last_name,
          'birthdate', a.birthdate
        )
        ORDER BY a.first_name, a.last_name
      ) FILTER (WHERE a.id IS NOT NULL),
      '[]'::jsonb
    ) AS linked_athletes
  FROM public.users u
  LEFT JOIN public.athlete_guardians ag ON ag.user_id = u.id AND ag.status = 'active' AND ag.org_id = p_org_id
  LEFT JOIN public.athletes a ON a.id = ag.athlete_id AND a.deleted_at IS NULL
  WHERE normalize_email(u.email) = v_normalized_email
  GROUP BY u.id, u.email, u.display_name, u.phone;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_athlete_guardians(p_athlete_id uuid, p_org_id uuid)
RETURNS TABLE(
  guardian_id uuid,
  user_id uuid,
  email text,
  display_name text,
  phone text,
  relationship_type text,
  status public.athlete_guardian_status,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT
    ag.id AS guardian_id,
    u.id AS user_id,
    u.email,
    u.display_name,
    u.phone,
    'parent' AS relationship_type,
    ag.status,
    ag.created_at
  FROM public.athlete_guardians ag
  JOIN public.users u ON u.id = ag.user_id
  WHERE ag.athlete_id = p_athlete_id
    AND ag.org_id = p_org_id
    AND public.can_access_sensitive_athlete_data(p_athlete_id, auth.uid(), 'pii');
$$;

-- ---------------------------------------------------------------------------
-- RLS alignment
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Enable read access for all users" ON public.athletes;

DROP POLICY IF EXISTS athlete_medical_private_select_policy ON public.athlete_medical_private;
CREATE POLICY athlete_medical_private_select_policy
ON public.athlete_medical_private
FOR SELECT
USING (public.can_access_sensitive_athlete_data(athlete_id, auth.uid(), 'medical'));

DROP POLICY IF EXISTS athlete_medical_private_insert_policy ON public.athlete_medical_private;
CREATE POLICY athlete_medical_private_insert_policy
ON public.athlete_medical_private
FOR INSERT
WITH CHECK (
  public.can_update_athlete_medical(athlete_id, auth.uid())
  AND org_id = (
    SELECT a.org_id
    FROM public.athletes a
    WHERE a.id = athlete_medical_private.athlete_id
  )
);

DROP POLICY IF EXISTS athlete_medical_private_update_policy ON public.athlete_medical_private;
CREATE POLICY athlete_medical_private_update_policy
ON public.athlete_medical_private
FOR UPDATE
USING (public.can_update_athlete_medical(athlete_id, auth.uid()))
WITH CHECK (
  public.can_update_athlete_medical(athlete_id, auth.uid())
  AND org_id = (
    SELECT a.org_id
    FROM public.athletes a
    WHERE a.id = athlete_medical_private.athlete_id
  )
);

DROP POLICY IF EXISTS athlete_guardians__org_select ON public.athlete_guardians;
CREATE POLICY athlete_guardians__org_select
ON public.athlete_guardians
FOR SELECT TO authenticated
USING (public.can_access_sensitive_athlete_data(athlete_id, auth.uid(), 'pii'));

DROP POLICY IF EXISTS parent_invites__org_select ON public.parent_invites;
CREATE POLICY parent_invites__org_select
ON public.parent_invites
FOR SELECT TO authenticated
USING (public.can_access_sensitive_athlete_data(athlete_id, auth.uid(), 'pii'));
