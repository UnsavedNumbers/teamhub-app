-- Migration: Update all RPC functions to use org_id instead of organization_id
-- ============================================================================
-- The athlete_guardians table column was renamed to org_id, but several
-- functions still reference organization_id causing "column does not exist" errors

-- 1. Fix find_guardian_by_email
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
  v_normalized_email := normalize_email(p_email);
  
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

-- 2. Fix get_athlete_guardians
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
    'parent' AS relationship_type,
    ag.status,
    ag.created_at
  FROM athlete_guardians ag
  JOIN users u ON u.id = ag.user_id
  WHERE ag.athlete_id = p_athlete_id
    AND ag.org_id = p_org_id
  ORDER BY ag.created_at ASC;
$$;

-- 3. Fix get_guardian_athletes
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
    'parent' AS relationship_type,
    ag.status
  FROM athlete_guardians ag
  JOIN athletes a ON a.id = ag.athlete_id
  WHERE ag.user_id = p_user_id
    AND ag.org_id = p_org_id
    AND a.deleted_at IS NULL
  ORDER BY a.first_name, a.last_name;
$$;

-- 4. Fix get_family_athletes_via_guardians
CREATE OR REPLACE FUNCTION get_family_athletes_via_guardians(
  p_athlete_id UUID,
  p_org_id UUID
)
RETURNS TABLE(athlete_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE family_athletes AS (
    -- Base case: athletes directly connected via shared guardians
    SELECT DISTINCT ag2.athlete_id
    FROM athlete_guardians ag1
    JOIN athlete_guardians ag2 ON ag1.user_id = ag2.user_id
    WHERE ag1.athlete_id = p_athlete_id
      AND ag1.org_id = p_org_id
      AND ag2.org_id = p_org_id
      AND ag1.status = 'active'
      AND ag2.status = 'active'
    
    UNION
    
    -- Recursive case: find athletes connected to already-found athletes
    SELECT DISTINCT ag3.athlete_id
    FROM family_athletes fa
    JOIN athlete_guardians ag2 ON fa.athlete_id = ag2.athlete_id
    JOIN athlete_guardians ag3 ON ag2.user_id = ag3.user_id
    WHERE ag2.org_id = p_org_id
      AND ag3.org_id = p_org_id
      AND ag2.status = 'active'
      AND ag3.status = 'active'
  )
  SELECT DISTINCT fa.athlete_id
  FROM family_athletes fa;
END;
$$;

-- 5. Fix get_orphaned_athletes
CREATE OR REPLACE FUNCTION get_orphaned_athletes(p_org_id UUID)
RETURNS TABLE(
  athlete_id UUID,
  first_name TEXT,
  last_name TEXT,
  birthdate DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    a.id,
    a.first_name,
    a.last_name,
    a.birthdate,
    a.created_at
  FROM athletes a
  LEFT JOIN athlete_guardians ag ON ag.athlete_id = a.id 
    AND ag.org_id = p_org_id 
    AND ag.status = 'active'
  WHERE ag.id IS NULL
    AND a.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      JOIN programs p ON p.id = t.program_id
      WHERE tm.athlete_id = a.id
      AND p.org_id = p_org_id
    )
  ORDER BY a.created_at DESC;
$$;

-- 6. Fix get_athlete_family_details (if it exists and uses organization_id)
CREATE OR REPLACE FUNCTION get_athlete_family_details(
  p_athlete_id UUID,
  p_org_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_family_athletes UUID[];
  v_guardian_ids UUID[];
  v_result JSONB;
BEGIN
  -- Get all athletes in this family
  SELECT ARRAY_AGG(DISTINCT athlete_id)
  INTO v_family_athletes
  FROM get_family_athletes_via_guardians(p_athlete_id, p_org_id);
  
  -- Handle case where athlete has no guardians
  IF v_family_athletes IS NULL OR ARRAY_LENGTH(v_family_athletes, 1) IS NULL THEN
    v_family_athletes := ARRAY[p_athlete_id];
  END IF;
  
  -- Get all guardians for this family
  SELECT ARRAY_AGG(DISTINCT ag.user_id)
  INTO v_guardian_ids
  FROM athlete_guardians ag
  WHERE ag.athlete_id = ANY(v_family_athletes)
    AND ag.org_id = p_org_id
    AND ag.status = 'active';
  
  -- Build athlete details
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'first_name', a.first_name,
        'last_name', a.last_name,
        'birthdate', a.birthdate,
        'gender', a.gender
      )
      ORDER BY a.first_name, a.last_name
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM athletes a
  WHERE a.id = ANY(v_family_athletes)
    AND a.deleted_at IS NULL;
  
  RETURN jsonb_build_object(
    'athletes', v_result,
    'guardian_ids', COALESCE(v_guardian_ids, ARRAY[]::UUID[])
  );
END;
$$;

COMMENT ON FUNCTION find_guardian_by_email IS 'Finds guardian by email with linked athletes. Uses org_id column.';
COMMENT ON FUNCTION get_athlete_guardians IS 'Returns all guardians for an athlete. Uses org_id column.';
COMMENT ON FUNCTION get_guardian_athletes IS 'Returns all athletes for a guardian. Uses org_id column.';
COMMENT ON FUNCTION get_family_athletes_via_guardians IS 'Returns family athletes via shared guardians. Uses org_id column.';
COMMENT ON FUNCTION get_orphaned_athletes IS 'Returns athletes without active guardians. Uses org_id column.';
