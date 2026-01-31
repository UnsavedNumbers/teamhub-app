-- Migration: Photo Galleries Aggregate Functions
-- ============================================
-- Purpose: Add database functions for efficient photo count and pending count queries

-- Function to update org storage usage (called from Edge Function or client)
CREATE OR REPLACE FUNCTION update_org_storage_usage(
  p_org_id UUID,
  p_bucket_id TEXT DEFAULT 'public-media',
  p_bytes_delta BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO org_storage_usage (org_id, bucket_id, bytes_used, updated_at)
  VALUES (p_org_id, p_bucket_id, GREATEST(0, p_bytes_delta), now())
  ON CONFLICT (org_id) 
  DO UPDATE SET
    bytes_used = GREATEST(0, org_storage_usage.bytes_used + p_bytes_delta),
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION update_org_storage_usage IS 
  'Updates org storage usage atomically. Called after photo upload/delete.';

GRANT EXECUTE ON FUNCTION update_org_storage_usage(UUID, TEXT, BIGINT) TO authenticated;

-- Function to get gallery photo counts (for efficient listing)
CREATE OR REPLACE FUNCTION get_gallery_photo_counts(
  p_gallery_ids UUID[]
)
RETURNS TABLE(
  gallery_id UUID,
  total_count BIGINT,
  pending_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    gp.gallery_id,
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE gp.status = 'pending')::BIGINT as pending_count
  FROM gallery_photos gp
  WHERE gp.gallery_id = ANY(p_gallery_ids)
  GROUP BY gp.gallery_id;
$$;

COMMENT ON FUNCTION get_gallery_photo_counts IS 
  'Returns photo counts (total and pending) for multiple galleries efficiently.';

GRANT EXECUTE ON FUNCTION get_gallery_photo_counts(UUID[]) TO authenticated;
