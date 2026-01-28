-- Backfill payment_allocations from existing Stripe payments + checkout_session_items
-- Use when payment_allocations is empty but payments and checkout_session_items exist
-- (e.g. webhook never ran complete_payment_processing or allocations were skipped)
--
-- Disables the balance trigger during insert to avoid "negative balance" errors when
-- allocation sums exceed current fee_assignment state (e.g. already marked paid elsewhere).
-- After insert, fee_assignments are recomputed from allocation sums and trigger is restored.

set search_path to public;

-- 1. Disable trigger so insert cannot raise "would have negative balance"
DROP TRIGGER IF EXISTS trg_payment_allocations_balance ON payment_allocations;

-- 2. Insert allocations (same logic as complete_payment_processing)
INSERT INTO payment_allocations (payment_id, charge_id, fee_assignment_id, amount_cents)
SELECT
  p.id,
  csi.charge_id,
  COALESCE(csi.fee_assignment_id, ch.fee_assignment_id),
  csi.amount_cents
FROM payments p
JOIN checkout_session_items csi ON csi.checkout_session_id = p.checkout_session_id
LEFT JOIN charges ch ON ch.id = csi.charge_id
WHERE p.checkout_session_id IS NOT NULL
  AND p.status = 'succeeded'
  AND NOT EXISTS (
    SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = p.id
  );

-- 3. Recompute fee_assignment balances from allocation sums (match update_fee_assignment_balance logic)
-- Cap balance at 0 so over-allocated assignments become "paid" instead of failing
UPDATE fee_assignments fa
SET
  paid_cents_total = v.paid,
  balance_cents = GREATEST(0, fa.amount_cents + COALESCE(fa.late_fee_cents_applied, 0)
    - v.paid - COALESCE(fa.waived_cents_total, 0) - COALESCE(fa.scholarship_cents_total, 0)
    + COALESCE(fa.discount_cents_total, 0)),
  status = CASE
    WHEN fa.status IN ('waived', 'refunded', 'offline_recorded', 'scholarship_applied') THEN fa.status
    WHEN GREATEST(0, fa.amount_cents + COALESCE(fa.late_fee_cents_applied, 0)
      - v.paid - COALESCE(fa.waived_cents_total, 0) - COALESCE(fa.scholarship_cents_total, 0)
      + COALESCE(fa.discount_cents_total, 0)) = 0 THEN 'paid'
    WHEN v.paid > 0 THEN 'partial'
    ELSE 'unpaid'
  END,
  updated_at = now()
FROM (
  SELECT fee_assignment_id, COALESCE(SUM(amount_cents), 0)::integer AS paid
  FROM payment_allocations
  WHERE fee_assignment_id IS NOT NULL
  GROUP BY fee_assignment_id
) v
WHERE fa.id = v.fee_assignment_id;

-- 4. Re-create trigger
CREATE TRIGGER trg_payment_allocations_balance
  AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_fee_assignment_balance();
