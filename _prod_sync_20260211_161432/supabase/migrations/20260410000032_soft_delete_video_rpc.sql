-- Soft-delete video via RPC to avoid RLS WITH CHECK blocking.
-- UPDATE policy's WITH CHECK runs on the NEW row; after setting status='deleted' and deleted_at,
-- the new row can fail policy (e.g. SELECT hides deleted rows so can_edit_video fails).
-- This function runs as SECURITY DEFINER so the UPDATE bypasses RLS; we still enforce
-- permission via can_edit_video(p_video_id, auth.uid()) before updating.

CREATE OR REPLACE FUNCTION public.soft_delete_video(p_video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF NOT public.can_edit_video(p_video_id, auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied to delete this video'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.videos
  SET
    status = 'deleted'::public.video_status,
    deleted_at = now()
  WHERE id = p_video_id;
END;
$$;

COMMENT ON FUNCTION public.soft_delete_video(uuid) IS 'Soft-delete a video. Enforces can_edit_video; runs as DEFINER so UPDATE bypasses RLS WITH CHECK.';

GRANT EXECUTE ON FUNCTION public.soft_delete_video(uuid) TO authenticated;
