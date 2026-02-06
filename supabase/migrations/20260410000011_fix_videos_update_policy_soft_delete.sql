-- Fix videos UPDATE RLS so soft-delete succeeds.
-- WITH CHECK runs on the NEW row; can_edit_video(id, auth.uid()) does a SELECT from videos,
-- which is subject to RLS. The SELECT policy only shows rows with deleted_at IS NULL, so
-- after setting deleted_at the NEW row is invisible and can_edit_video returns false.
-- Allow the updated row when it is in soft-deleted form (USING already ensures only
-- users who can edit the video can run the update).

DROP POLICY IF EXISTS videos_update_policy ON public.videos;

CREATE POLICY videos_update_policy ON public.videos
  FOR UPDATE
  USING (public.can_edit_video(id, auth.uid()))
  WITH CHECK (
    public.can_edit_video(id, auth.uid())
    OR (status = 'deleted' AND deleted_at IS NOT NULL)
  );
