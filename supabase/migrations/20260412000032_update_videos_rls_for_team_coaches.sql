-- Update videos RLS functions to use team_coaches table instead of org-level coach role
-- Coaches can only view/edit videos for teams they are assigned to

-- ============================================================================
-- Update can_view_video() function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_view_video(p_video_id uuid, p_user_id uuid) 
RETURNS boolean
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_video RECORD;
BEGIN
  -- Get video details
  SELECT v.*
  INTO v_video
  FROM public.videos v
  WHERE v.id = p_video_id AND v.deleted_at IS NULL;
  
  IF v_video IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Platform admins can view all videos
  IF is_platform_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Uploader can always view
  IF v_video.uploaded_by = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Org admins can view all org videos
  IF user_has_org_role(p_user_id, v_video.org_id, 'org_admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Coaches can view videos for teams they are assigned to
  IF v_video.team_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.team_coaches tc
      WHERE tc.team_id = v_video.team_id
        AND tc.coach_user_id = p_user_id
        AND tc.status = 'active'
        AND (tc.start_at IS NULL OR tc.start_at <= now())
        AND (tc.end_at IS NULL OR tc.end_at >= now())
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Check visibility rules for non-staff
  CASE v_video.visibility
    WHEN 'private' THEN
      RETURN FALSE;
    
    WHEN 'organization' THEN
      -- Any org member can view
      RETURN EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.org_id = v_video.org_id AND om.user_id = p_user_id
      );
    
    WHEN 'team' THEN
      -- Parents with athletes on the team can view
      -- Coaches assigned to the team can view (already checked above)
      RETURN EXISTS (
        SELECT 1 FROM public.athlete_guardians ag
        JOIN public.athletes a ON a.id = ag.athlete_id
        JOIN public.team_memberships tm ON tm.athlete_id = a.id
        WHERE ag.user_id = p_user_id
          AND ag.status = 'active'
          AND tm.team_id = v_video.team_id
          AND tm.deleted_at IS NULL
      );
    
    WHEN 'guardians' THEN
      -- Only guardians of tagged athletes
      RETURN EXISTS (
        SELECT 1 FROM public.video_athlete_links val
        JOIN public.athlete_guardians ag ON ag.athlete_id = val.athlete_id
        WHERE val.video_id = p_video_id
          AND ag.user_id = p_user_id
          AND ag.status = 'active'
      );
    
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.can_view_video(uuid, uuid) IS 
'Checks if user can view a video. Coaches can only view videos for teams they are assigned to via team_coaches table.';

-- ============================================================================
-- Update can_edit_video() function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_edit_video(p_video_id uuid, p_user_id uuid) 
RETURNS boolean
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_video RECORD;
BEGIN
  -- Platform admins can edit any video
  IF is_platform_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Get video details (don't filter on deleted_at so soft-deletes work)
  -- Must use direct query to bypass RLS since SELECT policy filters deleted_at IS NULL
  SELECT v.id, v.org_id, v.team_id, v.uploaded_by
  INTO v_video
  FROM public.videos v
  WHERE v.id = p_video_id
  LIMIT 1;

  IF v_video.id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Uploader can edit their own videos
  IF v_video.uploaded_by = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- Org admin can edit org videos
  IF user_has_org_role(p_user_id, v_video.org_id, 'org_admin') THEN
    RETURN TRUE;
  END IF;

  -- Coaches can edit videos for teams they are assigned to
  IF v_video.team_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.team_coaches tc
      WHERE tc.team_id = v_video.team_id
        AND tc.coach_user_id = p_user_id
        AND tc.status = 'active'
        AND (tc.start_at IS NULL OR tc.start_at <= now())
        AND (tc.end_at IS NULL OR tc.end_at >= now())
    );
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.can_edit_video(uuid, uuid) IS 
'Checks if user can edit a video. Coaches can only edit videos for teams they are assigned to via team_coaches table. Uses SECURITY DEFINER to bypass RLS on videos table.';
