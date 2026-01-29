-- Phase 15: Tryouts - RLS Hardening + RPCs + Storage Policies
-- ==========================================================
-- - Fixes overly-broad tryouts-related RLS policies
-- - Adds RLS for new tryouts tables (sports/programs/criteria/docs/etc.)
-- - Creates RPCs for safe registration and team-member conversion
-- - Creates private Storage bucket and policies for tryout documents

-- -----------------------------------------------------------------
-- Helper predicates (inlined in policies)
-- Notes:
-- - Prefer new multi-org helpers when available (user_has_org_access/user_is_org_admin).
-- - Fall back to legacy users.role/org_id where appropriate for compatibility.
-- -----------------------------------------------------------------

-- -----------------------------------------------------------------
-- SPORTS / PROGRAMS RLS
-- -----------------------------------------------------------------
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sports" ON sports;
CREATE POLICY "Users can view sports" ON sports
  FOR SELECT
  USING (
    user_has_org_access(auth.uid(), org_id)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.org_id = sports.org_id)
  );

DROP POLICY IF EXISTS "Org admins can manage sports" ON sports;
CREATE POLICY "Org admins can manage sports" ON sports
  FOR ALL
  USING (
    user_is_org_admin(auth.uid(), org_id)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.org_id = sports.org_id)
  );

DROP POLICY IF EXISTS "Users can view programs" ON programs;
CREATE POLICY "Users can view programs" ON programs
  FOR SELECT
  USING (
    user_has_org_access(auth.uid(), org_id)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.org_id = programs.org_id)
  );

DROP POLICY IF EXISTS "Org admins can manage programs" ON programs;
CREATE POLICY "Org admins can manage programs" ON programs
  FOR ALL
  USING (
    user_is_org_admin(auth.uid(), org_id)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.org_id = programs.org_id)
  );

-- -----------------------------------------------------------------
-- TRYOUT_TEAMS RLS
-- -----------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tryout_teams') THEN
    DROP POLICY IF EXISTS "Anyone can view tryout teams" ON tryout_teams;
    CREATE POLICY "Anyone can view tryout teams" ON tryout_teams
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM tryouts t WHERE t.id = tryout_teams.tryout_id)
      );

    DROP POLICY IF EXISTS "Org admins can manage tryout teams" ON tryout_teams;
    CREATE POLICY "Org admins can manage tryout teams" ON tryout_teams
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM tryouts t
          WHERE t.id = tryout_teams.tryout_id
            AND (
              user_is_org_admin(auth.uid(), t.org_id)
              OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.org_id = t.org_id)
            )
        )
      );
  END IF;
END $$;

-- -----------------------------------------------------------------
-- TRYOUT_CRITERIA RLS
-- -----------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tryout_criteria') THEN
    DROP POLICY IF EXISTS "Anyone can view tryout criteria" ON tryout_criteria;
    CREATE POLICY "Anyone can view tryout criteria" ON tryout_criteria
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM tryouts t WHERE t.id = tryout_criteria.tryout_id)
      );

    DROP POLICY IF EXISTS "Org admins can manage tryout criteria" ON tryout_criteria;
    CREATE POLICY "Org admins can manage tryout criteria" ON tryout_criteria
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM tryouts t
          WHERE t.id = tryout_criteria.tryout_id
            AND (
              user_is_org_admin(auth.uid(), t.org_id)
              OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.org_id = t.org_id)
            )
        )
      );
  END IF;
END $$;

-- -----------------------------------------------------------------
-- TRYOUT_REQUIRED_DOCUMENTS RLS (parents need to see the checklist)
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view tryout required documents" ON tryout_required_documents;
CREATE POLICY "Anyone can view tryout required documents" ON tryout_required_documents
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tryouts t WHERE t.id = tryout_required_documents.tryout_id)
  );

DROP POLICY IF EXISTS "Org admins can manage tryout required documents" ON tryout_required_documents;
CREATE POLICY "Org admins can manage tryout required documents" ON tryout_required_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM tryouts t
      WHERE t.id = tryout_required_documents.tryout_id
        AND (
          user_is_org_admin(auth.uid(), t.org_id)
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.org_id = t.org_id)
        )
    )
  );

