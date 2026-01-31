-- Stripe Connect Integration Updates
-- ===================================
-- Adds indexes, constraints, and RPC functions for Stripe Connect integration

-- 1. Add index on payout_account_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_payout_account_id 
ON organizations(payout_account_id) 
WHERE payout_account_id IS NOT NULL;

-- 2. Add connect_link_created_at column to track Account Link expiration
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'connect_link_created_at'
  ) THEN
    ALTER TABLE organizations ADD COLUMN connect_link_created_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Add CHECK constraint to prevent invalid payout states
DO $$ 
BEGIN
  -- First, validate existing data
  IF EXISTS (
    SELECT 1 FROM organizations 
    WHERE payouts_enabled = true AND payout_account_id IS NULL
  ) THEN
    -- Fix invalid data before adding constraint
    UPDATE organizations 
    SET payouts_enabled = false 
    WHERE payouts_enabled = true AND payout_account_id IS NULL;
  END IF;

  -- Add constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_payouts_consistency' 
    AND table_name = 'organizations'
  ) THEN
    ALTER TABLE organizations 
    ADD CONSTRAINT check_payouts_consistency 
    CHECK (payouts_enabled = false OR payout_account_id IS NOT NULL);
  END IF;
END $$;

-- 4. Create RPC function to sync organization Connect status from Stripe
CREATE OR REPLACE FUNCTION sync_organization_connect_status(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payout_account_id TEXT;
  v_result JSONB;
BEGIN
  -- Get payout_account_id
  SELECT payout_account_id INTO v_payout_account_id
  FROM organizations
  WHERE id = p_org_id;

  IF v_payout_account_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Organization does not have a connected Stripe account',
      'code', 'NO_CONNECT_ACCOUNT'
    );
  END IF;

  -- Note: Actual Stripe API call should be done in edge function
  -- This function is a placeholder for the sync logic
  -- The edge function will call Stripe API and update the database
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Sync initiated. Status will be updated via webhook.',
    'payout_account_id', v_payout_account_id
  );
END;
$$;

COMMENT ON FUNCTION sync_organization_connect_status IS 'Initiates sync of organization Stripe Connect status. Actual sync happens via Stripe API call in edge function.';

GRANT EXECUTE ON FUNCTION sync_organization_connect_status(UUID) TO authenticated;

-- 5. Ensure billing_events table supports Connect events
-- (Table already exists from 023_organization_licenses.sql)
-- Verify unique constraint exists on stripe_event_id for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'billing_events_unique_stripe_event_id' 
    AND table_name = 'billing_events'
  ) THEN
    ALTER TABLE billing_events 
    ADD CONSTRAINT billing_events_unique_stripe_event_id 
    UNIQUE (stripe_event_id);
  END IF;
END $$;
