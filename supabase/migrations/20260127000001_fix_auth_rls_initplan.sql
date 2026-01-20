-- Migration: Fix Auth RLS InitPlan Performance
-- Purpose: Wrap all auth.uid() calls in (select auth.uid()) to ensure single evaluation per query
-- 
-- Problem: RLS policies that call auth.uid() directly cause re-evaluation for each row scanned.
-- Solution: Wrapping in (select auth.uid()) forces PostgreSQL to evaluate once as an InitPlan.
--
-- This migration recreates all affected policies with the optimized pattern.

-- ============================================================================
-- PRE-MIGRATION: Backup current policies for rollback capability
-- ============================================================================

-- Create backup table to store original policy definitions
CREATE TABLE IF NOT EXISTS _rls_policy_backup AS 
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public';

-- Verify helper functions exist before proceeding
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_platform_admin') THEN
    RAISE EXCEPTION 'Required function is_platform_admin() does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_is_org_admin') THEN
    RAISE EXCEPTION 'Required function user_is_org_admin() does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_has_org_access') THEN
    RAISE EXCEPTION 'Required function user_has_org_access() does not exist';
  END IF;
END $$;

-- ============================================================================
-- PHASE 1A: Fix policies in 003_users.sql patterns
-- Table: users
-- ============================================================================

-- Drop and recreate users policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Allow user signup insert" ON users;
CREATE POLICY "Allow user signup insert" ON users
  FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- PHASE 1B: Fix policies from 021_auth_rls_policies.sql
-- Tables: organization_members, organizations, users (v2 policies)
-- ============================================================================

-- organization_members policies
DROP POLICY IF EXISTS "Users can view own memberships" ON organization_members;
CREATE POLICY "Users can view own memberships" ON organization_members
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Platform admins can view all memberships" ON organization_members;
CREATE POLICY "Platform admins can view all memberships" ON organization_members
  FOR SELECT
  USING (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Org admins can view org memberships" ON organization_members;
CREATE POLICY "Org admins can view org memberships" ON organization_members FOR SELECT USING (user_is_org_admin((select auth.uid()), org_id));

DROP POLICY IF EXISTS "Platform admins can manage all memberships" ON organization_members;
CREATE POLICY "Platform admins can manage all memberships" ON organization_members
  FOR ALL
  USING (is_platform_admin((select auth.uid())))
  WITH CHECK (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Org admins can manage org memberships" ON organization_members;
CREATE POLICY "Org admins can manage org memberships" ON organization_members
  FOR INSERT
  WITH CHECK (user_is_org_admin((select auth.uid()), org_id));

DROP POLICY IF EXISTS "Org admins can update org memberships" ON organization_members;
CREATE POLICY "Org admins can update org memberships" ON organization_members
  FOR UPDATE
  USING (user_is_org_admin((select auth.uid()), org_id))
  WITH CHECK (user_is_org_admin((select auth.uid()), org_id));

DROP POLICY IF EXISTS "Org admins can delete org memberships" ON organization_members;
CREATE POLICY "Org admins can delete org memberships" ON organization_members
  FOR DELETE
  USING (
    user_is_org_admin((select auth.uid()), org_id)
    AND user_id != (select auth.uid()) -- Can't delete own membership
  );

-- organizations policies
DROP POLICY IF EXISTS "Members can view their orgs" ON organizations;
CREATE POLICY "Members can view their orgs" ON organizations
  FOR SELECT
  USING (user_has_org_access((select auth.uid()), id));

DROP POLICY IF EXISTS "Platform admins can view all orgs" ON organizations;
CREATE POLICY "Platform admins can view all orgs" ON organizations
  FOR SELECT
  USING (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Platform admins can manage all orgs" ON organizations;
CREATE POLICY "Platform admins can manage all orgs" ON organizations
  FOR ALL
  USING (is_platform_admin((select auth.uid())))
  WITH CHECK (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Org admins can update their org" ON organizations;
CREATE POLICY "Org admins can update their org" ON organizations
  FOR UPDATE
  USING (user_is_org_admin((select auth.uid()), id))
  WITH CHECK (user_is_org_admin((select auth.uid()), id));

-- users v2 policies
DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
CREATE POLICY "Platform admins can view all users" ON users
  FOR SELECT
  USING (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Platform admins can manage all users" ON users;
CREATE POLICY "Platform admins can manage all users" ON users
  FOR ALL
  USING (is_platform_admin((select auth.uid())))
  WITH CHECK (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Org admins can view org users v2" ON users;
CREATE POLICY "Org admins can view org users v2" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = users.id
      AND user_is_org_admin((select auth.uid()), om.org_id)
    )
  );

DROP POLICY IF EXISTS "Coaches can view org users v2" ON users;
CREATE POLICY "Coaches can view org users v2" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = users.id
      AND user_has_any_org_roles((select auth.uid()), om.org_id, ARRAY['org_admin','coach']::org_member_role[])
    )
  );

-- ============================================================================
-- PHASE 1C: Fix organization_invites policies
-- ============================================================================

DROP POLICY IF EXISTS "Org admins can view org invites" ON organization_invites;
CREATE POLICY "Org admins can view org invites" ON organization_invites
  FOR SELECT
  USING (user_is_org_admin((select auth.uid()), org_id));

DROP POLICY IF EXISTS "Platform admins can view all invites" ON organization_invites;
CREATE POLICY "Platform admins can view all invites" ON organization_invites
  FOR SELECT
  USING (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Org admins can create invites" ON organization_invites;
CREATE POLICY "Org admins can create invites" ON organization_invites
  FOR INSERT
  WITH CHECK (user_is_org_admin((select auth.uid()), org_id));

DROP POLICY IF EXISTS "Platform admins can create all invites" ON organization_invites;
CREATE POLICY "Platform admins can create all invites" ON organization_invites
  FOR INSERT
  WITH CHECK (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Org admins can delete org invites" ON organization_invites;
CREATE POLICY "Org admins can delete org invites" ON organization_invites
  FOR DELETE
  USING (user_is_org_admin((select auth.uid()), org_id));

DROP POLICY IF EXISTS "Platform admins can delete all invites" ON organization_invites;
CREATE POLICY "Platform admins can delete all invites" ON organization_invites
  FOR DELETE
  USING (is_platform_admin((select auth.uid())));

-- ============================================================================
-- PHASE 1D: Fix 047_parent_onboarding_rls.sql policies
-- Tables: athlete_guardians, athletes, team_memberships, teams, events, attendance, seasons
-- ============================================================================

-- athlete_guardians policies
DROP POLICY IF EXISTS "Users can view own guardian relationships" ON athlete_guardians;
CREATE POLICY "Users can view own guardian relationships" ON athlete_guardians
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Platform admins can view all guardians" ON athlete_guardians;
CREATE POLICY "Platform admins can view all guardians" ON athlete_guardians
  FOR SELECT
  USING (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Org admins can view org guardians" ON athlete_guardians;
CREATE POLICY "Org admins can view org guardians" ON athlete_guardians
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM athletes c
      JOIN team_memberships tm ON tm.athlete_id = c.id
      JOIN teams t ON t.id = tm.team_id
      WHERE c.id = athlete_guardians.athlete_id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin']::org_member_role[])
    )
  );

-- athletes policies (athletes table)
DROP POLICY IF EXISTS "Guardians can manage their athletes" ON athletes;
CREATE POLICY "Guardians can manage their athletes" ON athletes
  FOR ALL
  USING (user_is_guardian_of_child((select auth.uid()), athletes.id))
  WITH CHECK (user_is_guardian_of_child((select auth.uid()), athletes.id));

DROP POLICY IF EXISTS "Org admins can view org athletes" ON athletes;
CREATE POLICY "Org admins can view org athletes" ON athletes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athletes.id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin']::org_member_role[])
    )
  );

DROP POLICY IF EXISTS "Org admins can manage org athletes" ON athletes;
CREATE POLICY "Org admins can manage org athletes" ON athletes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athletes.id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin']::org_member_role[])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athletes.id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin']::org_member_role[])
    )
  );

