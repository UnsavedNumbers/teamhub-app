-- Fix galleries_select_policy to use can_view_gallery function
-- The previous migration created an inline policy that was missing deleted_at checks
-- and was inconsistent with the can_view_gallery function

DROP POLICY IF EXISTS galleries_select_policy ON public.galleries;

-- Use the can_view_gallery function which has the correct logic
CREATE POLICY galleries_select_policy ON public.galleries 
FOR SELECT 
USING (public.can_view_gallery(id, auth.uid()));

COMMENT ON POLICY galleries_select_policy ON public.galleries IS 'Uses can_view_gallery function to check if user can view gallery based on their role and relationship to entities';
