-- Fix: Remove service_role policies that interfere with regular user UPDATEs.
-- Service role bypasses RLS via client config, doesn't need policies.
DROP POLICY IF EXISTS videos_service_role_policy ON public.videos;
DROP POLICY IF EXISTS videos_service_role_select ON public.videos;
DROP POLICY IF EXISTS videos_service_role_insert ON public.videos;
DROP POLICY IF EXISTS videos_service_role_update ON public.videos;
DROP POLICY IF EXISTS videos_service_role_delete ON public.videos;
