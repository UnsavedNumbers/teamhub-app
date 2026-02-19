-- Fix: Ensure videos_insert_policy doesn't interfere with UPDATE operations
-- Re-create it explicitly scoped to INSERT only

DROP POLICY IF EXISTS videos_insert_policy ON public.videos;

CREATE POLICY videos_insert_policy ON public.videos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.org_id = videos.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('org_admin', 'coach')
    )
  );
