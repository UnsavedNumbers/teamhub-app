-- ============================================================================
-- Phase 8: Remove Deprecated Plan Enum (FINAL CLEANUP PHASE)
-- ============================================================================
-- 
-- WARNING: Only run this migration after verifying:
-- 1. All code uses current_tier_id instead of license_plan
-- 2. All organizations have current_tier_id set (no NULL values for active orgs)
-- 3. Stripe webhooks are successfully setting current_tier_id
-- 4. Feature gates work correctly with current_tier_id
-- 5. Frontend displays tier_name instead of license_plan
-- 6. No TypeScript errors related to license_plan
-- 7. All tests pass
--
-- This migration removes:
-- - license_plan column from organizations table
-- - plan column from org_licenses table
-- - license_plan enum type
-- - license_plan references from sync functions
--
-- ROLLBACK: If issues arise, restore from backup or manually recreate:
--   CREATE TYPE license_plan AS ENUM ('starter', 'standard', 'pro');
--   ALTER TABLE organizations ADD COLUMN license_plan license_plan;
--   ALTER TABLE org_licenses ADD COLUMN plan license_plan;
--   -- Then restore data from backup
-- ============================================================================

-- Step 1: Drop dependent views first (they were already updated in Phase 4)
DROP VIEW IF EXISTS admin_license_tiers_list;
DROP VIEW IF EXISTS admin_license_metrics;
DROP VIEW IF EXISTS admin_organizations;

-- Recreate views without license_plan references
-- Note: Using CREATE (not CREATE OR REPLACE) since views were dropped above
CREATE VIEW admin_license_tiers_list WITH (security_invoker='true') AS
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
  lt.version,
  lt.created_at,
  lt.updated_at,
  (SELECT count(*) FROM tier_feature_assignments tfa
   WHERE tfa.license_tier_id = lt.id AND tfa.included = true) 
  AS included_features_count,
  (SELECT count(*) FROM organizations o
   WHERE o.current_tier_id = lt.id) 
  AS orgs_using_count
FROM license_tiers lt;

CREATE VIEW admin_license_metrics WITH (security_invoker='true') AS
SELECT 
  (SELECT count(*) FROM license_tiers WHERE status = 'active') AS active_tiers,
  (SELECT count(*) FROM feature_entitlements WHERE archived_at IS NULL) AS total_features,
  (SELECT count(*) FROM feature_entitlements WHERE archived_at IS NOT NULL) AS archived_features,
  (SELECT count(*) FROM organizations WHERE current_tier_id IS NOT NULL) AS orgs_with_tier,
  (SELECT count(*) FROM entitlement_overrides
   WHERE revoked_at IS NULL 
     AND (expires_at IS NULL OR expires_at > now())) AS active_overrides,
  (SELECT count(*) FROM license_tiers
   WHERE stripe_price_id IS NULL OR stripe_price_id = '') AS tiers_missing_price_id,
  (SELECT count(*) FROM feature_entitlements fe
   WHERE fe.archived_at IS NULL 
     AND fe.is_system_feature = false 
     AND fe.platform_admin_only = false
     AND NOT EXISTS (
       SELECT 1 FROM tier_feature_assignments tfa
       WHERE tfa.feature_entitlement_id = fe.id AND tfa.included = true
     )) AS features_without_assignment,
  (SELECT count(DISTINCT lt.id) FROM license_tiers lt
   WHERE lt.status = 'active'
     AND EXISTS (
       SELECT 1 FROM tier_feature_assignments tfa
       JOIN feature_entitlements fe ON fe.id = tfa.feature_entitlement_id
       WHERE tfa.license_tier_id = lt.id 
         AND tfa.included = true 
         AND fe.archived_at IS NOT NULL
     )) AS tiers_with_archived_features;

CREATE VIEW public.admin_organizations WITH (security_invoker='true') AS
 SELECT o.id,
    o.name,
    o.org_type,
    o.status,
    o.license_status,
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

-- Step 2: Update sync_org_license_summary() to remove license_plan assignment
CREATE OR REPLACE FUNCTION sync_org_license_summary(org_id uuid) 
RETURNS void AS $$
DECLARE
  lic record;
  v_tier_id uuid;
