-- Migration: Add Add-On Fields to feature_entitlements
-- Description: Adds fields to feature_entitlements table to support configuring features
--              as purchasable add-ons with Stripe integration
-- Date: 2026-04-22

BEGIN;

-- ============================================================================
-- STEP 1: Add add-on configuration columns to feature_entitlements
-- ============================================================================

ALTER TABLE public.feature_entitlements
  ADD COLUMN IF NOT EXISTS available_as_addon boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS addon_stripe_price_id text,
  ADD COLUMN IF NOT EXISTS addon_external_name text,
  ADD COLUMN IF NOT EXISTS addon_external_description text,
  ADD COLUMN IF NOT EXISTS addon_external_short_label text,
  ADD COLUMN IF NOT EXISTS addon_external_bullets jsonb,
  ADD COLUMN IF NOT EXISTS addon_external_cta_label text,
  ADD COLUMN IF NOT EXISTS addon_display_order integer,
  ADD COLUMN IF NOT EXISTS addon_is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS addon_eligibility_rules jsonb;

-- ============================================================================
-- STEP 2: Add check constraints
-- ============================================================================

-- Ensure stripe_price_id format is valid (must start with 'price_')
ALTER TABLE public.feature_entitlements
  ADD CONSTRAINT feature_entitlements_addon_stripe_price_id_format_check
  CHECK (
    addon_stripe_price_id IS NULL 
    OR addon_stripe_price_id ~ '^price_[a-zA-Z0-9_]+$'
  );

-- Ensure available_as_addon requires stripe_price_id and external_name
ALTER TABLE public.feature_entitlements
  ADD CONSTRAINT feature_entitlements_addon_required_fields_check
  CHECK (
    available_as_addon = false 
    OR (addon_stripe_price_id IS NOT NULL AND addon_external_name IS NOT NULL)
  );

-- Ensure bullets is an array if provided
ALTER TABLE public.feature_entitlements
  ADD CONSTRAINT feature_entitlements_addon_bullets_array_check
  CHECK (
    addon_external_bullets IS NULL 
    OR jsonb_typeof(addon_external_bullets) = 'array'
  );

-- ============================================================================
-- STEP 3: Create unique constraint on stripe_price_id
-- ============================================================================

-- Ensure one feature per Stripe price ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_entitlements_addon_stripe_price_id_unique
  ON public.feature_entitlements(addon_stripe_price_id)
  WHERE addon_stripe_price_id IS NOT NULL;

-- ============================================================================
-- STEP 4: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feature_entitlements_available_as_addon
  ON public.feature_entitlements(available_as_addon)
  WHERE available_as_addon = true;

CREATE INDEX IF NOT EXISTS idx_feature_entitlements_addon_is_public
  ON public.feature_entitlements(addon_is_public, available_as_addon)
  WHERE addon_is_public = true AND available_as_addon = true;

CREATE INDEX IF NOT EXISTS idx_feature_entitlements_addon_display_order
  ON public.feature_entitlements(addon_display_order)
  WHERE available_as_addon = true AND addon_display_order IS NOT NULL;

-- ============================================================================
-- STEP 5: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.feature_entitlements.available_as_addon IS 
  'If true, this feature can be purchased as an add-on by org admins';

COMMENT ON COLUMN public.feature_entitlements.addon_stripe_price_id IS 
  'Stripe Price ID (annual recurring) for this add-on. Must start with "price_". Required if available_as_addon is true.';

COMMENT ON COLUMN public.feature_entitlements.addon_external_name IS 
  'Display name shown to org admins when purchasing this add-on. Required if available_as_addon is true.';

COMMENT ON COLUMN public.feature_entitlements.addon_external_description IS 
  'Marketing description shown to org admins. Supports multiline text.';

COMMENT ON COLUMN public.feature_entitlements.addon_external_short_label IS 
  'Short label for badges/buttons (e.g., "Ticketing"). Optional.';

COMMENT ON COLUMN public.feature_entitlements.addon_external_bullets IS 
  'Array of feature bullets/benefits shown to org admins. Stored as JSONB array of strings.';

COMMENT ON COLUMN public.feature_entitlements.addon_external_cta_label IS 
  'Call-to-action button label (e.g., "Add Ticketing"). Defaults to "Add [external_name]" if not provided.';

COMMENT ON COLUMN public.feature_entitlements.addon_display_order IS 
  'Sort order for displaying add-ons in org admin UI. Lower numbers appear first.';

COMMENT ON COLUMN public.feature_entitlements.addon_is_public IS 
  'If true, this add-on is visible in org admin store. If false, only platform admins can see it.';

COMMENT ON COLUMN public.feature_entitlements.addon_eligibility_rules IS 
  'JSONB object for future eligibility rules (e.g., tier restrictions, org size limits).';

COMMIT;
