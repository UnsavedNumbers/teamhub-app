-- ============================================================================
-- Fix athlete_guardians RLS policy for org_admins
-- ============================================================================
-- Problem: The current policy requires athletes to be on a team for org_admins
-- to see their guardian relationships. This is too restrictive - org_admins
-- should see all guardian relationships within their organization.
--
-- Fix: Check athlete_guardians.org_id directly instead of requiring team membership.
-- ============================================================================

-- Drop and recreate the SELECT policy with correct logic
DROP POLICY IF EXISTS "athlete_guardians_select_policy" ON athlete_guardians;

CREATE POLICY "athlete_guardians_select_policy" ON athlete_guardians
  FOR SELECT
  USING (
    -- Users can view their own guardian relationships
    (SELECT auth.uid()) = user_id
    -- Platform admins can view all guardian relationships
    OR is_platform_admin((SELECT auth.uid()))
    -- Org admins can view guardian relationships for their organization
    -- Uses org_id directly - no team membership required
    OR user_has_any_org_roles((SELECT auth.uid()), org_id, ARRAY['org_admin']::org_member_role[])
  );

COMMENT ON POLICY "athlete_guardians_select_policy" ON athlete_guardians IS 
  'SELECT: Users see own guardians, platform admins see all, org admins see their org guardians (no team membership required)';
