-- Migration: Fix get_gallery_photo_counts function
-- Corrects the table reference from user_org_roles to organization_members

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
