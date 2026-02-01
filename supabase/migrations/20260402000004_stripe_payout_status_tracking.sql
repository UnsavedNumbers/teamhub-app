-- =====================================================================
-- Stripe Payout Status Tracking
-- ---------------------------------------------------------------------
-- Adds columns to organizations to store Stripe payout status snapshots
-- from webhook/account syncs. These values are derived from the Stripe
-- Account.requirements hash so we can:
--   - Detect when payouts are paused and why
--   - Present remediation guidance in the admin UI
--   - Trigger notifications before and after disruption
-- =====================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS stripe_payouts_disabled_reason text,
  ADD COLUMN IF NOT EXISTS stripe_requirements_due jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stripe_requirements_errors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stripe_requirements_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_status_updated_at timestamptz;

COMMENT ON COLUMN public.organizations.stripe_payouts_enabled
  IS 'Snapshot of Stripe account.payouts_enabled from the most recent sync/webhook.';

COMMENT ON COLUMN public.organizations.stripe_payouts_disabled_reason
  IS 'Stripe account.requirements.disabled_reason explaining why payouts are paused.';

COMMENT ON COLUMN public.organizations.stripe_requirements_due
  IS 'JSONB array/object of currently_due (and optionally pending_verification) requirement fields.';

COMMENT ON COLUMN public.organizations.stripe_requirements_errors
  IS 'Stripe account.requirements.errors captured for remediation UX.';

COMMENT ON COLUMN public.organizations.stripe_requirements_deadline
  IS 'Deadline timestamp from Stripe account.requirements.current_deadline (if provided).';

COMMENT ON COLUMN public.organizations.stripe_status_updated_at
  IS 'When we last refreshed payout status from Stripe (webhook or manual sync).';

-- Normalize any legacy onboarding status values produced by earlier webhooks
UPDATE public.organizations
SET payout_onboarding_status = 'completed'
WHERE payout_onboarding_status = 'complete';

UPDATE public.organizations
SET payout_onboarding_status = 'pending'
WHERE payout_onboarding_status = 'in_review';
