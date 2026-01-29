-- Phase 04: Deferred RLS Policies
-- ================================
-- RLS Policies that were deferred from earlier migrations due to dependency on users table
-- This migration MUST run after all tables are created

-- ============================================
-- ORGANIZATIONS RLS Policies
-- ============================================

-- Admins can do everything
CREATE POLICY "Admins can manage organizations" ON organizations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = organizations.id
    )
  );

-- All authenticated users can read their organization
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = organizations.id
    )
  );

-- ============================================
-- FAMILIES RLS Policies
-- ============================================

-- Parents can view their own family
CREATE POLICY "Parents can view their family" ON families
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.family_id = families.id
    )
  );

-- Parents can update their own family
CREATE POLICY "Parents can update their family" ON families
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.family_id = families.id
      AND users.role = 'parent'
    )
  );

-- Admins can manage all families in their org
CREATE POLICY "Admins can manage families" ON families
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = families.org_id
    )
  );

-- Coaches can view families in their org (for roster info)
CREATE POLICY "Coaches can view families" ON families
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'coach'
      AND users.org_id = families.org_id
    )
  );

-- ============================================
-- TEAMS RLS Policies
-- ============================================

-- Admins can manage all teams in their org
CREATE POLICY "Admins can manage teams" ON teams
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = teams.org_id
    )
  );

-- Coaches can view teams in their org
CREATE POLICY "Coaches can view teams" ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'coach'
      AND users.org_id = teams.org_id
    )
  );

-- Parents can view teams their children are members of
CREATE POLICY "Parents can view their teams" ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      JOIN team_memberships tm ON tm.athlete_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND tm.team_id = teams.id
    )
  );

-- ============================================
-- SEASONS RLS Policies
-- ============================================

-- Admins can manage all seasons in their org (via team's org_id)
CREATE POLICY "Admins can manage seasons" ON seasons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.org_id = u.org_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND t.id = seasons.team_id
    )
  );

-- Coaches can view seasons in their org
CREATE POLICY "Coaches can view seasons" ON seasons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.org_id = u.org_id
      WHERE u.id = auth.uid()
      AND u.role = 'coach'
      AND t.id = seasons.team_id
    )
  );

-- Parents can view seasons for teams their children are on
CREATE POLICY "Parents can view their seasons" ON seasons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      JOIN team_memberships tm ON tm.athlete_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND tm.season_id = seasons.id
    )
  );

-- ============================================
-- ATHLETES RLS Policies
-- ============================================

-- Parents can CRUD their own family's athletes
CREATE POLICY "Parents can manage their children" ON athletes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'parent'
      AND users.family_id = athletes.family_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'parent'
      AND users.family_id = athletes.family_id
    )
  );

-- Admins can view all athletes in their org
CREATE POLICY "Admins can view children" ON athletes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN families f ON f.id = athletes.family_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = f.org_id
    )
  );

-- Admins can manage athletes (for assignment purposes)
CREATE POLICY "Admins can manage children" ON athletes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN families f ON f.id = athletes.family_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = f.org_id
    )
  );

-- Coaches can view athletes on their teams
CREATE POLICY "Coaches can view team children" ON athletes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN team_memberships tm ON tm.athlete_id = athletes.id
      JOIN teams t ON t.id = tm.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'coach'
      AND u.org_id = t.org_id
    )
  );

-- ============================================
-- TEAM_MEMBERSHIPS RLS Policies
-- ============================================

-- Admins can manage all memberships in their org
CREATE POLICY "Admins can manage memberships" ON team_memberships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = team_memberships.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = t.org_id
    )
  );

-- Parents can view their children's memberships
CREATE POLICY "Parents can view their memberships" ON team_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND c.id = team_memberships.athlete_id
    )
  );

-- Coaches can view memberships for teams in their org
CREATE POLICY "Coaches can view team memberships" ON team_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = team_memberships.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'coach'
      AND u.org_id = t.org_id
    )
  );

-- ============================================
-- EVENTS RLS Policies
-- ============================================

-- Admins can manage all events in their org
CREATE POLICY "Admins can manage events" ON events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = events.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = t.org_id
    )
  );

-- Coaches can view events for teams in their org
CREATE POLICY "Coaches can view events" ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = events.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'coach'
      AND u.org_id = t.org_id
    )
  );

-- Parents can view events for teams their children are on
CREATE POLICY "Parents can view their events" ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      JOIN team_memberships tm ON tm.athlete_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND tm.team_id = events.team_id
      AND tm.status = 'active'
    )
  );

-- ============================================
-- ATTENDANCE RLS Policies
-- ============================================

-- Parents can manage their children's attendance
CREATE POLICY "Parents can manage their children's attendance" ON attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND c.id = attendance.athlete_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND c.id = attendance.athlete_id
    )
  );

-- Coaches can view attendance for events in their org
CREATE POLICY "Coaches can view attendance" ON attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN events e ON e.id = attendance.event_id
      JOIN teams t ON t.id = e.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'coach'
      AND u.org_id = t.org_id
    )
  );

