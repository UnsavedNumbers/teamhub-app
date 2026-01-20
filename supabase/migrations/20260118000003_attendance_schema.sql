-- Enable Attendance Features

-- 1. Create event_attendance table
DO $$ begin
    create type event_attendance_status as enum ('present', 'absent', 'late', 'excused');
exception
    when duplicate_object then null;
end $$;

create table if not exists event_attendance (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade not null,
  athlete_id uuid references athletes(id) on delete cascade not null,
  status event_attendance_status not null default 'present',
  notes text,
  recorded_by_user_id uuid references users(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(event_id, athlete_id)
);

-- 2. Create attendance_settings table
create table if not exists attendance_settings (
  org_id uuid references organizations(id) on delete cascade primary key,
  reminder_enabled boolean default false,
  lock_after_hours integer default 24,
  required_for_practice boolean default true,
  required_for_game boolean default true,
  required_for_meeting boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. RLS Policies
alter table event_attendance enable row level security;
alter table attendance_settings enable row level security;

-- Policies for event_attendance
drop policy if exists "Org admins can manage attendance" on event_attendance;
create policy "Org admins can manage attendance"
  on event_attendance
  for all
  using (
    exists (
      select 1 from events e
      join teams t on t.id = e.team_id
      where e.id = event_attendance.event_id
      and t.org_id in (
        select org_id from organization_members 
        where user_id = auth.uid() and role = 'org_admin'
      )
    )
  );

drop policy if exists "Coaches can manage attendance for their teams" on event_attendance;
create policy "Coaches can manage attendance for their teams"
  on event_attendance
  for all
  using (
    exists (
      select 1 from events e
      join teams t on t.id = e.team_id
      where e.id = event_attendance.event_id
      and t.org_id in (
        select org_id from organization_members 
        where user_id = auth.uid() and role = 'coach'
      )
    )
  );

drop policy if exists "Parents can view attendance for their children" on event_attendance;
create policy "Parents can view attendance for their children"
  on event_attendance
  for select
  using (
    athlete_id in (
      select id from athletes
      where family_id in (
        select family_id from family_members where user_id = auth.uid()
      )
    )
  );

-- Policies for attendance_settings
drop policy if exists "Org admins can manage changes" on attendance_settings;
create policy "Org admins can manage changes"
  on attendance_settings
  for all
  using (
    org_id in (
      select org_id from organization_members 
      where user_id = auth.uid() and role = 'org_admin'
    )
  );

drop policy if exists "Everyone can view settings" on attendance_settings;
create policy "Everyone can view settings"
  on attendance_settings
  for select
  using (
    org_id in (
      select org_id from organization_members where user_id = auth.uid()
    )
  );