-- -----------------------------------------------------------------
-- TRYOUT_REGISTRATION_DOCUMENTS RLS
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can manage tryout registration documents" ON tryout_registration_documents;
CREATE POLICY "Parents can manage tryout registration documents" ON tryout_registration_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM tryout_registrations r
      JOIN users u ON u.id = auth.uid()
      WHERE r.id = tryout_registration_documents.registration_id
        AND u.role = 'parent'
        AND u.family_id = r.family_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tryout_registrations r
      JOIN users u ON u.id = auth.uid()
      WHERE r.id = tryout_registration_documents.registration_id
        AND u.role = 'parent'
        AND u.family_id = r.family_id
    )
  );

DROP POLICY IF EXISTS "Staff can view tryout registration documents" ON tryout_registration_documents;
CREATE POLICY "Staff can view tryout registration documents" ON tryout_registration_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tryout_registrations r
      JOIN tryouts t ON t.id = r.tryout_id
      WHERE r.id = tryout_registration_documents.registration_id
        AND (
          user_has_org_access(auth.uid(), t.org_id)
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','coach') AND u.org_id = t.org_id)
        )
    )
  );

-- -----------------------------------------------------------------
-- TRYOUT_REGISTRATION_STAFF_NOTES RLS (staff-only)
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage tryout staff notes" ON tryout_registration_staff_notes;
CREATE POLICY "Staff can manage tryout staff notes" ON tryout_registration_staff_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM tryout_registrations r
      JOIN tryouts t ON t.id = r.tryout_id
      WHERE r.id = tryout_registration_staff_notes.registration_id
        AND (
          user_has_org_access(auth.uid(), t.org_id)
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','coach') AND u.org_id = t.org_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tryout_registrations r
      JOIN tryouts t ON t.id = r.tryout_id
      WHERE r.id = tryout_registration_staff_notes.registration_id
        AND (
          user_has_org_access(auth.uid(), t.org_id)
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','coach') AND u.org_id = t.org_id)
        )
    )
  );

-- -----------------------------------------------------------------
-- TRYOUT_SCORES RLS (fix: previously not org-scoped)
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "Coaches can create scores" ON tryout_scores;
DROP POLICY IF EXISTS "Staff can view scores" ON tryout_scores;

CREATE POLICY "Staff can manage tryout scores" ON tryout_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM tryout_registrations r
      JOIN tryouts t ON t.id = r.tryout_id
      WHERE r.id = tryout_scores.registration_id
        AND (
          user_has_org_access(auth.uid(), t.org_id)
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','coach') AND u.org_id = t.org_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tryout_registrations r
      JOIN tryouts t ON t.id = r.tryout_id
      WHERE r.id = tryout_scores.registration_id
        AND (
          user_has_org_access(auth.uid(), t.org_id)
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','coach') AND u.org_id = t.org_id)
        )
    )
  );

-- -----------------------------------------------------------------
-- STORAGE: private bucket + policies on storage.objects
-- -----------------------------------------------------------------
-- Create bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'tryout-documents') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('tryout-documents', 'tryout-documents', false);
  END IF;
END $$;

-- Policies for storage.objects for tryout-documents
-- The object name is expected to match tryout_registration_documents.storage_path
-- Example: org/{org_id}/tryouts/{tryout_id}/registrations/{registration_id}/{doc_key}/{filename}

DROP POLICY IF EXISTS "Tryout docs: parents can read own objects" ON storage.objects;
CREATE POLICY "Tryout docs: parents can read own objects" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'tryout-documents'
    AND EXISTS (
      SELECT 1
      FROM tryout_registration_documents d
      JOIN tryout_registrations r ON r.id = d.registration_id
      JOIN users u ON u.id = auth.uid()
      WHERE d.storage_path = storage.objects.name
        AND u.role = 'parent'
        AND u.family_id = r.family_id
    )
  );

DROP POLICY IF EXISTS "Tryout docs: staff can read org objects" ON storage.objects;
CREATE POLICY "Tryout docs: staff can read org objects" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'tryout-documents'
    AND EXISTS (
      SELECT 1
      FROM tryout_registration_documents d
      JOIN tryout_registrations r ON r.id = d.registration_id
      JOIN tryouts t ON t.id = r.tryout_id
      WHERE d.storage_path = storage.objects.name
        AND (
          user_has_org_access(auth.uid(), t.org_id)
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','coach') AND u.org_id = t.org_id)
        )
    )
  );

