-- Migration: 20260121000000_athlete_imports
-- Description: Creates imports audit table and RPC function for athlete spreadsheet imports

-- ============================================
-- 1. Create imports audit table
-- ============================================
CREATE TABLE IF NOT EXISTS athlete_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT, -- Path in storage bucket
  file_size_bytes INTEGER,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  results_json JSONB, -- Full results with per-row details
  error_summary JSONB, -- Summary of errors
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_athlete_imports_org_id ON athlete_imports(org_id);
CREATE INDEX IF NOT EXISTS idx_athlete_imports_created_by ON athlete_imports(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_athlete_imports_status ON athlete_imports(status);
CREATE INDEX IF NOT EXISTS idx_athlete_imports_created_at ON athlete_imports(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_athlete_imports_updated_at
  BEFORE UPDATE ON athlete_imports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE athlete_imports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Org admins can view imports for their org
CREATE POLICY "Org admins can view their org imports"
  ON athlete_imports
  FOR SELECT
  USING (
    user_is_org_admin(auth.uid(), org_id)
  );

-- RLS Policy: Org admins can create imports for their org
CREATE POLICY "Org admins can create imports"
  ON athlete_imports
  FOR INSERT
  WITH CHECK (
    user_is_org_admin(auth.uid(), org_id)
  );

-- RLS Policy: Org admins can update imports for their org
CREATE POLICY "Org admins can update their org imports"
  ON athlete_imports
  FOR UPDATE
  USING (
    user_is_org_admin(auth.uid(), org_id)
  );

-- ============================================
-- 2. Create RPC function for importing athletes
-- ============================================
CREATE OR REPLACE FUNCTION import_athletes_from_spreadsheet(
  p_org_id UUID,
  p_import_id UUID,
  p_rows JSONB,
  p_import_mode TEXT, -- 'create_only', 'update_and_create', 'update_only'
  p_team_id UUID DEFAULT NULL,
  p_season_id UUID DEFAULT NULL,
  p_assign_teams_from_spreadsheet BOOLEAN DEFAULT false,
  p_create_families BOOLEAN DEFAULT true,
  p_link_existing_families BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_row JSONB;
  v_result JSONB;
  v_imported_count INTEGER := 0;
  v_updated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_warnings JSONB := '[]'::JSONB;
  v_created_ids UUID[] := ARRAY[]::UUID[];
  v_row_result JSONB;
  v_child_id UUID;
  v_family_id UUID;
  v_guardian_email TEXT;
  v_team_id_to_assign UUID;
  v_season_id_to_assign UUID;
  v_team_name TEXT;
  v_season_name TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user is org admin
  IF NOT user_is_org_admin(v_user_id, p_org_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only org admins can import athletes'
    );
  END IF;

  -- Update import status to processing
  UPDATE athlete_imports
  SET status = 'processing', started_at = NOW()
  WHERE id = p_import_id AND org_id = p_org_id;

  -- Process each row
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    BEGIN
      -- Extract row data
      DECLARE
        v_first_name TEXT := v_row->>'athlete_first_name';
        v_last_name TEXT := v_row->>'athlete_last_name';
        v_dob DATE := (v_row->>'athlete_date_of_birth')::DATE;
        v_gender TEXT := v_row->>'athlete_gender';
        v_jersey_number TEXT := v_row->>'athlete_jersey_number';
        v_grade TEXT := v_row->>'athlete_grade';
        v_email TEXT := v_row->>'athlete_email';
        v_phone TEXT := v_row->>'athlete_phone';
        v_medical_notes TEXT := v_row->>'notes_medical';
        v_allergies TEXT := v_row->>'notes_allergies';
        v_guardian1_email TEXT := v_row->>'guardian1_email';
        v_guardian1_first_name TEXT := v_row->>'guardian1_first_name';
        v_guardian1_last_name TEXT := v_row->>'guardian1_last_name';
        v_guardian1_phone TEXT := v_row->>'guardian1_phone';
        v_guardian2_email TEXT := v_row->>'guardian2_email';
        v_guardian2_first_name TEXT := v_row->>'guardian2_first_name';
        v_guardian2_last_name TEXT := v_row->>'guardian2_last_name';
        v_guardian2_phone TEXT := v_row->>'guardian2_phone';
        v_team_name TEXT := v_row->>'team_name';
        v_season_name TEXT := v_row->>'season_name';
        v_membership_role TEXT := COALESCE(v_row->>'membership_role', 'player');
        v_row_number INTEGER := (v_row->>'row_number')::INTEGER;
        v_row_status TEXT := COALESCE(v_row->>'status', 'ready');
      BEGIN
        -- Skip rows with errors
        IF v_row_status = 'error' THEN
          v_error_count := v_error_count + 1;
          v_errors := v_errors || jsonb_build_object(
            'row_number', v_row_number,
            'message', COALESCE(v_row->>'error_message', 'Row marked as error')
          );
          CONTINUE;
        END IF;

        -- Validate required fields
        IF v_first_name IS NULL OR v_first_name = '' OR
           v_last_name IS NULL OR v_last_name = '' OR
           v_dob IS NULL THEN
          v_error_count := v_error_count + 1;
          v_errors := v_errors || jsonb_build_object(
            'row_number', v_row_number,
            'message', 'Missing required fields: first_name, last_name, or date_of_birth'
          );
          CONTINUE;
        END IF;

        -- Find or create family
        v_family_id := NULL;
        IF p_create_families THEN
          -- Try to find existing family by guardian email
          IF p_link_existing_families AND v_guardian1_email IS NOT NULL AND v_guardian1_email != '' THEN
            SELECT f.id INTO v_family_id
            FROM families f
            JOIN family_members fm ON fm.family_id = f.id
            JOIN users u ON u.id = fm.user_id
            WHERE f.org_id = p_org_id
              AND u.email = v_guardian1_email
            LIMIT 1;
          END IF;

          -- Create new family if not found
          IF v_family_id IS NULL THEN
            INSERT INTO families (org_id, name)
            VALUES (p_org_id, v_last_name || ' Family')
            RETURNING id INTO v_family_id;

            -- Create guardian users and link to family if provided
            IF v_guardian1_email IS NOT NULL AND v_guardian1_email != '' THEN
              -- Check if user exists
              DECLARE
                v_guardian1_user_id UUID;
              BEGIN
                SELECT id INTO v_guardian1_user_id
                FROM users
                WHERE email = v_guardian1_email
                LIMIT 1;

                -- Create user if doesn't exist (simplified - in production might want invite flow)
                IF v_guardian1_user_id IS NULL THEN
                  -- Note: User creation should be handled separately via auth flow
                  -- For now, we'll just create the family and note that guardian needs to be invited
                  NULL;
                ELSE
                  -- Link existing user to family
                  INSERT INTO family_members (family_id, user_id, role, is_primary)
                  VALUES (v_family_id, v_guardian1_user_id, 'owner', true)
                  ON CONFLICT DO NOTHING;
                END IF;
              END;
            END IF;
          END IF;
        END IF;

        -- Find existing child
        SELECT id INTO v_child_id
        FROM children
        WHERE family_id = v_family_id
          AND first_name = v_first_name
          AND last_name = v_last_name
          AND birthdate = v_dob
        LIMIT 1;

        -- Handle import mode
        IF v_child_id IS NOT NULL THEN
          -- Child exists
          IF p_import_mode = 'create_only' THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
          ELSIF p_import_mode IN ('update_and_create', 'update_only') THEN
            -- Update existing child (only non-null fields)
            UPDATE children
            SET 
              first_name = COALESCE(v_first_name, first_name),
              last_name = COALESCE(v_last_name, last_name),
              birthdate = COALESCE(v_dob, birthdate),
              updated_at = NOW()
            WHERE id = v_child_id;
            v_updated_count := v_updated_count + 1;
          END IF;
        ELSE
          -- Child doesn't exist
          IF p_import_mode = 'update_only' THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
          ELSE
            -- Create new child
            INSERT INTO children (family_id, first_name, last_name, birthdate)
            VALUES (v_family_id, v_first_name, v_last_name, v_dob)
            RETURNING id INTO v_child_id;
            v_imported_count := v_imported_count + 1;
            v_created_ids := v_created_ids || v_child_id;
          END IF;
        END IF;

        -- Assign to team if specified
        IF v_child_id IS NOT NULL THEN
          -- Determine team and season
          IF p_assign_teams_from_spreadsheet AND v_team_name IS NOT NULL THEN
            -- Look up team by name
            SELECT id INTO v_team_id_to_assign
            FROM teams
            WHERE org_id = p_org_id AND name = v_team_name
            LIMIT 1;

            -- Look up season by name
            IF v_season_name IS NOT NULL THEN
              SELECT id INTO v_season_id_to_assign
              FROM seasons
              WHERE org_id = p_org_id AND name = v_season_name
              LIMIT 1;
            END IF;
          ELSE
            -- Use provided team/season
            v_team_id_to_assign := p_team_id;
            v_season_id_to_assign := p_season_id;
          END IF;

          -- Create team membership if team and season are available
          IF v_team_id_to_assign IS NOT NULL AND v_season_id_to_assign IS NOT NULL THEN
            INSERT INTO team_memberships (child_id, team_id, season_id, status)
            VALUES (v_child_id, v_team_id_to_assign, v_season_id_to_assign, 'active')
            ON CONFLICT (child_id, team_id, season_id) DO NOTHING;
          END IF;
        END IF;

      EXCEPTION WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'row_number', v_row_number,
          'message', SQLERRM
        );
      END;
    END;
  END LOOP;

  -- Update import record with results
  UPDATE athlete_imports
  SET 
    status = 'completed',
    completed_at = NOW(),
    imported_count = v_imported_count,
    updated_count = v_updated_count,
    skipped_count = v_skipped_count,
    error_count = v_error_count,
    results_json = jsonb_build_object(
      'imported_count', v_imported_count,
      'updated_count', v_updated_count,
      'skipped_count', v_skipped_count,
      'error_count', v_error_count,
      'created_ids', v_created_ids,
      'errors', v_errors,
      'warnings', v_warnings
    ),
    error_summary = v_errors
  WHERE id = p_import_id;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'imported_count', v_imported_count,
    'updated_count', v_updated_count,
    'skipped_count', v_skipped_count,
    'error_count', v_error_count,
    'errors', v_errors
  );

EXCEPTION WHEN OTHERS THEN
  -- Update import record with error
  UPDATE athlete_imports
  SET 
    status = 'failed',
    completed_at = NOW(),
    error_summary = jsonb_build_object('error', SQLERRM)
  WHERE id = p_import_id;

  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users (RLS will enforce org admin check)
GRANT EXECUTE ON FUNCTION import_athletes_from_spreadsheet TO authenticated;

COMMENT ON FUNCTION import_athletes_from_spreadsheet IS 'Imports athletes from spreadsheet data. Requires org_admin role for the specified org_id.';
