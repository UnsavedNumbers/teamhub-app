-- Facilities Management RLS Policies
-- Org-scoped access control for facilities, resources, blackouts, and reservations

-- ============================================================================
-- FACILITIES RLS
-- ============================================================================

-- SELECT: Org members can view facilities in their org
CREATE POLICY "Org members can view facilities"
ON public.facilities
FOR SELECT
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_has_org_access(auth.uid(), org_id)
);

-- INSERT/UPDATE/DELETE: Org admins only (staff permissions handled separately)
CREATE POLICY "Org admins can manage facilities"
ON public.facilities
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

CREATE POLICY "Org admins can update facilities"
ON public.facilities
FOR UPDATE
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
)
WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

CREATE POLICY "Org admins can delete facilities"
ON public.facilities
FOR DELETE
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

COMMENT ON POLICY "Org members can view facilities" ON public.facilities IS 'All org members can view facilities';
COMMENT ON POLICY "Org admins can manage facilities" ON public.facilities IS 'Only org admins can create/update/delete facilities';

-- ============================================================================
-- FACILITY RESOURCES RLS
-- ============================================================================

-- SELECT: Org members can view resources
CREATE POLICY "Org members can view facility resources"
ON public.facility_resources
FOR SELECT
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_has_org_access(auth.uid(), org_id)
);

-- INSERT/UPDATE/DELETE: Org admins only
CREATE POLICY "Org admins can manage facility resources"
ON public.facility_resources
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

CREATE POLICY "Org admins can update facility resources"
ON public.facility_resources
FOR UPDATE
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
)
WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

CREATE POLICY "Org admins can delete facility resources"
ON public.facility_resources
FOR DELETE
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

COMMENT ON POLICY "Org members can view facility resources" ON public.facility_resources IS 'All org members can view resources';
COMMENT ON POLICY "Org admins can manage facility resources" ON public.facility_resources IS 'Only org admins can create/update/delete resources';

-- ============================================================================
-- FACILITY BLACKOUTS RLS
-- ============================================================================

-- SELECT: Org members can view blackouts
CREATE POLICY "Org members can view facility blackouts"
ON public.facility_blackouts
FOR SELECT
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_has_org_access(auth.uid(), org_id)
);

-- INSERT/UPDATE/DELETE: Org admins only
CREATE POLICY "Org admins can manage facility blackouts"
ON public.facility_blackouts
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

CREATE POLICY "Org admins can update facility blackouts"
ON public.facility_blackouts
FOR UPDATE
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
)
WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

CREATE POLICY "Org admins can delete facility blackouts"
ON public.facility_blackouts
FOR DELETE
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

COMMENT ON POLICY "Org members can view facility blackouts" ON public.facility_blackouts IS 'All org members can view blackouts';
COMMENT ON POLICY "Org admins can manage facility blackouts" ON public.facility_blackouts IS 'Only org admins can create/update/delete blackouts';

-- ============================================================================
-- FACILITY RESERVATIONS RLS
-- ============================================================================

-- SELECT: Org members can view reservations
-- Coaches can view reservations for their teams (via team_id or event->team)
CREATE POLICY "Org members can view facility reservations"
ON public.facility_reservations
FOR SELECT
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_has_org_access(auth.uid(), org_id)
    -- Coaches can see reservations for their teams (direct team_id)
    OR (
        team_id IS NOT NULL
        AND public.is_coach_for_team(team_id, auth.uid())
    )
    -- Or via event->team
    OR (
        event_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = facility_reservations.event_id
            AND e.team_id IS NOT NULL
            AND public.is_coach_for_team(e.team_id, auth.uid())
        )
    )
);

-- INSERT: Org admins, or coaches if org setting allows (handled in RPC)
-- For now, only org admins can insert directly
CREATE POLICY "Org admins can create facility reservations"
ON public.facility_reservations
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

-- UPDATE: Org admins only (coaches can create tentative via RPC if allowed)
CREATE POLICY "Org admins can update facility reservations"
ON public.facility_reservations
FOR UPDATE
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
)
WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

-- DELETE: Org admins only
CREATE POLICY "Org admins can delete facility reservations"
ON public.facility_reservations
FOR DELETE
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

COMMENT ON POLICY "Org members can view facility reservations" ON public.facility_reservations IS 'Org members and coaches can view reservations';
COMMENT ON POLICY "Org admins can create facility reservations" ON public.facility_reservations IS 'Only org admins can create reservations directly (coaches via RPC if allowed)';

-- ============================================================================
-- NOTES
-- ============================================================================

-- Staff permissions:
-- Staff role permissions are stored in organization_members.permissions (JSONB).
-- To check staff permissions, use:
--   (permissions->>'staff_facilities_view')::boolean
--   (permissions->>'staff_facilities_manage')::boolean
--   (permissions->>'staff_schedule_manage')::boolean
--
-- For v1, RLS policies only check org_admin. Staff permission checks should be
-- added in application layer or via helper functions when staff UI is built.
--
-- Coaches:
-- Coaches can view facilities/resources and reservations for their teams.
-- To allow coaches to create tentative reservations, use the RPC functions
-- which can check org settings and enforce status = 'tentative' only.
--
-- Parents/fans:
-- No direct access to facilities tables. They see event location via
-- event_locations (which is synced from facility for internal events).
