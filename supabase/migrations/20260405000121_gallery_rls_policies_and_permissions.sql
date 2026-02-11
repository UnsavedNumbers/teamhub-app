-- Enable RLS on galleries if not already enabled
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS galleries_select_policy ON public.galleries;

-- SELECT POLICY: Allow parents/guardians to view galleries related to their athletes
CREATE POLICY galleries_select_policy ON public.galleries
FOR SELECT
TO authenticated
USING (
  -- Platform admins can view all galleries
  public.is_platform_admin(auth.uid())
  OR
  -- Organization admins can view all galleries in their org
  public.is_org_admin(org_id, auth.uid())
  OR
  -- Parents/guardians can view galleries related to their athletes
  EXISTS (
    SELECT 1
    FROM public.athlete_guardians ag
    WHERE ag.user_id = auth.uid()
      AND ag.status = 'active'
      AND (
        -- Athlete galleries for their children
        (gallery_type = 'athlete'::public.gallery_type AND entity_id = ag.athlete_id)
        OR
        -- Team galleries for teams their children are on
        (gallery_type = 'team'::public.gallery_type AND entity_id IN (
          SELECT tm.team_id FROM public.team_memberships tm WHERE tm.athlete_id = ag.athlete_id
        ))
        OR
        -- Event galleries for events their children are participating in
        (gallery_type = 'event'::public.gallery_type AND entity_id IN (
          SELECT e.id FROM public.events e
          JOIN public.team_memberships tm ON tm.team_id = e.team_id
          WHERE tm.athlete_id = ag.athlete_id
        ))
        OR
        -- Organization galleries for their children's org
        (gallery_type = 'org'::public.gallery_type AND entity_id IN (
          SELECT o.id FROM public.organizations o
          JOIN public.teams t ON t.org_id = o.id
          JOIN public.team_memberships tm ON tm.team_id = t.id
          WHERE tm.athlete_id = ag.athlete_id
        ))
      )
  )
);

-- Function to check if user can view a specific gallery
CREATE OR REPLACE FUNCTION public.can_view_gallery(
  gallery_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery public.galleries;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get the gallery
  SELECT * INTO v_gallery
  FROM public.galleries
  WHERE id = gallery_id_param;

  IF v_gallery IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check permissions
  RETURN
    -- Platform admins can view all galleries
    public.is_platform_admin(v_user_id)
    OR
    -- Organization admins can view all galleries in their org
    public.is_org_admin(v_gallery.org_id, v_user_id)
    OR
    -- Parents/guardians can view galleries related to their athletes
    EXISTS (
      SELECT 1
      FROM public.athlete_guardians ag
      WHERE ag.user_id = v_user_id
        AND ag.status = 'active'
        AND (
          -- Athlete galleries for their children
          (v_gallery.gallery_type = 'athlete'::public.gallery_type AND v_gallery.entity_id = ag.athlete_id)
          OR
          -- Team galleries for teams their children are on
          (v_gallery.gallery_type = 'team'::public.gallery_type AND v_gallery.entity_id IN (
            SELECT tm.team_id FROM public.team_memberships tm WHERE tm.athlete_id = ag.athlete_id
          ))
          OR
          -- Event galleries for events their children are participating in
          (v_gallery.gallery_type = 'event'::public.gallery_type AND v_gallery.entity_id IN (
            SELECT e.id FROM public.events e
            JOIN public.team_memberships tm ON tm.team_id = e.team_id
            WHERE tm.athlete_id = ag.athlete_id
          ))
          OR
          -- Organization galleries for their children's org
          (v_gallery.gallery_type = 'org'::public.gallery_type AND v_gallery.entity_id IN (
            SELECT o.id FROM public.organizations o
            JOIN public.teams t ON t.org_id = o.id
            JOIN public.team_memberships tm ON tm.team_id = t.id
            WHERE tm.athlete_id = ag.athlete_id
          ))
        )
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.can_view_gallery(UUID) TO authenticated;