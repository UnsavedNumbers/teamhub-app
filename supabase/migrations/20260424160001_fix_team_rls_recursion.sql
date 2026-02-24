-- Migration: Fix infinite recursion in RLS policies for teams and related tables
--
-- Root cause: teams__member_select (from 20260424160000) queries team_memberships,
-- and team_memberships__coach_select (from 20260412000030) queries back into teams.
-- This A→B→A cycle causes PostgreSQL error 42P17 at runtime.
--
-- Fix: Replace inline subqueries with SECURITY DEFINER helper functions.
-- SECURITY DEFINER functions run as their owner (postgres superuser in Supabase),
-- which bypasses RLS on the tables they query, breaking the recursion chain.

-- ============================================================================
-- STEP 1: Drop the recursive policies added by 20260424160000
-- ============================================================================
DROP POLICY IF EXISTS teams__member_select       ON public.teams;
DROP POLICY IF EXISTS seasons__member_select     ON public.seasons;
DROP POLICY IF EXISTS sports__member_select      ON public.sports;
DROP POLICY IF EXISTS programs__member_select    ON public.programs;
DROP POLICY IF EXISTS levels__member_select      ON public.levels;
DROP POLICY IF EXISTS announcements__parent_select ON public.announcements;

-- ============================================================================
-- STEP 2: Create SECURITY DEFINER helper functions (bypass RLS internally)
-- ============================================================================

-- Check if a guardian can see a specific team via their child's active membership
CREATE OR REPLACE FUNCTION public.guardian_has_team_access(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.team_memberships tm
        WHERE tm.team_id = p_team_id
          AND tm.status = 'active'
          AND tm.deleted_at IS NULL
          AND public.user_is_guardian_of_child(p_user_id, tm.athlete_id)
    );
$$;

-- Check if a guardian can see a team-specific season (season.team_id IS NOT NULL)
CREATE OR REPLACE FUNCTION public.guardian_has_team_season_access(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
    SELECT public.guardian_has_team_access(p_user_id, p_team_id);
$$;

-- Check if a guardian can see an org-wide season (season.team_id IS NULL) via team_seasons
CREATE OR REPLACE FUNCTION public.guardian_has_org_season_access(p_user_id uuid, p_season_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.team_memberships tm
        JOIN public.team_seasons ts ON ts.team_id = tm.team_id
        WHERE ts.season_id = p_season_id
          AND tm.status = 'active'
          AND tm.deleted_at IS NULL
          AND public.user_is_guardian_of_child(p_user_id, tm.athlete_id)
    );
$$;

-- Check if a guardian can see a sport via their child's team
CREATE OR REPLACE FUNCTION public.guardian_has_sport_access(p_user_id uuid, p_sport_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.teams t
        JOIN public.team_memberships tm ON tm.team_id = t.id
        WHERE t.sport_id = p_sport_id
          AND tm.status = 'active'
          AND tm.deleted_at IS NULL
          AND public.user_is_guardian_of_child(p_user_id, tm.athlete_id)
    );
$$;

-- Check if a guardian can see a program via their child's team
CREATE OR REPLACE FUNCTION public.guardian_has_program_access(p_user_id uuid, p_program_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.teams t
        JOIN public.team_memberships tm ON tm.team_id = t.id
        WHERE t.program_id = p_program_id
          AND tm.status = 'active'
          AND tm.deleted_at IS NULL
          AND public.user_is_guardian_of_child(p_user_id, tm.athlete_id)
    );
$$;

-- Check if a guardian can see a level via their child's team
CREATE OR REPLACE FUNCTION public.guardian_has_level_access(p_user_id uuid, p_level_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.teams t
        JOIN public.team_memberships tm ON tm.team_id = t.id
        WHERE t.level_id = p_level_id
          AND tm.status = 'active'
          AND tm.deleted_at IS NULL

          AND public.user_is_guardian_of_child(p_user_id, tm.athlete_id)
    );
$$;

-- ============================================================================
-- STEP 3: Re-create policies using SECURITY DEFINER helpers (no recursion)
-- ============================================================================

-- 1. Teams: parents can see teams their child is actively enrolled in
CREATE POLICY teams__member_select ON public.teams
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR public.guardian_has_team_access(auth.uid(), id)
    );

-- 2. Seasons: parents can see seasons for their child's teams
CREATE POLICY seasons__member_select ON public.seasons
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        -- Team-specific season
        OR (team_id IS NOT NULL AND public.guardian_has_team_season_access(auth.uid(), team_id))
        -- Org-wide season joined via team_seasons
        OR (team_id IS NULL AND public.guardian_has_org_season_access(auth.uid(), id))
    );

-- 3. Sports: parents can see sports associated with their child's teams
CREATE POLICY sports__member_select ON public.sports
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR public.guardian_has_sport_access(auth.uid(), id)
    );

-- 4. Programs: parents can see programs associated with their child's teams
CREATE POLICY programs__member_select ON public.programs
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR public.guardian_has_program_access(auth.uid(), id)
    );

-- 5. Levels: parents can see levels associated with their child's teams
CREATE POLICY levels__member_select ON public.levels
    FOR SELECT TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR user_is_org_admin(auth.uid(), org_id)
        OR public.guardian_has_level_access(auth.uid(), id)
    );

-- 6. Announcements: parents can see team-scoped announcements for their child's teams
CREATE POLICY announcements__parent_select ON public.announcements
    FOR SELECT TO authenticated
    USING (
        team_id IS NOT NULL
        AND public.guardian_has_team_access(auth.uid(), team_id)
    );
