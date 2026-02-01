-- Fix helper functions to tolerate missing team_memberships.deleted_at column

CREATE OR REPLACE FUNCTION can_view_athlete(athlete_id_param UUID, user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  athlete_org_id UUID;
  coach_match BOOLEAN := FALSE;
BEGIN
  -- Try to get athlete's org_id via family
  SELECT f.org_id INTO athlete_org_id
  FROM athletes a
  JOIN families f ON f.id = a.family_id
  WHERE a.id = athlete_id_param;

  -- Check if user is org admin (if org known)
  IF athlete_org_id IS NOT NULL AND is_org_admin(athlete_org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is parent/guardian (works even without org/family)
  IF is_parent_of_athlete(athlete_id_param, user_id_param) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is coach for any team the athlete is on
  BEGIN
    SELECT EXISTS (
      SELECT 1
      FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athlete_id_param
        AND tm.deleted_at IS NULL
        AND t.deleted_at IS NULL
        AND is_coach_for_team(t.id, user_id_param)
    ) INTO coach_match;
  EXCEPTION WHEN undefined_column THEN
    -- Fallback for schemas without deleted_at columns
    SELECT EXISTS (
      SELECT 1
      FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athlete_id_param
        AND is_coach_for_team(t.id, user_id_param)
    ) INTO coach_match;
  END;

  RETURN coach_match;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION coach_has_medical_access(athlete_id_param UUID, user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  athlete_org_id UUID;
  coach_medical_access_enabled BOOLEAN;
  coach_match BOOLEAN := FALSE;
BEGIN
  -- Get athlete's org_id via family
  SELECT f.org_id INTO athlete_org_id
  FROM athletes a
  JOIN families f ON f.id = a.family_id
  WHERE a.id = athlete_id_param;

  IF athlete_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check org settings for coach medical access
  -- TODO: Replace with org setting once available
  coach_medical_access_enabled := FALSE;

  IF NOT coach_medical_access_enabled THEN
    RETURN FALSE;
  END IF;

  -- Check if user is coach for any team the athlete is on
  BEGIN
    SELECT EXISTS (
      SELECT 1
      FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athlete_id_param
        AND tm.deleted_at IS NULL
        AND t.deleted_at IS NULL
        AND is_coach_for_team(t.id, user_id_param)
    ) INTO coach_match;
  EXCEPTION WHEN undefined_column THEN
    SELECT EXISTS (
      SELECT 1
      FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = athlete_id_param
        AND is_coach_for_team(t.id, user_id_param)
    ) INTO coach_match;
  END;

  RETURN coach_match;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
