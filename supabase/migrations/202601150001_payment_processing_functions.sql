-- Payment processing helpers for parent checkout and license sync
-- Adds RPC helpers, balance trigger, idempotency constraints, and license summary trigger

set search_path to public;

-- ---------------------------------------------------------------------------
-- RPC: process_payment_allocation
-- Locks a fee assignment row, validates balance, and applies payment atomically
-- ---------------------------------------------------------------------------
create or replace function process_payment_allocation(
  p_fee_assignment_id uuid,
  p_amount_cents integer
) returns void
language plpgsql
as $$
declare
  v_fee fee_assignments%rowtype;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'p_amount_cents must be positive';
  end if;

  select * into v_fee
  from fee_assignments
  where id = p_fee_assignment_id
  for update nowait;

  if not found then
    raise exception 'fee_assignment % not found', p_fee_assignment_id;
  end if;

  if v_fee.balance_cents < p_amount_cents then
    raise exception 'insufficient balance on fee_assignment %', p_fee_assignment_id;
  end if;

  update fee_assignments
    set
      paid_cents_total = paid_cents_total + p_amount_cents,
      balance_cents = balance_cents - p_amount_cents,
      status = case
        when balance_cents - p_amount_cents <= 0 then 'paid'
        when paid_cents_total + p_amount_cents > 0 then 'partial'
        else 'unpaid'
      end,
      updated_at = now()
  where id = p_fee_assignment_id;
exception
  when lock_not_available then
    raise exception 'fee_assignment % is being updated; retry', p_fee_assignment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: keep fee_assignments balance and status in sync with allocations
-- ---------------------------------------------------------------------------
create or replace function update_fee_assignment_balance()
returns trigger
language plpgsql
as $$
declare
  v_fee_assignment_id uuid;
  v_amount integer;
  v_paid integer;
  v_waived integer;
  v_scholarship integer;
  v_discount integer;
  v_late integer;
  v_balance integer;
begin
  v_fee_assignment_id := coalesce(new.fee_assignment_id, old.fee_assignment_id);
  if v_fee_assignment_id is null then
    return null;
  end if;

  select amount_cents, waived_cents_total, scholarship_cents_total, discount_cents_total, late_fee_cents_applied
    into v_amount, v_waived, v_scholarship, v_discount, v_late
    from fee_assignments
    where id = v_fee_assignment_id
    for update;

  select coalesce(sum(amount_cents), 0)
    into v_paid
    from payment_allocations
    where fee_assignment_id = v_fee_assignment_id;

  v_balance := v_amount + coalesce(v_late, 0) - v_paid - v_waived - v_scholarship + v_discount;

  if v_balance < 0 then
    raise exception 'fee_assignment % would have negative balance (%).', v_fee_assignment_id, v_balance;
  end if;

  update fee_assignments
    set
      paid_cents_total = v_paid,
      balance_cents = v_balance,
      status = case
        when status in ('waived', 'refunded', 'offline_recorded', 'scholarship_applied') then status
        when v_balance = 0 then 'paid'
        when v_paid > 0 then 'partial'
        else 'unpaid'
      end,
      updated_at = now()
  where id = v_fee_assignment_id;

  return null;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_trigger where tgname = 'trg_payment_allocations_balance'
  ) then
    drop trigger trg_payment_allocations_balance on payment_allocations;
  end if;
  create trigger trg_payment_allocations_balance
    after insert or update or delete on payment_allocations
    for each row
    execute function update_fee_assignment_balance();
  end $$;

-- ---------------------------------------------------------------------------
-- RPC: complete_payment_processing
-- Creates allocations from checkout_session_items and marks payment/session
-- ---------------------------------------------------------------------------
create or replace function complete_payment_processing(
  p_payment_id uuid,
  p_checkout_session_id uuid
) returns void
language plpgsql
as $$
declare
  v_existing_allocs integer;
begin
  -- lock primary rows to avoid concurrent updates
  perform 1 from payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment % not found', p_payment_id;
  end if;

  perform 1 from checkout_sessions where id = p_checkout_session_id for update;
  if not found then
    raise exception 'checkout_session % not found', p_checkout_session_id;
  end if;

  select count(*) into v_existing_allocs from payment_allocations where payment_id = p_payment_id;
  if v_existing_allocs > 0 then
    return; -- already processed
  end if;

  insert into payment_allocations (payment_id, charge_id, fee_assignment_id, amount_cents)
  select
    p_payment_id,
    csi.charge_id,
    coalesce(csi.fee_assignment_id, ch.fee_assignment_id),
    csi.amount_cents
  from checkout_session_items csi
  left join charges ch on ch.id = csi.charge_id
  where csi.checkout_session_id = p_checkout_session_id;

  update payments
    set status = 'succeeded', paid_at = coalesce(paid_at, now())
  where id = p_payment_id;

  update checkout_sessions
    set status = 'succeeded'
  where id = p_checkout_session_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Idempotency constraints for webhook processing
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'billing_events'
      and constraint_name = 'billing_events_unique_stripe_event_id'
  ) then
    alter table billing_events add constraint billing_events_unique_stripe_event_id unique (stripe_event_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'payments'
      and constraint_name = 'payments_unique_stripe_payment_intent_id'
  ) then
    alter table payments add constraint payments_unique_stripe_payment_intent_id unique (stripe_payment_intent_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Fee assignment balance integrity checks
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'fee_assignments'
      and constraint_name = 'fee_assignments_balance_nonnegative'
  ) then
    alter table fee_assignments add constraint fee_assignments_balance_nonnegative check (balance_cents >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'fee_assignments'
      and constraint_name = 'fee_assignments_status_balance_match'
  ) then
    alter table fee_assignments add constraint fee_assignments_status_balance_match check (
      (status = 'paid' and balance_cents = 0) or
      (status = 'partial' and balance_cents > 0 and balance_cents < amount_cents) or
      (status = 'unpaid' and balance_cents = amount_cents) or
      (status in ('waived', 'refunded', 'scholarship_applied', 'offline_recorded'))
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- License summary sync trigger (backup to explicit RPC call)
-- ---------------------------------------------------------------------------
create or replace function trg_sync_org_license_summary()
returns trigger
language plpgsql
as $$
begin
  perform sync_org_license_summary(new.organization_id);
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'sync_license_summary_trigger'
  ) then
    create trigger sync_license_summary_trigger
      after insert or update on org_licenses
      for each row
      execute function trg_sync_org_license_summary();
  end if;
end $$;
