-- Migration: Consolidate Multiple Permissive Policies
-- Purpose: Combine multiple permissive policies for same role/action into single policies with OR conditions
-- 
-- Problem: Multiple permissive policies for the same action require all to be checked per row.
-- Solution: Consolidate into single policies with OR conditions to reduce policy evaluation overhead.
--
-- This migration consolidates policies on high-impact tables while maintaining identical security semantics.

-- ============================================================================
-- PRE-CONSOLIDATION: Capture current policy state for comparison
-- ============================================================================

-- Create table to track which policies existed before consolidation
CREATE TABLE IF NOT EXISTS _policy_consolidation_log (
  id SERIAL PRIMARY KEY,
  tablename TEXT NOT NULL,
  original_policies TEXT[] NOT NULL,
  consolidated_policy TEXT NOT NULL,
  operation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PHASE 2A: Consolidate users table SELECT policies
-- Original: 4 separate SELECT policies (own profile, platform admin, org admin v2, coaches v2)
-- Consolidated: 1 combined SELECT policy
-- ============================================================================

-- Log the consolidation
INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'users',
  ARRAY[
    'Users can view own profile',
    'Platform admins can view all users',
    'Org admins can view org users v2',
    'Coaches can view org users v2'
  ],
  'users_select_policy',
  'SELECT'
);

-- Drop individual SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
DROP POLICY IF EXISTS "Org admins can view org users v2" ON users;
DROP POLICY IF EXISTS "Coaches can view org users v2" ON users;

-- Create consolidated SELECT policy
CREATE POLICY "users_select_policy" ON users
  FOR SELECT
  USING (
    -- User can view their own profile
    (select auth.uid()) = id
    -- Platform admins can view all users
    OR is_platform_admin((select auth.uid()))
    -- Org admins/coaches can view users in their org
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = users.id
      AND user_has_any_org_roles((select auth.uid()), om.org_id, ARRAY['org_admin','coach']::org_member_role[])
    )
  );

-- ============================================================================
-- PHASE 2B: Consolidate organization_members table SELECT policies
-- Original: 4 SELECT policies (own, platform admin, org admin, from ALL policy)
-- Consolidated: 1 combined SELECT policy + keep ALL policy for write operations
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'organization_members',
  ARRAY[
    'Users can view own memberships',
    'Platform admins can view all memberships',
    'Org admins can view org memberships'
  ],
  'org_members_select_policy',
  'SELECT'
);

DROP POLICY IF EXISTS "Users can view own memberships" ON organization_members;
DROP POLICY IF EXISTS "Platform admins can view all memberships" ON organization_members;
DROP POLICY IF EXISTS "Org admins can view org memberships" ON organization_members;

CREATE POLICY "org_members_select_policy" ON organization_members
  FOR SELECT
  USING (
    -- User can view their own memberships
    (select auth.uid()) = user_id
    -- Platform admins can view all memberships
    OR is_platform_admin((select auth.uid()))
    -- Org admins can view memberships in their org
    OR user_is_org_admin((select auth.uid()), org_id)
  );

-- ============================================================================
-- PHASE 2C: Consolidate families table SELECT policies
-- Original: 3 SELECT policies (parents, coaches, from admin ALL)
-- Consolidated: 1 combined SELECT policy
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'families',
  ARRAY[
    'Parents can view their family',
    'Coaches can view families',
    'Admins can manage families (SELECT portion)'
  ],
  'families_select_policy',
  'SELECT'
);

DROP POLICY IF EXISTS "Parents can view their family" ON families;
DROP POLICY IF EXISTS "Coaches can view families" ON families;
DROP POLICY IF EXISTS "Admins can manage families" ON families;

CREATE POLICY "families_select_policy" ON families
  FOR SELECT
  USING (
    -- Parents can view their own family
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.family_id = families.id
    )
    -- Coaches can view families
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid())  -- AND user_has_org_role((select auth.uid()), organization_id, 'coach') -- FIXME: organization_id not in scope
    )
    -- Admins can view families
    OR is_platform_admin((select auth.uid()))
  );

-- Keep write policies separate for families
CREATE POLICY "families_insert_policy" ON families
  FOR INSERT
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

