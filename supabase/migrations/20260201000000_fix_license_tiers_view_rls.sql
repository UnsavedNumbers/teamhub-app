-- Migration: Fix License Tiers View RLS Policies
-- =============================================================
-- This migration fixes the issue where invalid RLS policies were created
-- on views (which PostgreSQL doesn't support). Views inherit RLS from their
-- underlying tables, so policies on views are invalid and can cause issues.
--
-- Issue: Creating a license tier throws "a tier with this stripe price id exists"
-- but /licenses/tiers shows "No Data" because invalid RLS policies on the view
-- are blocking access.
--
-- This migration is idempotent and can be run multiple times safely.

-- ============================================================================
-- 1. Drop Invalid RLS Policies on Views
-- ============================================================================
-- PostgreSQL views don't support RLS policies directly. RLS is inherited
-- from the underlying tables. These policies were incorrectly created in
-- the initial migration and need to be removed.
-- We check if views exist before trying to drop policies on them.

DO $$
BEGIN
  -- Drop policy on admin_license_metrics if view exists
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'admin_license_metrics') THEN
    DROP POLICY IF EXISTS "platform_admins_can_read_license_metrics" ON admin_license_metrics;
  END IF;

  -- Drop policy on admin_license_tiers_list if view exists
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'admin_license_tiers_list') THEN
    DROP POLICY IF EXISTS "platform_admins_can_read_license_tiers_list" ON admin_license_tiers_list;
  END IF;

  -- Drop policy on admin_feature_entitlements_list if view exists
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'admin_feature_entitlements_list') THEN
    DROP POLICY IF EXISTS "platform_admins_can_read_feature_entitlements_list" ON admin_feature_entitlements_list;
  END IF;

  -- Drop policy on admin_entitlement_overrides_list if view exists
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'admin_entitlement_overrides_list') THEN
    DROP POLICY IF EXISTS "platform_admins_can_read_entitlement_overrides_list" ON admin_entitlement_overrides_list;
  END IF;
END $$;

-- ============================================================================
-- 2. Ensure Views Are Properly Granted
-- ============================================================================
-- Views should have SELECT grants, but RLS is handled by the underlying tables
-- Only grant on views that exist

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'admin_license_metrics') THEN
    GRANT SELECT ON admin_license_metrics TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'admin_license_tiers_list') THEN
    GRANT SELECT ON admin_license_tiers_list TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'admin_feature_entitlements_list') THEN
    GRANT SELECT ON admin_feature_entitlements_list TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'admin_entitlement_overrides_list') THEN
    GRANT SELECT ON admin_entitlement_overrides_list TO authenticated;
  END IF;
END $$;

-- ============================================================================
-- 3. Verify and Fix RLS Policies on Underlying Tables
-- ============================================================================
-- The RLS policies on the underlying tables (license_tiers, etc.) are what
-- actually control access. We need to ensure the policy allows SELECT operations
-- for platform admins.

DO $$
BEGIN
  -- Drop and recreate the policy to ensure it's correct
  DROP POLICY IF EXISTS "platform_admins_can_manage_license_tiers" ON license_tiers;
  
  -- Create a policy that allows platform admins to do everything (SELECT, INSERT, UPDATE, DELETE)
  CREATE POLICY "platform_admins_can_manage_license_tiers"
    ON license_tiers
    FOR ALL
    TO authenticated
    USING (is_platform_admin(auth.uid()))
    WITH CHECK (is_platform_admin(auth.uid()));
END $$;

-- ============================================================================
-- 4. Recreate View to Ensure It Works Correctly
-- ============================================================================
-- Recreate the view to ensure it's properly configured and doesn't have
-- any lingering issues from previous migrations.

DO $$
BEGIN
  -- Recreate the view to ensure it's clean
  DROP VIEW IF EXISTS admin_license_tiers_list CASCADE;
  
  CREATE VIEW admin_license_tiers_list AS
  SELECT
    lt.id,
    lt.tier_key,
    lt.tier_name,
    lt.description,
    lt.stripe_price_id,
    lt.stripe_verified_at,
    lt.stripe_product_name,
    lt.stripe_amount_cents,
    lt.stripe_interval,
    lt.stripe_currency,
    lt.stripe_active,
    lt.status,
    lt.created_at,
    lt.updated_at,
    (SELECT COUNT(*) FROM tier_feature_assignments tfa WHERE tfa.license_tier_id = lt.id AND tfa.included = true) AS included_features_count,
    (SELECT COUNT(*) FROM organizations o WHERE (o.license_plan::text = lt.tier_key OR (lt.tier_key = 'basic' AND o.license_plan::text = 'starter') OR (lt.tier_key = 'power' AND o.license_plan::text IN ('standard', 'pro')))) AS orgs_using_count
  FROM license_tiers lt;
  
  GRANT SELECT ON admin_license_tiers_list TO authenticated;
END $$;

-- ============================================================================
-- Notes
-- ============================================================================
-- Views in PostgreSQL inherit RLS from their underlying tables. When you query
-- a view, PostgreSQL applies the RLS policies from the tables that the view
-- queries, not from the view itself. Therefore, creating RLS policies directly
-- on views is invalid and can cause unexpected behavior.
--
-- The admin_license_tiers_list view queries the license_tiers table, so access
-- is controlled by the RLS policy on license_tiers, not by any policy on the view.
--
-- We've recreated the view to ensure it's clean and properly configured.
-- The view will inherit RLS from the license_tiers table, so platform admins
-- should be able to see all tiers through the view.