-- Admins can manage all attendance in their org
CREATE POLICY "Admins can manage attendance" ON attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN events e ON e.id = attendance.event_id
      JOIN teams t ON t.id = e.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = t.org_id
    )
  );

-- ============================================
-- PAYMENTS RLS Policies
-- ============================================

-- Parents can view their children's payments
CREATE POLICY "Parents can view their payments" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND c.id = payments.athlete_id
    )
  );

-- Admins can manage all payments in their org
CREATE POLICY "Admins can manage payments" ON payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = payments.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = t.org_id
    )
  );

-- Coaches can see payment status only
CREATE POLICY "Coaches can view payment status" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = payments.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'coach'
      AND u.org_id = t.org_id
    )
  );

-- ============================================
-- UNIFORM_ORDERS RLS Policies
-- ============================================

-- Parents can manage their children's uniform orders
CREATE POLICY "Parents can manage their uniform orders" ON uniform_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND c.id = uniform_orders.athlete_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND c.id = uniform_orders.athlete_id
    )
  );

-- Admins can manage all uniform orders in their org
CREATE POLICY "Admins can manage uniform orders" ON uniform_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = uniform_orders.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = t.org_id
    )
  );

-- Coaches can view uniform orders for their teams
CREATE POLICY "Coaches can view uniform orders" ON uniform_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = uniform_orders.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'coach'
      AND u.org_id = t.org_id
    )
  );

-- ============================================
-- TRAVEL_PLANS RLS Policies
-- ============================================

-- Admins can manage all travel plans in their org
CREATE POLICY "Admins can manage travel plans" ON travel_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = travel_plans.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = t.org_id
    )
  );

-- Parents can view travel plans for teams their children are on
CREATE POLICY "Parents can view travel plans" ON travel_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      JOIN team_memberships tm ON tm.athlete_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND tm.team_id = travel_plans.team_id
      AND tm.status = 'active'
    )
  );

-- Coaches can view travel plans for teams in their org
CREATE POLICY "Coaches can view travel plans" ON travel_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = travel_plans.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'coach'
      AND u.org_id = t.org_id
    )
  );

-- ============================================
-- TRYOUTS RLS Policies
-- ============================================

-- Anyone can view tryouts (they're public for sign-ups)
CREATE POLICY "Anyone can view tryouts" ON tryouts
  FOR SELECT
  USING (true);

-- Admins can manage tryouts in their org
CREATE POLICY "Admins can manage tryouts" ON tryouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = tryouts.org_id
    )
  );

-- ============================================
-- TRYOUT_REGISTRATIONS RLS Policies
-- ============================================

-- Parents can manage their family's registrations
CREATE POLICY "Parents can manage registrations" ON tryout_registrations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND u.family_id = tryout_registrations.family_id
    )
  );

-- Admins and coaches can view all registrations in their org
CREATE POLICY "Staff can view registrations" ON tryout_registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN tryouts t ON t.id = tryout_registrations.tryout_id
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'coach')
      AND u.org_id = t.org_id
    )
  );

-- Admins can update registration status
CREATE POLICY "Admins can update registrations" ON tryout_registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN tryouts t ON t.id = tryout_registrations.tryout_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = t.org_id
    )
  );

-- ============================================
-- TRYOUT_SCORES RLS Policies
-- ============================================

-- Coaches can create scores
CREATE POLICY "Coaches can create scores" ON tryout_scores
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'coach')
    )
  );

-- Staff can view all scores
CREATE POLICY "Staff can view scores" ON tryout_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'coach')
    )
  );

-- ============================================
-- ANNOUNCEMENTS RLS Policies
-- ============================================

-- Coaches and admins can create announcements
CREATE POLICY "Staff can create announcements" ON announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = announcements.team_id
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'coach')
      AND u.org_id = t.org_id
    )
  );

-- Team members can view announcements
CREATE POLICY "Team members can view announcements" ON announcements
  FOR SELECT
  USING (
    -- Staff in org
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = announcements.team_id
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'coach')
      AND u.org_id = t.org_id
    )
    OR
    -- Parents with athletes on team
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      JOIN team_memberships tm ON tm.athlete_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND tm.team_id = announcements.team_id
      AND tm.status = 'active'
    )
  );

-- ============================================
-- MESSAGES RLS Policies
-- ============================================

-- Team members can send messages
CREATE POLICY "Team members can send messages" ON messages
  FOR INSERT
  WITH CHECK (
    -- Staff in org
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = messages.team_id
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'coach')
      AND u.org_id = t.org_id
    )
    OR
    -- Parents with athletes on team
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      JOIN team_memberships tm ON tm.athlete_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND tm.team_id = messages.team_id
      AND tm.status = 'active'
    )
  );

-- Team members can view messages
CREATE POLICY "Team members can view messages" ON messages
  FOR SELECT
  USING (
    -- Staff in org
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = messages.team_id
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'coach')
      AND u.org_id = t.org_id
    )
    OR
    -- Parents with athletes on team
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      JOIN team_memberships tm ON tm.athlete_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND tm.team_id = messages.team_id
      AND tm.status = 'active'
    )
  );
