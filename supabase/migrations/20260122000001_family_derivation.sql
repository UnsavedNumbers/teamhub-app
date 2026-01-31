-- Migration: Family Derivation & Helper Functions
-- ================================================
-- Creates functions to derive families from guardian relationships,
-- email normalization, and helper functions for athlete access control.

-- ==============================================
-- Add missing columns to athletes if not present
-- ==============================================
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS gender TEXT;

-- ==============================================
-- Email Normalization Function
-- ==============================================
CREATE OR REPLACE FUNCTION normalize_email(email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_local TEXT;
  v_domain TEXT;
  v_normalized TEXT;
BEGIN
  -- Handle null/empty
  IF email IS NULL OR TRIM(email) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Lowercase and trim
  v_normalized := LOWER(TRIM(email));
  
  -- Split into local and domain parts
  v_local := SPLIT_PART(v_normalized, '@', 1);
  v_domain := SPLIT_PART(v_normalized, '@', 2);
  
  -- Gmail-specific normalization (remove dots from local part)
  IF v_domain IN ('gmail.com', 'googlemail.com') THEN
    v_local := REPLACE(v_local, '.', '');
    -- Gmail also ignores everything after + in local part
    v_local := SPLIT_PART(v_local, '+', 1);
  END IF;
  
  RETURN v_local || '@' || v_domain;
END;
$$;

COMMENT ON FUNCTION normalize_email IS 'Normalizes email addresses for matching. Handles Gmail dot and plus addressing.';

-- ==============================================
-- User Access Check Helper
-- ==============================================
CREATE OR REPLACE FUNCTION user_can_access_athlete(
  p_athlete_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM athlete_guardians ag
    WHERE ag.athlete_id = p_athlete_id
      AND ag.user_id = p_user_id
      AND ag.status = 'active'
  );
$$;

COMMENT ON FUNCTION user_can_access_athlete IS 'Checks if a user can access an athlete via guardian relationship. Used in RLS policies.';

-- ==============================================
-- Get Family Athletes via Guardian Relationships
-- ==============================================
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

COMMENT ON FUNCTION get_family_athletes_via_guardians IS 'Returns all athletes in a family derived from shared guardian relationships. Uses recursive CTE to handle transitive relationships.';

-- ==============================================
-- Get Derived Family for Athlete (with details)
-- ==============================================
CREATE OR REPLACE FUNCTION get_derived_family_for_athlete(
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
  v_athletes JSONB;
  v_guardians JSONB;
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
  INTO v_athletes
  FROM athletes a
  WHERE a.id = ANY(v_family_athletes)
    AND a.deleted_at IS NULL;
  
  -- Build guardian details
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'display_name', u.display_name,
        'phone', u.phone
      )
      ORDER BY u.display_name, u.email
    ),
    '[]'::jsonb
  )
  INTO v_guardians
  FROM users u
  WHERE u.id = ANY(v_guardian_ids);
  
  RETURN jsonb_build_object(
    'athlete_ids', v_family_athletes,
    'guardian_ids', COALESCE(v_guardian_ids, ARRAY[]::UUID[]),
    'athletes', v_athletes,
    'guardians', COALESCE(v_guardians, '[]'::jsonb),
    'is_derived', true,
    'has_guardians', v_guardian_ids IS NOT NULL AND ARRAY_LENGTH(v_guardian_ids, 1) > 0
  );
END;
$$;

COMMENT ON FUNCTION get_derived_family_for_athlete IS 'Returns complete family structure for an athlete including all family members and guardians. Family is derived from shared guardian relationships.';

-- ==============================================
-- Get Orphaned Athletes (No Guardians)
-- ==============================================
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

COMMENT ON FUNCTION get_orphaned_athletes IS 'Returns athletes in an organization who have no active guardians. Useful for admin tools to identify athletes needing guardian assignment.';

-- ==============================================
-- Materialized View for Family Derivation Performance
-- ==============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS derived_families_mv AS
WITH family_groups AS (
  SELECT DISTINCT
    ag1.org_id,
    ag1.athlete_id,
    -- Create a consistent family identifier from sorted guardian IDs
    MD5(ARRAY_TO_STRING(
      ARRAY_AGG(DISTINCT ag2.user_id ORDER BY ag2.user_id)::TEXT[],
      ','
    ))::UUID AS family_group_id
  FROM athlete_guardians ag1
  JOIN athlete_guardians ag2 ON ag1.user_id = ag2.user_id
  WHERE ag1.status = 'active'
    AND ag2.status = 'active'
  GROUP BY ag1.org_id, ag1.athlete_id
)
SELECT 
  org_id,
  family_group_id,
  ARRAY_AGG(athlete_id ORDER BY athlete_id) AS athlete_ids,
  COUNT(*) AS athlete_count
FROM family_groups
GROUP BY org_id, family_group_id;

-- Create indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_derived_families_mv_org_family 
  ON derived_families_mv(org_id, family_group_id);
CREATE INDEX IF NOT EXISTS idx_derived_families_mv_org 
  ON derived_families_mv(org_id);

COMMENT ON MATERIALIZED VIEW derived_families_mv IS 'Precomputed family groups for performance. Refreshed automatically when athlete_guardians changes.';

-- ==============================================
-- Refresh Materialized View Trigger
-- ==============================================
CREATE OR REPLACE FUNCTION refresh_derived_families()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh concurrently to avoid blocking reads
  -- Note: CONCURRENTLY requires a unique index
  REFRESH MATERIALIZED VIEW CONCURRENTLY derived_families_mv;
  RETURN NULL;
END;
$$;

-- Create trigger to refresh on athlete_guardians changes
DROP TRIGGER IF EXISTS trigger_refresh_derived_families ON athlete_guardians;
CREATE TRIGGER trigger_refresh_derived_families
  AFTER INSERT OR UPDATE OR DELETE ON athlete_guardians
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_derived_families();

COMMENT ON FUNCTION refresh_derived_families IS 'Refreshes the derived_families_mv materialized view when guardian relationships change.';

-- ==============================================
-- Add Indexes for Performance
-- ==============================================
-- These indexes optimize the recursive family derivation queries
CREATE INDEX IF NOT EXISTS idx_athlete_guardians_user_org_status 
  ON athlete_guardians(user_id, org_id, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_athlete_guardians_athlete_org_status 
  ON athlete_guardians(athlete_id, org_id, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_athletes_deleted 
  ON athletes(id) 
  WHERE deleted_at IS NULL;
