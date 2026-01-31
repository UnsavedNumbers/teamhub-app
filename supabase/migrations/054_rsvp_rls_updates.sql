-- RSVP RLS Policy Updates
-- ========================
-- Separate explicit policies for general and athlete RSVPs

-- ============================================
-- EVENT_GENERAL_RSVPS RLS Policies
-- ============================================

-- Parents can manage their own general RSVPs
CREATE POLICY "Parents can manage their own general RSVPs" ON event_general_rsvps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND u.id = event_general_rsvps.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND u.id = event_general_rsvps.user_id
    )
  );

-- Coaches and admins can view general RSVPs for their team events
CREATE POLICY "Staff can view general RSVPs" ON event_general_rsvps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN teams t ON t.id = e.team_id
      JOIN users u ON u.id = auth.uid()
      WHERE e.id = event_general_rsvps.event_id
        AND u.role IN ('admin', 'coach')
        AND u.org_id = t.org_id
    )
  );

-- Platform admins can view all general RSVPs (read-only)
CREATE POLICY "Platform admins can view all general RSVPs" ON event_general_rsvps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'platform_admin'
    )
  );

-- ============================================
-- Update EVENT_RSVPS RLS Policies (athlete RSVPs)
-- ============================================

-- Note: Existing policies should already handle athlete RSVPs correctly
-- But we'll ensure they check eligibility

-- Drop and recreate parent policy to include eligibility check
DROP POLICY IF EXISTS "Parents can manage their children's RSVPs" ON event_rsvps;

CREATE POLICY "Parents can manage their children's RSVPs" ON event_rsvps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND c.id = event_rsvps.athlete_id
        AND is_child_eligible_for_event(c.id, event_rsvps.event_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND c.id = event_rsvps.athlete_id
        AND is_child_eligible_for_event(c.id, event_rsvps.event_id)
    )
  );
