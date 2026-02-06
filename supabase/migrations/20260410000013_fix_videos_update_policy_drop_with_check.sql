-- Fix: soft-delete fails because WITH CHECK re-evaluates on the NEW row.
-- USING already gates who can update; WITH CHECK is unnecessary here.
DROP POLICY IF EXISTS videos_update_policy ON public.videos;

CREATE POLICY videos_update_policy ON public.videos
  FOR UPDATE
  USING (public.can_edit_video(id, auth.uid()));
