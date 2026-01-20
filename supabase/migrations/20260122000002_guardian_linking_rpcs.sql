-- Migration: Guardian Linking RPC Functions
-- ==========================================
-- Creates SECURITY DEFINER functions for linking guardians to athletes,
-- with advisory locks for race condition prevention and idempotent operations.

-- ==============================================
-- Ensure athletes table has gender column
-- ==============================================
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS gender TEXT;

-- ==============================================
-- Find Existing Guardian by Email
-- ==============================================
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

COMMENT ON FUNCTION find_guardian_by_email IS 'Finds a user by normalized email and returns their linked athletes in an organization. Used for guardian matching during athlete creation.';

-- ==============================================
-- Link Guardian to Athlete (Idempotent)
-- ==============================================
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

-- ==============================================
-- Create Athlete with Guardians (Atomic Transaction)
-- ==============================================
CREATE OR REPLACE FUNCTION create_athlete_with_guardians(
  p_org_id UUID,
  p_athlete_data JSONB,
  p_guardians JSONB[] DEFAULT '{}'
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
    jersey_number,
    medical_notes,
    allergies,
    emergency_contact_name,
    emergency_contact_phone,
    family_id,  -- Still nullable, for backward compatibility
    created_at,
    updated_at
  )
  VALUES (
    TRIM(p_athlete_data->>'first_name'),
    TRIM(p_athlete_data->>'last_name'),
    NULLIF(p_athlete_data->>'birthdate', '')::DATE,
    NULLIF(p_athlete_data->>'gender', ''),
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
    'guardian_count', ARRAY_LENGTH(v_guardian_results, 1)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception to rollback transaction
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_athlete_with_guardians IS 'Atomically creates an athlete and links guardians. All operations succeed or fail together. Returns athlete_id and guardian linking results.';

-- ==============================================
-- Get Athlete Guardians
-- ==============================================
CREATE OR REPLACE FUNCTION get_athlete_guardians(
  p_athlete_id UUID,
  p_org_id UUID
)
RETURNS TABLE(
  guardian_id UUID,
  user_id UUID,
  email TEXT,
  display_name TEXT,
  phone TEXT,
  relationship_type TEXT,
  status athlete_guardian_status,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    ag.id AS guardian_id,
    u.id AS user_id,
    u.email,
    u.display_name,
    u.phone,
    'parent' AS relationship_type,  -- Future: store in athlete_guardians
    ag.status,
    ag.created_at
  FROM athlete_guardians ag
  JOIN users u ON u.id = ag.user_id
  WHERE ag.athlete_id = p_athlete_id
    AND ag.org_id = p_org_id
  ORDER BY ag.created_at ASC;
$$;

COMMENT ON FUNCTION get_athlete_guardians IS 'Returns all guardians for an athlete with their details.';

-- ==============================================
-- Get Guardian Athletes
-- ==============================================
CREATE OR REPLACE FUNCTION get_guardian_athletes(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS TABLE(
  athlete_id UUID,
  first_name TEXT,
  last_name TEXT,
  birthdate DATE,
  gender TEXT,
  relationship_type TEXT,
  status athlete_guardian_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    a.id AS athlete_id,
    a.first_name,
    a.last_name,
    a.birthdate,
    a.gender,
    'parent' AS relationship_type,  -- Future: store in athlete_guardians
    ag.status
  FROM athlete_guardians ag
  JOIN athletes a ON a.id = ag.athlete_id
  WHERE ag.user_id = p_user_id
    AND ag.org_id = p_org_id
    AND a.deleted_at IS NULL
  ORDER BY a.first_name, a.last_name;
$$;

COMMENT ON FUNCTION get_guardian_athletes IS 'Returns all athletes for a guardian in an organization.';

-- ==============================================
-- Remove Guardian from Athlete
-- ==============================================
CREATE OR REPLACE FUNCTION remove_guardian_from_athlete(
  p_athlete_id UUID,
  p_user_id UUID,
  p_org_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  -- Update status to 'removed' (soft delete)
  UPDATE athlete_guardians
  SET 
    status = 'removed',
    updated_at = NOW()
  WHERE athlete_id = p_athlete_id
    AND user_id = p_user_id
    AND org_id = p_org_id
    AND status = 'active';
  
  v_updated := FOUND;
  
  -- Check if user has any other active athlete guardians in this org
  -- If not, consider removing parent role (optional)
  -- For now, we keep the role as they may still have access to other features
  
  RETURN jsonb_build_object(
    'success', v_updated,
    'athlete_id', p_athlete_id,
    'user_id', p_user_id,
    'status', 'removed'
  );
END;
$$;

COMMENT ON FUNCTION remove_guardian_from_athlete IS 'Removes a guardian from an athlete by setting status to removed. Soft delete approach.';

-- ==============================================
-- Partial Unique Index for Pending Invites
-- ==============================================
-- Ensures we don't create duplicate pending invites for same email/athlete/org
DROP INDEX IF EXISTS idx_parent_invites_pending_unique;
CREATE UNIQUE INDEX idx_parent_invites_pending_unique 
  ON parent_invites(org_id, athlete_id, LOWER(email))
  WHERE status = 'pending';

COMMENT ON INDEX idx_parent_invites_pending_unique IS 'Prevents duplicate pending invites for same organization, athlete, and email. Uses partial index on pending status only.';
