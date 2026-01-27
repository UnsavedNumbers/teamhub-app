-- Update RLS policies for announcements to support org-wide announcements
-- ======================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can create announcements" ON announcements;
DROP POLICY IF EXISTS "Team members can view announcements" ON announcements;

-- Updated policy: Staff can create announcements
-- - Team-specific: user must be in the same org as the team
-- - Org-wide: user must be org_admin in the same org
CREATE POLICY "Staff can create announcements" ON announcements
  FOR INSERT
  WITH CHECK (
    -- Team-specific announcement: user must be admin/coach in team's org
    (
      announcements.team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM users u
        JOIN teams t ON t.id = announcements.team_id
        WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'coach')
        AND u.org_id = t.org_id
        AND announcements.org_id = t.org_id
      )
    )
    OR
    -- Org-wide announcement: user must be org_admin in the org
    (
      announcements.team_id IS NULL
      AND announcements.org_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.org_id = announcements.org_id
      )
    )
  );

-- Updated policy: Team members can view announcements
-- - Team-specific: user must be staff in org OR parent with child on team
-- - Org-wide: user must be in the org (staff OR parent with child in any team in org)
CREATE POLICY "Team members can view announcements" ON announcements
  FOR SELECT
  USING (
    -- Team-specific announcements
    (
      announcements.team_id IS NOT NULL
      AND (
        -- Staff in org
        EXISTS (
          SELECT 1 FROM users u
          JOIN teams t ON t.id = announcements.team_id
          WHERE u.id = auth.uid()
          AND u.role IN ('admin', 'coach')
          AND u.org_id = t.org_id
        )
        OR
        -- Parents with children on team
        EXISTS (
          SELECT 1 FROM users u
          JOIN athletes c ON c.family_id = u.family_id
          JOIN team_memberships tm ON tm.athlete_id = c.id
          WHERE u.id = auth.uid()
          AND u.role = 'parent'
          AND tm.team_id = announcements.team_id
          AND tm.status = 'active'
        )
      )
    )
    OR
    -- Org-wide announcements (team_id IS NULL)
    (
      announcements.team_id IS NULL
      AND announcements.org_id IS NOT NULL
      AND (
        -- Staff in org
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND u.role IN ('admin', 'coach')
          AND u.org_id = announcements.org_id
        )
        OR
        -- Parents with children in any team in the org
        EXISTS (
          SELECT 1 FROM users u
          JOIN athletes c ON c.family_id = u.family_id
          JOIN team_memberships tm ON tm.athlete_id = c.id
          JOIN teams t ON t.id = tm.team_id
          WHERE u.id = auth.uid()
          AND u.role = 'parent'
          AND t.org_id = announcements.org_id
          AND tm.status = 'active'
        )
      )
    )
  );

-- Add comment
COMMENT ON POLICY "Staff can create announcements" ON announcements IS 
  'Allows org admins to create org-wide announcements, and coaches/admins to create team-specific announcements';

COMMENT ON POLICY "Team members can view announcements" ON announcements IS 
  'Allows viewing team-specific announcements for team members, and org-wide announcements for all org members';
