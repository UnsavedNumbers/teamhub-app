-- Align events RLS with standard org admin helpers used across the schema.
-- This allows inserts when team_id is NULL, as long as org_id is set and user is org admin.

DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

CREATE POLICY "Admins can manage events"
ON public.events
USING (
  public.is_platform_admin(auth.uid())
  OR public.user_is_org_admin(
    auth.uid(),
    COALESCE(
      events.org_id,
      (
        SELECT t.org_id
        FROM public.teams t
        WHERE t.id = events.team_id
      )
    )
  )
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR public.user_is_org_admin(
    auth.uid(),
    COALESCE(
      events.org_id,
      (
        SELECT t.org_id
        FROM public.teams t
        WHERE t.id = events.team_id
      )
    )
  )
);

COMMENT ON POLICY "Admins can manage events" ON public.events IS
  'Org/platform admins can create, update, delete events within their org via org_id or team->org lookup.';