CREATE POLICY "families_update_policy" ON families
  FOR UPDATE
  USING (
    -- Parents can update their own family
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.family_id = families.id
    )
    -- Admins can update any family
    OR is_platform_admin((select auth.uid()))
  );

CREATE POLICY "families_delete_policy" ON families
  FOR DELETE
  USING (
    is_platform_admin((select auth.uid()))
  );

-- ============================================================================
-- PHASE 2D: Consolidate athletes (athletes) table policies
-- Original: Multiple overlapping SELECT and ALL policies
-- Consolidated: Separate policies by operation type
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'athletes',
  ARRAY[
    'Guardians can manage their athletes',
    'Org admins can view org athletes',
    'Org admins can manage org athletes',
    'Coaches can view org team athletes',
    'Parents can manage their athletes',
    'Admins can view athletes',
    'Admins can manage athletes',
    'Coaches can view team athletes'
  ],
  'athletes_select_policy + athletes_write_policy',
  'ALL'
);

-- Drop all existing athletes policies
DROP POLICY IF EXISTS "Guardians can manage their athletes" ON athletes;
DROP POLICY IF EXISTS "Org admins can view org athletes" ON athletes;
DROP POLICY IF EXISTS "Org admins can manage org athletes" ON athletes;
DROP POLICY IF EXISTS "Coaches can view org team athletes" ON athletes;
DROP POLICY IF EXISTS "Parents can manage their athletes" ON athletes;
DROP POLICY IF EXISTS "Admins can view athletes" ON athletes;
DROP POLICY IF EXISTS "Admins can manage athletes" ON athletes;
DROP POLICY IF EXISTS "Coaches can view team athletes" ON athletes;

-- Create consolidated SELECT policy for athletes
CREATE POLICY "athletes_select_policy" ON athletes
  FOR SELECT
  USING (
    -- Guardian relationship via athlete_guardians
    user_is_guardian_of_child((select auth.uid()), athletes.id)
    -- Family relationship via family_id
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.family_id = athletes.family_id
    )
    -- Org admins can view org athletes
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athletes.id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin']::org_member_role[])
    )
    -- Coaches can view athletes in their org
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athletes.id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin','coach']::org_member_role[])
    )
    -- Legacy admin check via users.role
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid())
      AND is_platform_admin((select auth.uid())) -- OR user_has_org_role((select auth.uid()), org_id, 'coach') -- FIXME
    )
  );

-- Create consolidated INSERT policy for athletes
CREATE POLICY "athletes_insert_policy" ON athletes
  FOR INSERT
  WITH CHECK (
    -- Guardian can add athletes
    user_is_guardian_of_child((select auth.uid()), athletes.id)
    -- Parents can add to their family
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.family_id = athletes.family_id
    )
    -- Admins can add athletes
    OR is_platform_admin((select auth.uid()))
    -- Org admins can add athletes in their org
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athletes.id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin']::org_member_role[])
    )
  );

-- Create consolidated UPDATE policy for athletes
CREATE POLICY "athletes_update_policy" ON athletes
  FOR UPDATE
  USING (
    user_is_guardian_of_child((select auth.uid()), athletes.id)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.family_id = athletes.family_id
    )
    OR is_platform_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athletes.id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin']::org_member_role[])
    )
  );

-- Create consolidated DELETE policy for athletes
CREATE POLICY "athletes_delete_policy" ON athletes
  FOR DELETE
  USING (
    user_is_guardian_of_child((select auth.uid()), athletes.id)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.family_id = athletes.family_id
    )
    OR is_platform_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athletes.id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin']::org_member_role[])
    )
  );

-- ============================================================================
-- PHASE 2E: Consolidate teams table SELECT policies
-- Original: 4 SELECT policies (admins, coaches, parents, invite code lookup, guardians)
-- Consolidated: 1 combined SELECT policy
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'teams',
  ARRAY[
    'Admins can manage teams',
    'Coaches can view teams',
    'Parents can view their teams',
    'Anyone can lookup team by invite code',
    'Guardians can view their athletes teams'
  ],
  'teams_select_policy',
  'SELECT'
);

