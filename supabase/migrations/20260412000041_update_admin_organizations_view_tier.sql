-- Update admin_organizations view to include current_tier_id and tier_name
-- This allows platform admin UI to display tier information without additional queries
-- Note: Adding columns in the middle (after license_plan) requires DROP + CREATE
-- (CREATE OR REPLACE VIEW can only add columns at the end)

DROP VIEW IF EXISTS public.admin_organizations;
CREATE VIEW public.admin_organizations WITH (security_invoker='true') AS
 SELECT o.id,
    o.name,
    o.org_type,
    o.status,
    o.license_status,
    o.license_plan, -- Keep for backward compatibility during transition
    o.current_tier_id,
    lt.tier_name,
    o.license_trial_ends_at,
    o.license_current_period_end,
    o.payout_account_id,
    o.payouts_enabled,
    o.created_at,
    o.updated_at,
    ( SELECT count(*) AS count
           FROM public.teams t
          WHERE (t.org_id = o.id)) AS team_count,
    ( SELECT count(DISTINCT s.id) AS count
           FROM (public.teams t
             JOIN public.seasons s ON ((s.org_id = o.id)))
          WHERE (t.org_id = o.id)) AS sport_count,
    ( SELECT count(DISTINCT om.user_id) AS count
           FROM public.organization_members om
          WHERE (om.org_id = o.id)) AS user_count,
    (o.stripe_customer_id IS NOT NULL) AS stripe_connected
   FROM public.organizations o
   LEFT JOIN public.license_tiers lt ON o.current_tier_id = lt.id
  WHERE (EXISTS ( SELECT 1
           FROM public.platform_admins pa
          WHERE (pa.user_id = auth.uid())));
