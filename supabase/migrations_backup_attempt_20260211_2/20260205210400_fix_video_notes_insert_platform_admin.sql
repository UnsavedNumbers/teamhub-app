-- Fix video_notes INSERT policy to allow platform admins
-- Platform admins should be able to create notes on any video

DROP POLICY IF EXISTS video_notes_insert_policy ON public.video_notes;

CREATE POLICY video_notes_insert_policy ON public.video_notes 
FOR INSERT 
WITH CHECK (
  (author_id = auth.uid()) 
  AND (
    -- Platform admins can create notes on any video
    is_platform_admin(auth.uid())
    OR
    -- Org admins and coaches can create notes on their org's videos
    EXISTS (
      SELECT 1
      FROM public.videos v
      JOIN public.organization_members om ON om.org_id = v.org_id
      WHERE v.id = video_notes.video_id
        AND om.user_id = auth.uid()
        AND om.role IN ('org_admin', 'coach')
    )
  )
);

COMMENT ON POLICY video_notes_insert_policy ON public.video_notes IS 
'Platform admins can create notes on any video. Org admins and coaches can create notes on their org videos.';