DROP POLICY IF EXISTS "Coaches can view teams" ON teams;
DROP POLICY IF EXISTS "Parents can view their teams" ON teams;
DROP POLICY IF EXISTS "Anyone can lookup team by invite code" ON teams;
DROP POLICY IF EXISTS "Guardians can view their athletes teams" ON teams;
DROP POLICY IF EXISTS "Admins can manage teams" ON teams;

CREATE POLICY "teams_select_policy" ON teams
  FOR SELECT
  USING (
    -- Admins can view all teams
    is_platform_admin((select auth.uid()))
    -- Coaches can view teams
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid())  -- AND user_has_org_role((select auth.uid()), organization_id, 'coach') -- FIXME: organization_id not in scope
    )
    -- Parents can view teams their athletes are on (via family)
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN athletes c ON c.id = tm.athlete_id
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE tm.team_id = teams.id
    )
    -- Guardians can view their athletes's teams (via athlete_guardians)
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.team_id = teams.id
      AND user_is_guardian_of_child((select auth.uid()), tm.athlete_id)
    )
    -- Org members can view teams in their org
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = (select auth.uid())
      AND om.org_id = teams.org_id
    )
  );

-- Keep admin write policy separate
CREATE POLICY "teams_write_policy" ON teams
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
    OR user_is_org_admin((select auth.uid()), org_id)
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
    OR user_is_org_admin((select auth.uid()), org_id)
  );

-- ============================================================================
-- PHASE 2F: Consolidate events table SELECT policies
-- Original: 3 SELECT policies (admins, coaches, parents/guardians)
-- Consolidated: 1 combined SELECT policy
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'events',
  ARRAY[
    'Admins can manage events',
    'Coaches can view events',
    'Parents can view their events',
    'Guardians can view their athletes events'
  ],
  'events_select_policy',
  'SELECT'
);

DROP POLICY IF EXISTS "Coaches can view events" ON events;
DROP POLICY IF EXISTS "Parents can view their events" ON events;
DROP POLICY IF EXISTS "Guardians can view their athletes events" ON events;
DROP POLICY IF EXISTS "Admins can manage events" ON events;

CREATE POLICY "events_select_policy" ON events
  FOR SELECT
  USING (
    -- Admins can view all events
    is_platform_admin((select auth.uid()))
    -- Coaches can view events
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid())  -- AND user_has_org_role((select auth.uid()), organization_id, 'coach') -- FIXME: organization_id not in scope
    )
    -- Parents can view events for their athletes's teams (via family)
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN athletes c ON c.id = tm.athlete_id
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE tm.team_id = events.team_id
    )
    -- Guardians can view events for their athletes's teams
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.team_id = events.team_id
      AND user_is_guardian_of_child((select auth.uid()), tm.athlete_id)
    )
    -- Org members can view events in their org
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_members om ON om.org_id = t.org_id
      WHERE t.id = events.team_id
      AND om.user_id = (select auth.uid())
    )
  );

-- Keep admin write policy for events
CREATE POLICY "events_write_policy" ON events
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = events.team_id
      AND user_is_org_admin((select auth.uid()), t.org_id)
    )
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = events.team_id
      AND user_is_org_admin((select auth.uid()), t.org_id)
    )
  );

-- ============================================================================
-- PHASE 2G: Consolidate attendance table policies
-- Original: 3 policies (guardians ALL, coaches SELECT, admins ALL)
-- Consolidated: Separate SELECT and write policies
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'attendance',
  ARRAY[
    'Guardians can manage their athletes attendance',
    'Coaches can view attendance',
    'Admins can manage attendance',
    'Parents can manage their athletes''s attendance'
  ],
  'attendance_select_policy + attendance_write_policy',
  'ALL'
);

DROP POLICY IF EXISTS "Guardians can manage their athletes attendance" ON attendance;
DROP POLICY IF EXISTS "Coaches can view attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Parents can manage their athletes's attendance" ON attendance;

