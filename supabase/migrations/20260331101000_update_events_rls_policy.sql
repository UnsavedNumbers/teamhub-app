-- Recreate events RLS policy to include new roles (run after 20260331100000_extend_user_role_and_events_rls.sql)

DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events" ON events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = events.team_id
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'org_admin', 'platform_admin')
      AND u.org_id = t.org_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = events.team_id
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'org_admin', 'platform_admin')
      AND u.org_id = t.org_id
    )
  );

COMMENT ON POLICY "Admins can manage events" ON events IS
  'Org/platform admins (admin, org_admin, platform_admin) can create, update, delete events within their org.';
