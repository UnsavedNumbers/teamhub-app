-- ============================================
-- SUB-ORGANIZATIONS RLS POLICIES
-- ============================================
-- This migration adds Row Level Security policies for sub-organizations.
--
-- Policies:
-- 1. organizations: parent org admins can SELECT their sub-orgs
-- 2. sub_org_settings: sub-org admins can SELECT/UPDATE own, parent admins can SELECT/UPDATE their sub-orgs
-- 3. sub_org_requests: parent admins can SELECT/UPDATE, anonymous can INSERT (with validation)
-- ============================================

-- ============================================
-- PART 1: organizations TABLE - PARENT CAN SEE SUB-ORGS
-- ============================================

-- Policy: Parent org admins can SELECT their sub-orgs
DROP POLICY IF EXISTS organizations_parent_admin_select_sub_orgs ON public.organizations;
CREATE POLICY organizations_parent_admin_select_sub_orgs
ON public.organizations
FOR SELECT
TO authenticated
USING (
  -- User is org admin of the parent org
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = parent_org_id
      AND om.user_id = auth.uid()
      AND om.role = 'org_admin'
  )
  -- And this org is a sub-org of that parent
  AND parent_org_id IS NOT NULL
);

COMMENT ON POLICY organizations_parent_admin_select_sub_orgs ON public.organizations IS 
  'Allows parent org admins to view metadata of their sub-organizations. Does not grant access to sub-org private data (teams, events, etc.).';

-- ============================================
-- PART 2: sub_org_settings TABLE
-- ============================================

-- Policy: Sub-org admins can SELECT and UPDATE their own settings
DROP POLICY IF EXISTS sub_org_settings_sub_org_admin_own ON public.sub_org_settings;
CREATE POLICY sub_org_settings_sub_org_admin_own
ON public.sub_org_settings
FOR ALL
TO authenticated
USING (
  -- User is org admin of this sub-org
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = sub_org_id
      AND om.user_id = auth.uid()
      AND om.role = 'org_admin'
  )
)
WITH CHECK (
  -- Same check for INSERT/UPDATE
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = sub_org_id
      AND om.user_id = auth.uid()
      AND om.role = 'org_admin'
  )
);

-- Policy: Parent org admins can SELECT and UPDATE their sub-orgs' settings
DROP POLICY IF EXISTS sub_org_settings_parent_admin_manage ON public.sub_org_settings;
CREATE POLICY sub_org_settings_parent_admin_manage
ON public.sub_org_settings
FOR ALL
TO authenticated
USING (
  -- User is org admin of the parent org
  EXISTS (
    SELECT 1 FROM public.organization_members om
    INNER JOIN public.organizations o ON o.id = sub_org_settings.sub_org_id
    WHERE om.org_id = o.parent_org_id
      AND om.user_id = auth.uid()
      AND om.role = 'org_admin'
  )
)
WITH CHECK (
  -- Same check for INSERT/UPDATE
  EXISTS (
    SELECT 1 FROM public.organization_members om
    INNER JOIN public.organizations o ON o.id = sub_org_settings.sub_org_id
    WHERE om.org_id = o.parent_org_id
      AND om.user_id = auth.uid()
      AND om.role = 'org_admin'
  )
);

-- Policy: Platform admins have full access
DROP POLICY IF EXISTS sub_org_settings_platform_admin_all ON public.sub_org_settings;
CREATE POLICY sub_org_settings_platform_admin_all
ON public.sub_org_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid()
  )
);

COMMENT ON POLICY sub_org_settings_sub_org_admin_own ON public.sub_org_settings IS 
  'Sub-org admins can view and update their own sub-org settings.';

COMMENT ON POLICY sub_org_settings_parent_admin_manage ON public.sub_org_settings IS 
  'Parent org admins can view and manage settings for all their sub-organizations.';

-- ============================================
-- PART 3: sub_org_requests TABLE
-- ============================================

-- Policy: Parent org admins can SELECT and UPDATE requests for their org
DROP POLICY IF EXISTS sub_org_requests_parent_admin_manage ON public.sub_org_requests;
CREATE POLICY sub_org_requests_parent_admin_manage
ON public.sub_org_requests
FOR ALL
TO authenticated
USING (
  -- User is org admin of the parent org
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = parent_org_id
      AND om.user_id = auth.uid()
      AND om.role = 'org_admin'
  )
)
WITH CHECK (
  -- Same check for INSERT/UPDATE
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = parent_org_id
      AND om.user_id = auth.uid()
      AND om.role = 'org_admin'
  )
);

-- Policy: Anonymous users can INSERT requests (for public registration)
-- Note: App layer should validate that parent allows public registration
DROP POLICY IF EXISTS sub_org_requests_anonymous_insert ON public.sub_org_requests;
CREATE POLICY sub_org_requests_anonymous_insert
ON public.sub_org_requests
FOR INSERT
TO anon
WITH CHECK (
  -- Parent org exists and allows public registration
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = parent_org_id
      AND o.sub_org_public_registration_enabled = true
      AND o.parent_org_id IS NULL  -- Must be a parent org
  )
);

-- Policy: Platform admins have full access
DROP POLICY IF EXISTS sub_org_requests_platform_admin_all ON public.sub_org_requests;
CREATE POLICY sub_org_requests_platform_admin_all
ON public.sub_org_requests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid()
  )
);

COMMENT ON POLICY sub_org_requests_parent_admin_manage ON public.sub_org_requests IS 
  'Parent org admins can view and manage sub-org registration requests for their organization.';

COMMENT ON POLICY sub_org_requests_anonymous_insert ON public.sub_org_requests IS 
  'Anonymous users can submit sub-org registration requests if parent org allows public registration.';
