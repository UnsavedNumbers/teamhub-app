-- Phase 06: Payments Table
-- =========================
-- Fees and payments per child per team/season

-- Create payment status enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('due', 'paid', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in cents
  description TEXT,
  due_date DATE,
  status payment_status NOT NULL DEFAULT 'due',
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_payments_child_id ON payments(child_id);
CREATE INDEX idx_payments_team_id ON payments(team_id);
CREATE INDEX idx_payments_season_id ON payments(season_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Add trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS Policies for payments are added in 017_deferred_rls_policies.sql
-- This is because they depend on users, children, and teams tables
