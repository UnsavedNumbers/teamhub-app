-- Travel Plans: itinerary + status/publish/cancel
-- ============================================
-- Extends Phase 08 `travel_plans` to support itinerary-style travel planning.

DO $$ BEGIN
  -- Status and lifecycle timestamps
  ALTER TABLE public.travel_plans
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

  -- Destination breakdown (optional, keeps existing `location` too)
  ALTER TABLE public.travel_plans
    ADD COLUMN IF NOT EXISTS destination_city TEXT,
    ADD COLUMN IF NOT EXISTS destination_state TEXT;

  -- Links and itinerary attachment
  ALTER TABLE public.travel_plans
    ADD COLUMN IF NOT EXISTS maps_url TEXT,
    ADD COLUMN IF NOT EXISTS itinerary_file_path TEXT;

  -- Meeting locations: array of {name,address,time,notes,maps_url}
  ALTER TABLE public.travel_plans
    ADD COLUMN IF NOT EXISTS meeting_locations JSONB;
EXCEPTION
  WHEN undefined_table THEN
    RAISE EXCEPTION 'travel_plans table does not exist; ensure 013_travel_plans.sql ran first';
END $$;

-- Backfill lifecycle timestamps for existing data
UPDATE public.travel_plans
SET published_at = COALESCE(published_at, created_at)
WHERE status = 'published' AND published_at IS NULL;

-- Constraints
DO $$ BEGIN
  ALTER TABLE public.travel_plans
    ADD CONSTRAINT travel_plans_status_check
      CHECK (status IN ('draft', 'published', 'cancelled'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.travel_plans
    ADD CONSTRAINT travel_plans_date_range_check
      CHECK (end_date >= start_date);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_travel_plans_status ON public.travel_plans(status);

-- Tighten parent visibility to published/cancelled only.
-- Existing policies are created in 017_deferred_rls_policies.sql; we drop+recreate the parent policy here.
DROP POLICY IF EXISTS "Parents can view travel plans" ON public.travel_plans;

CREATE POLICY "Parents can view travel plans" ON public.travel_plans
  FOR SELECT
  USING (
    status IN ('published', 'cancelled')
    AND EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.athletes c ON c.family_id = u.family_id
      JOIN public.team_memberships tm ON tm.athlete_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND tm.team_id = travel_plans.team_id
      AND tm.status = 'active'
    )
  );

