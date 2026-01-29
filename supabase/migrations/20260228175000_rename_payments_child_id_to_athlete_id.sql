-- Ensure payments uses athlete_id (run before 20260228180000 fix so the rename commits).
-- This migration handles renaming child_id to athlete_id if it hasn't happened yet.
-- It's idempotent: does nothing if athlete_id already exists OR if neither column exists
-- (which can happen if 018_payments_expanded.sql recreated the table with a new schema).

DO $$
DECLARE
  has_child_id BOOLEAN;
  has_athlete_id BOOLEAN;
  has_payments_table BOOLEAN;
BEGIN
  -- Check if payments table exists
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'payments'
  ) INTO has_payments_table;

  -- If table doesn't exist, nothing to do
  IF NOT has_payments_table THEN
    RAISE NOTICE 'payments table does not exist, skipping';
    RETURN;
  END IF;

  -- Check current state
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'child_id'
  ) INTO has_child_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'athlete_id'
  ) INTO has_athlete_id;

  -- If athlete_id exists, we're done (already renamed)
  IF has_athlete_id THEN
    RAISE NOTICE 'payments.athlete_id already exists, skipping rename';
    RETURN;
  END IF;

  -- If child_id exists, rename it
  IF has_child_id THEN
    RAISE NOTICE 'Renaming payments.child_id to athlete_id';
    ALTER TABLE payments RENAME COLUMN child_id TO athlete_id;
    
    -- Also rename the index if it exists
    IF EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'payments'
        AND indexname = 'idx_payments_child_id'
    ) THEN
      ALTER INDEX idx_payments_child_id RENAME TO idx_payments_athlete_id;
    END IF;
    RETURN;
  END IF;

  -- Neither column exists - this is OK if the table was recreated with a new schema
  -- (e.g., by 018_payments_expanded.sql which has a completely different structure)
  RAISE NOTICE 'payments table exists but has neither child_id nor athlete_id - likely recreated with new schema, skipping';
END $$;
