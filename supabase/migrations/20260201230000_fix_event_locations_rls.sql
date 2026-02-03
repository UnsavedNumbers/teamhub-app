-- Fix event_locations RLS to allow portal users to read location data
-- Previously, only platform admins and staff could read event_locations
-- This prevented parents/guardians from seeing venue information on event detail pages

-- Drop all existing policies first to avoid conflicts
DROP POLICY IF EXISTS event_locations__platform_admin_all ON public.event_locations;
DROP POLICY IF EXISTS event_locations_write_policy ON public.event_locations;
DROP POLICY IF EXISTS event_locations__staff_all ON public.event_locations;
DROP POLICY IF EXISTS event_locations__parent_read ON public.event_locations;
DROP POLICY IF EXISTS event_locations__athlete_read ON public.event_locations;

-- Allow platform admins full access
CREATE POLICY event_locations__platform_admin_all
ON public.event_locations
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Allow staff (org_admins/coaches) full access to event locations for their teams
CREATE POLICY event_locations__staff_all
ON public.event_locations
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.teams t ON t.id = e.team_id
    WHERE e.id = event_locations.event_id
      AND public.staff_can_access_team(auth.uid(), t.id)
  )
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.teams t ON t.id = e.team_id
    WHERE e.id = event_locations.event_id
      AND public.staff_can_access_team(auth.uid(), t.id)
  )
);

-- Allow parents/guardians to read event locations for their children's teams
CREATE POLICY event_locations__parent_read
ON public.event_locations
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.team_memberships tm ON tm.team_id = e.team_id
    JOIN public.athlete_guardians ag ON ag.athlete_id = tm.athlete_id
    WHERE e.id = event_locations.event_id
      AND ag.user_id = auth.uid()
      AND ag.status = 'active'
  )
);

-- Allow athletes to read event locations for their teams
CREATE POLICY event_locations__athlete_read
ON public.event_locations
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.team_memberships tm ON tm.team_id = e.team_id
    WHERE e.id = event_locations.event_id
      AND tm.athlete_id = auth.uid()
  )
);

COMMENT ON POLICY event_locations__platform_admin_all ON public.event_locations IS 'Platform admins have full access to all event locations';
COMMENT ON POLICY event_locations__staff_all ON public.event_locations IS 'Staff (org_admins/coaches) have full access to event locations for their teams';
COMMENT ON POLICY event_locations__parent_read ON public.event_locations IS 'Parents/guardians can read event locations for their childrens teams events';
COMMENT ON POLICY event_locations__athlete_read ON public.event_locations IS 'Athletes can read event locations for their teams events';
