-- Compatibility migration for PROD drift.
-- Adds athletes.org_id and backfills org associations required by gallery migrations.

ALTER TABLE public.athletes
ADD COLUMN IF NOT EXISTS org_id uuid;

COMMENT ON COLUMN public.athletes.org_id IS
'Organization ID for athlete. Added as compatibility for older prod schema prior to gallery migrations.';

-- Primary backfill path: infer org from athlete family.
UPDATE public.athletes a
SET org_id = f.org_id
FROM public.families f
WHERE a.org_id IS NULL
  AND a.family_id = f.id;

-- Secondary backfill path: infer org from latest team membership.
WITH ranked_team_org AS (
  SELECT
    tm.athlete_id,
    t.org_id,
    row_number() OVER (
      PARTITION BY tm.athlete_id
      ORDER BY tm.updated_at DESC NULLS LAST, tm.created_at DESC NULLS LAST
    ) AS rn
  FROM public.team_memberships tm
  JOIN public.teams t ON t.id = tm.team_id
)
UPDATE public.athletes a
SET org_id = r.org_id
FROM ranked_team_org r
WHERE a.org_id IS NULL
  AND a.id = r.athlete_id
  AND r.rn = 1;

CREATE INDEX IF NOT EXISTS idx_athletes_org_id ON public.athletes(org_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'athletes_org_id_fkey'
      AND conrelid = 'public.athletes'::regclass
  ) THEN
    ALTER TABLE public.athletes
      ADD CONSTRAINT athletes_org_id_fkey
      FOREIGN KEY (org_id)
      REFERENCES public.organizations(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;