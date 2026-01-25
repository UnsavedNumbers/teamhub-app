-- Allow coaches to UPDATE events for teams in their org
-- =====================================================

-- Drop existing coach policy if it exists (SELECT only)
DROP POLICY IF EXISTS "Coaches can view events" ON events;

-- Create new policy that allows coaches to both view and update events
CREATE POLICY "Coaches can view and update events" ON events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = events.team_id
      WHERE u.id = auth.uid()
      AND u.role = 'coach'
      AND u.org_id = t.org_id
    )
  );
