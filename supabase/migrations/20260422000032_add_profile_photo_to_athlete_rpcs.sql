-- Add profile_photo_updated_at and has_profile_photo to athlete RPCs so /portal/athletes can show photos.
-- get_athletes_with_guardian_status and get_guardian_athletes did not return these columns;
-- familyService and AthleteAvatar rely on them for photo URL generation.
-- PostgreSQL does not allow changing return type with CREATE OR REPLACE, so we DROP then CREATE.

DROP FUNCTION IF EXISTS public.get_athletes_with_guardian_status(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_guardian_athletes(uuid, uuid);

-- get_athletes_with_guardian_status: add photo columns to return type and SELECT
CREATE FUNCTION public.get_athletes_with_guardian_status(
    p_org_id uuid,
    p_limit integer DEFAULT 1000,
    p_offset integer DEFAULT 0
) RETURNS TABLE(
    athlete_id uuid,
    first_name text,
    last_name text,
    birthdate date,
    gender text,
    preferred_name text,
    jersey_number text,
    medical_notes text,
    allergies text,
    emergency_contact_name text,
    emergency_contact_phone text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    family_id uuid,
    has_active_guardian boolean,
    profile_photo_updated_at timestamp with time zone,
    has_profile_photo boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
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
    ) AS has_active_guardian,
    a.profile_photo_updated_at,
    COALESCE(a.has_profile_photo, false) AS has_profile_photo
  FROM athletes a
  WHERE a.deleted_at IS NULL
  ORDER BY a.first_name, a.last_name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_athletes_with_guardian_status(p_org_id uuid, p_limit integer, p_offset integer) IS
  'Returns athletes with their guardian status and profile photo flags. Used by /portal/athletes and familyService.';

-- get_guardian_athletes: add photo columns so guardian view shows photos
CREATE FUNCTION public.get_guardian_athletes(p_user_id uuid, p_org_id uuid)
RETURNS TABLE(
    athlete_id uuid,
    first_name text,
    last_name text,
    birthdate date,
    gender text,
    relationship_type text,
    status public.athlete_guardian_status,
    profile_photo_updated_at timestamp with time zone,
    has_profile_photo boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT
    a.id AS athlete_id,
    a.first_name,
    a.last_name,
    a.birthdate,
    a.gender,
    'parent' AS relationship_type,
    ag.status,
    a.profile_photo_updated_at,
    COALESCE(a.has_profile_photo, false) AS has_profile_photo
  FROM athlete_guardians ag
  JOIN athletes a ON a.id = ag.athlete_id
  WHERE ag.user_id = p_user_id
    AND ag.org_id = p_org_id
    AND a.deleted_at IS NULL
  ORDER BY a.first_name, a.last_name;
$$;

COMMENT ON FUNCTION public.get_guardian_athletes(p_user_id uuid, p_org_id uuid) IS
  'Returns all athletes for a guardian with profile photo flags. Uses org_id column.';
