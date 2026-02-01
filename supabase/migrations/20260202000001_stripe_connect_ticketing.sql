-- ============================================
-- Stripe Connect Ticketing - Database Migration
-- ============================================
-- This migration adds Stripe Connect destination charge support for ticketing:
-- - Creates stripe_connect_transactions table for transaction tracking
-- - Adds Connect-related columns to ticket_orders table
-- - Sets up RLS policies for org-scoped access

-- ============================================
-- CREATE stripe_connect_transactions TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.stripe_connect_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_order_id UUID NOT NULL REFERENCES public.ticket_orders(id) ON DELETE RESTRICT,
  stripe_charge_id TEXT,
  stripe_application_fee_id TEXT,
  connect_account_id TEXT NOT NULL,
  gross_amount_cents INTEGER NOT NULL,
  application_fee_cents INTEGER NOT NULL,
  net_amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one transaction record per order
  CONSTRAINT stripe_connect_transactions_ticket_order_id_key UNIQUE (ticket_order_id)
);

-- ============================================
-- ALTER ticket_orders TABLE
-- ============================================

-- Add Connect-related columns (all nullable for backward compatibility)
ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER,
  ADD COLUMN IF NOT EXISTS org_revenue_cents INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_application_fee_id TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- ============================================
-- INDEXES
-- ============================================

-- Index for org revenue queries (by Connect account and date)
CREATE INDEX IF NOT EXISTS idx_stripe_connect_transactions_account_created 
  ON public.stripe_connect_transactions(connect_account_id, created_at);

-- Index for ticket order queries by org and processing date
CREATE INDEX IF NOT EXISTS idx_ticket_orders_org_processed 
  ON public.ticket_orders(org_id, processed_at) 
  WHERE processed_at IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on stripe_connect_transactions
ALTER TABLE public.stripe_connect_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for edge functions)
CREATE POLICY "Service role full access to stripe_connect_transactions"
  ON public.stripe_connect_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Org admins can read their org's transactions via ticket_orders join
CREATE POLICY "Org admins can read their org's connect transactions"
  ON public.stripe_connect_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ticket_orders tord
      JOIN public.organization_members om ON om.org_id = tord.org_id
      WHERE tord.id = stripe_connect_transactions.ticket_order_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.stripe_connect_transactions IS 'Records Stripe Connect destination charge transactions for ticket orders. Each row represents one completed payment with platform fee and org revenue breakdown.';
COMMENT ON COLUMN public.stripe_connect_transactions.ticket_order_id IS 'Foreign key to ticket_orders. Unique constraint ensures one transaction record per order.';
COMMENT ON COLUMN public.stripe_connect_transactions.connect_account_id IS 'Stripe Connect account ID (e.g. acct_xxx) where revenue is transferred.';
COMMENT ON COLUMN public.stripe_connect_transactions.gross_amount_cents IS 'Total charge amount in cents (before platform fee).';
COMMENT ON COLUMN public.stripe_connect_transactions.application_fee_cents IS 'Platform fee amount in cents ($1 per ticket).';
COMMENT ON COLUMN public.stripe_connect_transactions.net_amount_cents IS 'Org revenue amount in cents (gross - application_fee).';

COMMENT ON COLUMN public.ticket_orders.stripe_connect_account_id IS 'Stripe Connect account ID used for this order (snapshot at checkout time).';
COMMENT ON COLUMN public.ticket_orders.platform_fee_cents IS 'Platform fee for this order ($1 × ticket count).';
COMMENT ON COLUMN public.ticket_orders.org_revenue_cents IS 'Organization revenue for this order (total_cents - platform_fee_cents).';
COMMENT ON COLUMN public.ticket_orders.stripe_charge_id IS 'Stripe Charge ID from PaymentIntent (for refunds).';
COMMENT ON COLUMN public.ticket_orders.stripe_application_fee_id IS 'Stripe Application Fee ID (for reporting).';
COMMENT ON COLUMN public.ticket_orders.processed_at IS 'Timestamp when webhook marked order as paid and created tickets.';
