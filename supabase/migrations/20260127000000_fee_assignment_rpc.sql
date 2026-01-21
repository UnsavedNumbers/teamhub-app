-- Migration: Create fee assignment RPC
-- Timestamp: 20260127000000

CREATE OR REPLACE FUNCTION create_fee_with_assignments(
  p_fee_data JSONB,
  p_assignments JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fee_id UUID;
  v_org_id UUID;
  v_created_fee JSONB;
  v_assignment JSONB;
  v_count INTEGER := 0;
BEGIN
  -- Extract org_id from fee data for security check
  v_org_id := (p_fee_data->>'org_id')::UUID;

  -- 1. Create the Fee
  INSERT INTO fees (
    org_id,
    season_id,
    title,
    description,
    fee_type,
    amount_cents,
    currency,
    due_date,
    scope,
    status,
    created_by_admin_id,
    allow_partial_payment,
    allow_installments,
    allow_discounts,
    allow_scholarships,
    visibility
  )
  VALUES (
    v_org_id,
    (p_fee_data->>'season_id')::UUID,
    (p_fee_data->>'title'),
    (p_fee_data->>'description'),
    (p_fee_data->>'fee_type')::fee_type,
    (p_fee_data->>'amount_cents')::INTEGER,
    COALESCE(p_fee_data->>'currency', 'usd'),
    (p_fee_data->>'due_date')::DATE,
    (p_fee_data->>'scope')::fee_scope,
    (p_fee_data->>'status')::fee_status,
    (p_fee_data->>'created_by_admin_id')::UUID,
    COALESCE((p_fee_data->>'allow_partial_payment')::BOOLEAN, false),
    COALESCE((p_fee_data->>'allow_installments')::BOOLEAN, false),
    COALESCE((p_fee_data->>'allow_discounts')::BOOLEAN, false),
    COALESCE((p_fee_data->>'allow_scholarships')::BOOLEAN, false),
    COALESCE((p_fee_data->>'visibility')::fee_visibility, 'all_parents')
  )
  RETURNING id INTO v_fee_id;

  -- 2. Create Assignments
  -- Loop through the assignments array
  FOR v_assignment IN SELECT * FROM jsonb_array_elements(p_assignments)
  LOOP
    INSERT INTO fee_assignments (
      org_id,
      fee_id,
      athlete_id,
      parent_id,
      amount_cents,
      balance_cents,
      status,
      due_date
    )
    VALUES (
      v_org_id,
      v_fee_id,
      (v_assignment->>'athlete_id')::UUID,
      (v_assignment->>'parent_id')::UUID,
      (p_fee_data->>'amount_cents')::INTEGER, -- Initial amount matches fee
      (p_fee_data->>'amount_cents')::INTEGER, -- Initial balance matches fee
      'unpaid',
      (p_fee_data->>'due_date')::DATE
    );
    v_count := v_count + 1;
  END LOOP;

  -- Return the created fee ID and count
  RETURN jsonb_build_object(
    'fee_id', v_fee_id,
    'assignments_created', v_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;
