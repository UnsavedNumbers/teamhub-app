-- Migration: Setup public-media bucket for athlete profile photos
-- ========================================================
-- Creates bucket and storage policies for athlete profile photos
-- Bucket is public for reads, authenticated writes with org validation

-- ==============================================
-- Create public-media bucket (if not exists)
-- ==============================================
-- Note: Bucket creation must be done via Supabase Dashboard or API
-- This migration assumes the bucket exists
-- To create: Go to Storage > New bucket > Name: "public-media" > Public: true

-- ==============================================
-- Storage Policies for public-media bucket
-- ==============================================

-- Policy: Anyone can read athlete photos (public bucket)
-- Since bucket is public, this is mainly for documentation
-- Public buckets don't need read policies, but we add one for clarity
CREATE POLICY IF NOT EXISTS "Public read access for athlete photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-media');

-- Policy: Authenticated users in org can upload athlete photos
-- DB validation ensures user has permission (org_admin, coach, or guardian)
-- Storage policy just checks user is authenticated and in an org
CREATE POLICY IF NOT EXISTS "Authenticated users can upload athlete photos"
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
CREATE POLICY IF NOT EXISTS "Authenticated users can update athlete photos"
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
CREATE POLICY IF NOT EXISTS "Authenticated users can delete athlete photos"
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
