-- Purpose: Ensure athlete_sports has org_id column for org-scoped guardian edits.
set search_path = public;

DO $$
BEGIN
  -- Add org_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'athlete_sports'
      AND column_name = 'org_id'
  ) THEN
    ALTER TABLE athlete_sports
      ADD COLUMN org_id UUID;
  END IF;
END $$;

-- Backfill org_id from athlete -> family -> org
UPDATE athlete_sports AS asp
SET org_id = f.org_id
FROM athletes a
JOIN families f ON f.id = a.family_id
WHERE asp.athlete_id = a.id
  AND asp.org_id IS NULL;

-- Enforce not null and FK (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'athlete_sports'
      AND column_name = 'org_id'
  ) THEN
    ALTER TABLE athlete_sports
      ALTER COLUMN org_id SET NOT NULL;

    -- Add FK if not present
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.athlete_sports'::regclass
        AND contype = 'f'
        AND conname = 'athlete_sports_org_id_fkey'
    ) THEN
      ALTER TABLE athlete_sports
        ADD CONSTRAINT athlete_sports_org_id_fkey
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;

    -- Recreate unique constraint to include org_id (drop old if exists)
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.athlete_sports'::regclass
        AND contype = 'u'
        AND conname = 'athlete_sports_athlete_id_sport_id_sport_type_key'
    ) THEN
      ALTER TABLE athlete_sports
        DROP CONSTRAINT athlete_sports_athlete_id_sport_id_sport_type_key;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.athlete_sports'::regclass
        AND contype = 'u'
        AND conname = 'athlete_sports_athlete_id_sport_id_org_id_sport_type_key'
    ) THEN
      ALTER TABLE athlete_sports
        ADD CONSTRAINT athlete_sports_athlete_id_sport_id_org_id_sport_type_key
        UNIQUE (athlete_id, sport_id, org_id, sport_type);
    END IF;

    -- Helpful indexes
    CREATE INDEX IF NOT EXISTS idx_athlete_sports_org_id ON athlete_sports(org_id);
    CREATE INDEX IF NOT EXISTS idx_athlete_sports_athlete_org ON athlete_sports(athlete_id, org_id);
  END IF;
END $$;

COMMENT ON COLUMN athlete_sports.org_id IS 'Organization context for the athlete-sport relationship (needed for guardian RLS and queries).';

