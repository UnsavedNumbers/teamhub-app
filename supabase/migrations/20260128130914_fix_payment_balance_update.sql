-- Fix complete_payment_processing to manually update fee assignment balances
-- This ensures balances are updated even if triggers don't fire

create or replace function complete_payment_processing(
  p_payment_id uuid,
  p_checkout_session_id uuid
) returns void
language plpgsql
as $$
declare
  v_existing_allocs integer;
  v_fee_assignment_id uuid;
  v_amount integer;
  v_paid integer;
  v_balance integer;
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

  -- Manually update each fee_assignment balance (backup in case trigger doesn't fire)
  for v_fee_assignment_id in
    select distinct coalesce(csi.fee_assignment_id, ch.fee_assignment_id) as faid
    from checkout_session_items csi
    left join charges ch on ch.id = csi.charge_id
    where csi.checkout_session_id = p_checkout_session_id
      and coalesce(csi.fee_assignment_id, ch.fee_assignment_id) is not null
  loop
    -- Recalculate balance for this fee_assignment
    select fa.amount_cents,
           coalesce(sum(pa.amount_cents), 0)
      into v_amount, v_paid
    from fee_assignments fa
    left join payment_allocations pa on pa.fee_assignment_id = fa.id
    where fa.id = v_fee_assignment_id
    group by fa.amount_cents;

    v_balance := v_amount - v_paid;

    update fee_assignments
    set
      paid_cents_total = v_paid,
      balance_cents = v_balance,
      status = case
        when v_balance = 0 then 'paid'
        when v_paid > 0 then 'partial'
        else 'unpaid'
      end,
      updated_at = now()
    where id = v_fee_assignment_id;
  end loop;

  update payments
    set status = 'succeeded', paid_at = coalesce(paid_at, now())
  where id = p_payment_id;

  update checkout_sessions
    set status = 'succeeded'
  where id = p_checkout_session_id;
end;
$$;
