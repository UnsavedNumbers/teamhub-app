-- Fix Ticketing RLS Policies: Add WITH CHECK clauses for INSERT operations
-- =========================================================================
-- The existing policies use FOR ALL with only USING, which fails on INSERT
-- because USING references columns from the row being inserted (which don't exist yet).
-- We need WITH CHECK to validate INSERT operations.

-- ============================================================================
-- TICKETED_EVENTS: Drop and recreate policies with WITH CHECK
-- ============================================================================

DROP POLICY IF EXISTS "Org admins can manage their org's ticketed events" ON ticketed_events;
DROP POLICY IF EXISTS "Coaches can manage team ticketed events" ON ticketed_events;

-- Org admins can manage (create/read/update/delete) their org's ticketed events
CREATE POLICY "Org admins can manage their org's ticketed events"
  ON ticketed_events
  FOR ALL
  USING (
    -- For SELECT/UPDATE/DELETE: check the row's org_id matches user's org
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = ticketed_events.org_id
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    -- For INSERT/UPDATE: check the new org_id matches user's org
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = ticketed_events.org_id
      AND users.role = 'admin'
    )
  );

-- Coaches can manage ticketed events for their org
CREATE POLICY "Coaches can manage team ticketed events"
  ON ticketed_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'coach'
      AND users.org_id = ticketed_events.org_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'coach'
      AND users.org_id = ticketed_events.org_id
    )
  );

-- ============================================================================
-- TICKET_TYPES: Drop and recreate policies with WITH CHECK
-- ============================================================================

DROP POLICY IF EXISTS "Org admins can manage ticket types" ON ticket_types;
DROP POLICY IF EXISTS "Coaches can manage ticket types for team events" ON ticket_types;

-- Org admins can manage ticket types for their org
CREATE POLICY "Org admins can manage ticket types"
  ON ticket_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = ticket_types.org_id
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = ticket_types.org_id
      AND users.role = 'admin'
    )
  );

-- Coaches can manage ticket types for their org's events
CREATE POLICY "Coaches can manage ticket types for team events"
  ON ticket_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ticketed_events te
      JOIN users u ON u.id = auth.uid()
      WHERE te.id = ticket_types.ticketed_event_id
      AND u.role = 'coach'
      AND u.org_id = te.org_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ticketed_events te
      JOIN users u ON u.id = auth.uid()
      WHERE te.id = ticket_types.ticketed_event_id
      AND u.role = 'coach'
      AND u.org_id = te.org_id
    )
  );

-- ============================================================================
-- TICKET_STAFF_LINKS: Add missing WITH CHECK
-- ============================================================================

DROP POLICY IF EXISTS "Org staff can manage ticket staff links" ON ticket_staff_links;

CREATE POLICY "Org staff can manage ticket staff links"
  ON ticket_staff_links
  FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- ============================================================================
-- RECURRING_EVENT_PATTERNS: Add missing WITH CHECK
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage recurring patterns" ON recurring_event_patterns;

CREATE POLICY "Admins can manage recurring patterns"
  ON recurring_event_patterns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN teams t ON t.id = e.team_id
      JOIN users u ON u.id = auth.uid()
      WHERE e.id = recurring_event_patterns.parent_event_id
      AND u.role = 'admin'
      AND u.org_id = t.org_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN teams t ON t.id = e.team_id
      JOIN users u ON u.id = auth.uid()
      WHERE e.id = recurring_event_patterns.parent_event_id
      AND u.role = 'admin'
      AND u.org_id = t.org_id
    )
  );
