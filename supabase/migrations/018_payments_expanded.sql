-- =================================================================
-- PAYMENTS + FEES DATA MODEL (EXPANDED)
-- YouthSports.team
-- =================================================================
-- This migration implements the comprehensive payments and fees system
-- supporting installments, discounts, scholarships, waivers, and more.

-- =================================================================
-- STEP 1: UPDATE EXISTING TABLES
-- =================================================================

-- Update organizations table with payment-related fields
DO $$ BEGIN
  -- Add org_type enum
  CREATE TYPE org_type AS ENUM ('school', 'club', 'league', 'academy', 'aau');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  -- Add billing_mode enum
  CREATE TYPE billing_mode AS ENUM ('platform_facilitated', 'offline_only');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  -- Add payout_onboarding_status enum
  CREATE TYPE payout_onboarding_status AS ENUM ('pending', 'completed', 'restricted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to organizations (using ALTER TABLE with IF NOT EXISTS check)
DO $$ 
BEGIN
  -- Add slug if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'organizations' AND column_name = 'slug') THEN
    ALTER TABLE organizations ADD COLUMN slug TEXT UNIQUE;
  END IF;
  
  -- Add org_type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'organizations' AND column_name = 'org_type') THEN
    ALTER TABLE organizations ADD COLUMN org_type org_type;
  END IF;
  
  -- Add billing_mode if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'organizations' AND column_name = 'billing_mode') THEN
    ALTER TABLE organizations ADD COLUMN billing_mode billing_mode DEFAULT 'platform_facilitated';
  END IF;
  
  -- Add currency if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'organizations' AND column_name = 'currency') THEN
    ALTER TABLE organizations ADD COLUMN currency TEXT DEFAULT 'usd';
  END IF;
  
  -- Add Stripe Connect fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'organizations' AND column_name = 'payout_account_id') THEN
    ALTER TABLE organizations ADD COLUMN payout_account_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'organizations' AND column_name = 'payouts_enabled') THEN
    ALTER TABLE organizations ADD COLUMN payouts_enabled BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'organizations' AND column_name = 'payout_onboarding_status') THEN
    ALTER TABLE organizations ADD COLUMN payout_onboarding_status payout_onboarding_status DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'organizations' AND column_name = 'payout_descriptor') THEN
    ALTER TABLE organizations ADD COLUMN payout_descriptor TEXT;
  END IF;
  
  -- Add policy fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'organizations' AND column_name = 'refund_policy') THEN
    ALTER TABLE organizations ADD COLUMN refund_policy TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'organizations' AND column_name = 'contact_email') THEN
    ALTER TABLE organizations ADD COLUMN contact_email TEXT;
  END IF;
END $$;

-- Add indexes for new organization fields
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_org_type ON organizations(org_type);
CREATE INDEX IF NOT EXISTS idx_organizations_billing_mode ON organizations(billing_mode);

-- Update seasons table with new fields
DO $$ 
BEGIN
  -- Add org_id if it doesn't exist (seasons should link to org)
  -- Note: Checking for organization_id for backward compatibility, but creating as org_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'seasons' AND (column_name = 'organization_id' OR column_name = 'org_id')) THEN
    ALTER TABLE seasons ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    -- Backfill: set org_id from team's org_id
    UPDATE seasons s SET org_id = t.org_id 
    FROM teams t WHERE s.team_id = t.id;
    -- Only set NOT NULL if all rows have values (safety check)
    -- Note: After normalization migration, this will be org_id
    IF NOT EXISTS (SELECT 1 FROM seasons WHERE org_id IS NULL) THEN
      ALTER TABLE seasons ALTER COLUMN org_id SET NOT NULL;
    END IF;
  END IF;
  
  -- Add sport_id, program_id (nullable for now, can be added later)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'seasons' AND column_name = 'sport_id') THEN
    ALTER TABLE seasons ADD COLUMN sport_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'seasons' AND column_name = 'program_id') THEN
    ALTER TABLE seasons ADD COLUMN program_id UUID;
  END IF;
  
  -- Note: team_id already exists, keeping it
  
  -- Add is_active
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'seasons' AND column_name = 'is_active') THEN
    ALTER TABLE seasons ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add indexes for new season fields
CREATE INDEX IF NOT EXISTS idx_seasons_org_id ON seasons(org_id);
CREATE INDEX IF NOT EXISTS idx_seasons_is_active ON seasons(is_active);

-- =================================================================
-- STEP 2: CREATE ENUMS
-- =================================================================

