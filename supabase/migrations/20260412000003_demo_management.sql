-- Demo Management schema

create table if not exists public.demo_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  country text not null default 'US',
  timezone text not null,
  org_type text,
  sports_sponsored jsonb not null default '[]'::jsonb,
  org_size text check (org_size in ('small', 'medium', 'large')),
  payment_enabled boolean not null default false,
  ticketing_enabled boolean not null default false,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_org_pocs (
  id uuid primary key default gen_random_uuid(),
  demo_org_id uuid not null references public.demo_organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  title text,
  email text not null,
  phone text,
  notes text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demo_org_pocs_email_unique_per_org unique (demo_org_id, email)
);

create table if not exists public.demo_codes (
  id uuid primary key default gen_random_uuid(),
  demo_code text not null unique,
  demo_org_id uuid not null references public.demo_organizations(id) on delete cascade,
  poc_id uuid references public.demo_org_pocs(id) on delete set null,
  allowed_roles jsonb not null default '["org_admin"]'::jsonb,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.demo_sessions (
  id uuid primary key default gen_random_uuid(),
  demo_code text not null references public.demo_codes(demo_code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  demo_org_id uuid not null references public.demo_organizations(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint demo_sessions_user_code_unique unique (user_id, demo_code)
);

create index if not exists idx_demo_codes_demo_org_id on public.demo_codes(demo_org_id);
create index if not exists idx_demo_codes_status on public.demo_codes(status);
create index if not exists idx_demo_org_pocs_demo_org_id on public.demo_org_pocs(demo_org_id);
create index if not exists idx_demo_sessions_user_id on public.demo_sessions(user_id);
create index if not exists idx_demo_sessions_demo_code on public.demo_sessions(demo_code);

alter table public.demo_organizations enable row level security;
alter table public.demo_org_pocs enable row level security;
alter table public.demo_codes enable row level security;
alter table public.demo_sessions enable row level security;

drop policy if exists demo_organizations_platform_admin_all on public.demo_organizations;
create policy demo_organizations_platform_admin_all
on public.demo_organizations
for all
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
);

drop policy if exists demo_org_pocs_platform_admin_all on public.demo_org_pocs;
create policy demo_org_pocs_platform_admin_all
on public.demo_org_pocs
for all
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
);

drop policy if exists demo_codes_platform_admin_all on public.demo_codes;
create policy demo_codes_platform_admin_all
on public.demo_codes
for all
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
);

drop policy if exists demo_sessions_platform_admin_all on public.demo_sessions;
create policy demo_sessions_platform_admin_all
on public.demo_sessions
for all
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
);

drop policy if exists demo_sessions_user_read_own on public.demo_sessions;
create policy demo_sessions_user_read_own
on public.demo_sessions
for select
using (auth.uid() = user_id);
