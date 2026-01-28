-- ============================================================================
-- Add payment_type to payments table
-- ============================================================================
-- Supports partial vs full payment tracking for fee payments.
-- payment_type: 'partial' for single-fee partial payments, 'full' for multi-fee or full balance payments.

-- Create payment_type enum
DO $$ BEGIN
  CREATE TYPE payment_type AS ENUM ('partial', 'full');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add payment_type column to payments table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN payment_type payment_type DEFAULT 'full';
    
    -- Backfill: set all existing payments to 'full' (they were all full payments)
    UPDATE payments SET payment_type = 'full' WHERE payment_type IS NULL;
    
    -- Make it NOT NULL after backfill
    ALTER TABLE payments ALTER COLUMN payment_type SET NOT NULL;
  END IF;
END $$;

-- Add index for efficient querying by payment_type
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);

-- Add comment
COMMENT ON COLUMN payments.payment_type IS 'Type of payment: partial (single fee partial amount) or full (multi-fee or full balance)';
