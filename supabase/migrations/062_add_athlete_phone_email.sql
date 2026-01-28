-- Migration: Add phone and email fields to athletes table
-- ========================================================
-- Adds phone and email columns to athletes table and updates
-- the create_athlete_with_guardians RPC function to handle these fields.
-- Both fields are nullable (optional) to maintain backward compatibility.

-- ==============================================
-- Add phone and email columns to athletes table
-- ==============================================
ALTER TABLE athletes 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Add comments for documentation
COMMENT ON COLUMN athletes.phone IS 'Athlete phone number';
COMMENT ON COLUMN athletes.email IS 'Athlete email address';

-- ==============================================
-- Add database constraints for basic validation
-- ==============================================
-- These constraints serve as a safety net - application validation is primary
ALTER TABLE athletes 
  ADD CONSTRAINT athletes_email_format CHECK (email IS NULL OR email ~ '@'),
  ADD CONSTRAINT athletes_phone_length CHECK (phone IS NULL OR LENGTH(phone) <= 50);

-- ==============================================
-- Update create_athlete_with_guardians function
-- ==============================================
CREATE OR REPLACE FUNCTION create_athlete_with_guardians(
  p_org_id UUID,
  p_athlete_data JSONB,
  p_guardians JSONB[] DEFAULT '{}',
  p_athlete_sports JSONB[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_athlete_id UUID;
  v_guardian JSONB;
  v_result JSONB;
  v_guardian_results JSONB[] := '{}';
  v_created_by UUID;
  v_sport JSONB;
  v_sport_id UUID;
  v_sport_type TEXT;
  v_sport_exists BOOLEAN;
BEGIN
  -- Get current user
  v_created_by := auth.uid();
  
  -- Validate required fields
  IF p_athlete_data->>'first_name' IS NULL OR TRIM(p_athlete_data->>'first_name') = '' THEN
    RAISE EXCEPTION 'first_name is required';
  END IF;
  
  IF p_athlete_data->>'last_name' IS NULL OR TRIM(p_athlete_data->>'last_name') = '' THEN
    RAISE EXCEPTION 'last_name is required';
  END IF;
  
  -- Create athlete
  INSERT INTO athletes (
    first_name,
    last_name,
    birthdate,
    gender,
    preferred_name,
    jersey_number,
    medical_notes,
    allergies,
    emergency_contact_name,
    emergency_contact_phone,
    phone,  -- NEW
    email,  -- NEW
    family_id,  -- Still nullable, for backward compatibility
    created_at,
    updated_at
  )
  VALUES (
    TRIM(p_athlete_data->>'first_name'),
    TRIM(p_athlete_data->>'last_name'),
    NULLIF(p_athlete_data->>'birthdate', '')::DATE,
    NULLIF(p_athlete_data->>'gender', ''),
    NULLIF(p_athlete_data->>'preferred_name', ''),
    NULLIF(p_athlete_data->>'jersey_number', ''),
    NULLIF(p_athlete_data->>'medical_notes', ''),
    NULLIF(p_athlete_data->>'allergies', ''),
    NULLIF(p_athlete_data->>'emergency_contact_name', ''),
    NULLIF(p_athlete_data->>'emergency_contact_phone', ''),
    NULLIF(p_athlete_data->>'phone', ''),  -- NEW - empty string becomes NULL
    NULLIF(p_athlete_data->>'email', ''),  -- NEW - empty string becomes NULL
    NULLIF(p_athlete_data->>'family_id', '')::UUID,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_athlete_id;
  
  -- Link each guardian (all must succeed or transaction rolls back)
  FOREACH v_guardian IN ARRAY p_guardians LOOP
    -- Validate guardian email
    IF v_guardian->>'email' IS NULL OR TRIM(v_guardian->>'email') = '' THEN
      RAISE EXCEPTION 'Guardian email is required';
    END IF;
    
    -- Link guardian
    v_result := link_guardian_to_athlete(
      v_athlete_id,
      v_guardian->>'email',
      p_org_id,
      COALESCE(v_guardian->>'relationship_type', 'parent'),
      v_created_by
    );
    
    -- Add to results array
    v_guardian_results := array_append(v_guardian_results, v_result);
  END LOOP;
  
  -- Link each sport (all must succeed or transaction rolls back)
  FOREACH v_sport IN ARRAY p_athlete_sports LOOP
    -- Extract sport_id and sport_type
    v_sport_id := (v_sport->>'sport_id')::UUID;
    v_sport_type := COALESCE(v_sport->>'sport_type', 'plays');
    
    -- Validate sport_id is provided
    IF v_sport_id IS NULL THEN
      RAISE EXCEPTION 'sport_id is required for each sport';
    END IF;
    
    -- Validate sport_type is valid
    IF v_sport_type NOT IN ('plays', 'interested') THEN
      RAISE EXCEPTION 'sport_type must be "plays" or "interested", got: %', v_sport_type;
    END IF;
    
    -- Validate sport exists and is a system sport
    SELECT EXISTS (
      SELECT 1 FROM sports 
      WHERE id = v_sport_id 
        AND (org_id IS NULL OR is_system = true)
    ) INTO v_sport_exists;
    
    IF NOT v_sport_exists THEN
      RAISE EXCEPTION 'Invalid sport_id: % (must be a system sport)', v_sport_id;
    END IF;
    
    -- Insert athlete sport relationship
    INSERT INTO athlete_sports (
      athlete_id,
      sport_id,
      org_id,
      sport_type
    )
    VALUES (
      v_athlete_id,
      v_sport_id,
      p_org_id,
      v_sport_type
    )
    ON CONFLICT (athlete_id, sport_id, org_id, sport_type) DO NOTHING;
  END LOOP;
  
  -- If team_id and season_id provided, create team membership
  IF p_athlete_data->>'team_id' IS NOT NULL 
     AND p_athlete_data->>'season_id' IS NOT NULL THEN
    INSERT INTO team_memberships (
      athlete_id,
      team_id,
      season_id,
      org_id,
      status,
      created_at
    )
    VALUES (
      v_athlete_id,
      (p_athlete_data->>'team_id')::UUID,
      (p_athlete_data->>'season_id')::UUID,
      p_org_id,
      'active',
      NOW()
    )
    ON CONFLICT (athlete_id, team_id, season_id) DO NOTHING;
  END IF;
  
  -- Return success with all details
  RETURN jsonb_build_object(
    'success', true,
    'athlete_id', v_athlete_id,
    'guardians', v_guardian_results,
    'guardian_count', ARRAY_LENGTH(v_guardian_results, 1),
    'sport_count', ARRAY_LENGTH(p_athlete_sports, 1)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception to rollback transaction
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_athlete_with_guardians(UUID, JSONB, JSONB[], JSONB[]) IS 'Atomically creates an athlete, links guardians, and links sports. All operations succeed or fail together. Returns athlete_id, guardian linking results, and sport count. Now includes phone and email fields.';
