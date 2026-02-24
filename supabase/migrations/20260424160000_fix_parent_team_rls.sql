-- Migration: RESTORE Parent/Athlete Visibility for Teams and Related Metadata
-- This fixes the issue where the Teams tab is empty for guardians/athletes 
-- after the coach-scoping migration (20260412000030) restricted access.

-- 1. Teams Table: Allow parents and athletes to see teams they are members of
CREATE POLICY teams__member_select ON public.teams
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        -- Parent can see teams their child belongs to
        OR EXISTS (
            SELECT 1 FROM public.team_memberships tm
            WHERE tm.team_id = public.teams.id
              AND user_is_guardian_of_child(auth.uid(), tm.athlete_id)
              AND tm.status = 'active'
              AND tm.deleted_at IS NULL
        )
    );

-- 2. Seasons Table: Allow parents and athletes to see seasons for their teams
CREATE POLICY seasons__member_select ON public.seasons
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR (
            -- Team specific season
            team_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.team_memberships tm
                WHERE tm.team_id = public.seasons.team_id
                  AND user_is_guardian_of_child(auth.uid(), tm.athlete_id)
                  AND tm.status = 'active'
                  AND tm.deleted_at IS NULL
            )
        )
        OR (
            -- Org wide season joined via team_seasons
            team_id IS NULL AND EXISTS (
                SELECT 1 FROM public.team_memberships tm
                JOIN public.team_seasons ts ON ts.season_id = public.seasons.id
                WHERE ts.team_id = tm.team_id
                  AND user_is_guardian_of_child(auth.uid(), tm.athlete_id)
                  AND tm.status = 'active'
                  AND tm.deleted_at IS NULL
            )
        )
    );

-- 3. Sports Table: Allow visibility for sports associated with accessible teams
CREATE POLICY sports__member_select ON public.sports
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR EXISTS (
            SELECT 1 FROM public.teams t
            JOIN public.team_memberships tm ON tm.team_id = t.id
            WHERE t.sport_id = public.sports.id
              AND user_is_guardian_of_child(auth.uid(), tm.athlete_id)
              AND tm.status = 'active'
              AND tm.deleted_at IS NULL
        )
    );

-- 4. Programs Table: Allow visibility for programs associated with accessible teams
CREATE POLICY programs__member_select ON public.programs
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR EXISTS (
            SELECT 1 FROM public.teams t
            JOIN public.team_memberships tm ON tm.team_id = t.id
            WHERE t.program_id = public.programs.id
              AND user_is_guardian_of_child(auth.uid(), tm.athlete_id)
              AND tm.status = 'active'
              AND tm.deleted_at IS NULL
        )
    );

-- 5. Levels Table: Allow visibility for levels associated with accessible teams
CREATE POLICY levels__member_select ON public.levels
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR EXISTS (
            SELECT 1 FROM public.teams t
            JOIN public.team_memberships tm ON tm.team_id = t.id
            WHERE t.level_id = public.levels.id
              AND user_is_guardian_of_child(auth.uid(), tm.athlete_id)
              AND tm.status = 'active'
              AND tm.deleted_at IS NULL
        )
    );

-- 6. Announcements: Ensure parents can see team-scoped announcements
-- The coach migration added announcements__coach_select which scopes to coach_team_ids()
-- We need to add a parent path.
CREATE POLICY announcements__parent_select ON public.announcements
    FOR SELECT TO authenticated
    USING (
        team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.team_memberships tm
            WHERE tm.team_id = public.announcements.team_id
              AND user_is_guardian_of_child(auth.uid(), tm.athlete_id)
              AND tm.status = 'active'
              AND tm.deleted_at IS NULL
        )
    );
