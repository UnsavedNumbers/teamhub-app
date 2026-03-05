-- Complete fan follow model + fan video visibility RLS
-- - Adds optional fan team/athlete follow tables
-- - Hardens follow-table RLS (self-manage + org-admin scoped read)
-- - Enables active videos_fan_select policy (replacing previously commented-out draft)
-- - Replaces placeholder follow_team/follow_athlete RPC implementations

-- ============================================================================
-- 1) FOLLOW MODEL TABLES (OPTIONAL TEAM + ATHLETE FOLLOWS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fan_team_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  fan_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'post_purchase', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, fan_user_id)
);

CREATE TABLE IF NOT EXISTS public.fan_athlete_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  fan_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'post_purchase', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, fan_user_id)
);

CREATE INDEX IF NOT EXISTS idx_fan_team_follows_org_id ON public.fan_team_follows(org_id);
CREATE INDEX IF NOT EXISTS idx_fan_team_follows_fan_user_id ON public.fan_team_follows(fan_user_id);
CREATE INDEX IF NOT EXISTS idx_fan_team_follows_org_fan ON public.fan_team_follows(org_id, fan_user_id);
CREATE INDEX IF NOT EXISTS idx_fan_team_follows_team_id ON public.fan_team_follows(team_id);

CREATE INDEX IF NOT EXISTS idx_fan_athlete_follows_org_id ON public.fan_athlete_follows(org_id);
CREATE INDEX IF NOT EXISTS idx_fan_athlete_follows_fan_user_id ON public.fan_athlete_follows(fan_user_id);
CREATE INDEX IF NOT EXISTS idx_fan_athlete_follows_org_fan ON public.fan_athlete_follows(org_id, fan_user_id);
CREATE INDEX IF NOT EXISTS idx_fan_athlete_follows_athlete_id ON public.fan_athlete_follows(athlete_id);

-- Existing org-follow table already exists; ensure composite lookup index in org->user order.
CREATE INDEX IF NOT EXISTS idx_fan_org_follows_org_user ON public.fan_org_follows(org_id, user_id);

ALTER TABLE public.fan_team_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_athlete_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_org_follows ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fan_team_follows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fan_athlete_follows TO authenticated;

-- fan_team_follows policies
DROP POLICY IF EXISTS fan_team_follows_self_manage ON public.fan_team_follows;
CREATE POLICY fan_team_follows_self_manage
  ON public.fan_team_follows
  FOR ALL
  TO authenticated
  USING (fan_user_id = auth.uid())
  WITH CHECK (
    fan_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = fan_team_follows.team_id
        AND t.org_id = fan_team_follows.org_id
    )
  );

DROP POLICY IF EXISTS fan_team_follows_org_admin_select ON public.fan_team_follows;
CREATE POLICY fan_team_follows_org_admin_select
  ON public.fan_team_follows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.org_id = fan_team_follows.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
        AND COALESCE(om.is_active, true) = true
    )
  );

-- fan_athlete_follows policies
DROP POLICY IF EXISTS fan_athlete_follows_self_manage ON public.fan_athlete_follows;
CREATE POLICY fan_athlete_follows_self_manage
  ON public.fan_athlete_follows
  FOR ALL
  TO authenticated
  USING (fan_user_id = auth.uid())
  WITH CHECK (
    fan_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.athletes a
      WHERE a.id = fan_athlete_follows.athlete_id
        AND a.org_id = fan_athlete_follows.org_id
        AND a.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS fan_athlete_follows_org_admin_select ON public.fan_athlete_follows;
CREATE POLICY fan_athlete_follows_org_admin_select
  ON public.fan_athlete_follows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.org_id = fan_athlete_follows.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
        AND COALESCE(om.is_active, true) = true
    )
  );

-- Existing org-follows table: preserve self-manage policy and add scoped org-admin read.
DROP POLICY IF EXISTS "Org admins can view follows for their org" ON public.fan_org_follows;
CREATE POLICY "Org admins can view follows for their org"
  ON public.fan_org_follows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.org_id = fan_org_follows.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
        AND COALESCE(om.is_active, true) = true
    )
  );

COMMENT ON TABLE public.fan_team_follows IS 'Fans following teams; org-scoped, self-managed.';
COMMENT ON TABLE public.fan_athlete_follows IS 'Fans following athletes; org-scoped, self-managed.';

-- ============================================================================
-- 2) ENABLE FAN VIDEO SELECT POLICY (replacement for commented-out draft)
-- ============================================================================