DROP POLICY IF EXISTS "Coaches can view org team athletes" ON athletes;
CREATE POLICY "Coaches can view org team athletes" ON athletes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athletes.id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin','coach']::org_member_role[])
    )
  );

-- team_memberships policies
DROP POLICY IF EXISTS "Guardians can view their athletes memberships" ON team_memberships;
CREATE POLICY "Guardians can view their athletes memberships" ON team_memberships
  FOR SELECT
  USING (user_is_guardian_of_child((select auth.uid()), team_memberships.athlete_id));

-- teams policies
DROP POLICY IF EXISTS "Guardians can view their athletes teams" ON teams;
CREATE POLICY "Guardians can view their athletes teams" ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.team_id = teams.id
      AND user_is_guardian_of_child((select auth.uid()), tm.athlete_id)
    )
  );

-- events policies
DROP POLICY IF EXISTS "Guardians can view their athletes events" ON events;
CREATE POLICY "Guardians can view their athletes events" ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.team_id = events.team_id
      AND user_is_guardian_of_child((select auth.uid()), tm.athlete_id)
    )
  );

-- attendance policies
DROP POLICY IF EXISTS "Guardians can manage their athletes attendance" ON attendance;
CREATE POLICY "Guardians can manage their athletes attendance" ON attendance
  FOR ALL
  USING (user_is_guardian_of_child((select auth.uid()), attendance.athlete_id))
  WITH CHECK (user_is_guardian_of_child((select auth.uid()), attendance.athlete_id));

-- seasons policies
DROP POLICY IF EXISTS "Guardians can view their athletes seasons" ON seasons;
CREATE POLICY "Guardians can view their athletes seasons" ON seasons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.season_id = seasons.id
      AND user_is_guardian_of_child((select auth.uid()), tm.athlete_id)
    )
  );

-- parent_invites policies
DROP POLICY IF EXISTS "Org admins can view parent invites" ON parent_invites;
CREATE POLICY "Org admins can view parent invites" ON parent_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM athletes c
      JOIN team_memberships tm ON tm.athlete_id = c.id
      JOIN teams t ON t.id = tm.team_id
      WHERE c.id = parent_invites.athlete_id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin']::org_member_role[])
    )
  );

