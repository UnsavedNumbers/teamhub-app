-- ============================================
-- DEMO MANAGEMENT REFACTOR: SCHEMA CHANGES
-- ============================================
-- This migration adds support for demo organizations to use real
-- organizations rows with shared demo accounts and session-bound org/role.
--
-- Changes:
-- 1. Add organization_id FK to demo_organizations
-- 2. Add allowed_roles to demo_organizations (default all roles)
-- 3. Add is_demo_org and demo_org_id to organizations
-- 4. Add organization_id to demo_sessions
-- 5. Create demo_account_roles table for shared demo users
-- 6. Update get_user_organizations to support demo users
-- 7. Add RLS branches for demo users on organizations and key tables
-- ============================================

-- ============================================
-- PART 1: ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Add organization_id to demo_organizations (nullable until approved)
ALTER TABLE public.demo_organizations
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add allowed_roles to demo_organizations (default all supported roles)
ALTER TABLE public.demo_organizations
  ADD COLUMN IF NOT EXISTS allowed_roles jsonb NOT NULL DEFAULT '["org_admin","coach","parent","athlete","staff","fan"]'::jsonb;

-- Add is_demo_org flag to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_demo_org boolean NOT NULL DEFAULT false;

-- Add demo_org_id FK to organizations (bidirectional link)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS demo_org_id uuid REFERENCES public.demo_organizations(id) ON DELETE SET NULL;

-- Add organization_id to demo_sessions (nullable initially for migration)
ALTER TABLE public.demo_sessions
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============================================
-- PART 2: CREATE DEMO ACCOUNT REGISTRY
-- ============================================

-- Table to track which auth users are shared demo accounts and their roles
CREATE TABLE IF NOT EXISTS public.demo_account_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('org_admin', 'coach', 'parent', 'athlete', 'staff', 'fan')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_account_roles_user_id ON public.demo_account_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_demo_account_roles_role ON public.demo_account_roles(role);

ALTER TABLE public.demo_account_roles ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage demo accounts
CREATE POLICY demo_account_roles_platform_admin_all
ON public.demo_account_roles
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

-- Demo users can read their own role
CREATE POLICY demo_account_roles_user_read_own
ON public.demo_account_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- PART 3: UPDATE get_user_organizations FOR DEMO USERS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_organizations(check_user_id uuid)
RETURNS TABLE(org_id uuid, org_name text, roles public.org_member_role[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  -- Get organizations where user is a member (staff/coach/parent/admin)
  SELECT
    om.org_id,
    o.name AS org_name,
    ARRAY_AGG(DISTINCT om.role ORDER BY om.role) AS roles
  FROM organization_members om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = check_user_id
    AND om.is_active = true  -- Only active memberships
  GROUP BY om.org_id, o.name

  UNION

  -- Get organizations that user follows as a fan
  SELECT
    fof.org_id,
    o.name AS org_name,
    ARRAY[]::public.org_member_role[] AS roles  -- Empty array for fan follows
  FROM fan_org_follows fof
  JOIN organizations o ON o.id = fof.org_id
  WHERE fof.user_id = check_user_id
    -- Only include if NOT already in organization_members
    AND NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = check_user_id
        AND om.org_id = fof.org_id
        AND om.is_active = true
    )

  UNION

  -- Get demo organization from active demo session (for shared demo accounts)
  SELECT
    ds.organization_id AS org_id,
    o.name AS org_name,
    CASE
      WHEN dar.role = 'org_admin' THEN ARRAY['org_admin']::public.org_member_role[]
      WHEN dar.role = 'coach' THEN ARRAY['coach']::public.org_member_role[]
      WHEN dar.role = 'parent' THEN ARRAY['parent']::public.org_member_role[]
      WHEN dar.role = 'staff' THEN ARRAY['staff']::public.org_member_role[]
      -- Note: 'athlete' and 'fan' are not valid org_member_role enum values
      -- Athletes don't have org_member_role entries (they're in athletes table)
      -- Fan is a platform capability, not an org role
      -- For demo purposes, return empty array (UI will handle these specially)
      WHEN dar.role IN ('athlete', 'fan') THEN ARRAY[]::public.org_member_role[]
      ELSE ARRAY[]::public.org_member_role[]
    END AS roles
  FROM demo_sessions ds
  JOIN demo_account_roles dar ON dar.user_id = ds.user_id
  JOIN organizations o ON o.id = ds.organization_id
  WHERE ds.user_id = check_user_id
    AND ds.expires_at > now()
    AND ds.organization_id IS NOT NULL
    -- Only include if NOT already in organization_members or fan_org_follows
    AND NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = check_user_id
        AND om.org_id = ds.organization_id
        AND om.is_active = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM fan_org_follows fof
      WHERE fof.user_id = check_user_id
        AND fof.org_id = ds.organization_id
    )

  ORDER BY org_name;
$$;

COMMENT ON FUNCTION public.get_user_organizations(uuid) IS 'Returns all organizations for a user: org memberships (with roles), fan follows (with empty roles array), and demo organizations from active demo sessions (for shared demo accounts).';

-- ============================================
-- PART 4: ADD RLS BRANCHES FOR DEMO USERS
-- ============================================

-- Helper function to check if user is a demo account
CREATE OR REPLACE FUNCTION public.is_demo_account(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.demo_account_roles
    WHERE user_id = check_user_id
  );
$$;

COMMENT ON FUNCTION public.is_demo_account(uuid) IS 'Returns true if the user is a shared demo account.';

