-- Migration: Setup public-media bucket for athlete profile photos
-- ========================================================
-- Creates bucket and storage policies for athlete profile photos
-- Bucket is public for reads, authenticated writes with org validation
--
-- NOTE: If you get "must be owner of relation objects" error, you may need to:
-- 1. Create the bucket via Supabase Dashboard first (Storage > New bucket)
-- 2. Then create policies via Dashboard (Storage > Policies) or run this migration
--    with superuser privileges

-- ==============================================
-- Create public-media bucket (if not exists)
-- ==============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-media',
  'public-media',
  true, -- Public bucket for direct access
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- Storage Policies for public-media bucket
-- ==============================================

-- Drop existing policies if re-running locally
DROP POLICY IF EXISTS "Public read access for athlete photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload athlete photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update athlete photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete athlete photos" ON storage.objects;

-- Policy: Anyone can read athlete photos (public bucket)
-- Since bucket is public, this is mainly for documentation
-- Public buckets don't need read policies, but we add one for clarity
CREATE POLICY "Public read access for athlete photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-media');

-- Policy: Authenticated users in org can upload athlete photos
-- DB validation ensures user has permission (org_admin, coach, or guardian)
-- Storage policy just checks user is authenticated and in an org
CREATE POLICY "Authenticated users can upload athlete photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-media'
  AND auth.role() = 'authenticated'
  -- Path must be in orgs/{org_id}/athletes/... structure
  AND (storage.foldername(name))[1] = 'orgs'
  -- User must be member of the org (DB validation ensures correct role)
  AND EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.org_id::text = (storage.foldername(name))[2]
  )
);

-- Policy: Authenticated users can update athlete photos (overwrite)
CREATE POLICY "Authenticated users can update athlete photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'orgs'
  AND EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.org_id::text = (storage.foldername(name))[2]
  )
)
WITH CHECK (
  bucket_id = 'public-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'orgs'
  AND EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.org_id::text = (storage.foldername(name))[2]
  )
);

-- Policy: Authenticated users can delete athlete photos
CREATE POLICY "Authenticated users can delete athlete photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'orgs'
  AND EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.org_id::text = (storage.foldername(name))[2]
  )
);

COMMENT ON POLICY "Public read access for athlete photos" ON storage.objects IS 
  'Allows public read access to athlete profile photos in public-media bucket';

COMMENT ON POLICY "Authenticated users can upload athlete photos" ON storage.objects IS 
  'Allows authenticated users (org admins, coaches, guardians) to upload athlete photos. Validates org membership via path structure.';

COMMENT ON POLICY "Authenticated users can update athlete photos" ON storage.objects IS 
  'Allows authenticated users to overwrite existing athlete photos.';

COMMENT ON POLICY "Authenticated users can delete athlete photos" ON storage.objects IS 
  'Allows authenticated users to delete athlete photos.';
