-- ============================================
-- Parent Onboarding RLS Policies
-- ============================================
-- RLS policies for the new child_guardians model and parent onboarding tables
-- Parents can only see their own children + teams their children are on

-- ============================================
-- Helper functions for parent access
-- ============================================

-- Check if user is a guardian of a child
CREATE OR REPLACE FUNCTION user_is_guardian_of_child(check_user_id UUID, check_child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM child_guardians
    WHERE user_id = check_user_id
      AND child_id = check_child_id
      AND status = 'active'
  );
$$;

-- Get all children for a user (as guardian)
CREATE OR REPLACE FUNCTION get_user_children(check_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT child_id
  FROM child_guardians
  WHERE user_id = check_user_id
    AND status = 'active';
$$;

-- ============================================
-- child_guardians RLS Policies
-- ============================================

-- Users can view their own guardian relationships
CREATE POLICY "Users can view own guardian relationships" ON child_guardians
  FOR SELECT
  USING (auth.uid() = user_id);

-- Platform admins can view all guardian relationships
CREATE POLICY "Platform admins can view all guardians" ON child_guardians
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Org admins can view guardians for children in their org (via team membership)
CREATE POLICY "Org admins can view org guardians" ON child_guardians
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.child_id = child_guardians.child_id
      AND user_has_any_org_roles(
        auth.uid(),
        t.org_id,
        ARRAY['org_admin']::org_member_role[]
      )
    )
  );

-- Org admins can manage guardian relationships (via RPC functions only for safety)
-- Direct INSERT/UPDATE/DELETE should be blocked to enforce using add_guardian_to_child RPC

-- ============================================
-- Update CHILDREN RLS Policies (new guardian-based)
-- ============================================

-- Drop old family-based policies
DROP POLICY IF EXISTS "Parents can manage their children" ON children;
DROP POLICY IF EXISTS "Admins can view children" ON children;
DROP POLICY IF EXISTS "Admins can manage children" ON children;
DROP POLICY IF EXISTS "Coaches can view team children" ON children;

-- Parents can view and manage children they are guardians of
CREATE POLICY "Guardians can manage their children" ON children
  FOR ALL
  USING (user_is_guardian_of_child(auth.uid(), children.id))
  WITH CHECK (user_is_guardian_of_child(auth.uid(), children.id));

-- Org admins can view children on teams in their org
CREATE POLICY "Org admins can view org children" ON children
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.child_id = children.id
      AND user_has_any_org_roles(
        auth.uid(),
        t.org_id,
        ARRAY['org_admin']::org_member_role[]
      )
    )
  );

-- Org admins can manage children in their org (for team assignments)
CREATE POLICY "Org admins can manage org children" ON children
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.child_id = children.id
      AND user_has_any_org_roles(
        auth.uid(),
        t.org_id,
        ARRAY['org_admin']::org_member_role[]
      )
    )
  );

-- Coaches can view children on their org's teams
CREATE POLICY "Coaches can view org team children" ON children
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.child_id = children.id
      AND user_has_any_org_roles(
        auth.uid(),
        t.org_id,
        ARRAY['coach', 'org_admin']::org_member_role[]
      )
    )
  );

-- ============================================
-- Update TEAM_MEMBERSHIPS RLS Policies (guardian-based)
-- ============================================

-- Drop old family-based policies
DROP POLICY IF EXISTS "Parents can view their memberships" ON team_memberships;

-- Guardians can view their children's team memberships
CREATE POLICY "Guardians can view their children memberships" ON team_memberships
  FOR SELECT
  USING (user_is_guardian_of_child(auth.uid(), team_memberships.child_id));

-- ============================================
-- Update TEAMS RLS Policies (guardian-based)
-- ============================================

-- Drop old family-based policy
DROP POLICY IF EXISTS "Parents can view their teams" ON teams;

-- Guardians can view teams their children are on
CREATE POLICY "Guardians can view their children teams" ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.team_id = teams.id
      AND user_is_guardian_of_child(auth.uid(), tm.child_id)
    )
  );

-- ============================================
-- Update EVENTS RLS Policies (guardian-based)
-- ============================================

-- Drop old family-based policy
DROP POLICY IF EXISTS "Parents can view their events" ON events;

-- Guardians can view events for teams their children are on
CREATE POLICY "Guardians can view their children events" ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.team_id = events.team_id
      AND tm.status = 'active'
      AND user_is_guardian_of_child(auth.uid(), tm.child_id)
    )
  );

-- ============================================
-- Update ATTENDANCE RLS Policies (guardian-based)
-- ============================================

-- Drop old family-based policy
DROP POLICY IF EXISTS "Parents can manage their children's attendance" ON attendance;

