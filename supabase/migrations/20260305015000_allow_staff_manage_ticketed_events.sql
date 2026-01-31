-- Purpose: Align ticketed_events write access with staff_can_access_team helper so coaches/org admins can create events with ticketing.
set search_path = public;

drop policy if exists "Org admins can manage their org's ticketed events" on ticketed_events;
drop policy if exists "Coaches can manage team ticketed events" on ticketed_events;

create policy "ticketed_events_write_policy" on ticketed_events
  for all
  using (
    is_platform_admin((select auth.uid()))
    or staff_can_access_team((select auth.uid()), team_id)
  )
  with check (
    is_platform_admin((select auth.uid()))
    or staff_can_access_team((select auth.uid()), team_id)
  );

comment on policy "ticketed_events_write_policy" on ticketed_events is
  'Platform admins or staff (org admins/coaches) of the team may insert/update/delete ticketed_events.';

