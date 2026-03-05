-- Migration: Allow All Authenticated Users to Read Active License Tiers
-- Description: Adds RLS policy so any authenticated user can SELECT from license_tiers
--              when status = 'active'. This enables the upgrade/paywall page to list all
--              available plans (including tiers above the user's current one) without
--              being blocked by the existing org-admin-only policy.
-- Date: 2026-04-12
--
-- Problem: The existing RLS policies only allow:
--   1. Platform admins (full access)
--   2. Org admins (read only the tier their org is currently on)
-- This means the paywall's getActiveTiers() query only returns the user's current tier,
-- so higher tiers never appear as upgrade options.
--
-- Solution: Add a SELECT policy that allows any authenticated user to read tiers
--           with status = 'active'. Tier pricing and feature lists are public knowledge.

BEGIN;

CREATE POLICY license_tiers__authenticated_read_active
ON public.license_tiers
FOR SELECT
TO authenticated
USING (status = 'active');

COMMENT ON POLICY license_tiers__authenticated_read_active ON public.license_tiers IS
'Allows any authenticated user to read active license tiers. Required for the upgrade paywall to display all available plans, not just the one the organization is currently on.';

COMMIT;
