-- Make team_id and season_id optional in events table
-- org_id becomes the primary way to identify an event's organization
-- team_id and season_id are now optional (for organization-wide events)

-- 1. First ensure org_id is populated for all existing events
UPDATE public.events e
SET org_id = t.org_id
FROM public.teams t
WHERE e.team_id = t.id
  AND e.org_id IS NULL;

-- 2. Make team_id nullable
ALTER TABLE public.events
ALTER COLUMN team_id DROP NOT NULL;

-- 3. Make season_id nullable  
ALTER TABLE public.events
ALTER COLUMN season_id DROP NOT NULL;

-- 4. Ensure org_id is NOT NULL (every event must belong to an organization)
ALTER TABLE public.events
ALTER COLUMN org_id SET NOT NULL;

-- 5. Update comments
COMMENT ON COLUMN public.events.team_id IS 'Team associated with this event (optional - can be organization-wide)';
COMMENT ON COLUMN public.events.season_id IS 'Season associated with this event (optional)';
COMMENT ON COLUMN public.events.org_id IS 'Organization that owns this event (required)';