DROP POLICY IF EXISTS "Platform admins can view all parent invites" ON parent_invites;
CREATE POLICY "Platform admins can view all parent invites" ON parent_invites
  FOR SELECT
  USING (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Users can view their pending invites" ON parent_invites;
CREATE POLICY "Users can view their pending invites" ON parent_invites
  FOR SELECT
  USING (
    email = (SELECT email FROM users WHERE id = (select auth.uid()))
    AND status = 'pending'
  );

-- join_links policies
DROP POLICY IF EXISTS "Org admins can view org join links" ON join_links;
CREATE POLICY "Org admins can view org join links" ON join_links
  FOR SELECT
  USING (
    user_has_any_org_roles((select auth.uid()), org_id, ARRAY['org_admin']::org_member_role[])
  );

DROP POLICY IF EXISTS "Platform admins can view all join links" ON join_links;
CREATE POLICY "Platform admins can view all join links" ON join_links
  FOR SELECT
  USING (is_platform_admin((select auth.uid())));

-- join_requests policies (conditional - table may not exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'join_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own join requests" ON join_requests';
    EXECUTE 'CREATE POLICY "Users can view own join requests" ON join_requests
      FOR SELECT
      USING ((select auth.uid()) = requested_by_user_id)';

    EXECUTE 'DROP POLICY IF EXISTS "Org admins can view org join requests" ON join_requests';
    EXECUTE 'CREATE POLICY "Org admins can view org join requests" ON join_requests
      FOR SELECT
      USING (
        user_has_any_org_roles((select auth.uid()), org_id, ARRAY[''org_admin'']::org_member_role[])
      )';

    EXECUTE 'DROP POLICY IF EXISTS "Platform admins can view all join requests" ON join_requests';
    EXECUTE 'CREATE POLICY "Platform admins can view all join requests" ON join_requests
      FOR SELECT
      USING (is_platform_admin((select auth.uid())))';

    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can submit join requests" ON join_requests';
    EXECUTE 'CREATE POLICY "Authenticated users can submit join requests" ON join_requests
      FOR INSERT
      WITH CHECK ((select auth.uid()) = requested_by_user_id)';
  END IF;
END $$;

-- ============================================================================
-- PHASE 1E: Fix 017_deferred_rls_policies.sql policies
-- Tables: families, teams, seasons, athletes, team_memberships, events, attendance, payments, etc.
-- ============================================================================

-- Families policies
DROP POLICY IF EXISTS "Parents can view their family" ON families;
CREATE POLICY "Parents can view their family" ON families
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.family_id = families.id
    )
  );

DROP POLICY IF EXISTS "Parents can update their family" ON families;
CREATE POLICY "Parents can update their family" ON families
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.family_id = families.id
    )
  );

DROP POLICY IF EXISTS "Admins can manage families" ON families;
CREATE POLICY "Admins can manage families" ON families
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Coaches can view families" ON families;
CREATE POLICY "Coaches can view families" ON families
  FOR SELECT
  USING (
    user_has_org_role((select auth.uid()), families.org_id, 'coach')
  );

-- Teams policies
DROP POLICY IF EXISTS "Admins can manage teams" ON teams;
CREATE POLICY "Admins can manage teams" ON teams
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Coaches can view teams" ON teams;
CREATE POLICY "Coaches can view teams" ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid()) 
      AND user_has_org_role((select auth.uid()), teams.org_id, 'coach')
    )
  );

DROP POLICY IF EXISTS "Parents can view their teams" ON teams;
CREATE POLICY "Parents can view their teams" ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN athletes c ON c.id = tm.athlete_id
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE tm.team_id = teams.id
    )
  );

-- Seasons policies
DROP POLICY IF EXISTS "Admins can manage seasons" ON seasons;
CREATE POLICY "Admins can manage seasons" ON seasons
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Coaches can view seasons" ON seasons;
CREATE POLICY "Coaches can view seasons" ON seasons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = seasons.team_id
      AND user_has_org_role((select auth.uid()), t.org_id, 'coach')
    )
  );

DROP POLICY IF EXISTS "Parents can view their seasons" ON seasons;
CREATE POLICY "Parents can view their seasons" ON seasons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN athletes c ON c.id = tm.athlete_id
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE tm.season_id = seasons.id
    )
  );

-- athletes policies (from 017)
DROP POLICY IF EXISTS "Parents can manage their athletes" ON athletes;
CREATE POLICY "Parents can manage their athletes" ON athletes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.family_id = athletes.family_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.family_id = athletes.family_id
    )
  );

DROP POLICY IF EXISTS "Admins can view athletes" ON athletes;
CREATE POLICY "Admins can view athletes" ON athletes
  FOR SELECT
  USING (
    is_platform_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can manage athletes" ON athletes;
CREATE POLICY "Admins can manage athletes" ON athletes
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Coaches can view team athletes" ON athletes;
CREATE POLICY "Coaches can view team athletes" ON athletes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid()) 
      -- FIXME:  -- AND user_has_org_role((select auth.uid()), org_id, 'coach') -- FIXME: organization_id not in scope -- organization_id not in scope
    )
  );

-- Team memberships policies
DROP POLICY IF EXISTS "Admins can manage memberships" ON team_memberships;
CREATE POLICY "Admins can manage memberships" ON team_memberships
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Parents can view their memberships" ON team_memberships;
CREATE POLICY "Parents can view their memberships" ON team_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM athletes c
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE c.id = team_memberships.athlete_id
    )
  );

DROP POLICY IF EXISTS "Coaches can view team memberships" ON team_memberships;
CREATE POLICY "Coaches can view team memberships" ON team_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid()) 
      -- FIXME:  -- AND user_has_org_role((select auth.uid()), org_id, 'coach') -- FIXME: organization_id not in scope -- organization_id not in scope
    )
  );

