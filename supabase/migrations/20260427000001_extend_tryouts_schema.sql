-- Extend tryouts schema for multi-session scheduling and evaluator assignment.
-- This migration is idempotent and safe to run in environments that already
-- include parts of the schema.

-- 1) Multi-session support per tryout
CREATE TABLE IF NOT EXISTS public.tryout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tryout_id UUID NOT NULL REFERENCES public.tryouts(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT,
  session_type TEXT NOT NULL DEFAULT 'initial'
    CHECK (session_type IN ('initial', 'callback', 'final')),
  capacity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tryout_sessions_tryout_id
  ON public.tryout_sessions(tryout_id);
CREATE INDEX IF NOT EXISTS idx_tryout_sessions_session_date
  ON public.tryout_sessions(session_date);

DROP TRIGGER IF EXISTS update_tryout_sessions_updated_at ON public.tryout_sessions;
CREATE TRIGGER update_tryout_sessions_updated_at
  BEFORE UPDATE ON public.tryout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tryout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_sessions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tryout_sessions__org_member_read ON public.tryout_sessions;
CREATE POLICY tryout_sessions__org_member_read
  ON public.tryout_sessions
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.tryouts t
      WHERE t.id = tryout_sessions.tryout_id
        AND public.user_has_org_access(auth.uid(), t.org_id)
    )
  );

DROP POLICY IF EXISTS tryout_sessions__org_admin_manage ON public.tryout_sessions;
CREATE POLICY tryout_sessions__org_admin_manage
  ON public.tryout_sessions
  FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.tryouts t
      WHERE t.id = tryout_sessions.tryout_id
        AND public.user_is_org_admin(auth.uid(), t.org_id)
    )
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.tryouts t
      WHERE t.id = tryout_sessions.tryout_id
        AND public.user_is_org_admin(auth.uid(), t.org_id)
    )
  );

-- 2) Evaluator assignments
CREATE TABLE IF NOT EXISTS public.tryout_evaluators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tryout_id UUID NOT NULL REFERENCES public.tryouts(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tryout_id, coach_id)
);

CREATE INDEX IF NOT EXISTS idx_tryout_evaluators_tryout_id
  ON public.tryout_evaluators(tryout_id);
CREATE INDEX IF NOT EXISTS idx_tryout_evaluators_coach_id
  ON public.tryout_evaluators(coach_id);

ALTER TABLE public.tryout_evaluators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_evaluators FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tryout_evaluators__org_member_read ON public.tryout_evaluators;
CREATE POLICY tryout_evaluators__org_member_read
  ON public.tryout_evaluators
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR coach_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.tryouts t
      WHERE t.id = tryout_evaluators.tryout_id
        AND public.user_has_org_access(auth.uid(), t.org_id)
    )
  );

DROP POLICY IF EXISTS tryout_evaluators__org_admin_manage ON public.tryout_evaluators;
CREATE POLICY tryout_evaluators__org_admin_manage
  ON public.tryout_evaluators
  FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.tryouts t
      WHERE t.id = tryout_evaluators.tryout_id
        AND public.user_is_org_admin(auth.uid(), t.org_id)
    )
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.tryouts t
      WHERE t.id = tryout_evaluators.tryout_id
        AND public.user_is_org_admin(auth.uid(), t.org_id)
    )
  );

-- 3) Tryout metadata extensions
ALTER TABLE public.tryouts
  ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES public.sports(id),
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.seasons(id),
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'closed', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS registration_open_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_close_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS eligibility_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS target_team_ids UUID[],
  ADD COLUMN IF NOT EXISTS capacity INTEGER;

CREATE INDEX IF NOT EXISTS idx_tryouts_status ON public.tryouts(status);
CREATE INDEX IF NOT EXISTS idx_tryouts_sport_id ON public.tryouts(sport_id);
CREATE INDEX IF NOT EXISTS idx_tryouts_season_id ON public.tryouts(season_id);
CREATE INDEX IF NOT EXISTS idx_tryouts_program_id ON public.tryouts(program_id);
CREATE INDEX IF NOT EXISTS idx_tryouts_registration_window
  ON public.tryouts(registration_open_at, registration_close_at);

-- 4) Optional scoring linkage to session
ALTER TABLE public.tryout_scores
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.tryout_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tryout_scores_session_id
  ON public.tryout_scores(session_id);
