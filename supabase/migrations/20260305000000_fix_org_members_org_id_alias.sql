-- Compatibility alias: add organization_id back as a generated column on organization_members.
-- Fixes legacy policies/functions that still reference organization_id after the org_id rename.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organization_members'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.organization_members
      ADD COLUMN organization_id UUID GENERATED ALWAYS AS (org_id) STORED;
  END IF;
END $$;

COMMENT ON COLUMN public.organization_members.organization_id IS
  'Deprecated compatibility alias for org_id. Do not use in new code.';
