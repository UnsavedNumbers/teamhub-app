-- Phase 13: Tryouts - Registrations and Scoring Normalization
-- ==========================================================
-- Adds missing registration statuses and normalizes scoring to be criterion-based.
-- Keeps legacy columns for compatibility (e.g. tryout_scores.category).

-- -----------------------------------------------------------------
-- ENUM: extend tryout_registration_status
-- -----------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'tryout_registration_status' AND e.enumlabel = 'withdrawn'
  ) THEN
    ALTER TYPE tryout_registration_status ADD VALUE 'withdrawn';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'tryout_registration_status' AND e.enumlabel = 'waitlisted'
  ) THEN
    ALTER TYPE tryout_registration_status ADD VALUE 'waitlisted';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'tryout_registration_status' AND e.enumlabel = 'not_selected'
  ) THEN
    ALTER TYPE tryout_registration_status ADD VALUE 'not_selected';
  END IF;
END $$;

-- -----------------------------------------------------------------
-- TABLE: tryout_registration_staff_notes (staff-only private notes)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tryout_registration_staff_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES tryout_registrations(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tryout_staff_notes_registration_id
  ON tryout_registration_staff_notes(registration_id);
CREATE INDEX IF NOT EXISTS idx_tryout_staff_notes_author_user_id
  ON tryout_registration_staff_notes(author_user_id);

DROP TRIGGER IF EXISTS update_tryout_registration_staff_notes_updated_at ON tryout_registration_staff_notes;
CREATE TRIGGER update_tryout_registration_staff_notes_updated_at
  BEFORE UPDATE ON tryout_registration_staff_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tryout_registration_staff_notes ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- TABLE: tryout_scores - add criterion-based linkage
-- -----------------------------------------------------------------
DO $$
BEGIN
  -- Add criteria_id column if tryout_criteria table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tryout_criteria') THEN
    ALTER TABLE tryout_scores
      ADD COLUMN IF NOT EXISTS criteria_id UUID REFERENCES tryout_criteria(id) ON DELETE SET NULL;
  ELSE
    ALTER TABLE tryout_scores
      ADD COLUMN IF NOT EXISTS criteria_id UUID;
  END IF;
END $$;

ALTER TABLE tryout_scores
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_tryout_scores_updated_at ON tryout_scores;
CREATE TRIGGER update_tryout_scores_updated_at
  BEFORE UPDATE ON tryout_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tryout_scores_criteria_id ON tryout_scores(criteria_id);

-- Ensure one score per coach per criterion per registration (for new criterion-based scores)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'tryout_scores'
      AND tc.constraint_type = 'UNIQUE'
      AND tc.constraint_name = 'tryout_scores_unique_per_coach_criterion'
  ) THEN
    ALTER TABLE tryout_scores
      ADD CONSTRAINT tryout_scores_unique_per_coach_criterion
      UNIQUE (registration_id, criteria_id, coach_id);
  END IF;
END $$;