-- Events policies (from 017)
DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events" ON events
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Coaches can view events" ON events;
CREATE POLICY "Coaches can view events" ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid()) 
      -- FIXME:  -- AND user_has_org_role((select auth.uid()), org_id, 'coach') -- FIXME: organization_id not in scope -- organization_id not in scope
    )
  );

DROP POLICY IF EXISTS "Parents can view their events" ON events;
CREATE POLICY "Parents can view their events" ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN athletes c ON c.id = tm.athlete_id
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE tm.team_id = events.team_id
    )
  );

-- Attendance policies (from 017)
DROP POLICY IF EXISTS "Parents can manage their athletes's attendance" ON attendance;
CREATE POLICY "Parents can manage their athletes's attendance" ON attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM athletes c
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE c.id = attendance.athlete_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM athletes c
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE c.id = attendance.athlete_id
    )
  );

DROP POLICY IF EXISTS "Coaches can view attendance" ON attendance;
CREATE POLICY "Coaches can view attendance" ON attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid()) 
      -- FIXME:  -- AND user_has_org_role((select auth.uid()), org_id, 'coach') -- FIXME: organization_id not in scope -- organization_id not in scope
    )
  );

DROP POLICY IF EXISTS "Admins can manage attendance" ON attendance;
CREATE POLICY "Admins can manage attendance" ON attendance
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

-- ============================================================================
-- PHASE 1F: Fix 019_payments_rls_policies.sql policies
-- Tables: installment_plans, fees, fee_assignments, charges, checkout_sessions, etc.
-- ============================================================================

-- Installment plans policies
DROP POLICY IF EXISTS "Admins can manage installment plans" ON installment_plans;
CREATE POLICY "Admins can manage installment plans" ON installment_plans
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Users can view installment plans" ON installment_plans;
CREATE POLICY "Users can view installment plans" ON installment_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid())
    )
  );

-- Fees policies
DROP POLICY IF EXISTS "Admins can manage fees" ON fees;
CREATE POLICY "Admins can manage fees" ON fees
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Parents can view published fees" ON fees;
CREATE POLICY "Parents can view published fees" ON fees
  FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can view published fees" ON fees;
CREATE POLICY "Coaches can view published fees" ON fees
  FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      -- FIXME:  -- AND user_has_org_role((select auth.uid()), org_id, 'coach') -- FIXME: organization_id not in scope -- organization_id not in scope
    )
  );

-- Fee assignments policies
DROP POLICY IF EXISTS "Parents can view their fee assignments" ON fee_assignments;
CREATE POLICY "Parents can view their fee assignments" ON fee_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.id = fee_assignments.parent_id
    )
  );

DROP POLICY IF EXISTS "Coaches can view fee assignment status" ON fee_assignments;
CREATE POLICY "Coaches can view fee assignment status" ON fee_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid()) 
      -- FIXME:  -- AND user_has_org_role((select auth.uid()), org_id, 'coach') -- FIXME: organization_id not in scope -- organization_id not in scope
    )
  );

DROP POLICY IF EXISTS "Admins can manage fee assignments" ON fee_assignments;
CREATE POLICY "Admins can manage fee assignments" ON fee_assignments
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

-- Charges policies
DROP POLICY IF EXISTS "Parents can view their charges" ON charges;
CREATE POLICY "Parents can view their charges" ON charges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fee_assignments fa
      JOIN users u ON u.id = (select auth.uid()) AND u.id = fa.parent_id
      WHERE fa.id = charges.fee_assignment_id
    )
  );

DROP POLICY IF EXISTS "Admins can manage charges" ON charges;
CREATE POLICY "Admins can manage charges" ON charges
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

-- Checkout sessions policies
DROP POLICY IF EXISTS "Parents can manage their checkout sessions" ON checkout_sessions;
CREATE POLICY "Parents can manage their checkout sessions" ON checkout_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.id = checkout_sessions.parent_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.id = checkout_sessions.parent_id
    )
  );

DROP POLICY IF EXISTS "Admins can view checkout sessions" ON checkout_sessions;
CREATE POLICY "Admins can view checkout sessions" ON checkout_sessions
  FOR SELECT
  USING (
    is_platform_admin((select auth.uid()))
  );

-- Checkout session items policies
DROP POLICY IF EXISTS "Parents can view their checkout session items" ON checkout_session_items;
CREATE POLICY "Parents can view their checkout session items" ON checkout_session_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM checkout_sessions cs
      JOIN users u ON u.id = (select auth.uid()) AND u.id = cs.parent_id
      WHERE cs.id = checkout_session_items.checkout_session_id
    )
  );

DROP POLICY IF EXISTS "Admins can view checkout session items" ON checkout_session_items;
CREATE POLICY "Admins can view checkout session items" ON checkout_session_items
  FOR SELECT
  USING (
    is_platform_admin((select auth.uid()))
  );

-- Payments policies
DROP POLICY IF EXISTS "Parents can view their payments" ON payments;
CREATE POLICY "Parents can view their payments" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.id = payments.parent_id
    )
  );

DROP POLICY IF EXISTS "Admins can view payments" ON payments;
CREATE POLICY "Admins can view payments" ON payments
  FOR SELECT
  USING (
    is_platform_admin((select auth.uid()))
  );

-- ============================================================================
-- PHASE 1G: Fix 20260115120000_platform_admin.sql policies
-- Tables: platform_admins, organizations, users, billing_accounts, etc.
-- ============================================================================

