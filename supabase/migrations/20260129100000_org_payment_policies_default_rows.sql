-- ============================================================================
-- Ensure every organization has an org_payment_policies row
-- ============================================================================
-- The table org_payment_policies was created in 018 but nothing ever inserts
-- rows. Backfill existing orgs and add a trigger for new orgs.

-- Backfill: insert default policy row for every org that doesn't have one
INSERT INTO org_payment_policies (
  org_id,
  require_offline_only,
  allow_partial_payments,
  allow_installments,
  allow_discounts,
  allow_scholarships,
  allow_late_fees,
  require_purchase_order_ref
)
SELECT
  o.id,
  false,
  true,
  true,
  true,
  true,
  false,
  false
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM org_payment_policies opp WHERE opp.org_id = o.id
);

-- Trigger: when a new organization is created, create a default payment policy row
CREATE OR REPLACE FUNCTION create_org_payment_policy_for_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO org_payment_policies (
    org_id,
    require_offline_only,
    allow_partial_payments,
    allow_installments,
    allow_discounts,
    allow_scholarships,
    allow_late_fees,
    require_purchase_order_ref
  )
  VALUES (
    NEW.id,
    false,
    true,
    true,
    true,
    true,
    false,
    false
  )
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_org_payment_policy ON organizations;
CREATE TRIGGER trigger_create_org_payment_policy
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_org_payment_policy_for_new_org();

COMMENT ON FUNCTION create_org_payment_policy_for_new_org() IS 'Creates a default org_payment_policies row when a new organization is inserted';
