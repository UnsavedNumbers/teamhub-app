-- Fix videos UPDATE RLS so soft-delete always passes WITH CHECK.
-- WITH CHECK runs on the NEW row. can_edit_video(id, auth.uid()) can fail for the new row
-- (e.g. the function's SELECT is subject to RLS and the updated row has deleted_at set,
-- so the SELECT policy hides it and can_edit_video returns false).
-- Allow the new row when it is in soft-deleted form WITHOUT calling can_edit_video;
-- USING already ensures only users who can edit the video can run the update.

DROP POLICY IF EXISTS videos_update_policy ON public.videos;

CREATE POLICY videos_update_policy ON public.videos
  FOR UPDATE
  USING (public.can_edit_video(id, auth.uid()))
  WITH CHECK (
    -- Soft-delete: allow new row when status is deleted and deleted_at is set (no can_edit_video call on new row)
    (status = 'deleted'::public.video_status AND deleted_at IS NOT NULL)
    OR
    -- Normal update: require can_edit_video for the new row
    (status IS DISTINCT FROM 'deleted'::public.video_status AND public.can_edit_video(id, auth.uid()))
  );
