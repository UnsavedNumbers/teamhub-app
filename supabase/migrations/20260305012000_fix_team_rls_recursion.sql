-- Purpose: Break recursive RLS checks between teams and team_memberships that
-- were causing PostgREST errors like
-- "infinite recursion detected in policy for relation \"teams\""
-- when querying announcements/teams endpoints.
set search_path = public;

-- Helper: centralized visibility check for teams.
-- SECURITY DEFINER ensures the lookups bypass RLS to avoid recursion.
create or replace function team_is_visible_to_user(
  check_user_id uuid,
  check_team_id uuid
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  -- Short-circuit for platform admins
  if is_platform_admin(check_user_id) then
    return true;
  end if;

  select org_id into v_org_id
  from teams
  where id = check_team_id;

  -- Org members (any role) can see teams in their org
  if exists (
    select 1
    from organization_members om
    where om.user_id = check_user_id
      and om.org_id = v_org_id
  ) then
    return true;
  end if;

  -- Parents via family link
  if exists (
    select 1
    from team_memberships tm
    join athletes a on a.id = tm.athlete_id
    join users u on u.id = check_user_id and u.family_id = a.family_id
    where tm.team_id = check_team_id
  ) then
    return true;
  end if;

  -- Guardians via athlete_guardians
  if exists (
    select 1
    from team_memberships tm
    where tm.team_id = check_team_id
      and user_is_guardian_of_child(check_user_id, tm.athlete_id)
  ) then
    return true;
  end if;

  return false;
end;
$$;

-- Helper: visibility for individual memberships (also bypasses RLS).
create or replace function team_membership_is_visible_to_user(
  check_user_id uuid,
  check_team_id uuid,
  check_athlete_id uuid
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if is_platform_admin(check_user_id) then
    return true;
  end if;

  select org_id into v_org_id
  from teams
  where id = check_team_id;

  -- Org member can see memberships for teams in their org
  if exists (
    select 1
    from organization_members om
    where om.user_id = check_user_id
      and om.org_id = v_org_id
  ) then
    return true;
  end if;

  -- Parent/guardian checks
  if user_is_guardian_of_child(check_user_id, check_athlete_id) then
    return true;
  end if;

  if exists (
    select 1
    from athletes a
    join users u on u.id = check_user_id and u.family_id = a.family_id
    where a.id = check_athlete_id
  ) then
    return true;
  end if;

  return false;
end;
$$;

-- Recreate teams SELECT policy using the helper to avoid cross-table RLS recursion.
drop policy if exists "teams_select_policy" on teams;
create policy "teams_select_policy" on teams
  for select
  using (team_is_visible_to_user((select auth.uid()), id));

-- Recreate team_memberships SELECT policy using the helper (no direct teams join).
drop policy if exists "team_memberships_select_policy" on team_memberships;
create policy "team_memberships_select_policy" on team_memberships
  for select
  using (team_membership_is_visible_to_user((select auth.uid()), team_id, athlete_id));

