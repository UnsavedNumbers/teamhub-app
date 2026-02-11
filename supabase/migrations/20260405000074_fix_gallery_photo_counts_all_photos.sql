-- Migration: Fix get_gallery_photo_counts to count all photos correctly
-- The previous version was too restrictive, only counting approved photos for non-admins
-- but galleries may not use the approval workflow at all

CREATE OR REPLACE FUNCTION public.get_gallery_photo_counts(p_gallery_ids uuid[])
RETURNS TABLE (
  gallery_id uuid,
  total_count bigint,
  pending_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gp.gallery_id,
    COUNT(*)::bigint AS total_count,
    COUNT(*) FILTER (WHERE gp.status = 'pending')::bigint AS pending_count
  FROM gallery_photos gp
  WHERE gp.gallery_id = ANY(p_gallery_ids)
  GROUP BY gp.gallery_id;
END;
$$;
