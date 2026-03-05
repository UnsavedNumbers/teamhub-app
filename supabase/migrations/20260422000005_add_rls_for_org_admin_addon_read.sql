-- Migration: Add RLS Policy for Org Admins to Read Public Add-On Configurations
-- Description: Allows org admins to read public add-on configurations from feature_entitlements
--              so they can view available add-ons in the store
-- Date: 2026-04-22

BEGIN;

-- ============================================================================
-- STEP 1: Add SELECT policy for org admins to read public add-on configurations
-- ============================================================================

-- Org admins can read feature_entitlements rows that are:
-- 1. Available as add-on (available_as_addon = true)
-- 2. Public (addon_is_public = true)
-- 3. Not archived (archived_at IS NULL)
-- This allows them to see add-ons in the store without exposing internal feature configuration
CREATE POLICY feature_entitlements__org_admin_addon_select
  ON public.feature_entitlements
  FOR SELECT
  TO authenticated
  USING (
    available_as_addon = true
    AND addon_is_public = true
    AND archived_at IS NULL
  );

-- ============================================================================
-- STEP 2: Add comment for documentation
-- ============================================================================

COMMENT ON POLICY feature_entitlements__org_admin_addon_select ON public.feature_entitlements IS 
  'Allows org admins to read public add-on configurations. Only exposes add-on fields for features marked as public add-ons.';

COMMIT;
