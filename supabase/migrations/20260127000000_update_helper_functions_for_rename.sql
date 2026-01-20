-- Migration: Update Helper Functions After Rename
-- ================================================
-- Updates helper functions to use renamed tables (children -> athletes, child_guardians -> athlete_guardians)
-- This migration must run after 20260122000000_rename_children_to_athletes.sql

-- Update is_parent_of_child function to use athletes table
CREATE OR REPLACE FUNCTION is_parent_of_child(check_user_id UUID, check_child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN athletes c ON c.family_id = u.family_id
    WHERE u.id = check_user_id
      AND c.id = check_child_id
  );
$$;

COMMENT ON FUNCTION is_parent_of_child IS 'Legacy function name kept for compatibility. Checks if user is parent of athlete via family_id.';

-- Update staff_can_access_team (no changes needed - doesn't reference renamed tables)
-- Included for completeness
CREATE OR REPLACE FUNCTION staff_can_access_team(check_user_id UUID, check_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM teams t
    WHERE t.id = check_team_id
      AND (
        -- Platform admins can access all orgs
        is_platform_admin(check_user_id)
        OR
        -- Org admins/coaches for the team's org can access
        user_has_org_role(check_user_id, t.org_id, 'org_admin')
        OR
        user_has_org_role(check_user_id, t.org_id, 'coach')
      )
  );
$$;

-- Update parent_can_access_team_via_membership to use athletes and athlete_id
CREATE OR REPLACE FUNCTION parent_can_access_team_via_membership(check_user_id UUID, check_team_id UUID, check_season_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN athletes c ON c.family_id = u.family_id
    JOIN team_memberships tm ON tm.athlete_id = c.id
    WHERE u.id = check_user_id
      AND tm.team_id = check_team_id
      AND tm.season_id = check_season_id
      AND tm.status = 'active'
  );
$$;

COMMENT ON FUNCTION parent_can_access_team_via_membership IS 'Legacy function name kept for compatibility. Checks if user can access team via athlete membership.';

-- Update user_is_guardian_of_child to use athlete_guardians table
CREATE OR REPLACE FUNCTION user_is_guardian_of_child(check_user_id UUID, check_child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM athlete_guardians ag
    WHERE ag.user_id = check_user_id
      AND ag.athlete_id = check_child_id
      AND ag.status = 'active'
  );
$$;

COMMENT ON FUNCTION user_is_guardian_of_child IS 'Legacy function name kept for compatibility. Checks if user is an active guardian of athlete.';
