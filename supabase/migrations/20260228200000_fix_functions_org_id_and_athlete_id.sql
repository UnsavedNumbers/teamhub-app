-- Ensure all functions use org_id (not organization_id) and athlete_id (not child_id)
-- where tables have been renamed. Fixes event_rsvps policy, tryout RPCs, and import RPC.

-- =============================================================================
-- 1) event_rsvps: "Parents can manage family RSVPs" policy (use athlete_id only)
-- =============================================================================

DROP POLICY IF EXISTS "Parents can manage family RSVPs" ON event_rsvps;
CREATE POLICY "Parents can manage family RSVPs" ON event_rsvps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM athletes c
      JOIN users u ON u.family_id = c.family_id
      WHERE c.id = event_rsvps.athlete_id
      AND u.id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM athletes c
      JOIN users u ON u.family_id = c.family_id
      WHERE c.id = event_rsvps.athlete_id
      AND u.id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- 2) register_child_for_tryout: use athlete_id in tryout_registrations
-- =============================================================================

CREATE OR REPLACE FUNCTION register_child_for_tryout(p_tryout_id UUID, p_child_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_family_id UUID;
  v_tryout_org_id UUID;
  v_deadline TIMESTAMPTZ;
  v_capacity INTEGER;
  v_active_count INTEGER;
  v_registration_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT u.family_id INTO v_family_id
  FROM users u
  WHERE u.id = v_user_id;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'User is not a parent with a family';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM athletes c
    WHERE c.id = p_child_id AND c.family_id = v_family_id
  ) THEN
    RAISE EXCEPTION 'Child does not belong to user family';
  END IF;

  SELECT t.org_id, t.registration_deadline_at, COALESCE(t.capacity, t.max_spots)
    INTO v_tryout_org_id, v_deadline, v_capacity
  FROM tryouts t
  WHERE t.id = p_tryout_id
  FOR UPDATE;

  IF v_tryout_org_id IS NULL THEN
    RAISE EXCEPTION 'Tryout not found';
  END IF;

  IF NOT (
    user_has_org_access(v_user_id, v_tryout_org_id)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = v_user_id AND u.org_id = v_tryout_org_id)
  ) THEN
    RAISE EXCEPTION 'No access to this organization';
  END IF;

  IF v_deadline IS NOT NULL AND NOW() > v_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  IF v_capacity IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active_count
    FROM tryout_registrations r
    WHERE r.tryout_id = p_tryout_id
      AND r.status <> 'withdrawn';

    IF v_active_count >= v_capacity THEN
      RAISE EXCEPTION 'Tryout is at capacity';
    END IF;
  END IF;

  INSERT INTO tryout_registrations (tryout_id, athlete_id, family_id, status)
  VALUES (p_tryout_id, p_child_id, v_family_id, 'registered')
  ON CONFLICT (tryout_id, athlete_id) DO UPDATE
    SET status = 'registered',
        updated_at = NOW()
  RETURNING id INTO v_registration_id;

  INSERT INTO tryout_registration_documents (registration_id, required_document_id, status)
  SELECT v_registration_id, rd.id, 'missing'
  FROM tryout_required_documents rd
  WHERE rd.tryout_id = p_tryout_id
  ON CONFLICT (registration_id, required_document_id) DO NOTHING;

  RETURN v_registration_id;
END;
$$;

-- =============================================================================
-- 3) convert_accepted_tryout_registration_to_team_member: use athlete_id in team_memberships
-- =============================================================================

CREATE OR REPLACE FUNCTION convert_accepted_tryout_registration_to_team_member(
  p_registration_id UUID,
  p_team_id UUID,
  p_season_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_child_id UUID;
  v_tryout_id UUID;
  v_org_id UUID;
  v_membership_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.athlete_id, r.tryout_id
    INTO v_child_id, v_tryout_id
  FROM tryout_registrations r
  WHERE r.id = p_registration_id;

  IF v_tryout_id IS NULL THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  SELECT t.org_id INTO v_org_id
  FROM tryouts t
  WHERE t.id = v_tryout_id;

  IF NOT (
    user_has_org_access(v_user_id, v_org_id)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = v_user_id AND u.role IN ('admin','coach') AND u.org_id = v_org_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM teams tm
    WHERE tm.id = p_team_id AND tm.org_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Team does not belong to organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM seasons s
    WHERE s.id = p_season_id
      AND (
        (s.org_id IS NOT NULL AND s.org_id = v_org_id)
        OR (s.team_id = p_team_id)
      )
  ) THEN
    RAISE EXCEPTION 'Season does not belong to organization/team';
  END IF;

  INSERT INTO team_memberships (athlete_id, team_id, season_id, status)
  VALUES (v_child_id, p_team_id, p_season_id, 'active')
  ON CONFLICT (athlete_id, team_id, season_id) DO UPDATE
    SET status = 'active',
        updated_at = NOW()
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

-- =============================================================================
-- 4) import_athletes_from_spreadsheet: fix team_memberships insert to use athlete_id
-- =============================================================================

DO $$
DECLARE
  v_oid OID;
  v_src TEXT;
BEGIN
  SELECT p.oid, p.prosrc INTO v_oid, v_src
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'import_athletes_from_spreadsheet';

  IF v_oid IS NOT NULL AND v_src IS NOT NULL THEN
    v_src := replace(v_src, 'INSERT INTO team_memberships (child_id, team_id, season_id, status)', 'INSERT INTO team_memberships (athlete_id, team_id, season_id, status)');
    v_src := replace(v_src, 'ON CONFLICT (child_id, team_id, season_id)', 'ON CONFLICT (athlete_id, team_id, season_id)');
    UPDATE pg_proc SET prosrc = v_src WHERE oid = v_oid;
  END IF;
END $$;
