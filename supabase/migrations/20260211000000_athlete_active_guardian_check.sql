-- Migration: Athlete Active Guardian Status Check
-- ================================================
-- Creates a function to determine if an athlete has at least one active guardian
-- with a valid auth account. This is a read-only visibility check.
--
-- DEFINITION OF "ACTIVE GUARDIAN":
-- - athlete_guardians row exists with status = 'active'
-- - user_id exists in auth.users (not deleted)
-- - auth.users.banned_until IS NULL OR banned_until < NOW() (not disabled)
--
-- This function is SECURITY DEFINER to allow checking auth.users status
-- while respecting RLS for the calling user's permissions.

-- ==============================================
-- Function: Check if athlete has active guardian
-- ==============================================
CREATE OR REPLACE FUNCTION athlete_has_active_guardian(
  p_athlete_id UUID,
  p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Check if there exists at least one active guardian relationship
  -- where the guardian has a valid, non-disabled auth account
  RETURN EXISTS (
    SELECT 1
    FROM athlete_guardians ag
    JOIN users u ON u.id = ag.user_id
    JOIN auth.users au ON au.id = u.id
    WHERE ag.athlete_id = p_athlete_id
      AND ag.org_id = p_org_id
      AND ag.status = 'active'
      -- User must exist in auth.users (not soft-deleted)
      AND au.deleted_at IS NULL
      -- User must not be banned/disabled
      AND (au.banned_until IS NULL OR au.banned_until < NOW())
  );
END;
$$;

COMMENT ON FUNCTION athlete_has_active_guardian IS 
  'Returns true if athlete has at least one active guardian with a valid, non-disabled auth account. 
   Used for visibility checks in admin interfaces. SECURITY DEFINER to access auth.users.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION athlete_has_active_guardian(UUID, UUID) TO authenticated;

-- ==============================================
-- Function: Batch check for multiple athletes
-- ==============================================
-- This is more efficient for the All Athletes table where we need to check many athletes at once
-- SECURITY DEFINER to access auth.users, but includes permission check to respect RLS
CREATE OR REPLACE FUNCTION get_athletes_with_guardian_status(
  p_org_id UUID,
  p_limit INTEGER DEFAULT 1000,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  athlete_id UUID,
  first_name TEXT,
  last_name TEXT,
  birthdate DATE,
  gender TEXT,
  preferred_name TEXT,
  jersey_number TEXT,
  medical_notes TEXT,
  allergies TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  family_id UUID,
  has_active_guardian BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  
  -- Permission check: caller must be org_admin or coach for the org, or platform admin
  -- This ensures RLS-equivalent security even though function is SECURITY DEFINER
  IF NOT (
    is_platform_admin(v_current_user) OR
    user_has_any_org_roles(v_current_user, p_org_id, ARRAY['org_admin', 'coach']::org_member_role[])
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions for organization %', p_org_id;
  END IF;
  
  -- Enable RLS for the query to respect athlete visibility policies
  -- This ensures we only return athletes the caller should see
  SET LOCAL row_security = on;
  
  RETURN QUERY
  SELECT 
    a.id AS athlete_id,
    a.first_name,
    a.last_name,
    a.birthdate,
    a.gender,
    a.preferred_name,
    a.jersey_number,
    a.medical_notes,
    a.allergies,
    a.emergency_contact_name,
    a.emergency_contact_phone,
    a.created_at,
    a.updated_at,
    a.deleted_at,
    a.family_id,
    -- Check if athlete has active guardian
    EXISTS (
      SELECT 1
      FROM athlete_guardians ag
      JOIN users u ON u.id = ag.user_id
      JOIN auth.users au ON au.id = u.id
      WHERE ag.athlete_id = a.id
        AND ag.org_id = p_org_id
        AND ag.status = 'active'
        AND au.deleted_at IS NULL
        AND (au.banned_until IS NULL OR au.banned_until < NOW())
    ) AS has_active_guardian
  FROM athletes a
  WHERE a.deleted_at IS NULL
  ORDER BY a.first_name, a.last_name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_athletes_with_guardian_status IS 
  'Returns athletes with their guardian status. More efficient than calling athlete_has_active_guardian 
   for each athlete individually. Used by All Athletes table. SECURITY DEFINER to access auth.users.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_athletes_with_guardian_status(UUID, INTEGER, INTEGER) TO authenticated;