DROP POLICY IF EXISTS videos_fan_select ON public.videos;
CREATE POLICY videos_fan_select
  ON public.videos
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND status = 'ready'
    AND (
      -- Public videos are visible to authenticated fans without follow.
      visibility = 'public'

      -- Follow-scoped fan visibility (non-private + non-team-only).
      OR (
        fan_visible = true
        AND visibility = 'organization'
        AND (
          EXISTS (
            SELECT 1
            FROM public.fan_org_follows fof
            WHERE fof.user_id = auth.uid()
              AND fof.org_id = videos.org_id
          )
          OR EXISTS (
            SELECT 1
            FROM public.fan_team_follows ftf
            JOIN public.teams t ON t.id = ftf.team_id
            WHERE ftf.fan_user_id = auth.uid()
              AND t.org_id = videos.org_id
              AND (videos.team_id IS NULL OR ftf.team_id = videos.team_id)
          )
          OR EXISTS (
            SELECT 1
            FROM public.fan_athlete_follows faf
            JOIN public.athletes a ON a.id = faf.athlete_id
            JOIN public.video_athlete_links val ON val.athlete_id = faf.athlete_id
            WHERE faf.fan_user_id = auth.uid()
              AND a.org_id = videos.org_id
              AND a.deleted_at IS NULL
              AND val.video_id = videos.id
          )
        )
      )

      -- Explicit share to authenticated user email.
      OR EXISTS (
        SELECT 1
        FROM public.video_shares vs
        WHERE vs.video_id = videos.id
          AND vs.revoked_at IS NULL
          AND (vs.expires_at IS NULL OR vs.expires_at > now())
          AND COALESCE(auth.jwt() ->> 'email', '') <> ''
          AND EXISTS (
            SELECT 1
            FROM unnest(COALESCE(vs.email_recipients, ARRAY[]::TEXT[])) AS recipient(email)
            WHERE lower(trim(recipient.email)) = lower(auth.jwt() ->> 'email')
          )
      )
    )
  );

COMMENT ON POLICY videos_fan_select ON public.videos IS
'Active fan visibility policy: public videos, followed-org fan-visible organization videos, and explicit email shares.';

-- ============================================================================
-- 3) FAN NAVIGATION RPCS (replace placeholder follow functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.follow_team(
  p_team_id UUID,
  p_source VARCHAR(50) DEFAULT 'manual'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_visible_to_fans BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT t.org_id, COALESCE(t.visible_to_fans, FALSE)
  INTO v_org_id, v_visible_to_fans
  FROM public.teams t
  WHERE t.id = p_team_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  IF v_visible_to_fans IS NOT TRUE THEN
    RAISE EXCEPTION 'This team cannot be followed';
  END IF;

  INSERT INTO public.fan_team_follows (org_id, team_id, fan_user_id, source)
  VALUES (v_org_id, p_team_id, v_user_id, COALESCE(NULLIF(trim(p_source), ''), 'manual'))
  ON CONFLICT (team_id, fan_user_id) DO NOTHING;

  -- Ensure org-level follow exists for fan-scope features.
  INSERT INTO public.fan_org_follows (user_id, org_id, source)
  VALUES (v_user_id, v_org_id, COALESCE(NULLIF(trim(p_source), ''), 'manual'))
  ON CONFLICT (user_id, org_id) DO NOTHING;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.follow_athlete(
  p_athlete_id UUID,
  p_source VARCHAR(50) DEFAULT 'manual'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_privacy_level TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT a.org_id, COALESCE(a.privacy_level::text, 'public')
  INTO v_org_id, v_privacy_level
  FROM public.athletes a
  WHERE a.id = p_athlete_id
    AND a.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Athlete not found';
  END IF;

  IF v_privacy_level = 'private' THEN
    RAISE EXCEPTION 'This athlete cannot be followed';
  END IF;

  INSERT INTO public.fan_athlete_follows (org_id, athlete_id, fan_user_id, source)
  VALUES (v_org_id, p_athlete_id, v_user_id, COALESCE(NULLIF(trim(p_source), ''), 'manual'))
  ON CONFLICT (athlete_id, fan_user_id) DO NOTHING;

  -- Ensure org-level follow exists for fan-scope features.
  INSERT INTO public.fan_org_follows (user_id, org_id, source)
  VALUES (v_user_id, v_org_id, COALESCE(NULLIF(trim(p_source), ''), 'manual'))
  ON CONFLICT (user_id, org_id) DO NOTHING;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.follow_team(UUID, VARCHAR) IS
'Follows a visible team and ensures org follow exists. Authenticated users only.';

COMMENT ON FUNCTION public.follow_athlete(UUID, VARCHAR) IS
'Follows a non-private athlete and ensures org follow exists. Authenticated users only.';

REVOKE ALL ON FUNCTION public.follow_team(UUID, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.follow_athlete(UUID, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.follow_team(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.follow_athlete(UUID, VARCHAR) TO authenticated;