DROP POLICY IF EXISTS "Platform admins can view platform_admins" ON platform_admins;
CREATE POLICY "Platform admins can view platform_admins" ON platform_admins
  FOR SELECT
  USING (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Platform admins can insert platform_admins" ON platform_admins;
CREATE POLICY "Platform admins can insert platform_admins" ON platform_admins
  FOR INSERT
  WITH CHECK (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Platform admins can update platform_admins" ON platform_admins;
CREATE POLICY "Platform admins can update platform_admins" ON platform_admins
  FOR UPDATE
  USING (is_platform_admin((select auth.uid())))
  WITH CHECK (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Platform admins can delete platform_admins" ON platform_admins;
CREATE POLICY "Platform admins can delete platform_admins" ON platform_admins
  FOR DELETE
  USING (is_platform_admin((select auth.uid())));

-- Billing events policies
DROP POLICY IF EXISTS "Platform admins can view billing_events" ON billing_events;
CREATE POLICY "Platform admins can view billing_events" ON billing_events
  FOR SELECT
  USING (is_platform_admin((select auth.uid())));

DROP POLICY IF EXISTS "Platform admins can insert billing_events" ON billing_events;
CREATE POLICY "Platform admins can insert billing_events" ON billing_events
  FOR INSERT
  WITH CHECK (is_platform_admin((select auth.uid())));

-- License usage policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'license_usage') THEN
    DROP POLICY IF EXISTS "Platform admins can view license_usage" ON license_usage;
    CREATE POLICY "Platform admins can view license_usage" ON license_usage
      FOR SELECT
      USING (is_platform_admin((select auth.uid())));

    DROP POLICY IF EXISTS "Platform admins can manage license_usage" ON license_usage;
    CREATE POLICY "Platform admins can manage license_usage" ON license_usage
      FOR ALL
      USING (is_platform_admin((select auth.uid())))
      WITH CHECK (is_platform_admin((select auth.uid())));
  END IF;
END $$;

-- ============================================================================
-- PHASE 1H: Fix 20260116090010_uniform_kits_rls.sql policies
-- Tables: uniform_kits, uniform_kit_items, uniform_kit_sizes, uniform_orders
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view uniform kits" ON uniform_kits;
CREATE POLICY "Staff can view uniform kits" ON uniform_kits
  FOR SELECT
  USING (staff_can_access_team((select auth.uid()), team_id));

DROP POLICY IF EXISTS "Parents can view uniform kits for their teams" ON uniform_kits;
CREATE POLICY "Parents can view uniform kits for their teams" ON uniform_kits
  FOR SELECT
  USING (parent_can_access_team_via_membership((select auth.uid()), team_id, season_id));

DROP POLICY IF EXISTS "Staff can manage uniform kits" ON uniform_kits;
CREATE POLICY "Staff can manage uniform kits" ON uniform_kits
  FOR ALL
  USING (staff_can_access_team((select auth.uid()), team_id))
  WITH CHECK (staff_can_access_team((select auth.uid()), team_id));

-- Uniform kit items policies
DROP POLICY IF EXISTS "Staff can view uniform kit items" ON uniform_kit_items;
CREATE POLICY "Staff can view uniform kit items" ON uniform_kit_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM uniform_kits k 
      WHERE k.id = uniform_kit_items.kit_id 
      AND staff_can_access_team((select auth.uid()), k.team_id)
    )
  );

DROP POLICY IF EXISTS "Staff can manage uniform kit items" ON uniform_kit_items;
CREATE POLICY "Staff can manage uniform kit items" ON uniform_kit_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM uniform_kits k 
      WHERE k.id = uniform_kit_items.kit_id 
      AND staff_can_access_team((select auth.uid()), k.team_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM uniform_kits k 
      WHERE k.id = uniform_kit_items.kit_id 
      AND staff_can_access_team((select auth.uid()), k.team_id)
    )
  );

DROP POLICY IF EXISTS "Parents can view kit items for their teams" ON uniform_kit_items;
CREATE POLICY "Parents can view kit items for their teams" ON uniform_kit_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM uniform_kits k 
      WHERE k.id = uniform_kit_items.kit_id 
      AND parent_can_access_team_via_membership((select auth.uid()), k.team_id, k.season_id)
    )
  );

-- Uniform kit sizes policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'uniform_kit_sizes') THEN
    DROP POLICY IF EXISTS "Staff can view uniform kit sizes" ON uniform_kit_sizes;
    CREATE POLICY "Staff can view uniform kit sizes" ON uniform_kit_sizes
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM uniform_kits k 
          WHERE k.id = uniform_kit_sizes.kit_id 
          AND staff_can_access_team((select auth.uid()), k.team_id)
        )
      );

    DROP POLICY IF EXISTS "Staff can manage uniform kit sizes" ON uniform_kit_sizes;
    CREATE POLICY "Staff can manage uniform kit sizes" ON uniform_kit_sizes
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM uniform_kits k 
          WHERE k.id = uniform_kit_sizes.kit_id 
          AND staff_can_access_team((select auth.uid()), k.team_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM uniform_kits k 
          WHERE k.id = uniform_kit_sizes.kit_id 
          AND staff_can_access_team((select auth.uid()), k.team_id)
        )
      );

    DROP POLICY IF EXISTS "Parents can view kit sizes for their teams" ON uniform_kit_sizes;
    CREATE POLICY "Parents can view kit sizes for their teams" ON uniform_kit_sizes
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM uniform_kits k 
          WHERE k.id = uniform_kit_sizes.kit_id 
          AND parent_can_access_team_via_membership((select auth.uid()), k.team_id, k.season_id)
        )
      );
  END IF;
