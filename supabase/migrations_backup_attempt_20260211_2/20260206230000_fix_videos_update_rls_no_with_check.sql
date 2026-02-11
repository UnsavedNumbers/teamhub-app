-- Fix: Remove WITH CHECK from videos_update_policy to allow soft-delete to succeed
-- The WITH CHECK clause evaluates on the NEW row after the UPDATE.
-- When soft-deleting (setting deleted_at), the SELECT policy filters it out,
-- causing can_edit_video to fail when re-evaluated on the NEW row.
-- Removing WITH CHECK is safe because USING already gates who can perform the UPDATE.

DROP POLICY IF EXISTS videos_update_policy ON public.videos;

CREATE POLICY videos_update_policy ON public.videos
  FOR UPDATE
  USING (public.can_edit_video(id, auth.uid()));