-- Fee-related enums
DO $$ BEGIN
  CREATE TYPE fee_type AS ENUM ('registration', 'uniform', 'tournament', 'travel', 'fundraiser', 'misc');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fee_scope AS ENUM ('team', 'selected_players', 'individual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fee_status AS ENUM ('draft', 'published', 'closed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fee_visibility AS ENUM ('all_parents', 'assigned_only');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fee_assignment_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded', 'waived', 'scholarship_applied', 'offline_recorded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE charge_type AS ENUM ('fee_payment', 'late_fee', 'discount', 'scholarship_credit', 'waiver_credit', 'adjustment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE charge_status AS ENUM ('pending', 'applied', 'voided');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE checkout_session_status AS ENUM ('created', 'in_progress', 'succeeded', 'canceled', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_new AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE offline_payment_method AS ENUM ('cash', 'check', 'external_processor', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE offline_payment_status AS ENUM ('recorded', 'voided');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE installment_frequency AS ENUM ('weekly', 'biweekly', 'monthly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE start_date_rule AS ENUM ('on_publish', 'custom_date');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE installment_schedule_status AS ENUM ('active', 'completed', 'defaulted', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE installment_status AS ENUM ('upcoming', 'due', 'paid', 'late', 'skipped', 'waived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percent', 'fixed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE discount_code_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE scholarship_funding_source AS ENUM ('org_funded', 'sponsor_funded', 'district_funded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE scholarship_program_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_event_entity_type AS ENUM (
    'fee',
    'fee_assignment',
    'charge',
    'checkout_session',
    'payment',
    'offline_payment',
    'refund',
    'waiver',
    'scholarship_award',
    'discount_redemption'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =================================================================
-- STEP 3: DROP OLD PAYMENTS TABLE (if exists, we'll recreate it)
-- =================================================================

-- Drop old payment policies first (from 017_deferred_rls_policies.sql)
DROP POLICY IF EXISTS "Parents can view their payments" ON payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
DROP POLICY IF EXISTS "Coaches can view payment status" ON payments;

-- Drop the old simple payments table and recreate with new structure
DROP TABLE IF EXISTS payments CASCADE;

-- =================================================================
-- STEP 4: CREATE FEES AND ASSIGNMENTS
-- =================================================================

-- Installment Plans (needed by fees)
CREATE TABLE IF NOT EXISTS installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  num_installments INTEGER NOT NULL,
  frequency installment_frequency NOT NULL,
  day_of_month INTEGER, -- nullable, for monthly plans
  start_date_rule start_date_rule NOT NULL,
  
  down_payment_cents INTEGER,
  allows_early_payoff BOOLEAN DEFAULT false,
  grace_days INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_installment_plans_org_id ON installment_plans(org_id);

CREATE TRIGGER update_installment_plans_updated_at
  BEFORE UPDATE ON installment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;

-- Fees (what admins create)
CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  
  fee_type fee_type NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  
  due_date DATE,
  scope fee_scope NOT NULL,
  
  status fee_status NOT NULL DEFAULT 'draft',
  
  allow_partial_payment BOOLEAN DEFAULT false,
  min_partial_cents INTEGER,
  allow_late_payment BOOLEAN DEFAULT false,
  late_fee_cents INTEGER,
  late_fee_starts_on DATE,
  
  allow_installments BOOLEAN DEFAULT false,
  installment_plan_id UUID REFERENCES installment_plans(id) ON DELETE SET NULL,
  
  allow_discounts BOOLEAN DEFAULT false,
  allow_scholarships BOOLEAN DEFAULT false,
  
  visibility fee_visibility NOT NULL DEFAULT 'all_parents',
  require_acknowledgement BOOLEAN DEFAULT false,
  ack_text TEXT,
  
  created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fees_org_id ON fees(org_id);
CREATE INDEX idx_fees_season_id ON fees(season_id);
CREATE INDEX idx_fees_status ON fees(status);
CREATE INDEX idx_fees_fee_type ON fees(fee_type);
CREATE INDEX idx_fees_created_by_admin_id ON fees(created_by_admin_id);

CREATE TRIGGER update_fees_updated_at
  BEFORE UPDATE ON fees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE fees ENABLE ROW LEVEL SECURITY;

-- Fee Assignments (who owes)
CREATE TABLE IF NOT EXISTS fee_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fee_id UUID NOT NULL REFERENCES fees(id) ON DELETE CASCADE,
  
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- parent is a user with role='parent'
  
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  
  due_date DATE,
  status fee_assignment_status NOT NULL DEFAULT 'unpaid',
  
  balance_cents INTEGER NOT NULL DEFAULT 0, -- remaining balance
  paid_cents_total INTEGER NOT NULL DEFAULT 0, -- sum of successful payments
  waived_cents_total INTEGER NOT NULL DEFAULT 0, -- sum of waivers
  scholarship_cents_total INTEGER NOT NULL DEFAULT 0, -- sum of scholarships
  discount_cents_total INTEGER NOT NULL DEFAULT 0, -- sum of discounts
  late_fee_cents_applied INTEGER NOT NULL DEFAULT 0, -- late fees assessed
  
  notes_internal TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_assignments_org_id ON fee_assignments(org_id);
CREATE INDEX idx_fee_assignments_fee_id ON fee_assignments(fee_id);
CREATE INDEX idx_fee_assignments_athlete_id ON fee_assignments(athlete_id);
CREATE INDEX idx_fee_assignments_parent_id ON fee_assignments(parent_id);
CREATE INDEX idx_fee_assignments_status ON fee_assignments(status);

CREATE TRIGGER update_fee_assignments_updated_at
  BEFORE UPDATE ON fee_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE fee_assignments ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 5: CREATE CHARGES AND CHECKOUT
-- =================================================================

-- Charges (line items for checkout and ledger)
CREATE TABLE IF NOT EXISTS charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  charge_type charge_type NOT NULL,
  fee_assignment_id UUID REFERENCES fee_assignments(id) ON DELETE SET NULL,
  fee_id UUID REFERENCES fees(id) ON DELETE SET NULL,
  
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL, -- positive = increases owed, negative = reduces owed
  currency TEXT DEFAULT 'usd',
  
  status charge_status NOT NULL DEFAULT 'pending',
  
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_charges_org_id ON charges(org_id);
CREATE INDEX idx_charges_fee_assignment_id ON charges(fee_assignment_id);
CREATE INDEX idx_charges_fee_id ON charges(fee_id);
CREATE INDEX idx_charges_charge_type ON charges(charge_type);
CREATE INDEX idx_charges_status ON charges(status);
CREATE INDEX idx_charges_created_by_user_id ON charges(created_by_user_id);

CREATE TRIGGER update_charges_updated_at
  BEFORE UPDATE ON charges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE charges ENABLE ROW LEVEL SECURITY;

-- Checkout Sessions (multi-fee single checkout)
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status checkout_session_status NOT NULL DEFAULT 'created',
  
  currency TEXT DEFAULT 'usd',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkout_sessions_org_id ON checkout_sessions(org_id);
CREATE INDEX idx_checkout_sessions_parent_id ON checkout_sessions(parent_id);
CREATE INDEX idx_checkout_sessions_status ON checkout_sessions(status);
CREATE INDEX idx_checkout_sessions_stripe_checkout_session_id ON checkout_sessions(stripe_checkout_session_id);

CREATE TRIGGER update_checkout_sessions_updated_at
  BEFORE UPDATE ON checkout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Checkout Session Items
CREATE TABLE IF NOT EXISTS checkout_session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id UUID NOT NULL REFERENCES checkout_sessions(id) ON DELETE CASCADE,
  
  charge_id UUID NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
  fee_assignment_id UUID REFERENCES fee_assignments(id) ON DELETE SET NULL,
  
  amount_cents INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkout_session_items_checkout_session_id ON checkout_session_items(checkout_session_id);
CREATE INDEX idx_checkout_session_items_charge_id ON checkout_session_items(charge_id);
CREATE INDEX idx_checkout_session_items_fee_assignment_id ON checkout_session_items(fee_assignment_id);

ALTER TABLE checkout_session_items ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 6: CREATE PAYMENTS (ONLINE, STRIPE-BACKED)
-- =================================================================

-- Payments (online, Stripe-backed)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  checkout_session_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  
  stripe_payment_intent_id TEXT NOT NULL,
  stripe_charge_id TEXT,
  
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  status payment_status_new NOT NULL DEFAULT 'pending',
  
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_org_id ON payments(org_id);
CREATE INDEX idx_payments_checkout_session_id ON payments(checkout_session_id);
CREATE INDEX idx_payments_parent_id ON payments(parent_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Payment Allocations
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  charge_id UUID NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
  fee_assignment_id UUID REFERENCES fee_assignments(id) ON DELETE SET NULL,
  
  amount_cents INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_charge_id ON payment_allocations(charge_id);
CREATE INDEX idx_payment_allocations_fee_assignment_id ON payment_allocations(fee_assignment_id);

ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 7: CREATE OFFLINE PAYMENTS
-- =================================================================

-- Offline Payments (check/cash tracking)
CREATE TABLE IF NOT EXISTS offline_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  fee_assignment_id UUID NOT NULL REFERENCES fee_assignments(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  
  method offline_payment_method NOT NULL,
  reference TEXT, -- check number, receipt id, optional
  received_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL,
  
  status offline_payment_status NOT NULL DEFAULT 'recorded',
  notes_internal TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offline_payments_org_id ON offline_payments(org_id);
CREATE INDEX idx_offline_payments_fee_assignment_id ON offline_payments(fee_assignment_id);
CREATE INDEX idx_offline_payments_parent_id ON offline_payments(parent_id);
CREATE INDEX idx_offline_payments_child_id ON offline_payments(child_id);
CREATE INDEX idx_offline_payments_received_by_admin_id ON offline_payments(received_by_admin_id);
CREATE INDEX idx_offline_payments_status ON offline_payments(status);

ALTER TABLE offline_payments ENABLE ROW LEVEL SECURITY;

-- Offline Payment Allocations
CREATE TABLE IF NOT EXISTS offline_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offline_payment_id UUID NOT NULL REFERENCES offline_payments(id) ON DELETE CASCADE,
  charge_id UUID NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
  
  amount_cents INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offline_payment_allocations_offline_payment_id ON offline_payment_allocations(offline_payment_id);
CREATE INDEX idx_offline_payment_allocations_charge_id ON offline_payment_allocations(charge_id);

ALTER TABLE offline_payment_allocations ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 8: CREATE INSTALLMENT SYSTEM
-- =================================================================

-- Installment Schedules
CREATE TABLE IF NOT EXISTS installment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_assignment_id UUID NOT NULL REFERENCES fee_assignments(id) ON DELETE CASCADE,
  installment_plan_id UUID NOT NULL REFERENCES installment_plans(id) ON DELETE CASCADE,
  
  status installment_schedule_status NOT NULL DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_installment_schedules_fee_assignment_id ON installment_schedules(fee_assignment_id);
CREATE INDEX idx_installment_schedules_installment_plan_id ON installment_schedules(installment_plan_id);
CREATE INDEX idx_installment_schedules_status ON installment_schedules(status);

CREATE TRIGGER update_installment_schedules_updated_at
  BEFORE UPDATE ON installment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;

-- Installments
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_schedule_id UUID NOT NULL REFERENCES installment_schedules(id) ON DELETE CASCADE,
  
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount_cents INTEGER NOT NULL,
  status installment_status NOT NULL DEFAULT 'upcoming',
  
  paid_cents_total INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_installments_installment_schedule_id ON installments(installment_schedule_id);
CREATE INDEX idx_installments_due_date ON installments(due_date);
CREATE INDEX idx_installments_status ON installments(status);

CREATE TRIGGER update_installments_updated_at
  BEFORE UPDATE ON installments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 9: CREATE DISCOUNTS
-- =================================================================

-- Discount Codes
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  code TEXT NOT NULL,
  description TEXT,
  
  discount_type discount_type NOT NULL,
  percent_off INTEGER, -- nullable
  amount_off_cents INTEGER, -- nullable
  
  max_redemptions INTEGER,
  redeem_by DATE,
  applies_to_fee_id UUID REFERENCES fees(id) ON DELETE SET NULL,
  applies_to_season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  
  status discount_code_status NOT NULL DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, code) -- unique per org
);

CREATE INDEX idx_discount_codes_org_id ON discount_codes(org_id);
CREATE INDEX idx_discount_codes_code ON discount_codes(org_id, code);
CREATE INDEX idx_discount_codes_status ON discount_codes(status);

CREATE TRIGGER update_discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Discount Redemptions
CREATE TABLE IF NOT EXISTS discount_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  fee_assignment_id UUID NOT NULL REFERENCES fee_assignments(id) ON DELETE CASCADE,
  
  redeemed_by_parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  amount_cents_applied INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discount_redemptions_discount_code_id ON discount_redemptions(discount_code_id);
CREATE INDEX idx_discount_redemptions_fee_assignment_id ON discount_redemptions(fee_assignment_id);
CREATE INDEX idx_discount_redemptions_redeemed_by_parent_id ON discount_redemptions(redeemed_by_parent_id);

ALTER TABLE discount_redemptions ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 10: CREATE WAIVERS
-- =================================================================

-- Waivers (admin-controlled comp)
CREATE TABLE IF NOT EXISTS waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fee_assignment_id UUID NOT NULL REFERENCES fee_assignments(id) ON DELETE CASCADE,
  
  amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_by_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waivers_org_id ON waivers(org_id);
CREATE INDEX idx_waivers_fee_assignment_id ON waivers(fee_assignment_id);
CREATE INDEX idx_waivers_created_by_admin_id ON waivers(created_by_admin_id);

ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 11: CREATE SCHOLARSHIPS
-- =================================================================

-- Scholarship Programs
CREATE TABLE IF NOT EXISTS scholarship_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  funding_source scholarship_funding_source NOT NULL,
  budget_cents_total INTEGER,
  budget_cents_remaining INTEGER,
  
  status scholarship_program_status NOT NULL DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scholarship_programs_org_id ON scholarship_programs(org_id);
CREATE INDEX idx_scholarship_programs_status ON scholarship_programs(status);

CREATE TRIGGER update_scholarship_programs_updated_at
  BEFORE UPDATE ON scholarship_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE scholarship_programs ENABLE ROW LEVEL SECURITY;

-- Scholarship Awards
CREATE TABLE IF NOT EXISTS scholarship_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_program_id UUID NOT NULL REFERENCES scholarship_programs(id) ON DELETE CASCADE,
  fee_assignment_id UUID NOT NULL REFERENCES fee_assignments(id) ON DELETE CASCADE,
  
  amount_cents INTEGER NOT NULL,
  awarded_by_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes_internal TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scholarship_awards_scholarship_program_id ON scholarship_awards(scholarship_program_id);
CREATE INDEX idx_scholarship_awards_fee_assignment_id ON scholarship_awards(fee_assignment_id);
CREATE INDEX idx_scholarship_awards_awarded_by_admin_id ON scholarship_awards(awarded_by_admin_id);

ALTER TABLE scholarship_awards ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 12: CREATE REFUNDS
-- =================================================================

-- Refunds
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  offline_payment_id UUID REFERENCES offline_payments(id) ON DELETE SET NULL,
  
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  
  reason TEXT NOT NULL,
  stripe_refund_id TEXT, -- nullable, only for online refunds
  
  created_by_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refunds_org_id ON refunds(org_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_offline_payment_id ON refunds(offline_payment_id);
CREATE INDEX idx_refunds_created_by_admin_id ON refunds(created_by_admin_id);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 13: CREATE ORG PAYMENT POLICIES
-- =================================================================

-- Org Payment Policies (edge cases: school vs club)
CREATE TABLE IF NOT EXISTS org_payment_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  
  require_offline_only BOOLEAN DEFAULT false,
  allow_partial_payments BOOLEAN DEFAULT true,
  allow_installments BOOLEAN DEFAULT true,
  allow_discounts BOOLEAN DEFAULT true,
  allow_scholarships BOOLEAN DEFAULT true,
  allow_late_fees BOOLEAN DEFAULT false,
  
  require_purchase_order_ref BOOLEAN DEFAULT false, -- rare
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_payment_policies_org_id ON org_payment_policies(org_id);

CREATE TRIGGER update_org_payment_policies_updated_at
  BEFORE UPDATE ON org_payment_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE org_payment_policies ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 14: CREATE AUDIT LOG
-- =================================================================

-- Payment Events (audit log)
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  entity_type payment_event_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  
  action TEXT NOT NULL,
  metadata JSONB,
  
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_events_org_id ON payment_events(org_id);
CREATE INDEX idx_payment_events_entity_type ON payment_events(entity_type);
CREATE INDEX idx_payment_events_entity_id ON payment_events(entity_id);
CREATE INDEX idx_payment_events_created_at ON payment_events(created_at);
CREATE INDEX idx_payment_events_created_by_user_id ON payment_events(created_by_user_id);

-- Note: payment_events is write-only for normal users (no SELECT policy for non-admins)
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- NOTES
-- =================================================================
-- 
-- RLS Policies for all payment tables will be added in a separate migration
-- (similar to 017_deferred_rls_policies.sql) to ensure proper role-based access:
-- 
-- Parents:
-- - Can read their own fee_assignments, charges, checkout_sessions, payments, refunds
-- - Can create checkout_sessions and pay
-- - Can view receipts
-- 
-- Coaches:
-- - Can read only "status flags" per child per fee_assignment (unpaid/partial/paid/etc)
-- - Cannot read amount_cents, charges, payments, refunds
-- - Cannot create fees or financial actions
-- 
-- Org Admins:
-- - Can create fees, publish fees, assign fees
-- - Can record offline payments
-- - Can apply waivers, scholarships, discounts (per policy)
-- - Can refund payments
-- - Can view totals and reports
-- - Cannot view card details
-- 
-- Platform Admin:
-- - Can see everything
-- - Can resolve disputes and Stripe onboarding issues
-- 
-- =================================================================
