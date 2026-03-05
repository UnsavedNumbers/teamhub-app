-- Migration: demo_org_pocs_anon_policies
-- Description: Allow anonymous users to INSERT and UPDATE demo_org_pocs for pending public demo orgs so the public demo request form can create the primary POC (and clear other primary flags) without touching platform_admins.
-- Author: system
-- Date: 2026-02-20

-- Anon INSERT: allow adding a POC when the demo org is pending and created via the public form.
DROP POLICY IF EXISTS demo_org_pocs_anon_insert ON public.demo_org_pocs;
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

-- Anon UPDATE: allow updating POCs (e.g. clearing is_primary) for the same pending public orgs so addPOC's pre-insert update succeeds.
DROP POLICY IF EXISTS demo_org_pocs_anon_update ON public.demo_org_pocs;
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

COMMENT ON POLICY demo_org_pocs_anon_insert ON public.demo_org_pocs IS
  'Allows anonymous users to add a POC when submitting a demo request; only for pending orgs created via the public form.';
COMMENT ON POLICY demo_org_pocs_anon_update ON public.demo_org_pocs IS
  'Allows anonymous users to update POCs for pending public demo orgs so the primary-POC reset before insert succeeds.';
