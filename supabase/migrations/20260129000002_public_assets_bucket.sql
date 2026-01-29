-- ============================================================================
-- Add venue photos policies to public-media storage bucket
-- ============================================================================
-- The public-media bucket already exists. This migration adds policies
-- to allow venue photo uploads from the Edge Function.

-- Allow public read access to the bucket (may already exist)
DROP POLICY IF EXISTS "Public read access for public-media" ON storage.objects;
CREATE POLICY "Public read access for public-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public-media');

-- Allow service role to upload files
DROP POLICY IF EXISTS "Service role upload access for public-media" ON storage.objects;
CREATE POLICY "Service role upload access for public-media"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'public-media');

-- Allow service role to update files (for upsert)
DROP POLICY IF EXISTS "Service role update access for public-media" ON storage.objects;
CREATE POLICY "Service role update access for public-media"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'public-media');

-- Allow service role to delete files
DROP POLICY IF EXISTS "Service role delete access for public-media" ON storage.objects;
CREATE POLICY "Service role delete access for public-media"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'public-media');
