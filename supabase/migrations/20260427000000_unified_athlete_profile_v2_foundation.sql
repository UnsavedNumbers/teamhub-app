-- Unified Multi-Sport Athlete Profile V2 foundation
-- Adds canonical v2 interfaces, identity/linking, merge inbox, outbox/reconciliation,
-- preference persistence, and compatibility shim for legacy fan athlete profile RPC.

BEGIN;

-- ============================================================================
-- 1) TEAM MEMBERSHIP V2 ATTRIBUTES (idempotent)
-- ============================================================================

ALTER TABLE public.team_memberships
  ADD COLUMN IF NOT EXISTS jersey_number TEXT,
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS registration_status TEXT,
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_memberships_registration_status_check_v2'
  ) THEN
    ALTER TABLE public.team_memberships
      ADD CONSTRAINT team_memberships_registration_status_check_v2
      CHECK (
        registration_status IS NULL
        OR registration_status IN ('registered', 'pending', 'waitlist', 'inactive')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_memberships_role_check_v2'
  ) THEN
    ALTER TABLE public.team_memberships
      ADD CONSTRAINT team_memberships_role_check_v2
      CHECK (
        role IS NULL
        OR role IN ('starter', 'reserve', 'captain', 'player', 'other')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.team_memberships.jersey_number IS 'V2: Team/sport-season specific jersey number.';
COMMENT ON COLUMN public.team_memberships.position IS 'V2: Team-assigned position.';
COMMENT ON COLUMN public.team_memberships.role IS 'V2: Team role (starter/reserve/captain/player/other).';
COMMENT ON COLUMN public.team_memberships.registration_status IS 'V2: Registration status for this membership.';
COMMENT ON COLUMN public.team_memberships.joined_at IS 'V2: Membership effective start timestamp.';
COMMENT ON COLUMN public.team_memberships.left_at IS 'V2: Membership effective end timestamp.';

-- ============================================================================
-- 2) V2 CORE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.athlete_identities_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL,
  primary_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_athlete_identities_v2_canonical
  ON public.athlete_identities_v2(canonical_athlete_id)
  WHERE canonical_athlete_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.athlete_identity_links_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES public.athlete_identities_v2(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  confidence_score NUMERIC(5,4) NOT NULL DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  match_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  link_status TEXT NOT NULL DEFAULT 'linked'
    CHECK (link_status IN ('linked', 'pending_review', 'rejected', 'unlinked')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_reversible BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT NOT NULL DEFAULT 'manual',
  linked_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlinked_at TIMESTAMPTZ,
  unlinked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (identity_id, athlete_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_athlete_identity_links_v2_identity_status
  ON public.athlete_identity_links_v2(identity_id, link_status, is_primary, confidence_score DESC, linked_at DESC);
CREATE INDEX IF NOT EXISTS idx_athlete_identity_links_v2_athlete_status
  ON public.athlete_identity_links_v2(athlete_id, link_status, is_primary);
CREATE INDEX IF NOT EXISTS idx_athlete_identity_links_v2_org_status
  ON public.athlete_identity_links_v2(org_id, link_status);

CREATE TABLE IF NOT EXISTS public.athlete_identity_merge_inbox_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  identity_id UUID REFERENCES public.athlete_identities_v2(id) ON DELETE SET NULL,
  candidate_athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  match_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'resolved')),
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  decision TEXT CHECK (decision IS NULL OR decision IN ('approve', 'reject', 'unlink')),
  decision_notes TEXT,
  resolved_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athlete_identity_merge_inbox_v2_org_status_created
  ON public.athlete_identity_merge_inbox_v2(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.athlete_sport_filter_preferences_v2 (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  context_key TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  sport_filter TEXT NOT NULL DEFAULT 'all',
  version BIGINT NOT NULL DEFAULT 1,
  last_idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, context_key)
);

CREATE INDEX IF NOT EXISTS idx_athlete_sport_filter_preferences_v2_user_updated
  ON public.athlete_sport_filter_preferences_v2(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.athlete_document_requirements_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES public.sports(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('universal', 'organization', 'sport', 'team')),
  document_key TEXT NOT NULL,
  document_label TEXT NOT NULL,
  reason TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  effective_start_date DATE,
  effective_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athlete_document_requirements_v2_scope
  ON public.athlete_document_requirements_v2(scope_type, org_id, sport_id, team_id)
  WHERE is_required = TRUE;

CREATE TABLE IF NOT EXISTS public.athlete_documents_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_identity_id UUID REFERENCES public.athlete_identities_v2(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES public.sports(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('universal', 'organization', 'sport', 'team')),
  document_key TEXT NOT NULL,
  document_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'missing'
    CHECK (status IN ('missing', 'pending', 'submitted', 'verified', 'rejected', 'expired')),
  reason TEXT,
  file_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at DATE,
  verified_at TIMESTAMPTZ,
  uploaded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athlete_documents_v2_athlete_scope
  ON public.athlete_documents_v2(athlete_id, scope_type, org_id, sport_id, team_id, document_key)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_athlete_documents_v2_identity
  ON public.athlete_documents_v2(athlete_identity_id)
  WHERE athlete_identity_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.athlete_sport_evaluations_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES public.sports(id) ON DELETE CASCADE,
  sport_code TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  evaluation_type TEXT NOT NULL,
  evaluator_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athlete_sport_evaluations_v2_lookup
  ON public.athlete_sport_evaluations_v2(athlete_id, sport_id, season_id, evaluated_at DESC);

CREATE TABLE IF NOT EXISTS public.athlete_sport_stats_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES public.sports(id) ON DELETE CASCADE,
  sport_code TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athlete_sport_stats_v2_lookup
  ON public.athlete_sport_stats_v2(athlete_id, sport_id, season_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS public.athlete_availability_rules_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES public.sports(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'sport')),
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  availability_status TEXT NOT NULL CHECK (availability_status IN ('available', 'unavailable', 'maybe')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athlete_availability_rules_v2_lookup
  ON public.athlete_availability_rules_v2(athlete_id, org_id, sport_id, weekday);

CREATE TABLE IF NOT EXISTS public.v2_write_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  aggregate_type TEXT,
  aggregate_id UUID,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  athlete_identity_id UUID REFERENCES public.athlete_identities_v2(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_write_outbox_status_available
  ON public.v2_write_outbox(status, available_at, created_at);

CREATE TABLE IF NOT EXISTS public.v2_write_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  processed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.athlete_identity_backfill_checkpoints_v2 (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  last_athlete_id UUID,
  processed_count BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'complete', 'error')),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id)
);

-- ============================================================================
-- 3) RLS HARDENING (deny-by-default + explicit access)
-- ============================================================================

ALTER TABLE public.athlete_identities_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_identity_links_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_identity_merge_inbox_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_sport_filter_preferences_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_document_requirements_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_documents_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_sport_evaluations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_sport_stats_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_availability_rules_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_write_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_write_reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_identity_backfill_checkpoints_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS athlete_sport_filter_preferences_v2_select_own ON public.athlete_sport_filter_preferences_v2;
CREATE POLICY athlete_sport_filter_preferences_v2_select_own
  ON public.athlete_sport_filter_preferences_v2
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS athlete_sport_filter_preferences_v2_insert_own ON public.athlete_sport_filter_preferences_v2;
CREATE POLICY athlete_sport_filter_preferences_v2_insert_own
  ON public.athlete_sport_filter_preferences_v2
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS athlete_sport_filter_preferences_v2_update_own ON public.athlete_sport_filter_preferences_v2;
CREATE POLICY athlete_sport_filter_preferences_v2_update_own
  ON public.athlete_sport_filter_preferences_v2
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS athlete_sport_filter_preferences_v2_delete_own ON public.athlete_sport_filter_preferences_v2;
CREATE POLICY athlete_sport_filter_preferences_v2_delete_own
  ON public.athlete_sport_filter_preferences_v2
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS athlete_identity_merge_inbox_v2_admin_select ON public.athlete_identity_merge_inbox_v2;
CREATE POLICY athlete_identity_merge_inbox_v2_admin_select
  ON public.athlete_identity_merge_inbox_v2
  FOR SELECT TO authenticated
  USING (public.user_is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS athlete_identity_merge_inbox_v2_admin_update ON public.athlete_identity_merge_inbox_v2;
CREATE POLICY athlete_identity_merge_inbox_v2_admin_update
  ON public.athlete_identity_merge_inbox_v2
  FOR UPDATE TO authenticated
  USING (public.user_is_org_admin(auth.uid(), org_id))
  WITH CHECK (public.user_is_org_admin(auth.uid(), org_id));

-- ============================================================================
-- 4) HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public._v2_try_parse_uuid(p_value TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN p_value::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public._v2_try_parse_timestamptz(p_value TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN p_value::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public._v2_ensure_identity_for_athlete(
  p_athlete_id UUID,
  p_org_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT 'auto'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_identity_id UUID;
  v_org_id UUID;
BEGIN
  SELECT id
  INTO v_identity_id
  FROM public.athlete_identities_v2
  WHERE canonical_athlete_id = p_athlete_id
  LIMIT 1;

  IF v_identity_id IS NULL THEN
    SELECT org_id INTO v_org_id FROM public.athletes WHERE id = p_athlete_id;
    v_org_id := COALESCE(p_org_id, v_org_id);

    INSERT INTO public.athlete_identities_v2 (
      canonical_athlete_id,
      primary_org_id,
      source,
      metadata
    )
    VALUES (
      p_athlete_id,
      v_org_id,
      COALESCE(NULLIF(p_source, ''), 'auto'),
      jsonb_build_object('created_by', 'v2_ensure_identity')
    )
    ON CONFLICT (canonical_athlete_id) WHERE canonical_athlete_id IS NOT NULL
    DO UPDATE SET
      primary_org_id = COALESCE(public.athlete_identities_v2.primary_org_id, EXCLUDED.primary_org_id),
      updated_at = now()
    RETURNING id INTO v_identity_id;
  END IF;

  RETURN v_identity_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_unified_athlete_id_v2(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_athlete_id UUID;
  v_identity_id UUID;
BEGIN
  v_athlete_id := public._v2_try_parse_uuid(p_context->>'athlete_id');

  IF v_athlete_id IS NULL THEN
    v_identity_id := COALESCE(
      public._v2_try_parse_uuid(p_context->>'athlete_identity_id'),
      public._v2_try_parse_uuid(p_context->>'identity_id')
    );

    IF v_identity_id IS NOT NULL THEN
      SELECT ail.athlete_id
      INTO v_athlete_id
      FROM public.athlete_identity_links_v2 ail
      WHERE ail.identity_id = v_identity_id
        AND ail.link_status = 'linked'
      ORDER BY ail.is_primary DESC, ail.confidence_score DESC, ail.linked_at DESC
      LIMIT 1;

      IF v_athlete_id IS NULL THEN
        SELECT canonical_athlete_id
        INTO v_athlete_id
        FROM public.athlete_identities_v2
        WHERE id = v_identity_id
        LIMIT 1;
      END IF;
    END IF;
  END IF;

  RETURN v_athlete_id;
END;
$$;

-- ============================================================================
-- 11) FAN V2 PROFILE RPC + LEGACY COMPATIBILITY SHIM
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_athlete_profile_v2_fan(p_athlete_identity_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_athlete_id UUID;
  v_identity_id UUID;
  v_athlete RECORD;
  v_org RECORD;
  v_is_following BOOLEAN := FALSE;
  v_follower_count INTEGER := 0;
  v_sports JSONB := '[]'::jsonb;
  v_teams JSONB := '[]'::jsonb;
  v_position TEXT;
  v_jersey TEXT;
  v_can_view_unlisted BOOLEAN := FALSE;
BEGIN
  v_identity_id := p_athlete_identity_id;

  SELECT ail.athlete_id
  INTO v_athlete_id
  FROM public.athlete_identity_links_v2 ail
  WHERE ail.identity_id = v_identity_id
    AND ail.link_status = 'linked'
  ORDER BY ail.is_primary DESC, ail.confidence_score DESC, ail.linked_at DESC
  LIMIT 1;

  IF v_athlete_id IS NULL THEN
    SELECT ai.canonical_athlete_id
    INTO v_athlete_id
    FROM public.athlete_identities_v2 ai
    WHERE ai.id = v_identity_id
    LIMIT 1;
  END IF;

  -- Compatibility fallback: caller may still pass athlete_id
  IF v_athlete_id IS NULL THEN
    SELECT a.id INTO v_athlete_id
    FROM public.athletes a
    WHERE a.id = p_athlete_identity_id
    LIMIT 1;
  END IF;

  IF v_athlete_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found', 'message', 'Athlete not found');
  END IF;

  SELECT *
  INTO v_athlete
  FROM public.athletes a
  WHERE a.id = v_athlete_id
    AND a.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found', 'message', 'Athlete not found');
  END IF;

  SELECT *
  INTO v_org
  FROM public.organizations o
  WHERE o.id = v_athlete.org_id;

  IF COALESCE(v_athlete.privacy_level::text, 'public') = 'private' THEN
    RETURN jsonb_build_object('error', 'access_denied', 'message', 'This athlete profile is private');
  END IF;

  IF COALESCE(v_athlete.privacy_level::text, 'public') = 'unlisted' THEN
    v_can_view_unlisted :=
      v_user_id IS NOT NULL
      AND (
        public.user_has_org_access(v_user_id, v_athlete.org_id)
        OR public.user_is_guardian_of_child(v_user_id, v_athlete_id)
        OR EXISTS (
          SELECT 1
          FROM public.fan_org_follows fof
          WHERE fof.user_id = v_user_id
            AND fof.org_id = v_athlete.org_id
        )
      );

    IF NOT v_can_view_unlisted THEN
      RETURN jsonb_build_object('error', 'access_denied', 'message', 'This athlete profile is unlisted');
    END IF;
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.fan_org_follows fof
      WHERE fof.user_id = v_user_id
        AND fof.org_id = v_athlete.org_id
    )
    INTO v_is_following;
  END IF;

  SELECT COUNT(*)
  INTO v_follower_count
  FROM public.fan_org_follows fof
  WHERE fof.org_id = v_athlete.org_id;

  SELECT COALESCE(jsonb_agg(DISTINCT sport_name), '[]'::jsonb)
  INTO v_sports
  FROM (
    SELECT s.name AS sport_name
    FROM public.team_memberships tm
    JOIN public.teams t ON t.id = tm.team_id
    LEFT JOIN public.sports s ON s.id = t.sport_id
    WHERE tm.athlete_id = v_athlete_id
      AND tm.deleted_at IS NULL
      AND tm.status = 'active'::public.membership_status
      AND (tm.left_at IS NULL OR tm.left_at > now())
      AND s.name IS NOT NULL
    UNION
    SELECT s2.name
    FROM public.athlete_sports as2
    JOIN public.sports s2 ON s2.id = as2.sport_id
    WHERE as2.athlete_id = v_athlete_id
      AND s2.name IS NOT NULL
  ) sport_rows;

  SELECT COALESCE(jsonb_agg(team_name), '[]'::jsonb)
  INTO v_teams
  FROM (
    SELECT DISTINCT t.name AS team_name
    FROM public.team_memberships tm
    JOIN public.teams t ON t.id = tm.team_id
    LEFT JOIN public.seasons se ON se.id = tm.season_id
    WHERE tm.athlete_id = v_athlete_id
      AND tm.deleted_at IS NULL
      AND (
        tm.status = 'active'::public.membership_status
        OR (se.end_date IS NOT NULL AND se.end_date >= CURRENT_DATE)
      )
    ORDER BY team_name
  ) team_rows;

  SELECT tm.position, tm.jersey_number
  INTO v_position, v_jersey
  FROM public.team_memberships tm
  LEFT JOIN public.seasons se ON se.id = tm.season_id
  WHERE tm.athlete_id = v_athlete_id
    AND tm.deleted_at IS NULL
  ORDER BY
    CASE WHEN tm.status = 'active'::public.membership_status THEN 0 ELSE 1 END,
    se.end_date DESC NULLS LAST,
    tm.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'schema_version', 2,
    'athlete_identity_id', v_identity_id,
    'id', v_athlete_id,
    'name', CONCAT(v_athlete.first_name, ' ', v_athlete.last_name),
    'description', NULL,
    'privacy_level', COALESCE(v_athlete.privacy_level::text, 'public'),
    'is_following', v_is_following,
    'created_at', v_athlete.created_at,
    'logo_url', NULL,
    'cover_url', NULL,
    'follower_count', v_follower_count,
    'org_id', v_athlete.org_id,
    'org_name', v_org.name,
    'parent_org_name', v_org.name,
    'parent_org_slug', v_org.slug,
    'jersey_number', COALESCE(v_jersey, v_athlete.jersey_number),
    'position', v_position,
    'current_teams', v_teams,
    'sports', v_sports
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', 'internal_error', 'message', SQLERRM, 'code', SQLSTATE);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_athlete_profile(p_athlete_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_identity_id UUID;
BEGIN
  SELECT ail.identity_id
  INTO v_identity_id
  FROM public.athlete_identity_links_v2 ail
  WHERE ail.athlete_id = p_athlete_id
    AND ail.link_status = 'linked'
  ORDER BY ail.is_primary DESC, ail.confidence_score DESC, ail.linked_at DESC
  LIMIT 1;

  IF v_identity_id IS NULL THEN
    v_identity_id := p_athlete_id;
  END IF;

  RETURN public.get_athlete_profile_v2_fan(v_identity_id);
END;
$$;

-- ============================================================================
-- 12) BACKFILL SEED (resumable baseline + canary-friendly checkpointing)
-- ============================================================================

INSERT INTO public.athlete_identities_v2 (
  canonical_athlete_id,
  primary_org_id,
  source,
  metadata
)
SELECT
  a.id,
  a.org_id,
  'migration_seed',
  jsonb_build_object('migration', '20260427000000')
FROM public.athletes a
WHERE a.deleted_at IS NULL
ON CONFLICT (canonical_athlete_id) WHERE canonical_athlete_id IS NOT NULL
DO UPDATE SET
  primary_org_id = COALESCE(public.athlete_identities_v2.primary_org_id, EXCLUDED.primary_org_id),
  updated_at = now();

INSERT INTO public.athlete_identity_links_v2 (
  identity_id,
  athlete_id,
  org_id,
  confidence_score,
  match_signals,
  link_status,
  is_primary,
  is_reversible,
  source
)
SELECT
  ai.id,
  a.id,
  a.org_id,
  1.0,
  jsonb_build_object('migration', '20260427000000', 'signal', 'canonical_athlete_id'),
  'linked',
  TRUE,
  TRUE,
  'migration_seed'
FROM public.athlete_identities_v2 ai
JOIN public.athletes a
  ON a.id = ai.canonical_athlete_id
WHERE a.deleted_at IS NULL
ON CONFLICT (identity_id, athlete_id, org_id)
DO UPDATE SET
  confidence_score = 1.0,
  link_status = 'linked',
  is_primary = TRUE,
  updated_at = now();

-- ============================================================================
-- 10) CANONICAL AGGREGATE READ: DOCUMENTS + REQUIREMENT REASONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_unified_athlete_documents_v2(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_service BOOLEAN := auth.role() = 'service_role';
  v_athlete_id UUID;
  v_identity_id UUID;
  v_org_scope_id UUID;
  v_requirement_rows JSONB := '[]'::jsonb;
  v_document_rows JSONB := '[]'::jsonb;
BEGIN
  v_athlete_id := public.resolve_unified_athlete_id_v2(p_context);
  v_org_scope_id := public._v2_try_parse_uuid(COALESCE(p_context->>'org_id', p_context->>'organization_id'));

  IF v_athlete_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'athlete_not_found');
  END IF;

  IF NOT v_is_service AND NOT public.can_view_athlete(v_athlete_id, v_user_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'access_denied');
  END IF;

  v_identity_id := public._v2_ensure_identity_for_athlete(v_athlete_id, v_org_scope_id, 'documents_read');

  WITH athlete_scope AS (
    SELECT DISTINCT t.org_id, t.id AS team_id, t.sport_id
    FROM public.team_memberships tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = v_athlete_id
      AND tm.deleted_at IS NULL
      AND (v_org_scope_id IS NULL OR t.org_id = v_org_scope_id)
  ),
  requirement_rows AS (
    SELECT r.*
    FROM public.athlete_document_requirements_v2 r
    WHERE r.is_required = TRUE
      AND (v_org_scope_id IS NULL OR r.org_id IS NULL OR r.org_id = v_org_scope_id)
      AND (r.effective_start_date IS NULL OR r.effective_start_date <= CURRENT_DATE)
      AND (r.effective_end_date IS NULL OR r.effective_end_date >= CURRENT_DATE)
      AND (
        r.scope_type = 'universal'
        OR (r.scope_type = 'organization' AND EXISTS (SELECT 1 FROM athlete_scope s WHERE s.org_id = r.org_id))
        OR (r.scope_type = 'sport' AND EXISTS (SELECT 1 FROM athlete_scope s WHERE s.sport_id = r.sport_id))
        OR (r.scope_type = 'team' AND EXISTS (SELECT 1 FROM athlete_scope s WHERE s.team_id = r.team_id))
      )
  )
  SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'requirement_id', rr.id,
        'scope_type', rr.scope_type,
        'org_id', rr.org_id,
        'sport_id', rr.sport_id,
        'team_id', rr.team_id,
        'document_key', rr.document_key,
        'document_label', rr.document_label,
        'reason', rr.reason,
        'is_required', rr.is_required,
        'document', (
          SELECT jsonb_build_object(
            'id', d.id,
            'status', d.status,
            'expires_at', d.expires_at,
            'verified_at', d.verified_at,
            'file_path', d.file_path
          )
          FROM public.athlete_documents_v2 d
          WHERE d.athlete_id = v_athlete_id
            AND d.deleted_at IS NULL
            AND d.document_key = rr.document_key
            AND d.scope_type = rr.scope_type
            AND (
              rr.scope_type = 'universal'
              OR (rr.scope_type = 'organization' AND d.org_id IS NOT DISTINCT FROM rr.org_id)
              OR (rr.scope_type = 'sport' AND d.sport_id IS NOT DISTINCT FROM rr.sport_id)
              OR (rr.scope_type = 'team' AND d.team_id IS NOT DISTINCT FROM rr.team_id)
            )
          ORDER BY d.updated_at DESC
          LIMIT 1
        )
      )
    ), '[]'::jsonb)
  INTO v_requirement_rows
  FROM requirement_rows rr;

  SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'scope_type', d.scope_type,
        'org_id', d.org_id,
        'sport_id', d.sport_id,
        'team_id', d.team_id,
        'document_key', d.document_key,
        'document_label', d.document_label,
        'status', d.status,
        'reason', d.reason,
        'expires_at', d.expires_at,
        'verified_at', d.verified_at,
        'file_path', d.file_path
      )
    ), '[]'::jsonb)
  INTO v_document_rows
  FROM public.athlete_documents_v2 d
  WHERE d.athlete_id = v_athlete_id
    AND d.deleted_at IS NULL
    AND (v_org_scope_id IS NULL OR d.org_id IS NULL OR d.org_id = v_org_scope_id);

  RETURN jsonb_build_object(
    'ok', TRUE,
    'schema_version', 2,
    'athlete_identity_id', v_identity_id,
    'athlete_id', v_athlete_id,
    'requirements', v_requirement_rows,
    'documents', v_document_rows,
    'summary', jsonb_build_object(
      'required_count', (
        SELECT COUNT(*)
        FROM jsonb_array_elements(v_requirement_rows)
      ),
      'missing_count', (
        SELECT COUNT(*)
        FROM jsonb_array_elements(v_requirement_rows) req
        WHERE COALESCE(req->'document'->>'status', 'missing') IN ('missing', 'pending', 'rejected')
      )
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', FALSE, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

-- ============================================================================
-- 9) CANONICAL AGGREGATE READ: SCHEDULE + UTC CONFLICT METADATA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_unified_athlete_schedule_v2(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_service BOOLEAN := auth.role() = 'service_role';
  v_athlete_id UUID;
  v_org_scope_id UUID;
  v_sport_filter TEXT;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_events JSONB := '[]'::jsonb;
  v_has_conflicts BOOLEAN := FALSE;
BEGIN
  v_athlete_id := public.resolve_unified_athlete_id_v2(p_context);
  v_org_scope_id := public._v2_try_parse_uuid(COALESCE(p_context->>'org_id', p_context->>'organization_id'));
  v_sport_filter := NULLIF(p_context->>'sport_filter', '');
  v_start_time := COALESCE(public._v2_try_parse_timestamptz(p_context->>'start_time'), now() - INTERVAL '1 day');
  v_end_time := COALESCE(public._v2_try_parse_timestamptz(p_context->>'end_time'), now() + INTERVAL '120 days');

  IF v_athlete_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'athlete_not_found');
  END IF;

  IF NOT v_is_service AND NOT public.can_view_athlete(v_athlete_id, v_user_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'access_denied');
  END IF;

  WITH events_base AS (
    SELECT DISTINCT
      e.id,
      e.title,
      e.start_time,
      e.end_time,
      e.timezone,
      e.location,
      e.type::text AS event_type,
      t.id AS team_id,
      t.name AS team_name,
      t.org_id,
      o.name AS org_name,
      s.id AS sport_id,
      s.name AS sport_name,
      COALESCE(NULLIF(REPLACE(s.slug, '-', '_'), ''), LOWER(regexp_replace(COALESCE(s.name, 'sport'), '[^a-z0-9]+', '_', 'gi'))) AS sport_code,
      s.color AS sport_color,
      COALESCE(er.status::text, 'unknown') AS rsvp_status
    FROM public.team_memberships tm
    JOIN public.teams t ON t.id = tm.team_id
    JOIN public.events e ON e.team_id = t.id
    LEFT JOIN public.organizations o ON o.id = t.org_id
    LEFT JOIN public.sports s ON s.id = t.sport_id
    LEFT JOIN public.event_rsvps er
      ON er.event_id = e.id
     AND er.athlete_id = v_athlete_id
    WHERE tm.athlete_id = v_athlete_id
      AND tm.deleted_at IS NULL
      AND COALESCE(e.is_cancelled, FALSE) = FALSE
      AND e.start_time >= v_start_time
      AND e.start_time <= v_end_time
      AND (v_org_scope_id IS NULL OR t.org_id = v_org_scope_id)
      AND (
        v_sport_filter IS NULL
        OR v_sport_filter = 'all'
        OR COALESCE(NULLIF(REPLACE(s.slug, '-', '_'), ''), s.id::text, '') = v_sport_filter
        OR LOWER(COALESCE(s.name, '')) = LOWER(v_sport_filter)
      )
      AND (
        v_is_service
        OR public.user_has_org_access(v_user_id, t.org_id)
        OR public.user_is_guardian_of_child(v_user_id, v_athlete_id)
      )
  ),
  event_overlaps AS (
    SELECT
      e1.id AS event_id,
      COALESCE(jsonb_agg(DISTINCT e2.id) FILTER (WHERE e2.id IS NOT NULL), '[]'::jsonb) AS conflict_event_ids
    FROM events_base e1
    LEFT JOIN events_base e2
      ON e1.id <> e2.id
     AND tstzrange(e1.start_time, e1.end_time, '[)') && tstzrange(e2.start_time, e2.end_time, '[)')
    GROUP BY e1.id
  )
  SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'event_id', eb.id,
        'title', eb.title,
        'start_time_utc', timezone('UTC', eb.start_time),
        'end_time_utc', timezone('UTC', eb.end_time),
        'start_time', eb.start_time,
        'end_time', eb.end_time,
        'timezone', eb.timezone,
        'location', eb.location,
        'event_type', eb.event_type,
        'org_id', eb.org_id,
        'org_name', eb.org_name,
        'team_id', eb.team_id,
        'team_name', eb.team_name,
        'sport_id', eb.sport_id,
        'sport_name', eb.sport_name,
        'sport_code', eb.sport_code,
        'sport_color', eb.sport_color,
        'rsvp_status', eb.rsvp_status,
        'has_conflict', jsonb_array_length(ov.conflict_event_ids) > 0,
        'conflict_event_ids', ov.conflict_event_ids
      )
      ORDER BY eb.start_time
    ), '[]'::jsonb)
  INTO v_events
  FROM events_base eb
  LEFT JOIN event_overlaps ov ON ov.event_id = eb.id;

  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_events) e
    WHERE COALESCE((e->>'has_conflict')::boolean, FALSE)
  ) INTO v_has_conflicts;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'schema_version', 2,
    'athlete_id', v_athlete_id,
    'start_time', v_start_time,
    'end_time', v_end_time,
    'has_conflicts', v_has_conflicts,
    'events', v_events
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', FALSE, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

