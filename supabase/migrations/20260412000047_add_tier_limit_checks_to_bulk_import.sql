-- Migration: Add tier limit checks to bulk import function
-- Updates import_athletes_from_spreadsheet to check max_athletes and max_players_per_team limits
-- from tier_feature_assignments before creating athletes or assigning to teams

BEGIN;

-- Update import_athletes_from_spreadsheet function to check tier limits
CREATE OR REPLACE FUNCTION public.import_athletes_from_spreadsheet(
    p_org_id uuid, 
    p_import_id uuid, 
    p_rows jsonb, 
    p_import_mode text, 
    p_team_id uuid DEFAULT NULL::uuid, 
    p_season_id uuid DEFAULT NULL::uuid, 
    p_assign_teams_from_spreadsheet boolean DEFAULT false, 
    p_create_families boolean DEFAULT true, 
    p_link_existing_families boolean DEFAULT true
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
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
  -- Tier limit variables
  v_max_athletes_limit INTEGER;
  v_max_players_per_team_limit INTEGER;
  v_current_athlete_count INTEGER;
  v_current_team_membership_count INTEGER;
  v_effective_license_org_id UUID;
  v_current_tier_id UUID;
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

  -- Get effective license org_id (parent if sub-org, self if parent)
  SELECT public.get_effective_license_org_id(p_org_id) INTO v_effective_license_org_id;

  -- Get current tier_id for the effective license org
  SELECT o.current_tier_id INTO v_current_tier_id
  FROM organizations o
  WHERE o.id = v_effective_license_org_id;

  -- Get max_athletes limit from tier_feature_assignments (if tier exists)
  IF v_current_tier_id IS NOT NULL THEN
    SELECT tfa.limit_value INTO v_max_athletes_limit
    FROM tier_feature_assignments tfa
    JOIN feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
    WHERE tfa.license_tier_id = v_current_tier_id
      AND fe.feature_key = 'max_athletes'
      AND fe.feature_type = 'limit'
      AND tfa.included = true
      AND fe.archived_at IS NULL
    LIMIT 1;
  END IF;

  -- Count current athletes for this org (before import)
  SELECT COUNT(*) INTO v_current_athlete_count
  FROM athletes
  WHERE org_id = p_org_id
    AND deleted_at IS NULL;

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
                  ON CONFLICT (family_id, user_id) DO NOTHING;
                END IF;
              END;
            END IF;
          END IF;
        END IF;

        -- Find existing athlete (using athletes table, not children)
        SELECT id INTO v_child_id
        FROM athletes
        WHERE org_id = p_org_id
          AND first_name = v_first_name
          AND last_name = v_last_name
          AND birthdate = v_dob
        LIMIT 1;

        -- Handle import mode
        IF v_child_id IS NOT NULL THEN
          -- Athlete exists
          IF p_import_mode = 'create_only' THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
          ELSIF p_import_mode IN ('update_and_create', 'update_only') THEN
            -- Update existing athlete (only non-null fields)
            UPDATE athletes
            SET 
              first_name = COALESCE(v_first_name, first_name),
              last_name = COALESCE(v_last_name, last_name),
              birthdate = COALESCE(v_dob, birthdate),
              updated_at = NOW()
            WHERE id = v_child_id;
            v_updated_count := v_updated_count + 1;
          END IF;
        ELSE
          -- Athlete doesn't exist
          IF p_import_mode = 'update_only' THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
          ELSE
            -- Check max_athletes limit before creating new athlete
            IF v_max_athletes_limit IS NOT NULL THEN
              IF v_current_athlete_count >= v_max_athletes_limit THEN
                v_error_count := v_error_count + 1;
                v_errors := v_errors || jsonb_build_object(
                  'row_number', v_row_number,
                  'message', format('Athlete limit reached (%s athletes). Upgrade your plan to add more athletes.', v_max_athletes_limit)
                );
                CONTINUE;
              END IF;
            END IF;

            -- Create new athlete
            INSERT INTO athletes (org_id, family_id, first_name, last_name, birthdate)
            VALUES (p_org_id, v_family_id, v_first_name, v_last_name, v_dob)
            RETURNING id INTO v_child_id;
            v_imported_count := v_imported_count + 1;
            v_current_athlete_count := v_current_athlete_count + 1;
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
            -- Check max_players_per_team limit before assigning
            IF v_current_tier_id IS NOT NULL THEN
              -- Get max_players_per_team limit for this tier
              SELECT tfa.limit_value INTO v_max_players_per_team_limit
              FROM tier_feature_assignments tfa
              JOIN feature_entitlements fe ON tfa.feature_entitlement_id = fe.id
              WHERE tfa.license_tier_id = v_current_tier_id
                AND fe.feature_key = 'max_players_per_team'
                AND fe.feature_type = 'limit'
                AND tfa.included = true
                AND fe.archived_at IS NULL
              LIMIT 1;

              -- Count current active memberships for this team/season
              IF v_max_players_per_team_limit IS NOT NULL THEN
                SELECT COUNT(*) INTO v_current_team_membership_count
                FROM team_memberships
                WHERE team_id = v_team_id_to_assign
                  AND season_id = v_season_id_to_assign
                  AND status = 'active';

                -- Check if adding this athlete would exceed the limit
                IF v_current_team_membership_count >= v_max_players_per_team_limit THEN
                  v_warnings := v_warnings || jsonb_build_object(
                    'row_number', v_row_number,
                    'message', format('Team roster limit reached (%s players). Athlete created but not assigned to team.', v_max_players_per_team_limit)
                  );
                  -- Skip team assignment but continue (athlete was already created)
                  CONTINUE;
                END IF;
              END IF;
            END IF;

            -- Create team membership (using athlete_id column)
            INSERT INTO team_memberships (athlete_id, team_id, season_id, status)
            VALUES (v_child_id, v_team_id_to_assign, v_season_id_to_assign, 'active')
            ON CONFLICT (athlete_id, team_id, season_id) DO NOTHING;
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
    'errors', v_errors,
    'warnings', v_warnings
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

COMMIT;
