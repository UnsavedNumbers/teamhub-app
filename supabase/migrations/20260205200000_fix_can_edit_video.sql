-- Fix can_edit_video function to allow soft-delete (setting deleted_at)
-- The WITH CHECK on videos_update_policy evaluates can_edit_video on the NEW row,
-- but the old function had WHERE v.deleted_at IS NULL which rejects soft-deletes.
-- Also add coach and staff roles to edit permissions, and add is_active check.

CREATE OR REPLACE FUNCTION public.can_edit_video(p_video_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_video RECORD;
BEGIN
  -- Get video details (don't filter on deleted_at so soft-deletes work)
  SELECT v.id, v.org_id, v.uploaded_by
  INTO v_video
  FROM public.videos v
  WHERE v.id = p_video_id;
  
  IF v_video IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Uploader can edit their own videos
  IF v_video.uploaded_by = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Org admin, staff, and coach can edit org videos
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = v_video.org_id
      AND om.user_id = p_user_id
      AND om.role IN ('org_admin', 'staff', 'coach')
      AND om.is_active = true
  );
END;
$$;
