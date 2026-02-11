-- Migration: Add get_gallery_photo_counts function
-- This function returns photo counts for multiple galleries at once,
-- respecting RLS policies by checking what photos the user can see.

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
  INNER JOIN galleries g ON g.id = gp.gallery_id
  WHERE gp.gallery_id = ANY(p_gallery_ids)
    -- Only count approved photos for non-admins, or all photos for admins
    AND (
      gp.status = 'approved'
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND om.org_id = g.org_id
          AND om.is_active = true
          AND om.role IN ('org_admin', 'coach', 'staff')
      )
    )
  GROUP BY gp.gallery_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_gallery_photo_counts(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_gallery_photo_counts(uuid[]) IS 
'Returns photo counts (total and pending) for multiple galleries. Respects visibility rules - non-admins only see approved photo counts.';
