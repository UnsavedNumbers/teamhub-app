-- Yearly organization license payment flow migration
-- Enums
create type license_status as enum ('trial', 'active', 'past_due', 'canceled', 'expired');
create type license_plan as enum ('starter', 'standard', 'pro');

-- Summary fields on organizations
alter table if exists organizations
  add column if not exists license_status license_status default 'trial',
  add column if not exists license_plan license_plan,
  add column if not exists license_current_period_start timestamptz,
  add column if not exists license_current_period_end timestamptz,
  add column if not exists license_trial_ends_at timestamptz,
  add column if not exists license_grace_ends_at timestamptz,
  add column if not exists license_cancel_at_period_end boolean default false,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text;

-- Canonical licenses table
create table if not exists org_licenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade unique,
  status license_status default 'trial',
  plan license_plan,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  stripe_latest_invoice_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_org_licenses_org_id on org_licenses(org_id);
create index if not exists idx_org_licenses_stripe_subscription_id on org_licenses(stripe_subscription_id);

create or replace function update_org_licenses_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_org_licenses_updated_at'
  ) then
    create trigger trg_org_licenses_updated_at
      before update on org_licenses
      for each row execute procedure update_org_licenses_updated_at();
  end if;
end $$;

-- Billing events audit table
create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete set null,
  event_type text,
  stripe_event_id text unique,
  stripe_object_id text,
  payload jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_billing_events_stripe_event_id on billing_events(stripe_event_id);
create index if not exists idx_billing_events_org_id on billing_events(org_id);

-- License helper functions
create or replace function is_org_license_active(org_id uuid)
returns boolean
language plpgsql
as $$
declare
  lic record;
begin
  select * into lic from org_licenses where org_id = org_id;
  if lic is null then
    return false;
  end if;

  if lic.status = 'trial' and lic.trial_ends_at > now() then
    return true;
  end if;

  if lic.status = 'active' and lic.current_period_end > now() then
    return true;
  end if;

  if lic.status = 'past_due' and lic.grace_ends_at > now() then
    return true;
  end if;

  return false;
end;
$$;

create or replace function is_org_license_readonly_allowed(org_id uuid)
returns boolean
language plpgsql
as $$
declare
  lic record;
begin
  select * into lic from org_licenses where org_id = org_id;
  if lic is null then
    return false;
  end if;

  if is_org_license_active(org_id) then
    return true;
  end if;

  if lic.status = 'canceled' and lic.current_period_end > now() then
    return true;
  end if;

  if lic.status = 'past_due' and lic.grace_ends_at > now() then
    return true;
  end if;

  return false;
end;
$$;

create or replace function sync_org_license_summary(org_id uuid)
returns void
language plpgsql
as $$
declare
  lic record;
begin
  select * into lic from org_licenses where org_id = org_id;

  if lic is null then
    return;
  end if;

  update organizations
    set
      license_status = lic.status,
      license_plan = lic.plan,
      license_current_period_start = lic.current_period_start,
      license_current_period_end = lic.current_period_end,
      license_trial_ends_at = lic.trial_ends_at,
      license_grace_ends_at = lic.grace_ends_at,
      license_cancel_at_period_end = lic.cancel_at_period_end,
      stripe_customer_id = lic.stripe_customer_id,
      stripe_subscription_id = lic.stripe_subscription_id,
      stripe_price_id = lic.stripe_price_id,
      updated_at = now()
  where id = org_id;
end;
$$;

-- Example RLS policies guarding writes on fees and seasons
-- Apply only if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'fees') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_admins_can_create_fees_if_license_active') THEN
      CREATE POLICY org_admins_can_create_fees_if_license_active ON fees FOR INSERT TO authenticated
      WITH CHECK (
        user_has_org_role(auth.uid(), org_id, 'org_admin')
        AND is_org_license_active(org_id)
      );
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'seasons') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_admins_can_create_seasons_if_license_active') THEN
      CREATE POLICY org_admins_can_create_seasons_if_license_active ON seasons FOR INSERT TO authenticated
      WITH CHECK (
        user_has_org_role(auth.uid(), org_id, 'org_admin')
        AND is_org_license_active(org_id)
      );
    END IF;
  END IF;
END $$;
