-- Fix references to team_memberships.child_id (renamed to athlete_id in 20260122000000)
-- and other child_id columns on team_memberships, attendance, payments, event_rsvps.
-- Updates functions, triggers, and RLS policies that still reference the old column names.

-- Note: payments.child_id -> athlete_id is done in 20260228175000 so it commits before policies run.

-- =============================================================================
-- 1) RSVP trigger functions (052_rsvp_system_updates)
-- =============================================================================

CREATE OR REPLACE FUNCTION create_rsvps_for_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rsvp_enabled = true AND NEW.rsvp_type = 'athlete' THEN
    INSERT INTO event_rsvps (event_id, athlete_id, status)
    SELECT
      NEW.id,
      tm.athlete_id,
      'unknown'
    FROM team_memberships tm
    WHERE tm.team_id = NEW.team_id
      AND tm.season_id = NEW.season_id
      AND tm.status = 'active'
    ON CONFLICT (event_id, athlete_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_rsvps_for_new_team_member()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO event_rsvps (event_id, athlete_id, status)
    SELECT
      e.id,
      NEW.athlete_id,
      'unknown'
    FROM events e
    WHERE e.team_id = NEW.team_id
      AND e.season_id = NEW.season_id
      AND e.rsvp_enabled = true
      AND e.rsvp_type = 'athlete'
      AND e.start_time > NOW()
    ON CONFLICT (event_id, athlete_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 2) RSVP config function (053_rsvp_config_functions)
-- =============================================================================

CREATE OR REPLACE FUNCTION is_child_eligible_for_event(
  p_child_id UUID,
  p_event_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN events e ON e.team_id = tm.team_id AND e.season_id = tm.season_id
    WHERE tm.athlete_id = p_child_id
      AND e.id = p_event_id
      AND tm.status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- 3) Uniform kits helper (20260116090000_uniform_kits)
-- =============================================================================

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

-- =============================================================================
-- 4) Travel recipient emails (035_travel_notification_outbox, 20260117100020)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.travel_recipient_emails(team_id_in UUID)
RETURNS TABLE(email TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT u.email
  FROM public.users u
  JOIN public.athletes c ON c.family_id = u.family_id
  JOIN public.team_memberships tm ON tm.athlete_id = c.id
  WHERE u.role = 'parent'
    AND tm.team_id = team_id_in
    AND tm.status = 'active'
    AND u.email IS NOT NULL
    AND u.email <> '';
$$;

CREATE OR REPLACE FUNCTION travel_event_recipient_emails(p_team_id UUID)
RETURNS TABLE(email TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT u.email
  FROM users u
  JOIN athletes c ON c.family_id = u.family_id
  JOIN team_memberships tm ON tm.athlete_id = c.id
  WHERE u.role = 'parent'
    AND tm.team_id = p_team_id
    AND tm.status = 'active'
    AND u.email IS NOT NULL
    AND u.email <> '';
$$;

-- =============================================================================
-- 5) Uniform kit roster (20260116090020_uniform_kits_rpc)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_uniform_kit_roster(p_kit_id UUID)
RETURNS TABLE (
  child_id UUID,
  first_name TEXT,
  last_name TEXT,
  team_id UUID,
  season_id UUID,
  kit_id UUID,
  kit_name TEXT,
  deadline_at TIMESTAMPTZ,
  kit_locked_at TIMESTAMPTZ,
  submission_id UUID,
  submission_status uniform_submission_status,
  submitted_at TIMESTAMPTZ,
  submission_locked_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  items JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH kit AS (
    SELECT k.*
    FROM uniform_kits k
    WHERE k.id = p_kit_id
  ),
  roster AS (
    SELECT tm.athlete_id, tm.team_id, tm.season_id
    FROM kit
    JOIN team_memberships tm
      ON tm.team_id = kit.team_id
     AND tm.season_id = kit.season_id
     AND tm.status = 'active'
  ),
  subs AS (
    SELECT s.*
    FROM uniform_submissions s
    WHERE s.kit_id = p_kit_id
  )
  SELECT
    c.id AS child_id,
    c.first_name,
    c.last_name,
    kit.team_id,
    kit.season_id,
    kit.id AS kit_id,
    kit.name AS kit_name,
    kit.deadline_at,
    kit.locked_at AS kit_locked_at,
    s.id AS submission_id,
    COALESCE(s.status, 'not_submitted'::uniform_submission_status) AS submission_status,
    s.submitted_at,
    s.locked_at AS submission_locked_at,
    s.fulfilled_at,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'item_id', ki.id,
          'name', ki.name,
          'required', ki.required,
          'sort_order', ki.sort_order,
          'size_options', ki.size_options,
          'size', si.size
        )
        ORDER BY ki.sort_order, ki.name
      ), '[]'::jsonb)
      FROM uniform_kit_items ki
      LEFT JOIN uniform_submission_items si
        ON si.item_id = ki.id
       AND si.submission_id = s.id
      WHERE ki.kit_id = kit.id
    ) AS items
  FROM kit
  JOIN roster r ON true
  JOIN athletes c ON c.id = r.athlete_id
  LEFT JOIN subs s
    ON s.kit_id = kit.id
   AND s.athlete_id = c.id
  WHERE staff_can_access_team(auth.uid(), kit.team_id)
  ORDER BY c.last_name, c.first_name;
