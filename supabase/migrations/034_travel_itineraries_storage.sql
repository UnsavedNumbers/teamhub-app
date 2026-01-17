-- Travel itineraries storage bucket + policies
-- ===========================================
-- Private bucket; clients use signed URLs for downloads.

-- Create bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('travel-itineraries', 'travel-itineraries', false)
ON CONFLICT (id) DO NOTHING;

-- Policies on storage.objects for travel-itineraries
-- Note: storage policies run with auth.uid(); Edge Functions using service role bypass RLS.

-- Drop existing policies if re-running locally
DROP POLICY IF EXISTS "Admins can manage travel itineraries objects" ON storage.objects;
DROP POLICY IF EXISTS "Parents can read travel itineraries objects for their teams" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can read travel itineraries objects for their org" ON storage.objects;

-- Storage object naming convention (enforced by UI/Edge Functions):
--   {org_id}/{team_id}/{travel_plan_id}/{filename}
--
-- This lets us authorize uploads before the plan is updated with `itinerary_file_path`.

-- Admins can upload/update/delete objects within their org prefix
CREATE POLICY "Admins can manage travel itineraries objects" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'travel-itineraries'
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND storage.objects.name LIKE (u.org_id::text || '/%')
    )
  )
  WITH CHECK (
    bucket_id = 'travel-itineraries'
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND storage.objects.name LIKE (u.org_id::text || '/%')
    )
  );

-- Parents can read itinerary objects for teams their children are active on (published/cancelled trips only)
CREATE POLICY "Parents can read travel itineraries objects for their teams" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'travel-itineraries'
    AND EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.children c ON c.family_id = u.family_id
      JOIN public.team_memberships tm ON tm.child_id = c.id
      JOIN public.travel_plans tp
        ON tp.team_id = tm.team_id
       AND tp.itinerary_file_path = storage.objects.name
      WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND tm.status = 'active'
        AND tp.status IN ('published', 'cancelled')
    )
  );

-- Coaches can read itinerary objects for teams in their org
CREATE POLICY "Coaches can read travel itineraries objects for their org" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'travel-itineraries'
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'coach'
        AND storage.objects.name LIKE (u.org_id::text || '/%')
    )
  );

