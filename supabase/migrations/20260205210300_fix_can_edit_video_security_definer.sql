-- Fix can_edit_video - remove is_active column reference that doesn't exist
-- organization_members table has: org_id, user_id, role (NO is_active column)
-- IMPORTANT: Must bypass RLS when querying videos to avoid infinite recursion during soft-delete
-- (SELECT policy filters deleted_at IS NULL, but WITH CHECK evaluates after the update)

CREATE OR REPLACE FUNCTION public.can_edit_video(p_video_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
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
  SELECT v.id, v.org_id, v.uploaded_by
  INTO v_video
  FROM public.videos v
  WHERE v.id = p_video_id
  LIMIT 1;  -- Add LIMIT to ensure single row

  IF v_video.id IS NULL THEN
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

COMMENT ON FUNCTION public.can_edit_video(uuid, uuid) IS 'Check if user can edit a video. Platform admins can edit any video. Uploaders can edit their own. Org admins/staff/coaches can edit org videos. Uses SECURITY DEFINER to bypass RLS on videos table.';