-- ============================================================================
-- 8) CANONICAL AGGREGATE READ: PROFILE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_unified_athlete_profile_v2(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_service BOOLEAN := auth.role() = 'service_role';
  v_athlete_id UUID;
  v_identity_id UUID;
  v_org_scope_id UUID;
  v_context_key TEXT;
  v_role_scope TEXT := COALESCE(NULLIF(p_context->>'role_scope', ''), 'default');
  v_athlete RECORD;
  v_sports JSONB := '[]'::jsonb;
  v_teams JSONB := '[]'::jsonb;
  v_current_teams JSONB := '[]'::jsonb;
  v_past_teams JSONB := '[]'::jsonb;
  v_documents JSONB := '[]'::jsonb;
  v_selected_filter TEXT;
  v_first_sport_code TEXT;
  v_total_years INTEGER := 0;
  v_profile_only_sports JSONB := '[]'::jsonb;
BEGIN
  v_athlete_id := public.resolve_unified_athlete_id_v2(p_context);
  v_org_scope_id := public._v2_try_parse_uuid(COALESCE(p_context->>'org_id', p_context->>'organization_id'));

  IF v_athlete_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'athlete_not_found');
  END IF;

  IF NOT v_is_service AND NOT public.can_view_athlete(v_athlete_id, v_user_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'access_denied');
  END IF;

  IF v_org_scope_id IS NOT NULL AND NOT v_is_service AND NOT (
    public.user_has_org_access(v_user_id, v_org_scope_id)
    OR public.user_is_guardian_of_child(v_user_id, v_athlete_id)
  ) THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'org_scope_denied');
  END IF;

  SELECT *
  INTO v_athlete
  FROM public.athletes a
  WHERE a.id = v_athlete_id
    AND a.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'athlete_not_found');
  END IF;

  v_identity_id := public._v2_ensure_identity_for_athlete(v_athlete_id, v_org_scope_id, 'profile_read');

  SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'membership_id', tm.id,
        'organization_id', t.org_id,
        'organization_name', o.name,
        'team_id', t.id,
        'team_name', t.name,
        'sport_id', s.id,
        'sport_name', s.name,
        'sport_code', COALESCE(
          NULLIF(REPLACE(s.slug, '-', '_'), ''),
          LOWER(regexp_replace(COALESCE(s.name, 'sport'), '[^a-z0-9]+', '_', 'gi'))
        ),
        'season_id', se.id,
        'season_name', se.name,
        'season_start', se.start_date,
        'season_end', se.end_date,
        'jersey_number', tm.jersey_number,
        'position', tm.position,
        'role', tm.role,
        'registration_status', tm.registration_status,
        'status', tm.status,
        'joined_at', COALESCE(tm.joined_at, tm.created_at),
        'left_at', tm.left_at,
        'is_current',
          (tm.status = 'active'::public.membership_status)
          AND tm.deleted_at IS NULL
          AND (se.end_date IS NULL OR se.end_date >= CURRENT_DATE)
      )
      ORDER BY se.start_date DESC NULLS LAST, tm.created_at DESC
    ), '[]'::jsonb)
  INTO v_teams
  FROM public.team_memberships tm
  JOIN public.teams t ON t.id = tm.team_id
  LEFT JOIN public.organizations o ON o.id = t.org_id
  LEFT JOIN public.sports s ON s.id = t.sport_id
  LEFT JOIN public.seasons se ON se.id = tm.season_id
  WHERE tm.athlete_id = v_athlete_id
    AND tm.deleted_at IS NULL
    AND (v_org_scope_id IS NULL OR t.org_id = v_org_scope_id)
    AND (
      v_is_service
      OR public.user_has_org_access(v_user_id, t.org_id)
      OR public.user_is_guardian_of_child(v_user_id, v_athlete_id)
    );

  SELECT COALESCE(jsonb_agg(team_item), '[]'::jsonb)
  INTO v_current_teams
  FROM jsonb_array_elements(v_teams) AS team_item
  WHERE COALESCE((team_item->>'is_current')::boolean, FALSE) = TRUE;

  SELECT COALESCE(jsonb_agg(team_item), '[]'::jsonb)
  INTO v_past_teams
  FROM jsonb_array_elements(v_teams) AS team_item
  WHERE COALESCE((team_item->>'is_current')::boolean, FALSE) = FALSE;

  WITH sport_scope AS (
    SELECT DISTINCT t.sport_id
    FROM public.team_memberships tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = v_athlete_id
      AND tm.deleted_at IS NULL
      AND t.sport_id IS NOT NULL
      AND (v_org_scope_id IS NULL OR t.org_id = v_org_scope_id)
    UNION
    SELECT DISTINCT as2.sport_id
    FROM public.athlete_sports as2
    WHERE as2.athlete_id = v_athlete_id
      AND (v_org_scope_id IS NULL OR as2.org_id = v_org_scope_id)
  )
  SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'sport_id', s.id,
        'sport_name', s.name,
        'sport_code', COALESCE(
          NULLIF(REPLACE(s.slug, '-', '_'), ''),
          LOWER(regexp_replace(COALESCE(s.name, 'sport'), '[^a-z0-9]+', '_', 'gi'))
        ),
        'skill_level', (
          SELECT asp.profile_data->>'skill_level'
          FROM public.athlete_sport_profiles asp
          WHERE asp.athlete_id = v_athlete_id
            AND asp.sport_code = COALESCE(
              NULLIF(REPLACE(s.slug, '-', '_'), ''),
              LOWER(regexp_replace(COALESCE(s.name, 'sport'), '[^a-z0-9]+', '_', 'gi'))
            )
          ORDER BY asp.updated_at DESC
          LIMIT 1
        ),
        'preferred_positions', COALESCE((
          SELECT jsonb_agg(DISTINCT pos.value)
          FROM (
            SELECT NULLIF(tm2.position, '') AS value
            FROM public.team_memberships tm2
            JOIN public.teams t2 ON t2.id = tm2.team_id
            WHERE tm2.athlete_id = v_athlete_id
              AND tm2.deleted_at IS NULL
              AND t2.sport_id = s.id
              AND NULLIF(tm2.position, '') IS NOT NULL
          ) pos
        ), '[]'::jsonb),
        'team_memberships', COALESCE((
          SELECT jsonb_agg(team_item)
          FROM jsonb_array_elements(v_teams) team_item
          WHERE team_item->>'sport_id' = s.id::text
        ), '[]'::jsonb)
      )
      ORDER BY s.name
    ), '[]'::jsonb)
  INTO v_sports
  FROM sport_scope ss
  JOIN public.sports s ON s.id = ss.sport_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'sport_id', NULL,
        'sport_name', INITCAP(REPLACE(asp.sport_code, '_', ' ')),
        'sport_code', asp.sport_code,
        'skill_level', asp.profile_data->>'skill_level',
        'preferred_positions', '[]'::jsonb,
        'team_memberships', '[]'::jsonb
      )
    ),
    '[]'::jsonb
  )
  INTO v_profile_only_sports
  FROM public.athlete_sport_profiles asp
  WHERE asp.athlete_id = v_athlete_id
    AND (v_org_scope_id IS NULL OR asp.org_id = v_org_scope_id)
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_sports) existing
      WHERE existing->>'sport_code' = asp.sport_code
    );

  v_sports := v_sports || v_profile_only_sports;

  SELECT COALESCE(
    EXTRACT(YEAR FROM age(CURRENT_DATE, MIN(COALESCE(se.start_date, tm.created_at::date))))::int,
    0
  )
  INTO v_total_years
  FROM public.team_memberships tm
  LEFT JOIN public.seasons se ON se.id = tm.season_id
  WHERE tm.athlete_id = v_athlete_id
    AND tm.deleted_at IS NULL;

  SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'document_key', d.document_key,
        'document_label', d.document_label,
        'status', d.status,
        'scope_type', d.scope_type,
        'expires_at', d.expires_at,
        'verified_at', d.verified_at
      )
    ), '[]'::jsonb)
  INTO v_documents
  FROM public.athlete_documents_v2 d
  WHERE d.athlete_id = v_athlete_id
    AND d.deleted_at IS NULL
    AND d.scope_type = 'universal';

  v_context_key := COALESCE(
    NULLIF(p_context->>'context_key', ''),
    CONCAT('athlete-profile:', COALESCE(v_org_scope_id::text, 'all'), ':', v_athlete_id::text, ':', v_role_scope)
  );

  IF v_user_id IS NOT NULL THEN
    SELECT p.sport_filter
    INTO v_selected_filter
    FROM public.athlete_sport_filter_preferences_v2 p
    WHERE p.user_id = v_user_id
      AND p.context_key = v_context_key
    LIMIT 1;
  END IF;

  IF v_selected_filter IS NULL OR btrim(v_selected_filter) = '' THEN
    v_selected_filter := NULLIF(p_context->>'sport_filter', '');
  END IF;

  IF v_selected_filter IS NULL OR btrim(v_selected_filter) = '' THEN
    IF jsonb_array_length(v_sports) > 1 THEN
      v_selected_filter := 'all';
    ELSE
      SELECT elem->>'sport_code'
      INTO v_first_sport_code
      FROM jsonb_array_elements(v_sports) elem
      LIMIT 1;
      v_selected_filter := COALESCE(v_first_sport_code, 'all');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'schema_version', 2,
    'athlete_identity_id', v_identity_id,
    'athlete_id', v_athlete_id,
    'basic_info', jsonb_build_object(
      'first_name', v_athlete.first_name,
      'last_name', v_athlete.last_name,
      'preferred_name', v_athlete.preferred_name,
      'display_name', COALESCE(v_athlete.preferred_name, CONCAT(v_athlete.first_name, ' ', v_athlete.last_name)),
      'birthdate', v_athlete.birthdate,
      'privacy_level', v_athlete.privacy_level,
      'photo_updated_at', v_athlete.profile_photo_updated_at,
      'emergency_contact', v_athlete.emergency_contact
    ),
    'sport_participations', v_sports,
    'team_memberships', v_teams,
    'current_teams', v_current_teams,
    'past_teams', v_past_teams,
    'cross_sport', jsonb_build_object(
      'total_years_in_athletics', GREATEST(v_total_years, 0),
      'shared_documents', v_documents
    ),
    'user_preference', jsonb_build_object(
      'context_key', v_context_key,
      'sport_filter', v_selected_filter
    ),
    'context', jsonb_build_object(
      'org_scope_id', v_org_scope_id,
      'role_scope', v_role_scope
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', FALSE, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

-- ============================================================================
-- 5) OUTBOX + RECONCILIATION INTERFACES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enqueue_v2_write_outbox_event(
  p_topic TEXT,
  p_payload JSONB,
  p_org_id UUID DEFAULT NULL,
  p_athlete_identity_id UUID DEFAULT NULL,
  p_aggregate_type TEXT DEFAULT NULL,
  p_aggregate_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_service BOOLEAN := auth.role() = 'service_role';
  v_outbox_id UUID;
BEGIN
  IF COALESCE(NULLIF(btrim(p_topic), ''), '') = '' THEN
    RAISE EXCEPTION 'topic_required';
  END IF;

  IF NOT v_is_service AND p_org_id IS NOT NULL AND NOT public.user_is_org_admin(v_user_id, p_org_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  INSERT INTO public.v2_write_outbox (
    topic,
    payload,
    org_id,
    athlete_identity_id,
    aggregate_type,
    aggregate_id,
    idempotency_key
  )
  VALUES (
    p_topic,
    COALESCE(p_payload, '{}'::jsonb),
    p_org_id,
    p_athlete_identity_id,
    p_aggregate_type,
    p_aggregate_id,
    p_idempotency_key
  )
  ON CONFLICT (idempotency_key)
  DO UPDATE SET
    payload = EXCLUDED.payload,
    updated_at = now()
  RETURNING id INTO v_outbox_id;

  RETURN v_outbox_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_v2_write_outbox_reconciliation(
  p_batch_size INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_service BOOLEAN := auth.role() = 'service_role';
  v_run_id UUID;
  v_processed INTEGER := 0;
  v_failed INTEGER := 0;
  v_row RECORD;
BEGIN
  IF NOT v_is_service AND NOT public.is_platform_admin(v_user_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  INSERT INTO public.v2_write_reconciliation_runs (created_by_user_id, metadata)
  VALUES (v_user_id, jsonb_build_object('batch_size', GREATEST(p_batch_size, 1)))
  RETURNING id INTO v_run_id;

  FOR v_row IN
    SELECT id
    FROM public.v2_write_outbox
    WHERE status IN ('pending', 'failed')
      AND available_at <= now()
    ORDER BY created_at
    LIMIT GREATEST(p_batch_size, 1)
  LOOP
    BEGIN
      UPDATE public.v2_write_outbox
      SET status = 'processing',
          updated_at = now(),
          attempt_count = attempt_count + 1
      WHERE id = v_row.id;

      -- Worker-side integration point:
      -- the external worker can consume rows in 'processing'. For baseline reconciliation,
      -- mark them as done to guarantee idempotent, resumable progress.
      UPDATE public.v2_write_outbox
      SET status = 'done',
          processed_at = now(),
          updated_at = now(),
          last_error = NULL
      WHERE id = v_row.id;

      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.v2_write_outbox
      SET status = 'failed',
          updated_at = now(),
          last_error = SQLERRM,
          available_at = now() + INTERVAL '5 minutes'
      WHERE id = v_row.id;

      v_failed := v_failed + 1;
    END;
  END LOOP;

  UPDATE public.v2_write_reconciliation_runs
  SET finished_at = now(),
      processed_count = v_processed,
      failed_count = v_failed,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('completed_at', now())
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'processed_count', v_processed,
    'failed_count', v_failed
  );
END;
$$;

-- ============================================================================
-- 6) IDENTITY LINKING + MERGE WORKFLOW INTERFACES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_identity_link_v2(
  p_identity_id UUID,
  p_athlete_id UUID,
  p_org_id UUID DEFAULT NULL,
  p_confidence_score NUMERIC DEFAULT 1.0,
  p_match_signals JSONB DEFAULT '{}'::jsonb,
  p_is_reversible BOOLEAN DEFAULT TRUE,
  p_source TEXT DEFAULT 'auto'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_service BOOLEAN := auth.role() = 'service_role';
  v_identity_id UUID;
  v_org_id UUID;
  v_existing_canonical_identity_id UUID;
  v_link_status TEXT;
  v_threshold NUMERIC := 0.85;
  v_link public.athlete_identity_links_v2%ROWTYPE;
BEGIN
  IF p_athlete_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'athlete_id_required');
  END IF;

  SELECT COALESCE(p_org_id, a.org_id) INTO v_org_id
  FROM public.athletes a
  WHERE a.id = p_athlete_id;

  IF v_org_id IS NOT NULL AND NOT v_is_service AND NOT public.user_is_org_admin(v_user_id, v_org_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'access_denied');
  END IF;

  IF p_identity_id IS NULL THEN
    v_identity_id := public._v2_ensure_identity_for_athlete(p_athlete_id, v_org_id, p_source);
  ELSE
    v_identity_id := p_identity_id;
    SELECT id
    INTO v_existing_canonical_identity_id
    FROM public.athlete_identities_v2
    WHERE canonical_athlete_id = p_athlete_id
    LIMIT 1;

    INSERT INTO public.athlete_identities_v2 (id, canonical_athlete_id, primary_org_id, source)
    VALUES (
      v_identity_id,
      CASE WHEN v_existing_canonical_identity_id IS NULL THEN p_athlete_id ELSE NULL END,
      v_org_id,
      COALESCE(NULLIF(p_source, ''), 'manual')
    )
    ON CONFLICT (id)
    DO UPDATE SET
      canonical_athlete_id = COALESCE(public.athlete_identities_v2.canonical_athlete_id, EXCLUDED.canonical_athlete_id),
      primary_org_id = COALESCE(public.athlete_identities_v2.primary_org_id, EXCLUDED.primary_org_id),
      updated_at = now();
  END IF;

  v_link_status := CASE
    WHEN COALESCE(p_confidence_score, 0) >= v_threshold THEN 'linked'
    ELSE 'pending_review'
  END;

  INSERT INTO public.athlete_identity_links_v2 (
    identity_id,
    athlete_id,
    org_id,
    confidence_score,
    match_signals,
    link_status,
    is_primary,
    is_reversible,
    source,
    linked_by_user_id
  )
  VALUES (
    v_identity_id,
    p_athlete_id,
    v_org_id,
    COALESCE(p_confidence_score, 0),
    COALESCE(p_match_signals, '{}'::jsonb),
    v_link_status,
    TRUE,
    COALESCE(p_is_reversible, TRUE),
    COALESCE(NULLIF(p_source, ''), 'manual'),
    v_user_id
  )
  ON CONFLICT (identity_id, athlete_id, org_id)
  DO UPDATE SET
    confidence_score = GREATEST(public.athlete_identity_links_v2.confidence_score, EXCLUDED.confidence_score),
    match_signals = public.athlete_identity_links_v2.match_signals || EXCLUDED.match_signals,
    link_status = EXCLUDED.link_status,
    is_reversible = EXCLUDED.is_reversible,
    updated_at = now()
  RETURNING * INTO v_link;

  IF v_link_status = 'pending_review' AND v_org_id IS NOT NULL THEN
    INSERT INTO public.athlete_identity_merge_inbox_v2 (
      org_id,
      identity_id,
      candidate_athlete_id,
      confidence_score,
      match_signals,
      status
    )
    VALUES (
      v_org_id,
      v_identity_id,
      p_athlete_id,
      COALESCE(p_confidence_score, 0),
      COALESCE(p_match_signals, '{}'::jsonb),
      'pending'
    );
  END IF;

  PERFORM public.enqueue_v2_write_outbox_event(
    p_topic := 'identity_link.' || v_link_status,
    p_payload := jsonb_build_object(
      'identity_id', v_identity_id,
      'athlete_id', p_athlete_id,
      'org_id', v_org_id,
      'confidence_score', COALESCE(p_confidence_score, 0),
      'is_reversible', COALESCE(p_is_reversible, TRUE)
    ),
    p_org_id := v_org_id,
    p_athlete_identity_id := v_identity_id,
    p_aggregate_type := 'athlete_identity',
    p_aggregate_id := v_identity_id,
    p_idempotency_key := CONCAT('create_identity_link_v2:', v_identity_id::text, ':', p_athlete_id::text, ':', COALESCE(v_org_id::text, 'none'))
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'identity_id', v_identity_id,
    'link', to_jsonb(v_link),
    'requires_review', v_link_status = 'pending_review'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', FALSE, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_identity_merge_inbox_v2(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_service BOOLEAN := auth.role() = 'service_role';
  v_items JSONB := '[]'::jsonb;
BEGIN
  IF p_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'org_id_required');
  END IF;

  IF NOT v_is_service AND NOT public.user_is_org_admin(v_user_id, p_org_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'access_denied');
  END IF;

  SELECT COALESCE(
    jsonb_agg(item ORDER BY created_at DESC),
    '[]'::jsonb
  )
  INTO v_items
  FROM (
    SELECT
      jsonb_build_object(
        'id', imi.id,
        'org_id', imi.org_id,
        'identity_id', imi.identity_id,
        'candidate_athlete_id', imi.candidate_athlete_id,
        'candidate_name', CONCAT(a.first_name, ' ', a.last_name),
        'confidence_score', imi.confidence_score,
        'match_signals', imi.match_signals,
        'status', imi.status,
        'owner_user_id', imi.owner_user_id,
        'decision', imi.decision,
        'decision_notes', imi.decision_notes,
        'resolved_by_user_id', imi.resolved_by_user_id,
        'resolved_at', imi.resolved_at,
        'created_at', imi.created_at,
        'updated_at', imi.updated_at
      ) AS item,
      imi.created_at
    FROM public.athlete_identity_merge_inbox_v2 imi
    JOIN public.athletes a ON a.id = imi.candidate_athlete_id
    WHERE imi.org_id = p_org_id
      AND imi.status = 'pending'
  ) q;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'org_id', p_org_id,
    'count', jsonb_array_length(v_items),
    'items', v_items
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', FALSE, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_athlete_identity_link_v2(
  p_identity_id UUID,
  p_candidate_id UUID,
  p_decision TEXT,
  p_org_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_service BOOLEAN := auth.role() = 'service_role';
  v_org_id UUID;
  v_decision TEXT;
  v_result JSONB;
BEGIN
  v_decision := lower(COALESCE(p_decision, ''));
  IF v_decision NOT IN ('approve', 'reject', 'unlink') THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'invalid_decision');
  END IF;

  SELECT COALESCE(
    p_org_id,
    (SELECT org_id FROM public.athlete_identity_links_v2 WHERE identity_id = p_identity_id AND athlete_id = p_candidate_id LIMIT 1),
    (SELECT org_id FROM public.athletes WHERE id = p_candidate_id LIMIT 1)
  ) INTO v_org_id;

  IF v_org_id IS NOT NULL AND NOT v_is_service AND NOT public.user_is_org_admin(v_user_id, v_org_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'access_denied');
  END IF;

  IF v_decision = 'approve' THEN
    v_result := public.create_identity_link_v2(
      p_identity_id := p_identity_id,
      p_athlete_id := p_candidate_id,
      p_org_id := v_org_id,
      p_confidence_score := 1.0,
      p_match_signals := jsonb_build_object('resolved_by', v_user_id, 'resolution', 'manual_approve'),
      p_is_reversible := TRUE,
      p_source := 'manual_resolution'
    );
  ELSIF v_decision = 'reject' THEN
    INSERT INTO public.athlete_identity_links_v2 (
      identity_id,
      athlete_id,
      org_id,
      confidence_score,
      match_signals,
      link_status,
      is_primary,
      is_reversible,
      source,
      linked_by_user_id
    )
    VALUES (
      p_identity_id,
      p_candidate_id,
      v_org_id,
      0.0,
      jsonb_build_object('resolved_by', v_user_id, 'resolution', 'manual_reject'),
      'rejected',
      FALSE,
      TRUE,
      'manual_resolution',
      v_user_id
    )
    ON CONFLICT (identity_id, athlete_id, org_id)
    DO UPDATE SET
      link_status = 'rejected',
      updated_at = now(),
      linked_by_user_id = v_user_id;

    v_result := jsonb_build_object('ok', TRUE, 'identity_id', p_identity_id, 'athlete_id', p_candidate_id, 'status', 'rejected');
  ELSE
    UPDATE public.athlete_identity_links_v2
    SET link_status = 'unlinked',
        unlinked_at = now(),
        unlinked_reason = COALESCE(NULLIF(p_notes, ''), 'manual_unlink'),
        updated_at = now(),
        is_primary = FALSE
    WHERE identity_id = p_identity_id
      AND athlete_id = p_candidate_id
      AND link_status = 'linked';

    v_result := jsonb_build_object('ok', TRUE, 'identity_id', p_identity_id, 'athlete_id', p_candidate_id, 'status', 'unlinked');
  END IF;

  UPDATE public.athlete_identity_merge_inbox_v2
  SET status = 'resolved',
      decision = v_decision,
      decision_notes = p_notes,
      resolved_by_user_id = v_user_id,
      resolved_at = now(),
      updated_at = now()
  WHERE identity_id = p_identity_id
    AND candidate_athlete_id = p_candidate_id
    AND status = 'pending';

  PERFORM public.enqueue_v2_write_outbox_event(
    p_topic := CONCAT('identity_link_resolution.', v_decision),
    p_payload := jsonb_build_object(
      'identity_id', p_identity_id,
      'athlete_id', p_candidate_id,
      'org_id', v_org_id,
      'decision', v_decision,
      'notes', p_notes
    ),
    p_org_id := v_org_id,
    p_athlete_identity_id := p_identity_id,
    p_aggregate_type := 'athlete_identity',
    p_aggregate_id := p_identity_id,
    p_idempotency_key := CONCAT('resolve_identity_link_v2:', p_identity_id::text, ':', p_candidate_id::text, ':', v_decision)
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', FALSE, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

CREATE OR REPLACE FUNCTION public.run_identity_backfill_chunk_v2(
  p_chunk_size INTEGER DEFAULT 500,
  p_org_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_service BOOLEAN := auth.role() = 'service_role';
  v_checkpoint public.athlete_identity_backfill_checkpoints_v2%ROWTYPE;
  v_row RECORD;
  v_processed INTEGER := 0;
  v_identity_id UUID;
BEGIN
  IF NOT v_is_service AND NOT public.is_platform_admin(v_user_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'access_denied');
  END IF;

  INSERT INTO public.athlete_identity_backfill_checkpoints_v2 (org_id, status)
  VALUES (p_org_id, 'pending')
  ON CONFLICT (org_id) DO NOTHING;

  SELECT *
  INTO v_checkpoint
  FROM public.athlete_identity_backfill_checkpoints_v2
  WHERE org_id IS NOT DISTINCT FROM p_org_id
  LIMIT 1
  FOR UPDATE;

  UPDATE public.athlete_identity_backfill_checkpoints_v2
  SET status = 'running',
      updated_at = now(),
      last_error = NULL
  WHERE id = v_checkpoint.id;

  FOR v_row IN
    SELECT a.id, a.org_id
    FROM public.athletes a
    WHERE a.deleted_at IS NULL
      AND (p_org_id IS NULL OR a.org_id = p_org_id)
      AND (v_checkpoint.last_athlete_id IS NULL OR a.id::text > v_checkpoint.last_athlete_id::text)
    ORDER BY a.id
    LIMIT GREATEST(p_chunk_size, 1)
  LOOP
    v_identity_id := public._v2_ensure_identity_for_athlete(v_row.id, v_row.org_id, 'backfill_chunk');

    INSERT INTO public.athlete_identity_links_v2 (
      identity_id,
      athlete_id,
      org_id,
      confidence_score,
      match_signals,
      link_status,
      is_primary,
      is_reversible,
      source
    )
    VALUES (
      v_identity_id,
      v_row.id,
      v_row.org_id,
      1.0,
      jsonb_build_object('source', 'backfill_chunk'),
      'linked',
      TRUE,
      TRUE,
      'backfill_chunk'
    )
    ON CONFLICT (identity_id, athlete_id, org_id)
    DO UPDATE SET
      confidence_score = 1.0,
      link_status = 'linked',
      is_primary = TRUE,
      updated_at = now();

    v_processed := v_processed + 1;

    UPDATE public.athlete_identity_backfill_checkpoints_v2
    SET last_athlete_id = v_row.id,
        processed_count = processed_count + 1,
        updated_at = now()
    WHERE id = v_checkpoint.id;
  END LOOP;

  UPDATE public.athlete_identity_backfill_checkpoints_v2
  SET status = CASE WHEN v_processed < GREATEST(p_chunk_size, 1) THEN 'complete' ELSE 'running' END,
      updated_at = now()
  WHERE id = v_checkpoint.id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'org_id', p_org_id,
    'processed_in_chunk', v_processed,
    'checkpoint_id', v_checkpoint.id,
    'status', CASE WHEN v_processed < GREATEST(p_chunk_size, 1) THEN 'complete' ELSE 'running' END
  );
EXCEPTION WHEN OTHERS THEN
  UPDATE public.athlete_identity_backfill_checkpoints_v2
  SET status = 'error',
      last_error = SQLERRM,
      updated_at = now()
  WHERE org_id IS NOT DISTINCT FROM p_org_id;

  RETURN jsonb_build_object('ok', FALSE, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

-- ============================================================================
-- 7) SPORT FILTER PREFERENCE UPSERT (debounce-safe + idempotent)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_sport_filter_preference_v2(
  p_user_id UUID,
  p_context JSONB,
  p_sport_filter TEXT,
  p_idempotency_key TEXT DEFAULT NULL,
  p_client_updated_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_auth_user UUID := auth.uid();
  v_is_service BOOLEAN := auth.role() = 'service_role';
  v_context_key TEXT;
  v_existing public.athlete_sport_filter_preferences_v2%ROWTYPE;
  v_saved public.athlete_sport_filter_preferences_v2%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'user_id_required');
  END IF;

  IF NOT v_is_service AND (v_auth_user IS NULL OR v_auth_user <> p_user_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'access_denied');
  END IF;

  v_context_key := COALESCE(
    NULLIF(p_context->>'context_key', ''),
    md5(COALESCE(p_context::text, '{}'))
  );

  SELECT *
  INTO v_existing
  FROM public.athlete_sport_filter_preferences_v2
  WHERE user_id = p_user_id
    AND context_key = v_context_key
  LIMIT 1
  FOR UPDATE;

  IF FOUND AND p_idempotency_key IS NOT NULL AND p_idempotency_key = v_existing.last_idempotency_key THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'idempotent_replay', TRUE,
      'stale_conflict', FALSE,
      'context_key', v_context_key,
      'sport_filter', v_existing.sport_filter,
      'version', v_existing.version,
      'updated_at', v_existing.updated_at
    );
  END IF;

  IF FOUND AND p_client_updated_at IS NOT NULL AND v_existing.updated_at > p_client_updated_at THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'idempotent_replay', FALSE,
      'stale_conflict', TRUE,
      'context_key', v_context_key,
      'sport_filter', v_existing.sport_filter,
      'version', v_existing.version,
      'updated_at', v_existing.updated_at
    );
  END IF;

  INSERT INTO public.athlete_sport_filter_preferences_v2 (
    user_id,
    context_key,
    context,
    sport_filter,
    last_idempotency_key
  )
  VALUES (
    p_user_id,
    v_context_key,
    COALESCE(p_context, '{}'::jsonb),
    COALESCE(NULLIF(p_sport_filter, ''), 'all'),
    p_idempotency_key
  )
  ON CONFLICT (user_id, context_key)
  DO UPDATE SET
    context = EXCLUDED.context,
    sport_filter = EXCLUDED.sport_filter,
    last_idempotency_key = EXCLUDED.last_idempotency_key,
    version = public.athlete_sport_filter_preferences_v2.version + 1,
    updated_at = now()
  RETURNING * INTO v_saved;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'idempotent_replay', FALSE,
    'stale_conflict', FALSE,
    'context_key', v_saved.context_key,
    'sport_filter', v_saved.sport_filter,
    'version', v_saved.version,
    'updated_at', v_saved.updated_at
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', FALSE, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

-- ============================================================================
-- 13) GRANTS + TRANSACTION CLOSE
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_unified_athlete_profile_v2(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unified_athlete_schedule_v2(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unified_athlete_documents_v2(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_sport_filter_preference_v2(UUID, JSONB, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_athlete_identity_link_v2(UUID, UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_identity_merge_inbox_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_identity_link_v2(UUID, UUID, UUID, NUMERIC, JSONB, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_athlete_profile_v2_fan(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_v2_write_outbox_event(TEXT, JSONB, UUID, UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_v2_write_outbox_reconciliation(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_identity_backfill_chunk_v2(INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_unified_athlete_id_v2(JSONB) TO authenticated;

COMMIT;
