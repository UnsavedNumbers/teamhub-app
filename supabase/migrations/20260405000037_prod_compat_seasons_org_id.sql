-- Compatibility migration for PROD drift.
-- Ensures seasons.org_id exists for gallery and fan-query migrations.

ALTER TABLE public.seasons
ADD COLUMN IF NOT EXISTS org_id uuid;

-- Backfill from canonical team ownership.
UPDATE public.seasons s
SET org_id = t.org_id
FROM public.teams t
WHERE s.org_id IS NULL
  AND s.team_id = t.id;

-- Fail early if unresolved org_id values remain.
DO $$
DECLARE
  v_missing_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_missing_count
  FROM public.seasons
  WHERE org_id IS NULL;

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION 'Cannot continue: % seasons rows still missing org_id after backfill', v_missing_count;
  END IF;
END $$;

ALTER TABLE public.seasons
ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_seasons_org_id ON public.seasons(org_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'seasons_org_id_fkey'
      AND conrelid = 'public.seasons'::regclass
  ) THEN
    ALTER TABLE public.seasons
      ADD CONSTRAINT seasons_org_id_fkey
      FOREIGN KEY (org_id)
      REFERENCES public.organizations(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;