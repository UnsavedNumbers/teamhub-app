-- Purpose: Allow org admins/coaches to view athletes in their org even before
-- they are rostered, and eliminate RLS recursion on team_memberships/teams.
set search_path = public;

-- Helper: centralized visibility check for athletes.
create or replace function athlete_is_visible_to_user(
  check_user_id uuid,
  check_athlete_id uuid
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_org_id uuid;
begin
  -- Platform admins can see everything
  if is_platform_admin(check_user_id) then
    return true;
  end if;

  -- Resolve family/org without triggering RLS (security definer)
  select family_id into v_family_id
  from athletes
  where id = check_athlete_id;

  if v_family_id is null then
    return false;
  end if;

  select org_id into v_org_id
  from families
  where id = v_family_id;

  -- Org admins/coaches for the family org can view
  if user_has_any_org_roles(
    check_user_id,
    v_org_id,
    array['org_admin','coach']::org_member_role[]
  ) then
    return true;
  end if;

  -- Guardians of the athlete can view
  if user_is_guardian_of_child(check_user_id, check_athlete_id) then
    return true;
  end if;

  -- Members of the same family can view (parent/sibling)
  if exists (
    select 1
    from users u
    where u.id = check_user_id
      and u.family_id = v_family_id
  ) then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function athlete_is_visible_to_user(uuid, uuid) to authenticated;

-- Recreate consolidated SELECT policy to use the helper (no joins that can recurse).
drop policy if exists "athletes_select_policy" on athletes;
create policy "athletes_select_policy" on athletes
  for select
  using (athlete_is_visible_to_user((select auth.uid()), id));

