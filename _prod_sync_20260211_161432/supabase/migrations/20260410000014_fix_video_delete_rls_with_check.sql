-- Fix: Remove WITH CHECK clause from videos_service_role_policy to allow regular users to UPDATE
-- The WITH CHECK clause re-evaluates on the NEW row after UPDATE, which fails for non-service-role users.
-- USING clause is sufficient since it already ensures only service_role users can access via this policy.
-- This allows videos_update_policy to handle regular user UPDATEs (including soft-delete).

DROP POLICY IF EXISTS videos_service_role_policy ON public.videos;

CREATE POLICY videos_service_role_policy ON public.videos
  FOR ALL
  USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));

-- No WITH CHECK clause - allows UPDATE to complete for regular users via other policies