DROP POLICY IF EXISTS "Tryout docs: parents can upload own objects" ON storage.objects;
CREATE POLICY "Tryout docs: parents can upload own objects" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tryout-documents'
    AND EXISTS (
      SELECT 1
      FROM tryout_registration_documents d
      JOIN tryout_registrations r ON r.id = d.registration_id
      JOIN users u ON u.id = auth.uid()
      WHERE d.storage_path = storage.objects.name
        AND u.role = 'parent'
        AND u.family_id = r.family_id
    )
  );

DROP POLICY IF EXISTS "Tryout docs: parents can update own objects" ON storage.objects;
CREATE POLICY "Tryout docs: parents can update own objects" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'tryout-documents'
    AND EXISTS (
      SELECT 1
      FROM tryout_registration_documents d
      JOIN tryout_registrations r ON r.id = d.registration_id
      JOIN users u ON u.id = auth.uid()
      WHERE d.storage_path = storage.objects.name
        AND u.role = 'parent'
        AND u.family_id = r.family_id
    )
  );

DROP POLICY IF EXISTS "Tryout docs: parents can delete own objects" ON storage.objects;
CREATE POLICY "Tryout docs: parents can delete own objects" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'tryout-documents'
    AND EXISTS (
      SELECT 1
      FROM tryout_registration_documents d
      JOIN tryout_registrations r ON r.id = d.registration_id
      JOIN users u ON u.id = auth.uid()
      WHERE d.storage_path = storage.objects.name
        AND u.role = 'parent'
        AND u.family_id = r.family_id
    )
  );

-- -----------------------------------------------------------------
-- RPC: register_child_for_tryout (capacity + deadline + ownership)
-- -----------------------------------------------------------------
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

  -- Verify child belongs to family
  IF NOT EXISTS (
    SELECT 1 FROM athletes c
    WHERE c.id = p_child_id AND c.family_id = v_family_id
  ) THEN
    RAISE EXCEPTION 'Child does not belong to user family';
  END IF;

  -- Lock tryout row to prevent capacity races
  SELECT t.org_id, t.registration_deadline_at, COALESCE(t.capacity, t.max_spots)
    INTO v_tryout_org_id, v_deadline, v_capacity
  FROM tryouts t
  WHERE t.id = p_tryout_id
  FOR UPDATE;

  IF v_tryout_org_id IS NULL THEN
    RAISE EXCEPTION 'Tryout not found';
  END IF;

  -- Verify org access (multi-org aware, legacy fallback)
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

  INSERT INTO tryout_registrations (tryout_id, child_id, family_id, status)
  VALUES (p_tryout_id, p_child_id, v_family_id, 'registered')
  ON CONFLICT (tryout_id, child_id) DO UPDATE
    SET status = 'registered',
        updated_at = NOW()
  RETURNING id INTO v_registration_id;

  -- Pre-create document rows for required docs (status=missing) for this registration
  INSERT INTO tryout_registration_documents (registration_id, required_document_id, status)
  SELECT v_registration_id, rd.id, 'missing'
  FROM tryout_required_documents rd
  WHERE rd.tryout_id = p_tryout_id
  ON CONFLICT (registration_id, required_document_id) DO NOTHING;

  RETURN v_registration_id;
END;
$$;

-- -----------------------------------------------------------------
-- RPC: convert_accepted_tryout_registration_to_team_member
-- -----------------------------------------------------------------
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

  -- Must be staff in org
  IF NOT (
    user_has_org_access(v_user_id, v_org_id)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = v_user_id AND u.role IN ('admin','coach') AND u.org_id = v_org_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Verify team belongs to org
  IF NOT EXISTS (
    SELECT 1 FROM teams tm
    WHERE tm.id = p_team_id AND tm.org_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Team does not belong to organization';
  END IF;

  -- Verify season belongs to org via seasons.org_id when available, or via team
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

  INSERT INTO team_memberships (child_id, team_id, season_id, status)
  VALUES (v_child_id, p_team_id, p_season_id, 'active')
  ON CONFLICT (child_id, team_id, season_id) DO UPDATE
    SET status = 'active',
        updated_at = NOW()
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

