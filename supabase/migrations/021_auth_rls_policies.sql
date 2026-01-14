-- Phase 2: Auth RLS Policies
-- ============================
-- Updates all RLS policies to use the new multi-org structure with helper functions
-- All policies use STABLE helper functions for consistency and performance

-- ============================================
-- 1. RLS Policies for organization_members
-- ============================================

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships" ON organization_members
  FOR SELECT
  USING (auth.uid() = user_id);

-- Platform admins can view all memberships
CREATE POLICY "Platform admins can view all memberships" ON organization_members
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Org admins can view memberships in their org
CREATE POLICY "Org admins can view org memberships" ON organization_members
  FOR SELECT
  USING (user_is_org_admin(auth.uid(), organization_id));

-- Platform admins can manage all memberships
CREATE POLICY "Platform admins can manage all memberships" ON organization_members
  FOR ALL
  USING (is_platform_admin(auth.uid()));

-- Org admins can manage memberships in their org (except other admins)
CREATE POLICY "Org admins can manage org memberships" ON organization_members
  FOR INSERT
  WITH CHECK (
    user_is_org_admin(auth.uid(), organization_id)
    AND role != 'org_admin' -- Can't create other admins
  );

CREATE POLICY "Org admins can update org memberships" ON organization_members
  FOR UPDATE
  USING (
    user_is_org_admin(auth.uid(), organization_id)
    AND role != 'org_admin' -- Can't modify other admins
  );

CREATE POLICY "Org admins can delete org memberships" ON organization_members
  FOR DELETE
  USING (
    user_is_org_admin(auth.uid(), organization_id)
    AND role != 'org_admin' -- Can't remove other admins
    AND user_id != auth.uid() -- Can't remove self
  );

-- ============================================
-- 2. RLS Policies for platform_admins
-- ============================================

-- Only platform admins can view platform_admins
CREATE POLICY "Platform admins can view all" ON platform_admins
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Only platform admins can manage platform_admins
CREATE POLICY "Platform admins can manage all" ON platform_admins
  FOR ALL
  USING (is_platform_admin(auth.uid()));

-- ============================================
-- 3. RLS Policies for organization_invites
-- ============================================

-- Org admins can view invites for their org
CREATE POLICY "Org admins can view org invites" ON organization_invites
  FOR SELECT
  USING (user_is_org_admin(auth.uid(), organization_id));

-- Platform admins can view all invites
CREATE POLICY "Platform admins can view all invites" ON organization_invites
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Anyone can view invite by token (for acceptance page)
CREATE POLICY "Anyone can view invite by token" ON organization_invites
  FOR SELECT
  USING (accepted_at IS NULL AND expires_at > NOW());

-- Org admins can create invites for their org
CREATE POLICY "Org admins can create invites" ON organization_invites
  FOR INSERT
  WITH CHECK (user_is_org_admin(auth.uid(), organization_id));

-- Platform admins can create invites for any org
CREATE POLICY "Platform admins can create all invites" ON organization_invites
  FOR INSERT
  WITH CHECK (is_platform_admin(auth.uid()));

-- Org admins can delete invites for their org
CREATE POLICY "Org admins can delete org invites" ON organization_invites
  FOR DELETE
  USING (user_is_org_admin(auth.uid(), organization_id));

-- Platform admins can delete any invite
CREATE POLICY "Platform admins can delete all invites" ON organization_invites
  FOR DELETE
  USING (is_platform_admin(auth.uid()));

-- ============================================
-- 4. Update existing users table policies
-- ============================================

-- Drop existing policies that use old structure
DROP POLICY IF EXISTS "Admins can view org users" ON users;
DROP POLICY IF EXISTS "Admins can manage org users" ON users;
DROP POLICY IF EXISTS "Coaches can view org users" ON users;

-- Platform admins can view all users
CREATE POLICY "Platform admins can view all users" ON users
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Platform admins can manage all users
CREATE POLICY "Platform admins can manage all users" ON users
  FOR ALL
  USING (is_platform_admin(auth.uid()));

-- Org admins can view users in their orgs
CREATE POLICY "Org admins can view org users v2" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = users.id
      AND user_is_org_admin(auth.uid(), om.organization_id)
    )
  );

-- Coaches can view users in their orgs
CREATE POLICY "Coaches can view org users v2" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = users.id
      AND EXISTS (
        SELECT 1 FROM organization_members my_om
        WHERE my_om.user_id = auth.uid()
        AND my_om.organization_id = om.organization_id
        AND my_om.role IN ('coach', 'org_admin')
      )
    )
  );

-- ============================================
-- 5. Update organizations table policies
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their org" ON organizations;
DROP POLICY IF EXISTS "Admins can update their org" ON organizations;

-- Users can view orgs they're members of
CREATE POLICY "Members can view their orgs" ON organizations
  FOR SELECT
  USING (user_has_org_access(auth.uid(), id));

-- Platform admins can view all orgs
CREATE POLICY "Platform admins can view all orgs" ON organizations
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Platform admins can manage all orgs
CREATE POLICY "Platform admins can manage all orgs" ON organizations
  FOR ALL
  USING (is_platform_admin(auth.uid()));

-- Org admins can update their org
CREATE POLICY "Org admins can update their org" ON organizations
  FOR UPDATE
  USING (user_is_org_admin(auth.uid(), id));

-- ============================================
-- 6. Add comments
-- ============================================
COMMENT ON POLICY "Users can view own memberships" ON organization_members IS 'Users can always see their own org memberships';
COMMENT ON POLICY "Platform admins can view all memberships" ON organization_members IS 'Platform admins have global access';
COMMENT ON POLICY "Org admins can manage org memberships" ON organization_members IS 'Org admins can add members but not other admins';