-- Guardians can manage their children's attendance
CREATE POLICY "Guardians can manage their children attendance" ON attendance
  FOR ALL
  USING (user_is_guardian_of_child(auth.uid(), attendance.child_id))
  WITH CHECK (user_is_guardian_of_child(auth.uid(), attendance.child_id));

-- ============================================
-- Update SEASONS RLS Policies (guardian-based)
-- ============================================

-- Drop old family-based policy
DROP POLICY IF EXISTS "Parents can view their seasons" ON seasons;

-- Guardians can view seasons for teams their children are on
CREATE POLICY "Guardians can view their children seasons" ON seasons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.season_id = seasons.id
      AND user_is_guardian_of_child(auth.uid(), tm.child_id)
    )
  );

-- ============================================
-- parent_invites RLS Policies
-- ============================================

-- Org admins can view invites for their org
CREATE POLICY "Org admins can view parent invites" ON parent_invites
  FOR SELECT
  USING (
    user_has_any_org_roles(
      auth.uid(),
      parent_invites.organization_id,
      ARRAY['org_admin']::org_member_role[]
    )
  );

-- Platform admins can view all invites
CREATE POLICY "Platform admins can view all parent invites" ON parent_invites
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Invited users can view their own pending invites by email
CREATE POLICY "Users can view their pending invites" ON parent_invites
  FOR SELECT
  USING (
    LOWER(email) = LOWER((SELECT email FROM users WHERE id = auth.uid()))
    AND status = 'pending'
    AND expires_at > NOW()
  );

-- Org admins can create invites (via RPC only)
-- Direct inserts should use the admin_attach_parents_to_child RPC

-- ============================================
-- join_links RLS Policies
-- ============================================

-- Anyone can view active join links (to display join page)
CREATE POLICY "Anyone can view active join links" ON join_links
  FOR SELECT
  USING (expires_at > NOW());

-- Org admins can manage join links for their org (via RPC)
CREATE POLICY "Org admins can view org join links" ON join_links
  FOR SELECT
  USING (
    user_has_any_org_roles(
      auth.uid(),
      join_links.organization_id,
      ARRAY['org_admin']::org_member_role[]
    )
  );

-- Platform admins can view all join links
CREATE POLICY "Platform admins can view all join links" ON join_links
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- ============================================
-- join_requests RLS Policies
-- ============================================

-- Users can view their own join requests
CREATE POLICY "Users can view own join requests" ON join_requests
  FOR SELECT
  USING (auth.uid() = requested_by_user_id);

-- Org admins can view join requests for their org
CREATE POLICY "Org admins can view org join requests" ON join_requests
  FOR SELECT
  USING (
    user_has_any_org_roles(
      auth.uid(),
      join_requests.organization_id,
      ARRAY['org_admin']::org_member_role[]
    )
  );

-- Platform admins can view all join requests
CREATE POLICY "Platform admins can view all join requests" ON join_requests
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Users can insert join requests (via submit_join_request RPC)
-- This bootstrap policy allows the RPC to work
CREATE POLICY "Authenticated users can submit join requests" ON join_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requested_by_user_id);

-- ============================================
-- child_claim_tokens RLS Policies
-- ============================================

-- Org admins can view claim tokens for their org
CREATE POLICY "Org admins can view claim tokens" ON child_claim_tokens
  FOR SELECT
  USING (
    user_has_any_org_roles(
      auth.uid(),
      child_claim_tokens.organization_id,
      ARRAY['org_admin']::org_member_role[]
    )
  );

-- Platform admins can view all claim tokens
CREATE POLICY "Platform admins can view all claim tokens" ON child_claim_tokens
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Anyone can view unused, non-expired tokens (for redemption page)
CREATE POLICY "Anyone can view active claim tokens" ON child_claim_tokens
  FOR SELECT
  USING (used_at IS NULL AND expires_at > NOW());

-- ============================================
-- Grant permissions on helper functions
-- ============================================

GRANT EXECUTE ON FUNCTION user_is_guardian_of_child(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_children(UUID) TO authenticated;

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION user_is_guardian_of_child(UUID, UUID) IS 'STABLE: Check if user is an active guardian of a child';
COMMENT ON FUNCTION get_user_children(UUID) IS 'STABLE: Get all children for which user is an active guardian';
COMMENT ON POLICY "Guardians can manage their children" ON children IS 'Parents can only access children they are guardians of (via child_guardians table)';
COMMENT ON POLICY "Guardians can view their children teams" ON teams IS 'Parents see teams only if their child is a member';
COMMENT ON POLICY "Authenticated users can submit join requests" ON join_requests IS 'Bootstrap policy: allows authenticated users to submit join requests via RPC';