BEGIN
  SELECT * INTO lic
  FROM org_licenses l
  WHERE l.org_id = sync_org_license_summary.org_id;
  
  IF lic IS NULL THEN RETURN; END IF;
  
  -- Look up tier by stripe_price_id
  SELECT id INTO v_tier_id
  FROM license_tiers
  WHERE stripe_price_id = lic.stripe_price_id
    AND status = 'active'
  LIMIT 1;
  
  UPDATE organizations o
  SET
    license_status = lic.status,
    current_tier_id = COALESCE(v_tier_id, o.current_tier_id),
    license_current_period_start = lic.current_period_start,
    license_current_period_end = lic.current_period_end,
    license_trial_ends_at = lic.trial_ends_at,
    license_grace_ends_at = lic.grace_ends_at,
    license_cancel_at_period_end = lic.cancel_at_period_end,
    stripe_customer_id = lic.stripe_customer_id,
    stripe_subscription_id = lic.stripe_subscription_id,
    stripe_price_id = lic.stripe_price_id,
    updated_at = now()
  WHERE o.id = sync_org_license_summary.org_id;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update sync_organization_license_from_org_licenses() trigger function
CREATE OR REPLACE FUNCTION public.sync_organization_license_from_org_licenses() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
declare
  v_org_id uuid;
  v_tier_id uuid;
begin
  -- Determine org_id for INSERT/UPDATE/DELETE
  v_org_id := coalesce(new.org_id, old.org_id);

  if v_org_id is null then
    return null;
  end if;

  -- If the license row was deleted, decide what org should show.
  if tg_op = 'DELETE' then
    update public.organizations o
    set
      license_status = 'trial'::public.license_status,
      current_tier_id = null,
      license_current_period_start = null,
      license_current_period_end = null,
      license_trial_ends_at = null,
      license_grace_ends_at = null,
      license_cancel_at_period_end = false,
      stripe_customer_id = null,
      stripe_subscription_id = null,
      stripe_price_id = null,
      updated_at = now()
    where o.id = v_org_id;

    return old;
  end if;

  -- Look up tier by stripe_price_id
  SELECT id INTO v_tier_id
  FROM license_tiers
  WHERE stripe_price_id = new.stripe_price_id
    AND status = 'active'
  LIMIT 1;

  -- INSERT or UPDATE: copy license fields over
  update public.organizations o
  set
    license_status = new.status,
    current_tier_id = COALESCE(v_tier_id, o.current_tier_id),
    license_current_period_start = new.current_period_start,
    license_current_period_end = new.current_period_end,
    license_trial_ends_at = new.trial_ends_at,
    license_grace_ends_at = new.grace_ends_at,
    license_cancel_at_period_end = coalesce(new.cancel_at_period_end, false),
    stripe_customer_id = new.stripe_customer_id,
    stripe_subscription_id = new.stripe_subscription_id,
    stripe_price_id = new.stripe_price_id,
    updated_at = now()
  where o.id = v_org_id;

  return new;
end;
$$;

-- Step 4: Drop trigger that depends on plan column, then recreate without plan dependency
DROP TRIGGER IF EXISTS trg_sync_organization_license ON public.org_licenses;

-- Recreate trigger without plan column in UPDATE OF clause
CREATE TRIGGER trg_sync_organization_license 
  AFTER INSERT OR DELETE OR UPDATE OF status, current_period_start, current_period_end, cancel_at_period_end, trial_ends_at, grace_ends_at, stripe_customer_id, stripe_subscription_id, stripe_price_id 
  ON public.org_licenses 
  FOR EACH ROW 
  EXECUTE FUNCTION public.sync_organization_license_from_org_licenses();

-- Step 5: Remove license_plan column from organizations table
ALTER TABLE organizations DROP COLUMN IF EXISTS license_plan;

-- Step 6: Remove plan column from org_licenses table (trigger no longer depends on it)
ALTER TABLE org_licenses DROP COLUMN IF EXISTS plan;

-- Step 7: Drop enum type (only if no other tables reference it)
-- Check for dependencies first:
-- SELECT typname, nspname 
-- FROM pg_type t 
-- JOIN pg_namespace n ON n.oid = t.typnamespace 
-- WHERE typname = 'license_plan';
DROP TYPE IF EXISTS license_plan;

COMMENT ON FUNCTION sync_org_license_summary(uuid) IS 
'Updates organization license summary fields from org_licenses table.
Sets current_tier_id by looking up license_tiers via stripe_price_id.
No longer sets license_plan (removed in Phase 8).';

COMMENT ON FUNCTION sync_organization_license_from_org_licenses() IS 
'Trigger function that syncs license fields from org_licenses to organizations.
Sets current_tier_id by looking up license_tiers via stripe_price_id.
No longer sets license_plan (removed in Phase 8).';