$$;

-- =============================================================================
-- 6) RLS policies that reference tm.child_id or team_memberships.child_id
-- =============================================================================

DROP POLICY IF EXISTS "Parents can view their teams" ON teams;
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

DROP POLICY IF EXISTS "Parents can view their seasons" ON seasons;
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

DROP POLICY IF EXISTS "Coaches can view team children" ON athletes;
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

DROP POLICY IF EXISTS "Parents can view their memberships" ON team_memberships;
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

DROP POLICY IF EXISTS "Parents can view their events" ON events;
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

DROP POLICY IF EXISTS "Parents can manage their children's attendance" ON attendance;
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

DROP POLICY IF EXISTS "Parents can view their payments" ON payments;
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

DROP POLICY IF EXISTS "Parents can view travel plans" ON travel_plans;
CREATE POLICY "Parents can view travel plans" ON travel_plans
  FOR SELECT
  USING (
    status IN ('published', 'cancelled')
    AND EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.athletes c ON c.family_id = u.family_id
      JOIN public.team_memberships tm ON tm.athlete_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND tm.team_id = travel_plans.team_id
      AND tm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Team members can view announcements" ON announcements;
CREATE POLICY "Team members can view announcements" ON announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = announcements.team_id
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'coach')
      AND u.org_id = t.org_id
    )
    OR
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

DROP POLICY IF EXISTS "Team members can send messages" ON messages;
CREATE POLICY "Team members can send messages" ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = messages.team_id
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'coach')
      AND u.org_id = t.org_id
    )
    OR
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

DROP POLICY IF EXISTS "Team members can view messages" ON messages;
CREATE POLICY "Team members can view messages" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teams t ON t.id = messages.team_id
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'coach')
      AND u.org_id = t.org_id
    )
    OR
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

-- =============================================================================
-- 7) Storage policy (034_travel_itineraries_storage)
-- =============================================================================

DROP POLICY IF EXISTS "Parents can read travel itineraries objects for their teams" ON storage.objects;
CREATE POLICY "Parents can read travel itineraries objects for their teams" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'travel-itineraries'
    AND EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.athletes c ON c.family_id = u.family_id
      JOIN public.team_memberships tm ON tm.athlete_id = c.id
      JOIN public.travel_plans tp
        ON tp.team_id = tm.team_id
       AND tp.itinerary_file_path = storage.objects.name
      WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND tm.status = 'active'
        AND tp.status IN ('published', 'cancelled')
    )
  );

-- =============================================================================
-- 8) Travel plans policy from 033 (if different from 017 - same name, same table)
-- Already recreated above as "Parents can view travel plans" on travel_plans.
-- =============================================================================