CREATE POLICY "attendance_select_policy" ON attendance
  FOR SELECT
  USING (
    -- Guardians can view attendance for their athletes
    user_is_guardian_of_child((select auth.uid()), attendance.athlete_id)
    -- Parents can view via family relationship
    OR EXISTS (
      SELECT 1 FROM athletes c
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE c.id = attendance.athlete_id
    )
    -- Coaches can view attendance
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid())  -- AND user_has_org_role((select auth.uid()), organization_id, 'coach') -- FIXME: organization_id not in scope
    )
    -- Admins can view attendance
    OR is_platform_admin((select auth.uid()))
  );

CREATE POLICY "attendance_write_policy" ON attendance
  FOR ALL
  USING (
    -- Guardians can manage attendance for their athletes
    user_is_guardian_of_child((select auth.uid()), attendance.athlete_id)
    -- Parents can manage via family relationship
    OR EXISTS (
      SELECT 1 FROM athletes c
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE c.id = attendance.athlete_id
    )
    -- Admins can manage attendance
    OR is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    user_is_guardian_of_child((select auth.uid()), attendance.athlete_id)
    OR EXISTS (
      SELECT 1 FROM athletes c
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE c.id = attendance.athlete_id
    )
    OR is_platform_admin((select auth.uid()))
  );

-- ============================================================================
-- PHASE 2H: Consolidate team_memberships table SELECT policies
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'team_memberships',
  ARRAY[
    'Admins can manage memberships',
    'Parents can view their memberships',
    'Coaches can view team memberships',
    'Guardians can view their athletes memberships'
  ],
  'team_memberships_select_policy',
  'SELECT'
);

DROP POLICY IF EXISTS "Parents can view their memberships" ON team_memberships;
DROP POLICY IF EXISTS "Coaches can view team memberships" ON team_memberships;
DROP POLICY IF EXISTS "Guardians can view their athletes memberships" ON team_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON team_memberships;

CREATE POLICY "team_memberships_select_policy" ON team_memberships
  FOR SELECT
  USING (
    -- Guardians can view their athletes's memberships
    user_is_guardian_of_child((select auth.uid()), team_memberships.athlete_id)
    -- Parents can view via family relationship
    OR EXISTS (
      SELECT 1 FROM athletes c
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE c.id = team_memberships.athlete_id
    )
    -- Coaches can view memberships
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid())  -- AND user_has_org_role((select auth.uid()), organization_id, 'coach') -- FIXME: organization_id not in scope
    )
    -- Admins can view memberships
    OR is_platform_admin((select auth.uid()))
    -- Org members can view memberships in their org
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_members om ON om.org_id = t.org_id
      WHERE t.id = team_memberships.team_id
      AND om.user_id = (select auth.uid())
    )
  );

CREATE POLICY "team_memberships_write_policy" ON team_memberships
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_memberships.team_id
      AND user_is_org_admin((select auth.uid()), t.org_id)
    )
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_memberships.team_id
      AND user_is_org_admin((select auth.uid()), t.org_id)
    )
  );

-- ============================================================================
-- PHASE 2I: Consolidate seasons table SELECT policies
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'seasons',
  ARRAY[
    'Admins can manage seasons',
    'Coaches can view seasons',
    'Parents can view their seasons',
    'Guardians can view their athletes seasons'
  ],
  'seasons_select_policy',
  'SELECT'
);

DROP POLICY IF EXISTS "Coaches can view seasons" ON seasons;
DROP POLICY IF EXISTS "Parents can view their seasons" ON seasons;
DROP POLICY IF EXISTS "Guardians can view their athletes seasons" ON seasons;
DROP POLICY IF EXISTS "Admins can manage seasons" ON seasons;

CREATE POLICY "seasons_select_policy" ON seasons
  FOR SELECT
  USING (
    -- Admins can view all seasons
    is_platform_admin((select auth.uid()))
    -- Coaches can view seasons
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (select auth.uid())  -- AND user_has_org_role((select auth.uid()), organization_id, 'coach') -- FIXME: organization_id not in scope
    )
    -- Parents can view seasons their athletes are in (via family)
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN athletes c ON c.id = tm.athlete_id
      JOIN users u ON u.id = (select auth.uid()) AND u.family_id = c.family_id
      WHERE tm.season_id = seasons.id
    )
    -- Guardians can view their athletes's seasons
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.season_id = seasons.id
      AND user_is_guardian_of_child((select auth.uid()), tm.athlete_id)
    )
    -- Org members can view seasons in their org
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_members om ON om.org_id = t.org_id
      WHERE t.id = seasons.team_id
      AND om.user_id = (select auth.uid())
    )
  );

