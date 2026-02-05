-- Fix can_edit_video - remove is_active column reference that doesn't exist
-- organization_members table has: org_id, user_id, role (NO is_active column)

CREATE OR REPLACE FUNCTION public.can_edit_video(p_video_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_video RECORD;
BEGIN
  -- Platform admins can edit any video
  IF is_platform_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;

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
  );
END;
$$;

COMMENT ON FUNCTION public.can_edit_video(uuid, uuid) IS 'Check if user can edit a video. Platform admins can edit any video. Uploaders can edit their own. Org admins/staff/coaches can edit org videos.';
