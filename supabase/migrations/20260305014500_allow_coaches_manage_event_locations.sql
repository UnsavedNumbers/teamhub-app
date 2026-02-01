-- Purpose: Allow staff (org admins & coaches) to insert/update/delete event_locations via the same helper as events.
set search_path = public;

drop policy if exists "Org admins can manage locations" on event_locations;
create policy "event_locations_write_policy" on event_locations
  for all
  using (
    is_platform_admin((select auth.uid()))
    or exists (
      select 1
      from events e
      join teams t on t.id = e.team_id
      where e.id = event_locations.event_id
        and staff_can_access_team((select auth.uid()), t.id)
    )
  )
  with check (
    is_platform_admin((select auth.uid()))
    or exists (
      select 1
      from events e
      join teams t on t.id = e.team_id
      where e.id = event_locations.event_id
        and staff_can_access_team((select auth.uid()), t.id)
    )
  );

comment on policy "event_locations_write_policy" on event_locations is
  'Platform admins or staff (org admins/coaches) of the event team can manage locations.';

