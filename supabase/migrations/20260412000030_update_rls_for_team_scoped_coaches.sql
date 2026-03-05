-- Update RLS policies to scope coaches to assigned teams only
-- Coaches can only access data for teams they are assigned to via team_coaches table

-- ============================================================================
-- 1. Teams Table
-- ============================================================================

-- Drop existing org-wide SELECT policy
DROP POLICY IF EXISTS teams__org_select ON public.teams;

-- New team-scoped SELECT policy for coaches
CREATE POLICY teams__coach_select ON public.teams
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR id = ANY(SELECT coach_team_ids(auth.uid()))
    );

-- Keep existing INSERT/UPDATE/DELETE policies (org admin only)
-- These don't need changes as coaches shouldn't create/delete teams

-- ============================================================================
-- 2. Seasons Table
-- ============================================================================

-- Drop existing org-wide SELECT policy
DROP POLICY IF EXISTS seasons__org_select ON public.seasons;

-- New team-scoped SELECT policy for coaches
CREATE POLICY seasons__coach_select ON public.seasons
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR (
            -- Season is team-specific and coach is assigned to that team
            (team_id IS NOT NULL AND team_id = ANY(SELECT coach_team_ids(auth.uid())))
        )
    );

-- Keep existing INSERT/UPDATE/DELETE policies (org admin only)

-- ============================================================================
-- 3. Athletes Table - Update can_view_athlete() function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_view_athlete(athlete_id_param uuid, user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id = athlete_id_param
          AND (
            is_platform_admin(user_id_param)
            OR user_is_org_admin(user_id_param, a.org_id)
            OR user_is_guardian_of_child(user_id_param, athlete_id_param)
            OR EXISTS (
                -- Coach is assigned to a team that this athlete is on
                SELECT 1 FROM public.team_memberships tm
                INNER JOIN public.team_coaches tc ON tc.team_id = tm.team_id
                WHERE tm.athlete_id = athlete_id_param
                  AND tc.coach_user_id = user_id_param
                  AND tc.status = 'active'
                  AND (tc.start_at IS NULL OR tc.start_at <= now())
                  AND (tc.end_at IS NULL OR tc.end_at >= now())
                  AND tm.deleted_at IS NULL
            )
          )
    );
$$;

-- ============================================================================
-- 4. Team Memberships Table
-- ============================================================================

-- Drop existing org-wide SELECT policy
DROP POLICY IF EXISTS team_memberships__org_select ON public.team_memberships;

-- New team-scoped SELECT policy for coaches
CREATE POLICY team_memberships__coach_select ON public.team_memberships
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = team_memberships.team_id
              AND user_is_org_admin(auth.uid(), t.org_id)
        )
        OR team_id = ANY(SELECT coach_team_ids(auth.uid()))
    );

-- ============================================================================
-- 5. Events Table
-- ============================================================================

-- Events SELECT policy already uses staff_can_access_team(), which is now updated
-- Update INSERT/UPDATE/DELETE policies to use updated staff_can_access_team()

DROP POLICY IF EXISTS events_write_policy ON public.events;

CREATE POLICY events__coach_write ON public.events
    FOR INSERT TO authenticated
    WITH CHECK (
        is_platform_admin(auth.uid())
        OR (team_id IS NOT NULL AND staff_can_access_team(auth.uid(), team_id))
    );

CREATE POLICY events__coach_update ON public.events
    FOR UPDATE TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR (team_id IS NOT NULL AND staff_can_access_team(auth.uid(), team_id))
    )
    WITH CHECK (
        is_platform_admin(auth.uid())
        OR (team_id IS NOT NULL AND staff_can_access_team(auth.uid(), team_id))
    );

CREATE POLICY events__coach_delete ON public.events
    FOR DELETE TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR (team_id IS NOT NULL AND staff_can_access_team(auth.uid(), team_id))
    );

-- ============================================================================
-- 6. Attendance Tables
-- ============================================================================

-- Update attendance SELECT policy
DROP POLICY IF EXISTS attendance__athlete_guardian_read ON public.attendance;

CREATE POLICY attendance__coach_read ON public.attendance
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_guardian_of_child(auth.uid(), athlete_id)
        OR EXISTS (
            SELECT 1 FROM public.events e
            INNER JOIN public.team_coaches tc ON tc.team_id = e.team_id
            WHERE e.id = attendance.event_id
              AND tc.coach_user_id = auth.uid()
              AND tc.status = 'active'
              AND (tc.start_at IS NULL OR tc.start_at <= now())
              AND (tc.end_at IS NULL OR tc.end_at >= now())
        )
    );

-- Update event_attendance SELECT policy
DROP POLICY IF EXISTS event_attendance__athlete_guardian_read ON public.event_attendance;

CREATE POLICY event_attendance__coach_read ON public.event_attendance
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_guardian_of_child(auth.uid(), child_id)
        OR EXISTS (
            SELECT 1 FROM public.events e
            INNER JOIN public.team_coaches tc ON tc.team_id = e.team_id
            WHERE e.id = event_attendance.event_id
              AND tc.coach_user_id = auth.uid()
              AND tc.status = 'active'
              AND (tc.start_at IS NULL OR tc.start_at <= now())
              AND (tc.end_at IS NULL OR tc.end_at >= now())
        )
    );

-- Coach can INSERT/UPDATE attendance for their team events
CREATE POLICY event_attendance__coach_write ON public.event_attendance
    FOR INSERT TO authenticated
    WITH CHECK (
        is_platform_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.events e
            INNER JOIN public.team_coaches tc ON tc.team_id = e.team_id
            WHERE e.id = event_attendance.event_id
              AND tc.coach_user_id = auth.uid()
              AND tc.status = 'active'
              AND (tc.start_at IS NULL OR tc.start_at <= now())
              AND (tc.end_at IS NULL OR tc.end_at >= now())
        )
    );

