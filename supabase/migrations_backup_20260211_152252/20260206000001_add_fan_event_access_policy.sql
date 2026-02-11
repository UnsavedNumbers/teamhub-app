-- Add RLS policy to allow fans to view public events
-- This enables the fan event detail page to display public events

CREATE POLICY "fans_can_view_public_events" 
ON public.events 
FOR SELECT 
TO authenticated
USING (
  visibility = 'public'
);

COMMENT ON POLICY "fans_can_view_public_events" ON public.events 
IS 'Authenticated users (fans) can view events marked as public visibility';
