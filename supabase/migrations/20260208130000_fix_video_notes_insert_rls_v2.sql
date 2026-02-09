-- Fix video_notes INSERT RLS policy - Part 2
-- The previous migration didn't properly update the policy
-- This migration ensures the policy uses can_view_video correctly

-- First ensure can_view_video function is updated
CREATE OR REPLACE FUNCTION public.can_view_video(p_video_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_video RECORD;
BEGIN
  -- Get video details
  SELECT v.*, v.org_id, v.team_id, v.visibility, v.uploaded_by
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
  
  -- Coaches in the org can view all org videos
  IF user_has_org_role(p_user_id, v_video.org_id, 'coach') THEN
    RETURN TRUE;
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
      RETURN EXISTS (
        SELECT 1 FROM public.athlete_guardians ag
        JOIN public.athletes a ON a.id = ag.athlete_id
        JOIN public.team_memberships tm ON tm.athlete_id = a.id
        WHERE ag.user_id = p_user_id
          AND ag.status = 'active'
          AND tm.team_id = v_video.team_id
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

-- Drop and recreate the INSERT policy
DROP POLICY IF EXISTS video_notes_insert_policy ON public.video_notes;

CREATE POLICY video_notes_insert_policy ON public.video_notes 
FOR INSERT 
WITH CHECK (
  (author_id = auth.uid()) 
  AND public.can_view_video(video_id, auth.uid())
);

COMMENT ON POLICY video_notes_insert_policy ON public.video_notes IS 
'Users can create notes on videos they can view. Uses can_view_video() for access check.';
