-- Migration: Create org_addon_entitlements Table
-- Description: Creates table to track organization add-on entitlements linked to Stripe subscription items
-- Date: 2026-04-22

BEGIN;

-- ============================================================================
-- STEP 1: Create org_addon_entitlements table
-- ============================================================================

CREATE TABLE public.org_addon_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.feature_entitlements(feature_key) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('active', 'pending_payment', 'canceled', 'past_due')),
  stripe_subscription_id text NOT NULL,
  stripe_subscription_item_id text NOT NULL,
  stripe_price_id text NOT NULL,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Ensure one entitlement per org+feature combination
  CONSTRAINT org_addon_entitlements_org_feature_unique UNIQUE (org_id, feature_key),
  
  -- Ensure one entitlement per Stripe subscription item
  CONSTRAINT org_addon_entitlements_subscription_item_unique UNIQUE (stripe_subscription_item_id)
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX idx_org_addon_entitlements_org_id 
  ON public.org_addon_entitlements(org_id);

CREATE INDEX idx_org_addon_entitlements_feature_key 
  ON public.org_addon_entitlements(feature_key);

CREATE INDEX idx_org_addon_entitlements_status 
  ON public.org_addon_entitlements(status)
  WHERE status = 'active';

CREATE INDEX idx_org_addon_entitlements_subscription_item 
  ON public.org_addon_entitlements(stripe_subscription_item_id);

CREATE INDEX idx_org_addon_entitlements_org_status 
  ON public.org_addon_entitlements(org_id, status)
  WHERE status = 'active';

CREATE INDEX idx_org_addon_entitlements_subscription_id 
  ON public.org_addon_entitlements(stripe_subscription_id);

-- ============================================================================
-- STEP 3: Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_org_addon_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_org_addon_entitlements_updated_at
  BEFORE UPDATE ON public.org_addon_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_org_addon_entitlements_updated_at();

-- ============================================================================
-- STEP 4: Enable RLS and create policies
-- ============================================================================

ALTER TABLE public.org_addon_entitlements ENABLE ROW LEVEL SECURITY;

-- Platform admins: full access
CREATE POLICY org_addon_entitlements__platform_admin_all
  ON public.org_addon_entitlements
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Org admins: read access to their org's entitlements
CREATE POLICY org_addon_entitlements__org_admin_select
  ON public.org_addon_entitlements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = org_addon_entitlements.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
    )
  );

-- ============================================================================
-- STEP 5: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE public.org_addon_entitlements IS 
  'Tracks organization add-on entitlements linked to Stripe subscription items. Each row represents one add-on purchase for an org.';

COMMENT ON COLUMN public.org_addon_entitlements.org_id IS 
  'Organization that purchased this add-on';

COMMENT ON COLUMN public.org_addon_entitlements.feature_key IS 
  'Feature key from feature_entitlements table';

COMMENT ON COLUMN public.org_addon_entitlements.status IS 
  'Entitlement status: active (paid and active), pending_payment (awaiting payment), canceled (removed), past_due (payment failed)';

COMMENT ON COLUMN public.org_addon_entitlements.stripe_subscription_id IS 
  'Stripe subscription ID (same as org_licenses.stripe_subscription_id)';

COMMENT ON COLUMN public.org_addon_entitlements.stripe_subscription_item_id IS 
  'Stripe subscription item ID for this add-on. Unique across all entitlements.';

COMMENT ON COLUMN public.org_addon_entitlements.stripe_price_id IS 
  'Stripe Price ID for this add-on (matches feature_entitlements.addon_stripe_price_id)';

COMMENT ON COLUMN public.org_addon_entitlements.current_period_start IS 
  'Start of current billing period (from Stripe subscription)';

COMMENT ON COLUMN public.org_addon_entitlements.current_period_end IS 
  'End of current billing period (from Stripe subscription)';

COMMIT;
