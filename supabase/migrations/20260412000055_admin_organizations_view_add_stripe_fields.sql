-- Migration: Add stripe_subscription_id and other missing fields to admin_organizations view
-- The view was missing stripe_subscription_id (needed for platform admin tier changes),
-- stripe_price_id, stripe_customer_id, license period start, grace period, and other fields
-- that the AdminOrganization TypeScript type already declared.

DROP VIEW IF EXISTS public.admin_organizations;

CREATE VIEW public.admin_organizations WITH (security_invoker = 'true') AS
SELECT
  o.id,
  o.name,
  o.slug,
  o.org_type,
  o.status,

  -- Contact (added in 20260405000110)
  o.contact_email,
  o.phone,
  o.website,
  o.address,
  o.city,
  o.state,
  o.zip,

  -- License
  o.license_status,
  o.current_tier_id,
  lt.tier_name,
  o.license_trial_ends_at,
  o.license_current_period_start,
  o.license_current_period_end,
  o.license_grace_ends_at,
  o.license_cancel_at_period_end,

  -- Stripe
  o.stripe_customer_id,
  o.stripe_subscription_id,
  o.stripe_price_id,
  (o.stripe_customer_id IS NOT NULL) AS stripe_connected,

  -- Payouts
  o.payout_account_id,
  o.payouts_enabled,
  o.payout_onboarding_status,
  o.payout_descriptor,
  o.billing_mode,
  o.currency,

  -- Primary location
  o.primary_city,
  o.primary_state,
  o.primary_region_radius_miles,

  -- Timestamps
  o.created_at,
  o.updated_at,

  -- Aggregated counts
  (SELECT count(*) FROM public.teams t WHERE t.org_id = o.id) AS team_count,
  (SELECT count(DISTINCT s.id)
     FROM public.teams t
     JOIN public.seasons s ON s.org_id = o.id
    WHERE t.org_id = o.id) AS sport_count,
  (SELECT count(DISTINCT om.user_id)
     FROM public.organization_members om
    WHERE om.org_id = o.id) AS user_count

FROM public.organizations o
LEFT JOIN public.license_tiers lt ON o.current_tier_id = lt.id
WHERE EXISTS (
  SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()
);