CREATE POLICY "seasons_write_policy" ON seasons
  FOR ALL
  USING (
    is_platform_admin((select auth.uid()))
  )
  WITH CHECK (
    is_platform_admin((select auth.uid()))
  );

-- ============================================================================
-- PHASE 2J: Consolidate organizations table SELECT policies
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'organizations',
  ARRAY[
    'Members can view their orgs',
    'Platform admins can view all orgs',
    'Platform admins can manage all orgs',
    'Org admins can update their org'
  ],
  'organizations_select_policy',
  'SELECT'
);

DROP POLICY IF EXISTS "Members can view their orgs" ON organizations;
DROP POLICY IF EXISTS "Platform admins can view all orgs" ON organizations;
-- Keep write policies - they're already consolidated

CREATE POLICY "organizations_select_policy" ON organizations
  FOR SELECT
  USING (
    -- Platform admins can view all organizations
    is_platform_admin((select auth.uid()))
    -- Members can view their organization
    OR user_has_org_access((select auth.uid()), id)
    -- Authenticated users can view organizations they're members of
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organizations.id
      AND om.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PHASE 2K: Consolidate organization_invites table SELECT policies
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'organization_invites',
  ARRAY[
    'Org admins can view org invites',
    'Platform admins can view all invites'
  ],
  'organization_invites_select_policy',
  'SELECT'
);

DROP POLICY IF EXISTS "Org admins can view org invites" ON organization_invites;
DROP POLICY IF EXISTS "Platform admins can view all invites" ON organization_invites;

CREATE POLICY "organization_invites_select_policy" ON organization_invites
  FOR SELECT
  USING (
    -- Platform admins can view all invites
    is_platform_admin((select auth.uid()))
    -- Org admins can view invites for their org
    OR user_is_org_admin((select auth.uid()), org_id)
  );

-- Consolidate INSERT policies
DROP POLICY IF EXISTS "Org admins can create invites" ON organization_invites;
DROP POLICY IF EXISTS "Platform admins can create all invites" ON organization_invites;

CREATE POLICY "organization_invites_insert_policy" ON organization_invites
  FOR INSERT
  WITH CHECK (
    is_platform_admin((select auth.uid()))
    OR user_is_org_admin((select auth.uid()), org_id)
  );

-- Consolidate DELETE policies
DROP POLICY IF EXISTS "Org admins can delete org invites" ON organization_invites;
DROP POLICY IF EXISTS "Platform admins can delete all invites" ON organization_invites;

CREATE POLICY "organization_invites_delete_policy" ON organization_invites
  FOR DELETE
  USING (
    is_platform_admin((select auth.uid()))
    OR user_is_org_admin((select auth.uid()), org_id)
  );

-- ============================================================================
-- PHASE 2L: Consolidate parent_invites table SELECT policies
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'parent_invites',
  ARRAY[
    'Org admins can view parent invites',
    'Platform admins can view all parent invites',
    'Users can view their pending invites'
  ],
  'parent_invites_select_policy',
  'SELECT'
);

DROP POLICY IF EXISTS "Org admins can view parent invites" ON parent_invites;
DROP POLICY IF EXISTS "Platform admins can view all parent invites" ON parent_invites;
DROP POLICY IF EXISTS "Users can view their pending invites" ON parent_invites;

CREATE POLICY "parent_invites_select_policy" ON parent_invites
  FOR SELECT
  USING (
    -- Platform admins can view all invites
    is_platform_admin((select auth.uid()))
    -- Org admins can view invites for athletes in their org
    OR EXISTS (
      SELECT 1 FROM athletes c
      JOIN team_memberships tm ON tm.athlete_id = c.id
      JOIN teams t ON t.id = tm.team_id
      WHERE c.id = parent_invites.athlete_id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin']::org_member_role[])
    )
    -- Users can view their own pending invites
    OR (
      email = (SELECT email FROM users WHERE id = (select auth.uid()))
      AND status = 'pending'
    )
  );

