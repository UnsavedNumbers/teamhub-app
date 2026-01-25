-- Add missing columns to athletes table
-- These columns are referenced in RPC functions and TypeScript code but were missing from the schema

-- Add jersey_number column to athletes table
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS jersey_number TEXT;

-- Add medical_notes column to athletes table
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS medical_notes TEXT;

-- Add allergies column to athletes table
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS allergies TEXT;

-- Add emergency_contact_name column to athletes table
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;

-- Add emergency_contact_phone column to athletes table
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- Add comments for documentation
COMMENT ON COLUMN athletes.medical_notes IS 'Medical notes and information for the athlete';
COMMENT ON COLUMN athletes.allergies IS 'Known allergies for the athlete';
COMMENT ON COLUMN athletes.emergency_contact_name IS 'Name of emergency contact person';
COMMENT ON COLUMN athletes.emergency_contact_phone IS 'Phone number of emergency contact person';

-- Update the find_guardian_by_email function to use org_id instead of organization_id
CREATE OR REPLACE FUNCTION find_guardian_by_email(
  p_email TEXT,
  p_org_id UUID
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  display_name TEXT,
  phone TEXT,
  linked_athletes JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_normalized_email TEXT;
BEGIN
  -- Normalize email for matching
  v_normalized_email := normalize_email(p_email);
  
  -- Return user and their linked athletes
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.email,
    u.display_name,
    u.phone,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'first_name', a.first_name,
          'last_name', a.last_name,
          'birthdate', a.birthdate
        )
        ORDER BY a.first_name, a.last_name
      ) FILTER (WHERE a.id IS NOT NULL),
      '[]'::jsonb
    ) AS linked_athletes
  FROM users u
  LEFT JOIN athlete_guardians ag ON ag.user_id = u.id 
    AND ag.org_id = p_org_id 
    AND ag.status = 'active'
  LEFT JOIN athletes a ON a.id = ag.athlete_id 
    AND a.deleted_at IS NULL
  WHERE normalize_email(u.email) = v_normalized_email
  GROUP BY u.id, u.email, u.display_name, u.phone;
END;
$$;

-- Recreate link_guardian_to_athlete function to ensure it uses org_id instead of organization_id
-- This fixes the issue where the function may have been created before the column rename migration
CREATE OR REPLACE FUNCTION link_guardian_to_athlete(
  p_athlete_id UUID,
  p_email TEXT,
  p_org_id UUID,
  p_relationship_type TEXT DEFAULT 'parent',
  p_created_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key BIGINT;
  v_normalized_email TEXT;
  v_user_id UUID;
  v_invite_id UUID;
  v_token TEXT;
  v_athlete_guardian_id UUID;
BEGIN
  -- Normalize email
  v_normalized_email := normalize_email(p_email);
  
  -- Acquire advisory lock on normalized email hash
  -- This prevents race conditions when multiple admins link same guardian
  v_lock_key := hashtext(v_normalized_email);
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Check if user exists
  SELECT id INTO v_user_id 
  FROM users 
  WHERE normalize_email(email) = v_normalized_email
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- User exists: create or update athlete_guardians link (idempotent)
    INSERT INTO athlete_guardians (
      athlete_id,
      user_id,
      org_id,
      status
    )
    VALUES (
      p_athlete_id,
      v_user_id,
      p_org_id,
      'active'
    )
    ON CONFLICT (athlete_id, user_id, org_id)
    DO UPDATE SET
      status = 'active',
      updated_at = NOW()
    RETURNING id INTO v_athlete_guardian_id;
    
    -- Ensure user has parent role in organization
    -- This uses the existing add_org_role function which is also idempotent
    PERFORM add_org_role(v_user_id, p_org_id, 'parent');
    
    -- Convert any pending invites to accepted
    UPDATE parent_invites
    SET 
      status = 'accepted',
      accepted_by_user_id = v_user_id,
      accepted_at = NOW()
    WHERE org_id = p_org_id
      AND athlete_id = p_athlete_id
      AND LOWER(email) = v_normalized_email
      AND status = 'pending';
    
    RETURN jsonb_build_object(
      'type', 'guardian',
      'id', v_athlete_guardian_id,
      'user_id', v_user_id,
      'email', v_normalized_email,
      'status', 'active',
      'already_existed', FOUND
    );
    
  ELSE
    -- User doesn't exist: create parent_invites (idempotent)
    v_token := gen_random_uuid()::text;
    
    INSERT INTO parent_invites (
      org_id,
      athlete_id,
      email,
      status,
      token,
      expires_at,
      created_by_user_id
    )
    VALUES (
      p_org_id,
      p_athlete_id,
      v_normalized_email,
      'pending',
      v_token,
      NOW() + INTERVAL '30 days',
      COALESCE(p_created_by_user_id, auth.uid())
    )
    ON CONFLICT (org_id, athlete_id, LOWER(email))
    WHERE status = 'pending'
    DO UPDATE SET
      expires_at = NOW() + INTERVAL '30 days',
      updated_at = NOW(),
      token = EXCLUDED.token
    RETURNING id, token INTO v_invite_id, v_token;
    
    RETURN jsonb_build_object(
      'type', 'invite',
      'id', v_invite_id,
      'email', v_normalized_email,
      'token', v_token,
      'status', 'pending',
      'expires_at', NOW() + INTERVAL '30 days'
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION link_guardian_to_athlete IS 'Links a guardian to an athlete by email. If user exists, creates athlete_guardians relationship. If not, creates parent_invite. Uses advisory locks to prevent race conditions. Idempotent.';

-- Ensure parent_invites table uses org_id (in case column rename didn't happen)
DO $$
BEGIN
  -- Check if organization_id column still exists and rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'parent_invites'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE parent_invites RENAME COLUMN organization_id TO org_id;
  END IF;
END $$;

-- Recreate indexes that might reference the old column name
-- Drop old index if it exists with wrong column name
DROP INDEX IF EXISTS idx_parent_invites_org_email_old;
-- Create index with correct column name (IF NOT EXISTS will skip if already exists)
CREATE INDEX IF NOT EXISTS idx_parent_invites_org_email ON parent_invites(org_id, LOWER(email));
CREATE INDEX IF NOT EXISTS idx_parent_invites_athlete_id ON parent_invites(athlete_id);

-- Ensure create_athlete_with_guardians function uses correct column names
-- Drop any existing versions first to avoid ambiguity errors
-- Drop all overloads of this function to ensure clean recreation
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all versions of the function regardless of signature
  FOR r IN 
    SELECT oid::regprocedure 
    FROM pg_proc 
    WHERE proname = 'create_athlete_with_guardians'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
  END LOOP;
END $$;

-- Recreate the function with correct column names
CREATE FUNCTION create_athlete_with_guardians(
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
  
  -- Create athlete (only include columns that exist)
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
    family_id,
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
    
    -- Link guardian (uses link_guardian_to_athlete which handles org_id correctly)
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

COMMENT ON FUNCTION create_athlete_with_guardians IS 'Atomically creates an athlete, links guardians, and links sports. All operations succeed or fail together. Returns athlete_id, guardian linking results, and sport count. Uses org_id (not organization_id) for parent_invites.';
