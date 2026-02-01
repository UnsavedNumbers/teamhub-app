-- Migration: Photo Galleries Storage Policies
-- ============================================
-- Purpose: Extend public-media bucket storage policies to support gallery photo paths
-- Path convention: orgs/{org_id}/galleries/{gallery_id}/{photo_id}.jpg
-- Note: Reads use direct public URLs (bucket is public), writes require can_upload_to_gallery or can_moderate_gallery

-- ============================================================================
-- HELPER FUNCTION: Extract gallery_id from storage path
-- ============================================================================
-- Path format: orgs/{org_id}/galleries/{gallery_id}/{photo_id}.jpg
-- Returns gallery_id UUID if path matches pattern, NULL otherwise

CREATE OR REPLACE FUNCTION extract_gallery_id_from_path(storage_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  path_parts TEXT[];
  gallery_id_str TEXT;
BEGIN
  -- Split path by /
  path_parts := string_to_array(storage_path, '/');
  
  -- Check if path matches pattern: orgs/{org_id}/galleries/{gallery_id}/...
  IF array_length(path_parts, 1) >= 4 
     AND path_parts[1] = 'orgs' 
     AND path_parts[3] = 'galleries' THEN
    gallery_id_str := path_parts[4];
    
    -- Validate UUID format
    IF gallery_id_str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN gallery_id_str::UUID;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION extract_gallery_id_from_path IS 
  'Extracts gallery_id UUID from storage path (orgs/{org_id}/galleries/{gallery_id}/...).';

-- ============================================================================
-- STORAGE POLICIES FOR GALLERY PHOTOS
-- ============================================================================

-- Drop existing gallery-specific policies if they exist
DROP POLICY IF EXISTS "Gallery photos read access" ON storage.objects;
DROP POLICY IF EXISTS "Gallery photos upload access" ON storage.objects;
DROP POLICY IF EXISTS "Gallery photos update access" ON storage.objects;
DROP POLICY IF EXISTS "Gallery photos delete access" ON storage.objects;

-- Policy: Public read access for gallery photos (bucket is public)
-- This is mainly for documentation since public buckets don't need read policies
CREATE POLICY "Gallery photos read access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'orgs'
  AND (storage.foldername(name))[3] = 'galleries'
);

-- Policy: Authenticated users can upload gallery photos if they have permission
CREATE POLICY "Gallery photos upload access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'orgs'
  AND (storage.foldername(name))[3] = 'galleries'
  AND can_upload_to_gallery(extract_gallery_id_from_path(name), auth.uid())
);

-- Policy: Authenticated users can update gallery photos if they have permission
CREATE POLICY "Gallery photos update access"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'orgs'
  AND (storage.foldername(name))[3] = 'galleries'
  AND (
    can_moderate_gallery(extract_gallery_id_from_path(name), auth.uid())
    OR EXISTS (
      -- Allow uploader to update their own photos (if still pending)
      SELECT 1 FROM gallery_photos gp
      WHERE gp.storage_path = name
        AND gp.uploaded_by_user_id = auth.uid()
        AND gp.status = 'pending'
    )
  )
)
WITH CHECK (
  bucket_id = 'public-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'orgs'
  AND (storage.foldername(name))[3] = 'galleries'
  AND (
    can_moderate_gallery(extract_gallery_id_from_path(name), auth.uid())
    OR EXISTS (
      SELECT 1 FROM gallery_photos gp
      WHERE gp.storage_path = name
        AND gp.uploaded_by_user_id = auth.uid()
        AND gp.status = 'pending'
    )
  )
);

-- Policy: Authenticated users can delete gallery photos if they have permission
CREATE POLICY "Gallery photos delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'orgs'
  AND (storage.foldername(name))[3] = 'galleries'
  AND (
    can_moderate_gallery(extract_gallery_id_from_path(name), auth.uid())
    OR EXISTS (
      -- Allow uploader to delete their own photos
      SELECT 1 FROM gallery_photos gp
      WHERE gp.storage_path = name
        AND gp.uploaded_by_user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Gallery photos read access" ON storage.objects IS 
  'Allows public read access to gallery photos in public-media bucket (bucket is public).';

COMMENT ON POLICY "Gallery photos upload access" ON storage.objects IS 
  'Allows authenticated users to upload gallery photos if they have can_upload_to_gallery permission.';

COMMENT ON POLICY "Gallery photos update access" ON storage.objects IS 
  'Allows authenticated users to update gallery photos if they can moderate or are the uploader (pending only).';

COMMENT ON POLICY "Gallery photos delete access" ON storage.objects IS 
  'Allows authenticated users to delete gallery photos if they can moderate or are the uploader.';
