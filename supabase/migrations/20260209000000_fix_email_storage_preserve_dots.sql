-- Migration: Fix Email Storage to Preserve Dots
-- =============================================
-- Fixes the link_guardian_to_athlete function to store the original email
-- (with dots preserved) instead of the normalized email (with dots removed).
-- 
-- Normalization should only be used for matching/lookup purposes, not for storage.
-- Email addresses with dots are valid and must be preserved as entered by the user.

-- ==============================================
-- Fix link_guardian_to_athlete function
-- ==============================================
-- Store original email (trimmed and lowercased) instead of normalized email
-- Normalization is still used for matching existing users, but storage preserves dots

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
  v_stored_email TEXT;  -- Original email, trimmed and lowercased (preserves dots)
  v_user_id UUID;
  v_invite_id UUID;
  v_token TEXT;
  v_athlete_guardian_id UUID;
BEGIN
  -- Normalize email for matching/lookup purposes only
  v_normalized_email := normalize_email(p_email);
  
  -- Store original email (trimmed and lowercased, but preserving dots)
  -- This is what gets stored in the database and sent in emails
  v_stored_email := LOWER(TRIM(p_email));
  
  -- Acquire advisory lock on normalized email hash
  -- This prevents race conditions when multiple admins link same guardian
  v_lock_key := hashtext(v_normalized_email);
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Check if user exists using normalized email for matching
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
    -- Use normalized email for matching, but check against stored emails
    UPDATE parent_invites
    SET 
      status = 'accepted',
      accepted_by_user_id = v_user_id,
      accepted_at = NOW()
    WHERE org_id = p_org_id
      AND athlete_id = p_athlete_id
      AND normalize_email(email) = v_normalized_email
      AND status = 'pending';
    
    RETURN jsonb_build_object(
      'type', 'guardian',
      'id', v_athlete_guardian_id,
      'user_id', v_user_id,
      'email', v_stored_email,  -- Return stored email (with dots preserved)
      'status', 'active',
      'already_existed', FOUND
    );
    
  ELSE
    -- User doesn't exist: create parent_invites (idempotent)
    -- Store original email (with dots preserved) for sending invitations
    
    -- Check for existing pending invite with normalized email match
    -- This handles Gmail addresses where user.name@gmail.com and username@gmail.com are the same
    SELECT id, token INTO v_invite_id, v_token
    FROM parent_invites
    WHERE org_id = p_org_id
      AND athlete_id = p_athlete_id
      AND normalize_email(email) = v_normalized_email
      AND status = 'pending'
    LIMIT 1;
    
    IF v_invite_id IS NOT NULL THEN
      -- Existing invite found - update it
      UPDATE parent_invites
      SET 
        expires_at = NOW() + INTERVAL '30 days',
        updated_at = NOW(),
        token = COALESCE(v_token, gen_random_uuid()::text)
      WHERE id = v_invite_id
      RETURNING token INTO v_token;
    ELSE
      -- No existing invite - create new one
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
        v_stored_email,  -- Store original email (with dots preserved)
        'pending',
        v_token,
        NOW() + INTERVAL '30 days',
        COALESCE(p_created_by_user_id, auth.uid())
      )
      RETURNING id, token INTO v_invite_id, v_token;
    END IF;
    
    RETURN jsonb_build_object(
      'type', 'invite',
      'id', v_invite_id,
      'email', v_stored_email,  -- Return stored email (with dots preserved)
      'token', v_token,
      'status', 'pending',
      'expires_at', NOW() + INTERVAL '30 days'
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION link_guardian_to_athlete IS 
  'Links a guardian to an athlete by email. If user exists, creates athlete_guardians relationship. If not, creates parent_invite. 
   Uses normalized email for matching existing users, but stores original email (with dots preserved) for invitations. 
   Uses advisory locks to prevent race conditions. Idempotent.';
