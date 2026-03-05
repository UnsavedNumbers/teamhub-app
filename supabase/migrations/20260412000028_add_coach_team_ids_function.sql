-- Create coach_team_ids() helper function for RLS policies
-- Returns set of team_ids for which the user is an active coach

CREATE OR REPLACE FUNCTION public.coach_team_ids(check_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT DISTINCT team_id
    FROM public.team_coaches
    WHERE coach_user_id = check_user_id
      AND status = 'active'
      AND (start_at IS NULL OR start_at <= now())
      AND (end_at IS NULL OR end_at >= now());
$$;

COMMENT ON FUNCTION public.coach_team_ids(uuid) IS 
    'Returns team_ids for which the user is an active coach. Used in RLS policies to scope coach access to assigned teams only.';
