-- Migration: demo_management_schema_recovery
-- Description: Recover demo management schema with all required columns (pending/rejected status, requested_at, reviewed_at, reviewed_by, last_login_at) and fix RLS policies to support public demo requests and authenticated admins without touching platform_admins table.
-- Author: system
-- Date: 2026-02-20

-- ============================================================================
-- ALTER demo_organizations: Add missing columns and update status constraint
-- ============================================================================

-- Update status check constraint to include 'pending' and 'rejected' states
ALTER TABLE public.demo_organizations
  DROP CONSTRAINT IF EXISTS demo_organizations_status_check;

ALTER TABLE public.demo_organizations
  ADD CONSTRAINT demo_organizations_status_check 
  CHECK (status IN ('pending', 'active', 'inactive', 'rejected'));

-- Add request tracking columns if not exists
ALTER TABLE public.demo_organizations
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- ============================================================================
-- RLS POLICIES: Fix to work with anonymous and authenticated users
-- ============================================================================

-- DEMO_ORGANIZATIONS policies
DROP POLICY IF EXISTS demo_organizations_platform_admin_all ON public.demo_organizations;
DROP POLICY IF EXISTS demo_organizations_public_insert ON public.demo_organizations;
DROP POLICY IF EXISTS demo_organizations_anon_insert ON public.demo_organizations;
DROP POLICY IF EXISTS demo_organizations_authenticated_insert ON public.demo_organizations;
DROP POLICY IF EXISTS demo_organizations_authenticated_all ON public.demo_organizations;
DROP POLICY IF EXISTS demo_organizations_anon_read ON public.demo_organizations;

-- Allow anonymous users to INSERT pending demo requests
CREATE POLICY demo_organizations_anon_insert
  ON public.demo_organizations
  FOR INSERT
  TO anon
  WITH CHECK (status = 'pending');

-- Allow authenticated users to INSERT pending demo requests
CREATE POLICY demo_organizations_authenticated_insert
  ON public.demo_organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (status = 'pending');

-- Allow authenticated users all operations (platform admin verified by app layer)
CREATE POLICY demo_organizations_authenticated_all
  ON public.demo_organizations
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Allow anonymous to read pending records if needed
CREATE POLICY demo_organizations_anon_read
  ON public.demo_organizations
  FOR SELECT
  TO anon
  USING (status = 'pending');

-- DEMO_ORG_POCS policies: Allow anon INSERT/UPDATE for pending public orgs
DROP POLICY IF EXISTS demo_org_pocs_platform_admin_all ON public.demo_org_pocs;
DROP POLICY IF EXISTS demo_org_pocs_authenticated_all ON public.demo_org_pocs;
DROP POLICY IF EXISTS demo_org_pocs_anon_insert ON public.demo_org_pocs;
DROP POLICY IF EXISTS demo_org_pocs_anon_update ON public.demo_org_pocs;

-- Anon INSERT into demo_org_pocs for pending public orgs
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

-- Anon UPDATE into demo_org_pocs for pending public orgs (for clearing is_primary before insert)
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

-- Authenticated users all operations on demo_org_pocs
CREATE POLICY demo_org_pocs_authenticated_all
  ON public.demo_org_pocs
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- DEMO_CODES policies
DROP POLICY IF EXISTS demo_codes_platform_admin_all ON public.demo_codes;
DROP POLICY IF EXISTS demo_codes_authenticated_all ON public.demo_codes;

CREATE POLICY demo_codes_authenticated_all
  ON public.demo_codes
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- DEMO_SESSIONS policies
DROP POLICY IF EXISTS demo_sessions_platform_admin_all ON public.demo_sessions;
DROP POLICY IF EXISTS demo_sessions_authenticated_all ON public.demo_sessions;
DROP POLICY IF EXISTS demo_sessions_user_read_own ON public.demo_sessions;

CREATE POLICY demo_sessions_authenticated_all
  ON public.demo_sessions
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY demo_sessions_user_read_own
  ON public.demo_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY demo_organizations_anon_insert ON public.demo_organizations IS
  'Allows anonymous users to submit demo requests; only allows status=pending.';
COMMENT ON POLICY demo_organizations_authenticated_insert ON public.demo_organizations IS
  'Allows authenticated users to submit demo requests; only allows status=pending.';
COMMENT ON POLICY demo_organizations_authenticated_all ON public.demo_organizations IS
  'Allows authenticated users (verified as platform admins by application layer) all operations.';
COMMENT ON POLICY demo_organizations_anon_read ON public.demo_organizations IS
  'Allows anonymous users to read pending demo requests.';

COMMENT ON POLICY demo_org_pocs_anon_insert ON public.demo_org_pocs IS
  'Allows anonymous users to add a POC when submitting a demo request; only for pending orgs.';
COMMENT ON POLICY demo_org_pocs_anon_update ON public.demo_org_pocs IS
  'Allows anonymous users to update POCs for pending public orgs so primary-POC reset before insert succeeds.';
COMMENT ON POLICY demo_org_pocs_authenticated_all ON public.demo_org_pocs IS
  'Allows authenticated users (verified as platform admins by application layer) all operations.';

COMMENT ON POLICY demo_codes_authenticated_all ON public.demo_codes IS
  'Allows authenticated users (verified as platform admins by application layer) all operations.';

COMMENT ON POLICY demo_sessions_authenticated_all ON public.demo_sessions IS
  'Allows authenticated users (verified as platform admins by application layer) all operations.';
COMMENT ON POLICY demo_sessions_user_read_own ON public.demo_sessions IS
  'Allows users to read their own demo sessions.';