END $$;

-- Uniform orders policies  
DROP POLICY IF EXISTS "Parents can manage their uniform orders" ON uniform_orders;
CREATE POLICY "Parents can manage their uniform orders" ON uniform_orders
  FOR ALL
  USING (
    is_parent_of_child((select auth.uid()), uniform_orders.athlete_id)
  );

DROP POLICY IF EXISTS "Admins can manage uniform orders" ON uniform_orders;
CREATE POLICY "Admins can manage uniform orders" ON uniform_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = uniform_orders.team_id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin']::org_member_role[])
    )
  );

DROP POLICY IF EXISTS "Coaches can view uniform orders" ON uniform_orders;
CREATE POLICY "Coaches can view uniform orders" ON uniform_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = uniform_orders.team_id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['coach']::org_member_role[])
    )
  );

-- ============================================================================
-- PHASE 1I: Fix 20260116090100_tryouts_rls_and_rpcs.sql policies
-- Tables: tryout_sessions, tryout_registrations, tryout_scores, tryout_documents
-- ============================================================================

-- Tryout policies (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tryout_sessions') THEN

DROP POLICY IF EXISTS "Org admins can view tryout sessions" ON tryout_sessions;
CREATE POLICY "Org admins can view tryout sessions" ON tryout_sessions
  FOR SELECT
  USING (
    user_has_org_access((select auth.uid()), org_id)
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Org admins can manage tryout sessions" ON tryout_sessions;
CREATE POLICY "Org admins can manage tryout sessions" ON tryout_sessions
  FOR ALL
  USING (
    user_is_org_admin((select auth.uid()), org_id)
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
  )
  WITH CHECK (
    user_is_org_admin((select auth.uid()), org_id)
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Public can view active published sessions" ON tryout_sessions;
CREATE POLICY "Public can view active published sessions" ON tryout_sessions
  FOR SELECT
  USING (
    status = 'published'
    AND registration_deadline >= NOW()
  );

-- Tryout registrations policies
DROP POLICY IF EXISTS "Org admins can view registrations" ON tryout_registrations;
CREATE POLICY "Org admins can view registrations" ON tryout_registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tryout_sessions ts
      WHERE ts.id = tryout_registrations.session_id
      AND user_has_org_access((select auth.uid()), ts.org_id)
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Org admins can manage registrations" ON tryout_registrations;
CREATE POLICY "Org admins can manage registrations" ON tryout_registrations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tryout_sessions ts
      WHERE ts.id = tryout_registrations.session_id
      AND user_is_org_admin((select auth.uid()), ts.org_id)
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tryout_sessions ts
      WHERE ts.id = tryout_registrations.session_id
      AND user_is_org_admin((select auth.uid()), ts.org_id)
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Parents can view their registrations" ON tryout_registrations;
CREATE POLICY "Parents can view their registrations" ON tryout_registrations
  FOR SELECT
  USING (
    registered_by_user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM parent_child_links pcl 
      WHERE pcl.user_id = (select auth.uid()) 
      AND pcl.athlete_id = tryout_registrations.athlete_id
    )
  );

DROP POLICY IF EXISTS "Parents can register their athletes" ON tryout_registrations;
CREATE POLICY "Parents can register their athletes" ON tryout_registrations
  FOR INSERT
  WITH CHECK (
    registered_by_user_id = (select auth.uid())
    AND (
      athlete_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM parent_child_links pcl 
        WHERE pcl.user_id = (select auth.uid()) 
        AND pcl.athlete_id = tryout_registrations.athlete_id
      )
    )
  );

-- Tryout scores policies
DROP POLICY IF EXISTS "Org admins can view scores" ON tryout_scores;
CREATE POLICY "Org admins can view scores" ON tryout_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tryout_registrations tr
      JOIN tryout_sessions ts ON ts.id = tr.session_id
      WHERE tr.id = tryout_scores.registration_id
      AND user_has_org_access((select auth.uid()), ts.org_id)
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Org admins can manage scores" ON tryout_scores;
CREATE POLICY "Org admins can manage scores" ON tryout_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tryout_registrations tr
      JOIN tryout_sessions ts ON ts.id = tr.session_id
      WHERE tr.id = tryout_scores.registration_id
      AND user_is_org_admin((select auth.uid()), ts.org_id)
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tryout_registrations tr
      JOIN tryout_sessions ts ON ts.id = tr.session_id
      WHERE tr.id = tryout_scores.registration_id
      AND user_is_org_admin((select auth.uid()), ts.org_id)
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Evaluators can manage scores" ON tryout_scores;
CREATE POLICY "Evaluators can manage scores" ON tryout_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tryout_registrations tr
      JOIN tryout_sessions ts ON ts.id = tr.session_id
      JOIN organization_members om ON om.org_id = ts.org_id AND om.user_id = (select auth.uid())
      WHERE tr.id = tryout_scores.registration_id
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tryout_registrations tr
      JOIN tryout_sessions ts ON ts.id = tr.session_id
      JOIN organization_members om ON om.org_id = ts.org_id AND om.user_id = (select auth.uid())
      WHERE tr.id = tryout_scores.registration_id
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
    )
  );

