-- Anon SELECT on demo_org_pocs for pending orgs (same as demo_organizations_anon_read).

CREATE POLICY demo_org_pocs_anon_read
  ON public.demo_org_pocs
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.demo_organizations o
      WHERE o.id = demo_org_pocs.demo_org_id AND o.status = 'pending'
    )
  );
