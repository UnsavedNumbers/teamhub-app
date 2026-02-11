-- Fix function overloading issue with can_view_gallery
-- Drop dependent policies first, then drop the one-parameter version and keep the two-parameter version

-- Drop dependent policies that use can_view_gallery(uuid, uuid)
DROP POLICY IF EXISTS gallery_albums_select_policy ON public.gallery_albums;
DROP POLICY IF EXISTS gallery_photos_select_policy ON public.gallery_photos;
DROP POLICY IF EXISTS gallery_photo_tags_select_policy ON public.gallery_photo_tags;
DROP POLICY IF EXISTS gallery_downloads_insert_policy ON public.gallery_downloads;

-- Drop the one-parameter version (created in previous migration) since the two-parameter version is used by policies
DROP FUNCTION IF EXISTS public.can_view_gallery(UUID);

-- Recreate the policies using the existing two-parameter function
-- gallery_albums_select_policy
CREATE POLICY gallery_albums_select_policy ON public.gallery_albums
FOR SELECT
TO authenticated
USING (public.can_view_gallery(gallery_id, auth.uid()));

-- gallery_photos_select_policy  
CREATE POLICY gallery_photos_select_policy ON public.gallery_photos
FOR SELECT
TO authenticated
USING (public.can_view_gallery(gallery_id, auth.uid()));

-- gallery_photo_tags_select_policy
CREATE POLICY gallery_photo_tags_select_policy ON public.gallery_photo_tags
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gallery_photos gp
    WHERE gp.id = gallery_photo_tags.photo_id
      AND public.can_view_gallery(gp.gallery_id, auth.uid())
  )
);

-- gallery_downloads_insert_policy - use photo_id to get gallery_id
CREATE POLICY gallery_downloads_insert_policy ON public.gallery_downloads
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.gallery_photos gp
    WHERE gp.id = gallery_downloads.photo_id
      AND public.can_view_gallery(gp.gallery_id, auth.uid())
  )
);