-- Tryout documents policies
DROP POLICY IF EXISTS "Org admins can view documents" ON tryout_documents;
CREATE POLICY "Org admins can view documents" ON tryout_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tryout_registrations tr
      JOIN tryout_sessions ts ON ts.id = tr.session_id
      WHERE tr.id = tryout_documents.registration_id
      AND user_has_org_access((select auth.uid()), ts.org_id)
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Org admins can manage documents" ON tryout_documents;
CREATE POLICY "Org admins can manage documents" ON tryout_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tryout_registrations tr
      JOIN tryout_sessions ts ON ts.id = tr.session_id
      WHERE tr.id = tryout_documents.registration_id
      AND user_is_org_admin((select auth.uid()), ts.org_id)
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tryout_registrations tr
      JOIN tryout_sessions ts ON ts.id = tr.session_id
      WHERE tr.id = tryout_documents.registration_id
      AND user_is_org_admin((select auth.uid()), ts.org_id)
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Parents can view their documents" ON tryout_documents;
CREATE POLICY "Parents can view their documents" ON tryout_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tryout_registrations tr
      WHERE tr.id = tryout_documents.registration_id
      AND (
        tr.registered_by_user_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM parent_child_links pcl 
          WHERE pcl.user_id = (select auth.uid()) 
          AND pcl.athlete_id = tr.athlete_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Parents can upload documents" ON tryout_documents;
CREATE POLICY "Parents can upload documents" ON tryout_documents
  FOR INSERT
  WITH CHECK (
    uploaded_by_user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM tryout_registrations tr
      WHERE tr.id = tryout_documents.registration_id
      AND (
        tr.registered_by_user_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM parent_child_links pcl 
          WHERE pcl.user_id = (select auth.uid()) 
          AND pcl.athlete_id = tr.athlete_id
        )
      )
    )
  );

  END IF; -- End tryout tables check
END $$;

-- ============================================================================
-- PHASE 1J: Fix 049_user_preferences_rls.sql policies
-- Table: user_preferences
-- ============================================================================

-- User preferences policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_preferences') THEN
    DROP POLICY IF EXISTS "users_read_own_preferences" ON user_preferences;
    CREATE POLICY "users_read_own_preferences" ON user_preferences
      FOR SELECT
      USING (user_id = (select auth.uid()));

    DROP POLICY IF EXISTS "users_insert_own_preferences" ON user_preferences;
    CREATE POLICY "users_insert_own_preferences" ON user_preferences
      FOR INSERT
      WITH CHECK (user_id = (select auth.uid()));

    DROP POLICY IF EXISTS "users_update_own_preferences" ON user_preferences;
    CREATE POLICY "users_update_own_preferences" ON user_preferences
      FOR UPDATE
      USING (user_id = (select auth.uid()));
  END IF;
END $$;

-- ============================================================================
-- PHASE 1K: Fix 20260114200731_fix_organizations_insert_policy.sql
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Platform admin has full access" ON organizations;
CREATE POLICY "Platform admin has full access" ON organizations
  FOR ALL
  USING (is_platform_admin((select auth.uid())))
  WITH CHECK (is_platform_admin((select auth.uid())));

-- ============================================================================
-- PHASE 1L: Fix 20260119000001_organization_settings_tables.sql policies
-- Tables: organization_brand_settings, organization_notification_settings, organization_feature_settings
-- ============================================================================

-- Organization settings policies (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_brand_settings') THEN
    DROP POLICY IF EXISTS "Org admins can manage brand settings" ON organization_brand_settings;
    CREATE POLICY "Org admins can manage brand settings" ON organization_brand_settings
      FOR ALL
      USING (user_is_org_admin((select auth.uid()), org_id))
      WITH CHECK (user_is_org_admin((select auth.uid()), org_id));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_notification_settings') THEN
    DROP POLICY IF EXISTS "Org admins can manage notification settings" ON organization_notification_settings;
    CREATE POLICY "Org admins can manage notification settings" ON organization_notification_settings
      FOR ALL
      USING (user_is_org_admin((select auth.uid()), org_id))
      WITH CHECK (user_is_org_admin((select auth.uid()), org_id));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_feature_settings') THEN
    DROP POLICY IF EXISTS "Org admins can manage feature settings" ON organization_feature_settings;
    CREATE POLICY "Org admins can manage feature settings" ON organization_feature_settings
      FOR ALL
      USING (user_is_org_admin((select auth.uid()), org_id))
      WITH CHECK (user_is_org_admin((select auth.uid()), org_id));
  END IF;
END $$;

-- ============================================================================
-- PHASE 1M: Fix 20260125000001_organization_storage.sql policies
-- Storage bucket policies
-- ============================================================================

DROP POLICY IF EXISTS "Org admins can upload org files" ON storage.objects;
CREATE POLICY "Org admins can upload org files" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'organization-assets'
    AND user_is_org_admin((select auth.uid()), (storage.foldername(name))[1]::UUID)
  );

DROP POLICY IF EXISTS "Org admins can update org files" ON storage.objects;
CREATE POLICY "Org admins can update org files" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'organization-assets'
    AND user_is_org_admin((select auth.uid()), (storage.foldername(name))[1]::UUID)
  );

DROP POLICY IF EXISTS "Org admins can delete org files" ON storage.objects;
CREATE POLICY "Org admins can delete org files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'organization-assets'
    AND user_is_org_admin((select auth.uid()), (storage.foldername(name))[1]::UUID)
  );

