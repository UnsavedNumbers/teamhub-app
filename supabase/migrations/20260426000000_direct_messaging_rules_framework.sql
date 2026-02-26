-- Direct Messaging Rules Framework
-- Implements policy metadata, org messaging settings, idempotent DM identities,
-- block records, and expanded audit traceability.

-- ============================================================================
-- Organization messaging settings (versioned + precedence-aware)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organization_messaging_settings (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  settings_version INTEGER NOT NULL DEFAULT 1,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  precedence_contract JSONB NOT NULL DEFAULT '{"platform_floor":"enforced","org_policy":"authoritative","user_preference":"allowed_when_safe"}'::jsonb,
  enable_parent_to_parent_dms BOOLEAN NOT NULL DEFAULT TRUE,
  enable_minor_to_minor_dms BOOLEAN NOT NULL DEFAULT TRUE,
  require_parent_approval_for_minor_dm BOOLEAN NOT NULL DEFAULT FALSE,
  enable_admin_audit_access BOOLEAN NOT NULL DEFAULT TRUE,
  enable_minor_group_parent_visibility BOOLEAN NOT NULL DEFAULT TRUE,
  require_read_receipts_safety_critical BOOLEAN NOT NULL DEFAULT FALSE,
  retention_days INTEGER NOT NULL DEFAULT 730 CHECK (retention_days > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.athlete_messaging_preferences (
  athlete_id UUID PRIMARY KEY REFERENCES public.athletes(id) ON DELETE CASCADE,
  athlete_user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  maintain_parent_visibility_until_season_end BOOLEAN NOT NULL DEFAULT TRUE,
  effective_season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  parent_visibility_opt_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dm_user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  blocker_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dm_user_blocks_not_self CHECK (blocker_user_id <> blocked_user_id),
  CONSTRAINT dm_user_blocks_unique_pair UNIQUE (org_id, blocker_user_id, blocked_user_id)
);

CREATE TABLE IF NOT EXISTS public.stream_membership_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stream_channel_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('matched', 'drift_detected', 'reconciled', 'failed')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Stream channel and metadata extensions for DM policy + idempotency
-- ============================================================================
ALTER TABLE public.stream_channels
  ADD COLUMN IF NOT EXISTS dm_key TEXT,
  ADD COLUMN IF NOT EXISTS dm_idempotency_key TEXT;

ALTER TABLE public.stream_channel_metadata
  ADD COLUMN IF NOT EXISTS policy_version TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS rule_id_at_creation TEXT,
  ADD COLUMN IF NOT EXISTS subject_athlete_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guardian_copy_mode TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS created_by_role_context TEXT,
  ADD COLUMN IF NOT EXISTS requires_parental_copy_notice BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS effective_settings_hash TEXT;

ALTER TABLE public.huddle_audit_log
  ADD COLUMN IF NOT EXISTS decision_id UUID,
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS actor_role_context TEXT,
  ADD COLUMN IF NOT EXISTS subject_athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS access_reason TEXT;

UPDATE public.stream_channels
SET dm_key = CONCAT('dm:', LEAST(user_id_1::text, user_id_2::text), ':', GREATEST(user_id_1::text, user_id_2::text))
WHERE channel_type = 'dm'
  AND user_id_1 IS NOT NULL
  AND user_id_2 IS NOT NULL
  AND dm_key IS NULL;

INSERT INTO public.stream_channel_metadata (channel_id, name, policy_version)
SELECT
  sc.id,
  CASE
    WHEN sc.channel_type = 'team' THEN 'Team Channel'
    WHEN sc.channel_type = 'org' THEN 'Organization Channel'
    ELSE 'Direct Message'
  END,
  'legacy'
FROM public.stream_channels sc
LEFT JOIN public.stream_channel_metadata scm ON scm.channel_id = sc.id
WHERE scm.channel_id IS NULL;

UPDATE public.stream_channel_metadata
SET policy_version = COALESCE(policy_version, 'legacy')
WHERE policy_version IS NULL;

ALTER TABLE public.stream_channels
  DROP CONSTRAINT IF EXISTS stream_channels_dm_key_required,
  ADD CONSTRAINT stream_channels_dm_key_required
  CHECK ((channel_type <> 'dm') OR (dm_key IS NOT NULL));

CREATE UNIQUE INDEX IF NOT EXISTS idx_stream_channels_dm_key_unique
  ON public.stream_channels(dm_key)
  WHERE channel_type = 'dm';

CREATE INDEX IF NOT EXISTS idx_stream_channels_dm_idempotency_key
  ON public.stream_channels(dm_idempotency_key)
  WHERE dm_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stream_channel_metadata_policy_version
  ON public.stream_channel_metadata(policy_version);

CREATE INDEX IF NOT EXISTS idx_huddle_audit_log_decision_id ON public.huddle_audit_log(decision_id);
CREATE INDEX IF NOT EXISTS idx_huddle_audit_log_reason_code ON public.huddle_audit_log(reason_code);
CREATE INDEX IF NOT EXISTS idx_huddle_audit_log_actor_role_context ON public.huddle_audit_log(actor_role_context);
CREATE INDEX IF NOT EXISTS idx_dm_user_blocks_org_active ON public.dm_user_blocks(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dm_user_blocks_pair_active ON public.dm_user_blocks(blocker_user_id, blocked_user_id, is_active);

-- Relationship lookup indexes for policy evaluation
CREATE INDEX IF NOT EXISTS idx_team_memberships_athlete_team_active
  ON public.team_memberships(athlete_id, team_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_team_memberships_team_athlete_active
  ON public.team_memberships(team_id, athlete_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_athlete_guardians_org_user_active
  ON public.athlete_guardians(org_id, user_id, status, athlete_id);

CREATE INDEX IF NOT EXISTS idx_athlete_guardians_org_athlete_active
  ON public.athlete_guardians(org_id, athlete_id, status, user_id);

CREATE INDEX IF NOT EXISTS idx_org_members_org_user_role_active
  ON public.organization_members(org_id, user_id, role)
  WHERE COALESCE(is_active, TRUE) = TRUE;

-- ============================================================================
-- Trigger wiring
-- ============================================================================
DROP TRIGGER IF EXISTS organization_messaging_settings_updated_at ON public.organization_messaging_settings;
CREATE TRIGGER organization_messaging_settings_updated_at
  BEFORE UPDATE ON public.organization_messaging_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS athlete_messaging_preferences_updated_at ON public.athlete_messaging_preferences;
CREATE TRIGGER athlete_messaging_preferences_updated_at
  BEFORE UPDATE ON public.athlete_messaging_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS dm_user_blocks_updated_at ON public.dm_user_blocks;
CREATE TRIGGER dm_user_blocks_updated_at
  BEFORE UPDATE ON public.dm_user_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS policies
-- ============================================================================
ALTER TABLE public.organization_messaging_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_messaging_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_membership_reconciliation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_messaging_settings__org_select ON public.organization_messaging_settings;
CREATE POLICY organization_messaging_settings__org_select
  ON public.organization_messaging_settings
  FOR SELECT
  TO authenticated
  USING (public.user_has_org_access(auth.uid(), org_id));

DROP POLICY IF EXISTS organization_messaging_settings__org_write ON public.organization_messaging_settings;
CREATE POLICY organization_messaging_settings__org_write
  ON public.organization_messaging_settings
  FOR ALL
  TO authenticated
  USING (public.user_is_org_admin(auth.uid(), org_id))
  WITH CHECK (public.user_is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS organization_messaging_settings__platform_admin_all ON public.organization_messaging_settings;
CREATE POLICY organization_messaging_settings__platform_admin_all
  ON public.organization_messaging_settings
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS athlete_messaging_preferences__athlete_guardian_admin_select ON public.athlete_messaging_preferences;
CREATE POLICY athlete_messaging_preferences__athlete_guardian_admin_select
  ON public.athlete_messaging_preferences
  FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_athlete(athlete_id, auth.uid())
    OR athlete_user_id = auth.uid()
  );

DROP POLICY IF EXISTS athlete_messaging_preferences__athlete_guardian_admin_write ON public.athlete_messaging_preferences;
CREATE POLICY athlete_messaging_preferences__athlete_guardian_admin_write
  ON public.athlete_messaging_preferences
  FOR ALL
  TO authenticated
  USING (
    public.user_can_access_athlete(athlete_id, auth.uid())
    OR athlete_user_id = auth.uid()
  )
  WITH CHECK (
    public.user_can_access_athlete(athlete_id, auth.uid())
    OR athlete_user_id = auth.uid()
  );

DROP POLICY IF EXISTS dm_user_blocks__participant_or_admin_select ON public.dm_user_blocks;
CREATE POLICY dm_user_blocks__participant_or_admin_select
  ON public.dm_user_blocks
  FOR SELECT
  TO authenticated
  USING (
    blocker_user_id = auth.uid()
    OR blocked_user_id = auth.uid()
    OR public.user_is_org_admin(auth.uid(), org_id)
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS dm_user_blocks__self_or_admin_insert ON public.dm_user_blocks;
CREATE POLICY dm_user_blocks__self_or_admin_insert
  ON public.dm_user_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    blocker_user_id = auth.uid()
    OR public.user_is_org_admin(auth.uid(), org_id)
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS dm_user_blocks__self_or_admin_update ON public.dm_user_blocks;
CREATE POLICY dm_user_blocks__self_or_admin_update
  ON public.dm_user_blocks
  FOR UPDATE
  TO authenticated
  USING (
    blocker_user_id = auth.uid()
    OR public.user_is_org_admin(auth.uid(), org_id)
    OR public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    blocker_user_id = auth.uid()
    OR public.user_is_org_admin(auth.uid(), org_id)
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS dm_user_blocks__self_or_admin_delete ON public.dm_user_blocks;
CREATE POLICY dm_user_blocks__self_or_admin_delete
  ON public.dm_user_blocks
  FOR DELETE
  TO authenticated
  USING (
    blocker_user_id = auth.uid()
    OR public.user_is_org_admin(auth.uid(), org_id)
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS stream_membership_reconciliation_log__org_select ON public.stream_membership_reconciliation_log;
CREATE POLICY stream_membership_reconciliation_log__org_select
  ON public.stream_membership_reconciliation_log
  FOR SELECT
  TO authenticated
  USING (
    public.user_is_org_admin(auth.uid(), org_id)
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS stream_membership_reconciliation_log__platform_write ON public.stream_membership_reconciliation_log;
CREATE POLICY stream_membership_reconciliation_log__platform_write
  ON public.stream_membership_reconciliation_log
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Allow non-admin DM participants to create DM channel records in their own org.
DROP POLICY IF EXISTS stream_channels__dm_participant_insert ON public.stream_channels;
CREATE POLICY stream_channels__dm_participant_insert
  ON public.stream_channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    channel_type = 'dm'
    AND public.user_has_org_access(auth.uid(), org_id)
    AND (user_id_1 = auth.uid() OR user_id_2 = auth.uid())
  );

COMMENT ON TABLE public.organization_messaging_settings IS
  'Organization-level direct messaging controls with versioned settings and precedence contract.';
COMMENT ON TABLE public.athlete_messaging_preferences IS
  'Athlete-level preference overrides for parent visibility during minor-to-adult transition.';
COMMENT ON TABLE public.dm_user_blocks IS
  'Per-org direct messaging blocks between users.';
COMMENT ON TABLE public.stream_membership_reconciliation_log IS
  'Tracks Stream/Supabase membership reconciliation outcomes and drift alerts.';
COMMENT ON COLUMN public.stream_channels.dm_key IS
  'Deterministic identity for DM channels. Enforced unique for channel_type=dm to prevent races.';
COMMENT ON COLUMN public.stream_channels.dm_idempotency_key IS
  'Caller-supplied idempotency key for DM creation attempts.';
COMMENT ON COLUMN public.huddle_audit_log.reason_code IS
  'Machine-readable reason code for policy allow/deny and moderation/audit actions.';
