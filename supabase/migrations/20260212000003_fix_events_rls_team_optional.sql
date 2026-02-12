-- Allow events RLS admin policy to authorize by org_id when team_id is NULL
-- This removes implicit team_id requirement for event INSERT/UPDATE while preserving org scoping.

DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

CREATE POLICY "Admins can manage events"
ON public.events
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = ANY (ARRAY['admin'::public.user_role, 'org_admin'::public.user_role, 'platform_admin'::public.user_role])
      AND (
        (events.org_id IS NOT NULL AND u.org_id = events.org_id)
        OR (
          events.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.teams t
            WHERE t.id = events.team_id
              AND t.org_id = u.org_id
          )
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = ANY (ARRAY['admin'::public.user_role, 'org_admin'::public.user_role, 'platform_admin'::public.user_role])
      AND (
        (events.org_id IS NOT NULL AND u.org_id = events.org_id)
        OR (
          events.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.teams t
            WHERE t.id = events.team_id
              AND t.org_id = u.org_id
          )
        )
      )
  )
);

COMMENT ON POLICY "Admins can manage events" ON public.events IS
  'Org/platform admins can create, update, delete events within their org. team_id is optional when org_id is set.';
