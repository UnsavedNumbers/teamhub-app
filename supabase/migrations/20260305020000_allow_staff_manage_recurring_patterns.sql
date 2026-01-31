-- Purpose: Allow org admins/coaches (staff_can_access_team) to manage recurring_event_patterns.
set search_path = public;

drop policy if exists "Admins can manage recurring patterns" on recurring_event_patterns;

create policy "recurring_patterns_write_policy" on recurring_event_patterns
  for all
  using (
    is_platform_admin((select auth.uid()))
    or exists (
      select 1
      from events e
      join teams t on t.id = e.team_id
      where e.id = recurring_event_patterns.parent_event_id
        and staff_can_access_team((select auth.uid()), t.id)
    )
  )
  with check (
    is_platform_admin((select auth.uid()))
    or exists (
      select 1
      from events e
      join teams t on t.id = e.team_id
      where e.id = recurring_event_patterns.parent_event_id
        and staff_can_access_team((select auth.uid()), t.id)
    )
  );

comment on policy "recurring_patterns_write_policy" on recurring_event_patterns is
  'Platform admins or staff (org admins/coaches) of the parent event team may insert/update/delete recurring patterns.';

