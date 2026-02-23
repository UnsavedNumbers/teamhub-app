-- Migration: Allow Org Admins to Read Their Organization's License Tier
-- Description: Adds RLS policy to allow org admins to SELECT tier_name and tier_key from license_tiers
--              when the tier matches their organization's current_tier_id
-- Date: 2026-04-12
--
-- Problem: The license_tiers table only has RLS policy for platform admins, which blocks
--          org admins from reading tier information via JOIN queries. This causes tier_name
--          to be null in useLicense hook even though the tier exists.
--
-- Solution: Add RLS policy that allows org admins to read tier information for tiers
--           their organization is using (via current_tier_id).

BEGIN;

-- Add RLS policy: Org admins can SELECT license_tiers if the tier is their org's current_tier_id
-- This allows JOIN queries like license_tiers:current_tier_id(tier_name, tier_key) to work
CREATE POLICY license_tiers__org_admin_read_own_tier
ON public.license_tiers
FOR SELECT
TO authenticated
USING (
  -- Allow if user is platform admin (existing policy handles this, but include for clarity)
  public.is_platform_admin(auth.uid())
  OR
  -- Allow if user is org admin of an organization that uses this tier
  EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.current_tier_id = license_tiers.id
      AND public.user_is_org_admin(auth.uid(), o.id)
  )
);

COMMENT ON POLICY license_tiers__org_admin_read_own_tier ON public.license_tiers IS
'Allows org admins to read tier information (tier_name, tier_key) for tiers their organization is using. This enables JOIN queries in useLicense hook to work correctly.';

COMMIT;