CREATE POLICY event_attendance__coach_update ON public.event_attendance
    FOR UPDATE TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.events e
            INNER JOIN public.team_coaches tc ON tc.team_id = e.team_id
            WHERE e.id = event_attendance.event_id
              AND tc.coach_user_id = auth.uid()
              AND tc.status = 'active'
              AND (tc.start_at IS NULL OR tc.start_at <= now())
              AND (tc.end_at IS NULL OR tc.end_at >= now())
        )
    )
    WITH CHECK (
        is_platform_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.events e
            INNER JOIN public.team_coaches tc ON tc.team_id = e.team_id
            WHERE e.id = event_attendance.event_id
              AND tc.coach_user_id = auth.uid()
              AND tc.status = 'active'
              AND (tc.start_at IS NULL OR tc.start_at <= now())
              AND (tc.end_at IS NULL OR tc.end_at >= now())
        )
    );

-- ============================================================================
-- 7. Announcements Table
-- ============================================================================

-- Drop existing org-wide SELECT policy
DROP POLICY IF EXISTS announcements__org_select ON public.announcements;

-- New team-scoped SELECT policy for coaches
CREATE POLICY announcements__coach_select ON public.announcements
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR (
            team_id IS NOT NULL 
            AND team_id = ANY(SELECT coach_team_ids(auth.uid()))
        )
    );

-- Coaches can CREATE announcements for their teams
CREATE POLICY announcements__coach_insert ON public.announcements
    FOR INSERT TO authenticated
    WITH CHECK (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR (
            team_id IS NOT NULL 
            AND team_id = ANY(SELECT coach_team_ids(auth.uid()))
        )
    );

-- Coaches can UPDATE their team announcements
CREATE POLICY announcements__coach_update ON public.announcements
    FOR UPDATE TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR (
            team_id IS NOT NULL 
            AND team_id = ANY(SELECT coach_team_ids(auth.uid()))
        )
    )
    WITH CHECK (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR (
            team_id IS NOT NULL 
            AND team_id = ANY(SELECT coach_team_ids(auth.uid()))
        )
    );

-- ============================================================================
-- 8. User Notifications Table
-- ============================================================================

-- Drop existing org-wide SELECT policy
DROP POLICY IF EXISTS user_notifications__org_select ON public.user_notifications;

-- New team-scoped SELECT policy for coaches
CREATE POLICY user_notifications__coach_select ON public.user_notifications
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_id = auth.uid()  -- Users always see their own notifications
        OR (
            user_is_org_admin(auth.uid(), org_id)
            AND role_context = 'org_admin'
        )
        OR (
            role_context = 'coach'
            AND user_id = auth.uid()
            AND (
                team_id IS NULL  -- Coach-level org notifications
                OR team_id = ANY(SELECT coach_team_ids(auth.uid()))  -- Team-specific
            )
        )
    );

-- ============================================================================
-- 9. Travel Plans Table
-- ============================================================================

-- Drop existing team-scoped SELECT policy
DROP POLICY IF EXISTS travel_plans__team_select ON public.travel_plans;

-- New team-scoped SELECT policy for coaches
CREATE POLICY travel_plans__coach_select ON public.travel_plans
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = travel_plans.team_id
              AND user_is_org_admin(auth.uid(), t.org_id)
        )
        OR team_id = ANY(SELECT coach_team_ids(auth.uid()))
    );

-- Coaches can CREATE/UPDATE travel plans for their teams
CREATE POLICY travel_plans__coach_write ON public.travel_plans
    FOR INSERT TO authenticated
    WITH CHECK (
        is_platform_admin(auth.uid())
        OR team_id = ANY(SELECT coach_team_ids(auth.uid()))
    );

CREATE POLICY travel_plans__coach_update ON public.travel_plans
    FOR UPDATE TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = travel_plans.team_id
              AND user_is_org_admin(auth.uid(), t.org_id)
        )
        OR team_id = ANY(SELECT coach_team_ids(auth.uid()))
    )
    WITH CHECK (
        is_platform_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = travel_plans.team_id
              AND user_is_org_admin(auth.uid(), t.org_id)
        )
        OR team_id = ANY(SELECT coach_team_ids(auth.uid()))
    );

-- ============================================================================
-- 10. Uniform Orders Table
-- ============================================================================

-- Drop existing team-scoped SELECT policy
DROP POLICY IF EXISTS uniform_orders__team_select ON public.uniform_orders;

-- New team-scoped SELECT policy for coaches
CREATE POLICY uniform_orders__coach_select ON public.uniform_orders
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_guardian_of_child(auth.uid(), athlete_id)
        OR team_id = ANY(SELECT coach_team_ids(auth.uid()))
    );

-- ============================================================================
-- 11. Sports, Levels, Programs Tables
-- ============================================================================

-- Sports: Coach sees sports for their teams
DROP POLICY IF EXISTS sports__org_select ON public.sports;

CREATE POLICY sports__coach_select ON public.sports
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.sport_id = sports.id
              AND t.id = ANY(SELECT coach_team_ids(auth.uid()))
        )
    );

-- Levels: Coach sees levels for their teams
DROP POLICY IF EXISTS levels__org_select ON public.levels;

CREATE POLICY levels__coach_select ON public.levels
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.level_id = levels.id
              AND t.id = ANY(SELECT coach_team_ids(auth.uid()))
        )
    );

-- Programs: Coach sees programs for their teams
DROP POLICY IF EXISTS programs__org_select ON public.programs;

CREATE POLICY programs__coach_select ON public.programs
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.program_id = programs.id
              AND t.id = ANY(SELECT coach_team_ids(auth.uid()))
        )
    );
