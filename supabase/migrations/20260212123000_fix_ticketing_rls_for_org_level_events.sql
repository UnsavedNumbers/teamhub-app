-- Allow ticketing writes for org-level events where team_id is NULL
-- Prior policies required team access only, which blocks org-scoped events.

DROP POLICY IF EXISTS ticketed_events_write_policy ON public.ticketed_events;

CREATE POLICY ticketed_events_write_policy
ON public.ticketed_events
USING (
  public.is_platform_admin(auth.uid())
  OR public.user_is_org_admin(
    auth.uid(),
    COALESCE(
      ticketed_events.org_id,
      (
        SELECT t.org_id
        FROM public.teams t
        WHERE t.id = ticketed_events.team_id
      )
    )
  )
  OR (
    ticketed_events.team_id IS NOT NULL
    AND public.staff_can_access_team(auth.uid(), ticketed_events.team_id)
  )
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR public.user_is_org_admin(
    auth.uid(),
    COALESCE(
      ticketed_events.org_id,
      (
        SELECT t.org_id
        FROM public.teams t
        WHERE t.id = ticketed_events.team_id
      )
    )
  )
  OR (
    ticketed_events.team_id IS NOT NULL
    AND public.staff_can_access_team(auth.uid(), ticketed_events.team_id)
  )
);

COMMENT ON POLICY ticketed_events_write_policy ON public.ticketed_events IS
  'Platform admins, org admins (via org_id), or team staff can insert/update/delete ticketed events.';

DROP POLICY IF EXISTS ticket_types_write_policy ON public.ticket_types;

CREATE POLICY ticket_types_write_policy
ON public.ticket_types
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.ticketed_events te
    WHERE te.id = ticket_types.ticketed_event_id
      AND (
        public.user_is_org_admin(
          auth.uid(),
          COALESCE(
            te.org_id,
            (
              SELECT t.org_id
              FROM public.teams t
              WHERE t.id = te.team_id
            )
          )
        )
        OR (
          te.team_id IS NOT NULL
          AND public.staff_can_access_team(auth.uid(), te.team_id)
        )
      )
  )
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.ticketed_events te
    WHERE te.id = ticket_types.ticketed_event_id
      AND (
        public.user_is_org_admin(
          auth.uid(),
          COALESCE(
            te.org_id,
            (
              SELECT t.org_id
              FROM public.teams t
              WHERE t.id = te.team_id
            )
          )
        )
        OR (
          te.team_id IS NOT NULL
          AND public.staff_can_access_team(auth.uid(), te.team_id)
        )
      )
  )
);

COMMENT ON POLICY ticket_types_write_policy ON public.ticket_types IS
  'Platform admins, org admins (via ticketed event org_id), or team staff can insert/update/delete ticket types.';
