-- Migration: License Change Audit Table
-- Description: Creates license_change_log table to track tier upgrades with Stripe integration
-- Date: 2026-04-12

BEGIN;

-- ============================================================================
-- STEP 1: Create license_change_log table
-- ============================================================================

CREATE TABLE public.license_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  actor_user_id UUID REFERENCES users(id),
  from_tier_id UUID REFERENCES license_tiers(id),
  to_tier_id UUID NOT NULL REFERENCES license_tiers(id),
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  result_status TEXT NOT NULL CHECK (result_status IN ('pending', 'succeeded', 'failed')),
  error_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX idx_license_change_log_org_id ON license_change_log(org_id);
CREATE INDEX idx_license_change_log_stripe_subscription_id ON license_change_log(stripe_subscription_id);
CREATE INDEX idx_license_change_log_initiated_at ON license_change_log(initiated_at DESC);

-- ============================================================================
-- STEP 3: Enable RLS and create policies
-- ============================================================================

ALTER TABLE license_change_log ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's license change log
CREATE POLICY license_change_log__org_select ON license_change_log
  FOR SELECT TO authenticated
  USING (public.user_has_org_access(auth.uid(), org_id));

-- Platform admins can view and manage all license change logs
CREATE POLICY license_change_log__platform_admin_all ON license_change_log
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

COMMIT;
