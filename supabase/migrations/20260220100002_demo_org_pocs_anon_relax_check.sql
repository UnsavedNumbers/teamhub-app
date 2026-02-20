-- Relax anon INSERT/UPDATE: allow for any pending org (drop created_by IS NULL).
-- Matches demo_organizations which only checks status = 'pending'.

DROP POLICY IF EXISTS demo_org_pocs_anon_insert ON public.demo_org_pocs;
DROP POLICY IF EXISTS demo_org_pocs_anon_update ON public.demo_org_pocs;

CREATE POLICY demo_org_pocs_anon_insert
  ON public.demo_org_pocs
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demo_organizations o
      WHERE o.id = demo_org_pocs.demo_org_id AND o.status = 'pending'
    )
  );

CREATE POLICY demo_org_pocs_anon_update
  ON public.demo_org_pocs
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.demo_organizations o
      WHERE o.id = demo_org_pocs.demo_org_id AND o.status = 'pending'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demo_organizations o
      WHERE o.id = demo_org_pocs.demo_org_id AND o.status = 'pending'
    )
  );
