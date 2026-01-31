-- Purpose: Align ticket_types write access with staff_can_access_team helper so org admins/coaches can create ticket types.
set search_path = public;

drop policy if exists "Org admins can manage ticket types" on ticket_types;
drop policy if exists "Coaches can manage ticket types for team events" on ticket_types;

create policy "ticket_types_write_policy" on ticket_types
  for all
  using (
    is_platform_admin((select auth.uid()))
    or exists (
      select 1
      from ticketed_events te
      where te.id = ticket_types.ticketed_event_id
        and staff_can_access_team((select auth.uid()), te.team_id)
    )
  )
  with check (
    is_platform_admin((select auth.uid()))
    or exists (
      select 1
      from ticketed_events te
      where te.id = ticket_types.ticketed_event_id
        and staff_can_access_team((select auth.uid()), te.team_id)
    )
  );

comment on policy "ticket_types_write_policy" on ticket_types is
  'Platform admins or staff (org admins/coaches) of the ticketed event team may insert/update/delete ticket types.';

