-- Re-enable RLS on demo_org_pocs and add anon INSERT/UPDATE so demo request form
-- can create POCs (same pattern as demo_organizations). Runs after 20260220100000.

ALTER TABLE public.demo_org_pocs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demo_org_pocs_anon_insert ON public.demo_org_pocs;
DROP POLICY IF EXISTS demo_org_pocs_anon_update ON public.demo_org_pocs;

CREATE POLICY demo_org_pocs_anon_insert
  ON public.demo_org_pocs
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demo_organizations o
      WHERE o.id = demo_org_pocs.demo_org_id
        AND o.status = 'pending'
        AND o.created_by IS NULL
    )
  );

CREATE POLICY demo_org_pocs_anon_update
  ON public.demo_org_pocs
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.demo_organizations o
      WHERE o.id = demo_org_pocs.demo_org_id
        AND o.status = 'pending'
        AND o.created_by IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demo_organizations o
      WHERE o.id = demo_org_pocs.demo_org_id
        AND o.status = 'pending'
        AND o.created_by IS NULL
    )
  );