-- Helper function to get demo user's current organization_id from active session
CREATE OR REPLACE FUNCTION public.get_demo_user_org_id(check_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT ds.organization_id
  FROM public.demo_sessions ds
  WHERE ds.user_id = check_user_id
    AND ds.expires_at > now()
    AND ds.organization_id IS NOT NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_demo_user_org_id(uuid) IS 'Returns the organization_id from the active demo session for a demo user, or NULL if no active session.';

-- Update organizations RLS to allow demo users to see their demo org
-- This policy is added alongside existing policies (they use OR)
DROP POLICY IF EXISTS "Demo users can view their demo organization" ON public.organizations;
CREATE POLICY "Demo users can view their demo organization"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is a demo account and this org matches their active demo session
    public.is_demo_account(auth.uid())
    AND id = public.get_demo_user_org_id(auth.uid())
  );

COMMENT ON POLICY "Demo users can view their demo organization" ON public.organizations 
  IS 'Allows shared demo accounts to view their assigned demo organization from active demo session.';

-- ============================================
-- PART 5: ADD INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_demo_organizations_organization_id ON public.demo_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_demo_org_id ON public.organizations(demo_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_is_demo_org ON public.organizations(is_demo_org);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_organization_id ON public.demo_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_user_expires ON public.demo_sessions(user_id, expires_at);

-- ============================================
-- PART 6: COMMENTS
-- ============================================

COMMENT ON COLUMN public.demo_organizations.organization_id IS 'Foreign key to the real organizations row created when this demo org is approved. NULL until approved.';
COMMENT ON COLUMN public.demo_organizations.allowed_roles IS 'Array of roles that are available for this demo org. Defaults to all supported roles. Platform admin can edit this on the demo org detail page.';
COMMENT ON COLUMN public.organizations.is_demo_org IS 'True if this organization row is for a demo organization. Demo orgs are excluded from billing and some real org listings.';
COMMENT ON COLUMN public.organizations.demo_org_id IS 'Foreign key back to demo_organizations for bidirectional linking.';
COMMENT ON COLUMN public.demo_sessions.organization_id IS 'Foreign key to the organizations row for this demo session. Used for RLS scoping.';

-- ============================================
-- PART 7: ADD RLS FOR KEY ORG-SCOPED TABLES
-- ============================================
-- Note: These policies use OR logic, so they work alongside existing policies.
-- Demo users can only access data for their active demo session's organization.

-- Teams table: Allow demo users to see teams for their demo org
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
    DROP POLICY IF EXISTS "Demo users can view teams in their demo org" ON public.teams;
    CREATE POLICY "Demo users can view teams in their demo org"
      ON public.teams
      FOR SELECT
      TO authenticated
      USING (
        public.is_demo_account(auth.uid())
        AND org_id = public.get_demo_user_org_id(auth.uid())
      );
    
    COMMENT ON POLICY "Demo users can view teams in their demo org" ON public.teams 
      IS 'Allows shared demo accounts to view teams for their assigned demo organization.';
  END IF;
END $$;

-- Seasons table: Allow demo users to see seasons for their demo org
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seasons') THEN
    DROP POLICY IF EXISTS "Demo users can view seasons in their demo org" ON public.seasons;
    CREATE POLICY "Demo users can view seasons in their demo org"
      ON public.seasons
      FOR SELECT
      TO authenticated
      USING (
        public.is_demo_account(auth.uid())
        AND org_id = public.get_demo_user_org_id(auth.uid())
      );
    
    COMMENT ON POLICY "Demo users can view seasons in their demo org" ON public.seasons 
      IS 'Allows shared demo accounts to view seasons for their assigned demo organization.';
  END IF;
END $$;

-- Events table: Allow demo users to see events for their demo org
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    DROP POLICY IF EXISTS "Demo users can view events in their demo org" ON public.events;
    CREATE POLICY "Demo users can view events in their demo org"
      ON public.events
      FOR SELECT
      TO authenticated
      USING (
        public.is_demo_account(auth.uid())
        AND org_id = public.get_demo_user_org_id(auth.uid())
      );
    
    COMMENT ON POLICY "Demo users can view events in their demo org" ON public.events 
      IS 'Allows shared demo accounts to view events for their assigned demo organization.';
  END IF;
END $$;

-- Athletes table: Allow demo users to see athletes for their demo org
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'athletes') THEN
    DROP POLICY IF EXISTS "Demo users can view athletes in their demo org" ON public.athletes;
    CREATE POLICY "Demo users can view athletes in their demo org"
      ON public.athletes
      FOR SELECT
      TO authenticated
      USING (
        public.is_demo_account(auth.uid())
        AND org_id = public.get_demo_user_org_id(auth.uid())
      );
    
    COMMENT ON POLICY "Demo users can view athletes in their demo org" ON public.athletes 
      IS 'Allows shared demo accounts to view athletes for their assigned demo organization.';
  END IF;
END $$;

-- Organization_sports table: Allow demo users to see sports for their demo org
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_sports') THEN
    DROP POLICY IF EXISTS "Demo users can view organization_sports in their demo org" ON public.organization_sports;
    CREATE POLICY "Demo users can view organization_sports in their demo org"
      ON public.organization_sports
      FOR SELECT
      TO authenticated
      USING (
        public.is_demo_account(auth.uid())
        AND org_id = public.get_demo_user_org_id(auth.uid())
      );
    
    COMMENT ON POLICY "Demo users can view organization_sports in their demo org" ON public.organization_sports 
      IS 'Allows shared demo accounts to view organization sports for their assigned demo organization.';
  END IF;
END $$;
