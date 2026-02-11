-- Compatibility migration for PROD drift.
-- Ensures gallery_type enum supports program galleries required by 20260405000040.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'gallery_type'
      AND e.enumlabel = 'program'
  ) THEN
    ALTER TYPE public.gallery_type ADD VALUE 'program';
  END IF;
END $$;