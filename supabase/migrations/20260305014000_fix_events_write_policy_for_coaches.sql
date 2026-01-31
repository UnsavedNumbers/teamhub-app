-- Purpose: Allow coaches to create/manage events for their teams while keeping admin controls.
set search_path = public;

-- Recreate write policy using staff_can_access_team helper (covers org_admin + coach).
drop policy if exists "events_write_policy" on events;
create policy "events_write_policy" on events
  for all
  using (
    is_platform_admin((select auth.uid()))
    or staff_can_access_team((select auth.uid()), team_id)
  )
  with check (
    is_platform_admin((select auth.uid()))
    or staff_can_access_team((select auth.uid()), team_id)
  );

comment on policy "events_write_policy" on events is
  'Platform admins or staff (org admins/coaches) for the team can insert/update/delete events.';