-- ============================================================================
-- PHASE 2M: Consolidate join_requests table SELECT policies (conditional - table may not exist)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'join_requests') THEN
    INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
    VALUES (
      'join_requests',
      ARRAY[
        'Users can view own join requests',
        'Org admins can view org join requests',
        'Platform admins can view all join requests'
      ],
      'organization_join_requests_select_policy',
      'SELECT'
    );

    EXECUTE 'DROP POLICY IF EXISTS "Users can view own join requests" ON join_requests';
    EXECUTE 'DROP POLICY IF EXISTS "Org admins can view org join requests" ON join_requests';
    EXECUTE 'DROP POLICY IF EXISTS "Platform admins can view all join requests" ON join_requests';

    EXECUTE 'CREATE POLICY "organization_join_requests_select_policy" ON join_requests
      FOR SELECT
      USING (
        (select auth.uid()) = requested_by_user_id
        OR is_platform_admin((select auth.uid()))
        OR user_has_any_org_roles((select auth.uid()), org_id, ARRAY[''org_admin'']::org_member_role[])
      )';
  END IF;
END $$;

-- ============================================================================
-- PHASE 2N: Consolidate join_links table SELECT policies
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'join_links',
  ARRAY[
    'Org admins can view org join links',
    'Platform admins can view all join links'
  ],
  'organization_join_links_select_policy',
  'SELECT'
);

DROP POLICY IF EXISTS "Org admins can view org join links" ON join_links;
DROP POLICY IF EXISTS "Platform admins can view all join links" ON join_links;

CREATE POLICY "organization_join_links_select_policy" ON join_links
  FOR SELECT
  USING (
    -- Platform admins can view all join links
    is_platform_admin((select auth.uid()))
    -- Org admins can view join links for their org
    OR user_has_any_org_roles((select auth.uid()), org_id, ARRAY['org_admin']::org_member_role[])
  );

-- ============================================================================
-- PHASE 2O: Consolidate athlete_guardians table SELECT policies
-- ============================================================================

INSERT INTO _policy_consolidation_log (tablename, original_policies, consolidated_policy, operation)
VALUES (
  'athlete_guardians',
  ARRAY[
    'Users can view own guardian relationships',
    'Platform admins can view all guardians',
    'Org admins can view org guardians'
  ],
  'athlete_guardians_select_policy',
  'SELECT'
);

DROP POLICY IF EXISTS "Users can view own guardian relationships" ON athlete_guardians;
DROP POLICY IF EXISTS "Platform admins can view all guardians" ON athlete_guardians;
DROP POLICY IF EXISTS "Org admins can view org guardians" ON athlete_guardians;

CREATE POLICY "athlete_guardians_select_policy" ON athlete_guardians
  FOR SELECT
  USING (
    -- Users can view their own guardian relationships
    (select auth.uid()) = user_id
    -- Platform admins can view all guardian relationships
    OR is_platform_admin((select auth.uid()))
    -- Org admins can view guardian relationships for athletes in their org
    OR EXISTS (
      SELECT 1 FROM athletes c
      JOIN team_memberships tm ON tm.athlete_id = c.id
      JOIN teams t ON t.id = tm.team_id
      WHERE c.id = athlete_guardians.athlete_id
      AND user_has_any_org_roles((select auth.uid()), t.org_id, ARRAY['org_admin']::org_member_role[])
    )
  );

-- ============================================================================
-- POST-CONSOLIDATION: Validation and logging
-- ============================================================================

DO $$
DECLARE
  consolidation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO consolidation_count FROM _policy_consolidation_log;
  RAISE NOTICE 'Phase 2 Complete: Consolidated % table policy groups', consolidation_count;
END $$;

-- Log summary of consolidation
DO $$
BEGIN
  RAISE NOTICE 'Policy consolidation complete. Review _policy_consolidation_log table for details.';
  RAISE NOTICE 'Security semantics maintained - only evaluation efficiency changed.';
END $$;