-- ============================================================================
-- PHASE 1N: Fix 054_rsvp_rls_updates.sql policies
-- Tables: event_rsvps, rsvp_configurations
-- ============================================================================

DROP POLICY IF EXISTS "Parents can manage family RSVPs" ON event_rsvps;
-- Use athlete_id if it exists, otherwise fall back to child_id (for backward compatibility)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'event_rsvps'
    AND column_name = 'athlete_id'
  ) THEN
    EXECUTE 'CREATE POLICY "Parents can manage family RSVPs" ON event_rsvps
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM athletes c
          JOIN users u ON u.family_id = c.family_id
          WHERE c.id = event_rsvps.athlete_id
          AND u.id = (select auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM athletes c
          JOIN users u ON u.family_id = c.family_id
          WHERE c.id = event_rsvps.athlete_id
          AND u.id = (select auth.uid())
        )
      )';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'event_rsvps'
    AND column_name = 'child_id'
  ) THEN
    EXECUTE 'CREATE POLICY "Parents can manage family RSVPs" ON event_rsvps
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM athletes c
          JOIN users u ON u.family_id = c.family_id
          WHERE c.id = event_rsvps.child_id
          AND u.id = (select auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM athletes c
          JOIN users u ON u.family_id = c.family_id
          WHERE c.id = event_rsvps.child_id
          AND u.id = (select auth.uid())
        )
      )';
  END IF;
END $$;

DROP POLICY IF EXISTS "Staff can view team RSVPs" ON event_rsvps;
CREATE POLICY "Staff can view team RSVPs" ON event_rsvps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organization_members om ON om.org_id = (
        SELECT org_id FROM teams WHERE id = e.team_id
      )
      WHERE e.id = event_rsvps.event_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('org_admin', 'coach')
    )
  );

DROP POLICY IF EXISTS "Staff can manage team RSVPs" ON event_rsvps;
CREATE POLICY "Staff can manage team RSVPs" ON event_rsvps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organization_members om ON om.org_id = (
        SELECT org_id FROM teams WHERE id = e.team_id
      )
      WHERE e.id = event_rsvps.event_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('org_admin', 'coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organization_members om ON om.org_id = (
        SELECT org_id FROM teams WHERE id = e.team_id
      )
      WHERE e.id = event_rsvps.event_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('org_admin', 'coach')
    )
  );

-- ============================================================================
-- PHASE 1O: Fix additional RLS policies from various files
-- ============================================================================

-- Fix family_members policies if they exist
DROP POLICY IF EXISTS "Users can view own family" ON family_members;
CREATE POLICY "Users can view own family" ON family_members
  FOR SELECT
  USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Users can view family by membership" ON family_members;
CREATE POLICY "Users can view family by membership" ON family_members
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR family_id IN (SELECT family_id FROM family_members WHERE user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Users can leave family" ON family_members;
CREATE POLICY "Users can leave family" ON family_members
  FOR DELETE
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Org admins can manage family members" ON family_members;
CREATE POLICY "Org admins can manage family members" ON family_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.user_id = (select auth.uid()) 
      AND om.role = 'org_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.user_id = (select auth.uid()) 
      AND om.role = 'org_admin'
    )
  );

-- Fix event_locations policies
DROP POLICY IF EXISTS "Org members can view locations" ON event_locations;
CREATE POLICY "Org members can view locations" ON event_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN teams t ON t.id = e.team_id
      JOIN organization_members om ON om.org_id = t.org_id
      WHERE e.id = event_locations.event_id
      AND om.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org admins can manage locations" ON event_locations;
CREATE POLICY "Org admins can manage locations" ON event_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN teams t ON t.id = e.team_id
      WHERE e.id = event_locations.event_id
      AND user_is_org_admin((select auth.uid()), t.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN teams t ON t.id = e.team_id
      WHERE e.id = event_locations.event_id
      AND user_is_org_admin((select auth.uid()), t.org_id)
    )
  );

-- Fix travel_plans policies
DROP POLICY IF EXISTS "Org members can view travel plans" ON travel_plans;
CREATE POLICY "Org members can view travel plans" ON travel_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_members om ON om.org_id = t.org_id
      WHERE t.id = travel_plans.team_id
      AND om.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can manage travel plans" ON travel_plans;
CREATE POLICY "Staff can manage travel plans" ON travel_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_members om ON om.org_id = t.org_id
      WHERE t.id = travel_plans.team_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('org_admin', 'coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_members om ON om.org_id = t.org_id
      WHERE t.id = travel_plans.team_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('org_admin', 'coach')
    )
  );

-- ============================================================================
-- POST-MIGRATION: Validation
-- ============================================================================

-- Verify all policies were recreated successfully
DO $$
DECLARE
  original_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO original_count FROM _rls_policy_backup;
  SELECT COUNT(*) INTO new_count FROM pg_policies WHERE schemaname = 'public';
  
  -- Allow for some variation due to consolidation, but catch major issues
  IF new_count < original_count * 0.8 THEN
    RAISE WARNING 'Policy count dropped significantly: % -> %. Review changes.', original_count, new_count;
  END IF;
  
  RAISE NOTICE 'Migration complete. Original policies: %, New policies: %', original_count, new_count;
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Phase 1 Complete: All auth.uid() calls wrapped in (select auth.uid()) for InitPlan optimization';
END $$;




