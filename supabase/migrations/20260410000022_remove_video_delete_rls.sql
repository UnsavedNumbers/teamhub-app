-- =============================================================================
-- REMOVE RLS POLICIES FOR VIDEO TAG LINKING (ALL CRUD OPERATIONS)
-- =============================================================================

-- Drop all RLS policies for video_tag_links table
DROP POLICY IF EXISTS video_tag_links_select_policy ON public.video_tag_links;
DROP POLICY IF EXISTS video_tag_links_insert_policy ON public.video_tag_links;
DROP POLICY IF EXISTS video_tag_links_delete_policy ON public.video_tag_links;

-- Drop DELETE policy for videos (for bulk delete operations)
DROP POLICY IF EXISTS videos_delete_policy ON public.videos;

-- Comments
COMMENT ON TABLE public.video_tag_links IS 'Video tag links - All RLS policies removed for unrestricted CRUD operations';
COMMENT ON TABLE public.videos IS 'Videos table - DELETE operations no longer restricted by RLS';
