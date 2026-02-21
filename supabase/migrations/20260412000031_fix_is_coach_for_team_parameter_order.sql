-- Fix is_coach_for_team() to use correct parameter order
-- The function was calling staff_can_access_team() with swapped parameters

CREATE OR REPLACE FUNCTION public.is_coach_for_team(team_id_param uuid, user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fix parameter order: staff_can_access_team expects (user_id, team_id)
  RETURN staff_can_access_team(user_id_param, team_id_param);
END;
$$;

COMMENT ON FUNCTION public.is_coach_for_team(uuid, uuid) IS 
    'Checks if user is a coach for the team. Uses staff_can_access_team() which checks team_coaches table.';
