-- Migration: Update storage bucket policies to use consolidated buckets
-- All organization assets (logos, sport icons, event banners, etc) now go in public-media bucket with folder structure
-- Athlete imports remain in athlete-imports bucket
-- Date: 2026-02-05

-- Drop old organization-assets policies
DROP POLICY IF EXISTS "Org admins can delete org files" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update org files" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can upload org files" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can manage sport icons" ON storage.objects;
DROP POLICY IF EXISTS "Public can read sport icons" ON storage.objects;

-- Create new policies for public-media bucket with folder-based access control

-- Policy: Org admins can upload org logos
CREATE POLICY "Org admins can upload org logos" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'org-logos'
  AND public.user_is_org_admin(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

-- Policy: Org admins can update org logos
CREATE POLICY "Org admins can update org logos" ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'org-logos'
  AND public.user_is_org_admin(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

-- Policy: Org admins can delete org logos
CREATE POLICY "Org admins can delete org logos" ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'org-logos'
  AND public.user_is_org_admin(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

-- Policy: Org admins can manage sport icons (upload/update/delete)
-- Path structure: public-media/sports/{org_id}/{sport_id}/icon.{ext}
CREATE POLICY "Org admins can manage sport icons" ON storage.objects 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'sports'
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.role = 'org_admin'
    AND (storage.foldername(objects.name))[2] = om.org_id::text
  )
)
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'sports'
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.role = 'org_admin'
    AND (storage.foldername(objects.name))[2] = om.org_id::text
  )
);

-- Policy: Public can read sport icons
CREATE POLICY "Public can read sport icons" ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'sports'
);

-- Policy: Org admins can upload event banners
-- Path structure: public-media/event-banners/{org_id}/...
CREATE POLICY "Org admins can upload event banners" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'event-banners'
  AND public.user_is_org_admin(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

-- Policy: Org admins can update event banners
CREATE POLICY "Org admins can update event banners" ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'event-banners'
  AND public.user_is_org_admin(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

-- Policy: Org admins can delete event banners
CREATE POLICY "Org admins can delete event banners" ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'event-banners'
  AND public.user_is_org_admin(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

-- Policy: Org admins can upload travel itineraries
CREATE POLICY "Org admins can upload travel itineraries" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'travel-itineraries'
  AND public.user_is_org_admin(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

-- Policy: Org admins can update travel itineraries
CREATE POLICY "Org admins can update travel itineraries" ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'travel-itineraries'
  AND public.user_is_org_admin(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

-- Policy: Org admins can delete travel itineraries
CREATE POLICY "Org admins can delete travel itineraries" ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'travel-itineraries'
  AND public.user_is_org_admin(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

-- Policy: Org members can read travel itineraries
CREATE POLICY "Org members can read travel itineraries" ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'travel-itineraries'
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND (storage.foldername(objects.name))[2] = om.org_id::text
  )
);

-- Update tryout-documents policies to use public-media bucket
-- Drop old tryout-documents policies
DROP POLICY IF EXISTS "Tryout docs: parents can delete own objects" ON storage.objects;
DROP POLICY IF EXISTS "Tryout docs: parents can read own objects" ON storage.objects;
DROP POLICY IF EXISTS "Tryout docs: parents can update own objects" ON storage.objects;
DROP POLICY IF EXISTS "Tryout docs: parents can upload own objects" ON storage.objects;
DROP POLICY IF EXISTS "Tryout docs: staff can read org objects" ON storage.objects;

-- Create new policies for tryout documents in public-media bucket
-- Path structure: public-media/tryout-documents/{org_id}/...

CREATE POLICY "Tryout docs: parents can upload own objects" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'tryout-documents'
  AND EXISTS (
    SELECT 1
    FROM public.tryout_registration_documents d
    JOIN public.tryout_registrations r ON r.id = d.registration_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE d.storage_path = objects.name
    AND u.role = 'parent'
    AND u.family_id = r.family_id
  )
);

CREATE POLICY "Tryout docs: parents can read own objects" ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'tryout-documents'
  AND EXISTS (
    SELECT 1
    FROM public.tryout_registration_documents d
    JOIN public.tryout_registrations r ON r.id = d.registration_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE d.storage_path = objects.name
    AND u.role = 'parent'
    AND u.family_id = r.family_id
  )
);

CREATE POLICY "Tryout docs: parents can update own objects" ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'tryout-documents'
  AND EXISTS (
    SELECT 1
    FROM public.tryout_registration_documents d
    JOIN public.tryout_registrations r ON r.id = d.registration_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE d.storage_path = objects.name
    AND u.role = 'parent'
    AND u.family_id = r.family_id
  )
);

CREATE POLICY "Tryout docs: parents can delete own objects" ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'tryout-documents'
  AND EXISTS (
    SELECT 1
    FROM public.tryout_registration_documents d
    JOIN public.tryout_registrations r ON r.id = d.registration_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE d.storage_path = objects.name
    AND u.role = 'parent'
    AND u.family_id = r.family_id
  )
);

CREATE POLICY "Tryout docs: staff can read org objects" ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'tryout-documents'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND (storage.foldername(objects.name))[2] = om.org_id::text
  )
);
