-- Fix: videos_service_role_policy WITH CHECK blocks regular user UPDATEs.
-- The catch-all policy (no FOR clause) applies to ALL operations including UPDATE.
-- Its WITH CHECK evaluates on the NEW row (soft-deleted state) and blocks regular users.
-- Solution: Remove it entirely - service_role should bypass RLS via connection settings.

DROP POLICY IF EXISTS videos_service_role_policy ON public.videos;
DROP POLICY IF EXISTS videos_service_role_select ON public.videos;
DROP POLICY IF EXISTS videos_service_role_insert ON public.videos;
DROP POLICY IF EXISTS videos_service_role_update ON public.videos;
DROP POLICY IF EXISTS videos_service_role_delete ON public.videos;
