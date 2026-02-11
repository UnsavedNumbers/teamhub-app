-- Add org_id column to events table for easier organization lookups
-- This denormalizes the data but improves query performance and simplifies fan page access

-- 1. Add the column (nullable initially)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS org_id uuid;

-- 2. Populate org_id from the team's org_id
UPDATE public.events e
SET org_id = t.org_id
FROM public.teams t
WHERE e.team_id = t.id
  AND e.org_id IS NULL;

-- 3. Add foreign key constraint
ALTER TABLE public.events
ADD CONSTRAINT events_org_id_fkey
FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_events_org_id ON public.events(org_id);

-- 5. Add RLS policy for fans to read events by org_id
CREATE POLICY "Fans can view public events by org"
ON public.events
FOR SELECT
TO authenticated
USING (
  visibility = 'public'
  OR org_id IN (
    SELECT org_id FROM public.fan_org_follows WHERE user_id = auth.uid()
  )
);

-- 6. Comment for documentation
COMMENT ON COLUMN public.events.org_id IS 'Organization that owns this event (denormalized from team for performance)';
