-- Simplified RLS: if you can read the event, you can read its location
-- This fixes the join returning null even when user has event access

DROP POLICY IF EXISTS event_locations__read_with_event ON public.event_locations;

CREATE POLICY event_locations__read_with_event
ON public.event_locations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_locations.event_id
  )
);

COMMENT ON POLICY event_locations__read_with_event ON public.event_locations IS 'Anyone who can read the event can read its location (event RLS handles access control)';
