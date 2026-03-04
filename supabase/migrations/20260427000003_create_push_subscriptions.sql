-- Create user_push_subscriptions table for browser push subscription lifecycle

CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('onesignal')),
  provider_subscription_id TEXT,
  permission TEXT NOT NULL CHECK (permission IN ('granted', 'denied', 'default', 'unsupported')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_push_subscriptions_unique_device UNIQUE (user_id, org_id, device_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_user_id
  ON public.user_push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_org_id
  ON public.user_push_subscriptions(org_id);

CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_active
  ON public.user_push_subscriptions(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_provider_subscription_id
  ON public.user_push_subscriptions(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_user_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_push_subscriptions_updated_at ON public.user_push_subscriptions;
CREATE TRIGGER set_user_push_subscriptions_updated_at
  BEFORE UPDATE ON public.user_push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_push_subscriptions_updated_at();

ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_push_subscriptions_owner_select ON public.user_push_subscriptions;
CREATE POLICY user_push_subscriptions_owner_select ON public.user_push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_push_subscriptions_owner_insert ON public.user_push_subscriptions;
CREATE POLICY user_push_subscriptions_owner_insert ON public.user_push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_push_subscriptions_owner_update ON public.user_push_subscriptions;
CREATE POLICY user_push_subscriptions_owner_update ON public.user_push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_push_subscriptions_platform_admin_all ON public.user_push_subscriptions;
CREATE POLICY user_push_subscriptions_platform_admin_all ON public.user_push_subscriptions
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

COMMENT ON TABLE public.user_push_subscriptions IS 'Tracks browser/device push subscription state for app users.';
COMMENT ON COLUMN public.user_push_subscriptions.provider_subscription_id IS 'Provider-specific subscription identifier (e.g. OneSignal subscription ID).';
COMMENT ON COLUMN public.user_push_subscriptions.permission IS 'Browser push permission state at last sync.';
