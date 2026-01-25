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
