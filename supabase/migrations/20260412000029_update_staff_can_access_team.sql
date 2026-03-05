-- Update staff_can_access_team() to use team_coaches table instead of org-level role
-- This ensures coaches can only access teams they are explicitly assigned to

CREATE OR REPLACE FUNCTION public.staff_can_access_team(check_user_id uuid, check_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.teams t
        WHERE t.id = check_team_id
          AND (
            is_platform_admin(check_user_id)
            OR user_has_org_role(check_user_id, t.org_id, 'org_admin')
            OR EXISTS (
                SELECT 1 FROM public.team_coaches tc
                WHERE tc.team_id = check_team_id
                  AND tc.coach_user_id = check_user_id
                  AND tc.status = 'active'
                  AND (tc.start_at IS NULL OR tc.start_at <= now())
                  AND (tc.end_at IS NULL OR tc.end_at >= now())
            )
          )
    );
$$;

COMMENT ON FUNCTION public.staff_can_access_team(uuid, uuid) IS 
    'Checks if user can access a team. Coaches must be explicitly assigned via team_coaches table.';
