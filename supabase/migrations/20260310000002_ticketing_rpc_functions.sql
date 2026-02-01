-- Ticketing System RPC Functions
-- ===============================
-- Helper functions for ticket capacity management and validation

-- Function to decrement ticket capacity (with row lock)
CREATE OR REPLACE FUNCTION decrement_ticket_capacity(
  p_ticket_type_id UUID,
  p_quantity INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_capacity INTEGER;
BEGIN
  -- Lock row and decrement capacity
  UPDATE ticket_types
  SET capacity_remaining = capacity_remaining - p_quantity,
      updated_at = NOW()
  WHERE id = p_ticket_type_id
    AND capacity_total IS NOT NULL
    AND capacity_remaining IS NOT NULL
    AND capacity_remaining >= p_quantity
  RETURNING capacity_remaining INTO v_current_capacity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient capacity or invalid ticket type';
  END IF;

  IF v_current_capacity < 0 THEN
    RAISE EXCEPTION 'Capacity would go negative';
  END IF;
END;
$$;

-- Function to increment ticket capacity (for hold releases or refunds)
CREATE OR REPLACE FUNCTION increment_ticket_capacity(
  p_ticket_type_id UUID,
  p_quantity INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_capacity INTEGER;
  v_total_capacity INTEGER;
BEGIN
  -- Lock row and increment capacity
  UPDATE ticket_types
  SET capacity_remaining = LEAST(
      capacity_remaining + p_quantity,
      capacity_total
    ),
      updated_at = NOW()
  WHERE id = p_ticket_type_id
    AND capacity_total IS NOT NULL
    AND capacity_remaining IS NOT NULL
  RETURNING capacity_remaining, capacity_total INTO v_current_capacity, v_total_capacity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket type not found or has no capacity limit';
  END IF;

  -- Ensure we don't exceed total capacity
  IF v_current_capacity > v_total_capacity THEN
    UPDATE ticket_types
    SET capacity_remaining = capacity_total
    WHERE id = p_ticket_type_id;
  END IF;
END;
$$;

-- Function to release expired ticket holds
CREATE OR REPLACE FUNCTION release_expired_ticket_holds()
RETURNS TABLE(
  released_holds INTEGER,
  released_capacity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hold RECORD;
  v_released_holds INTEGER := 0;
  v_released_capacity INTEGER := 0;
BEGIN
  -- Process expired holds that are not yet finalized (order still pending_payment)
  FOR v_hold IN
    SELECT th.id, th.ticket_type_id, th.qty, th.order_id
    FROM ticket_holds th
    JOIN ticket_orders ord ON ord.id = th.order_id
    WHERE th.expires_at < NOW()
      AND ord.status = 'pending_payment'
  LOOP
    -- Release capacity
    PERFORM increment_ticket_capacity(v_hold.ticket_type_id, v_hold.qty);
    
    -- Delete hold
    DELETE FROM ticket_holds WHERE id = v_hold.id;
    
    v_released_holds := v_released_holds + 1;
    v_released_capacity := v_released_capacity + v_hold.qty;
  END LOOP;

  RETURN QUERY SELECT v_released_holds, v_released_capacity;
END;
$$;
