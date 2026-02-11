-- =============================================================================
-- VIDEO LIBRARY FEATURES MIGRATION
-- Adds: video_shares table, full-text search vector, soft delete for comments
-- =============================================================================

-- =============================================================================
-- 1. VIDEO SHARES TABLE (for shareable links with expiration)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.video_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,  -- NULL = never expires
    revoked_at TIMESTAMPTZ,
    allow_download BOOLEAN DEFAULT false,
    password_hash TEXT,  -- Optional password protection (hashed)
    email_recipients TEXT[],  -- Email addresses shared with
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_shares_token ON public.video_shares(token);
CREATE INDEX IF NOT EXISTS idx_video_shares_video_id ON public.video_shares(video_id);
CREATE INDEX IF NOT EXISTS idx_video_shares_created_by ON public.video_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_video_shares_org_id ON public.video_shares(org_id);

-- RLS Policies
ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares they created
CREATE POLICY "video_shares_select_own"
    ON public.video_shares
    FOR SELECT
    USING (created_by = auth.uid());

-- Org admins can view all shares in their org
CREATE POLICY "video_shares_select_org_admin"
    ON public.video_shares
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.org_id = video_shares.org_id
            AND om.user_id = auth.uid()
            AND om.role = 'org_admin'
        )
    );

-- Users can create shares for videos they can edit
CREATE POLICY "video_shares_insert"
    ON public.video_shares
    FOR INSERT
    WITH CHECK (
        created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.videos v
            WHERE v.id = video_shares.video_id
            AND public.can_edit_video(v.id, auth.uid())
        )
    );

-- Users can update their own shares
CREATE POLICY "video_shares_update_own"
    ON public.video_shares
    FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Users can delete their own shares
CREATE POLICY "video_shares_delete_own"
    ON public.video_shares
    FOR DELETE
    USING (created_by = auth.uid());

-- Comments
COMMENT ON TABLE public.video_shares IS 'Shareable video links with optional expiration and password protection';
COMMENT ON COLUMN public.video_shares.token IS 'Unique cryptographic token for the share URL';
COMMENT ON COLUMN public.video_shares.expires_at IS 'When the share link expires (NULL = never)';
COMMENT ON COLUMN public.video_shares.revoked_at IS 'When the share was manually revoked';
COMMENT ON COLUMN public.video_shares.password_hash IS 'Optional bcrypt hash of password for protected shares';

-- =============================================================================
-- 2. ADD SOFT DELETE TO VIDEO_COMMENTS
-- =============================================================================

-- Add deleted_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'video_comments'
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.video_comments ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- =============================================================================
-- 3. ADD FULL-TEXT SEARCH VECTOR TO VIDEOS
-- =============================================================================

-- Add search vector column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'videos'
        AND column_name = 'search_vector'
    ) THEN
        ALTER TABLE public.videos ADD COLUMN search_vector tsvector;
    END IF;
END $$;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_videos_search_vector ON public.videos USING GIN(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION public.videos_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain search vector
DROP TRIGGER IF EXISTS trigger_videos_search_vector ON public.videos;
CREATE TRIGGER trigger_videos_search_vector
    BEFORE INSERT OR UPDATE OF title, description
    ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.videos_search_vector_update();

-- Backfill existing videos
UPDATE public.videos SET search_vector = 
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B')
WHERE search_vector IS NULL;

-- =============================================================================
-- 4. ADD VIEW/COMMENT/BOOKMARK COUNTS TO VIDEOS (for sorting)
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'videos'
        AND column_name = 'comment_count'
    ) THEN
        ALTER TABLE public.videos ADD COLUMN comment_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'videos'
        AND column_name = 'bookmark_count'
    ) THEN
        ALTER TABLE public.videos ADD COLUMN bookmark_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'videos'
        AND column_name = 'share_count'
    ) THEN
        ALTER TABLE public.videos ADD COLUMN share_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'videos'
        AND column_name = 'last_shared_at'
    ) THEN
        ALTER TABLE public.videos ADD COLUMN last_shared_at TIMESTAMPTZ;
    END IF;
END $$;

-- =============================================================================
-- 5. ADD USER VIDEO BOOKMARKS (Simpler, per-video toggle instead of timestamps)
-- This is for "favorite/bookmark this video" not timestamp bookmarks
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.video_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(video_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_video_favorites_user_id ON public.video_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_video_favorites_video_id ON public.video_favorites(video_id);
CREATE INDEX IF NOT EXISTS idx_video_favorites_org_id ON public.video_favorites(org_id);

-- RLS Policies
ALTER TABLE public.video_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_favorites_select"
    ON public.video_favorites
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "video_favorites_insert"
    ON public.video_favorites
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "video_favorites_delete"
    ON public.video_favorites
    FOR DELETE
    USING (user_id = auth.uid());

COMMENT ON TABLE public.video_favorites IS 'User-specific video bookmarks/favorites';

-- =============================================================================
-- 6. FUNCTION TO VALIDATE SHARE TOKEN
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_video_share_token(p_token VARCHAR)
RETURNS TABLE(
    video_id UUID,
    is_valid BOOLEAN,
    allow_download BOOLEAN,
    requires_password BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vs.video_id,
        (
            vs.revoked_at IS NULL 
            AND (vs.expires_at IS NULL OR vs.expires_at > NOW())
        ) as is_valid,
        vs.allow_download,
        (vs.password_hash IS NOT NULL) as requires_password
    FROM public.video_shares vs
    WHERE vs.token = p_token
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. FUNCTION TO INCREMENT SHARE ACCESS COUNT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_share_access(p_token VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE public.video_shares
    SET 
        access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE token = p_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. TRIGGERS TO MAINTAIN COUNTS
-- =============================================================================

-- Comment count trigger
CREATE OR REPLACE FUNCTION public.update_video_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.videos 
        SET comment_count = comment_count + 1 
        WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.videos 
        SET comment_count = GREATEST(comment_count - 1, 0) 
        WHERE id = OLD.video_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_video_comment_count ON public.video_comments;
CREATE TRIGGER trigger_video_comment_count
    AFTER INSERT OR DELETE ON public.video_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_video_comment_count();

-- Bookmark count trigger
CREATE OR REPLACE FUNCTION public.update_video_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.videos 
        SET bookmark_count = bookmark_count + 1 
        WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.videos 
        SET bookmark_count = GREATEST(bookmark_count - 1, 0) 
        WHERE id = OLD.video_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_video_bookmark_count ON public.video_favorites;
CREATE TRIGGER trigger_video_bookmark_count
    AFTER INSERT OR DELETE ON public.video_favorites
    FOR EACH ROW
    EXECUTE FUNCTION public.update_video_bookmark_count();

-- Share count trigger
CREATE OR REPLACE FUNCTION public.update_video_share_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.videos 
        SET 
            share_count = share_count + 1,
            last_shared_at = NOW()
        WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.videos 
        SET share_count = GREATEST(share_count - 1, 0) 
        WHERE id = OLD.video_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_video_share_count ON public.video_shares;
CREATE TRIGGER trigger_video_share_count
    AFTER INSERT OR DELETE ON public.video_shares
    FOR EACH ROW
    EXECUTE FUNCTION public.update_video_share_count();

-- Backfill counts for existing data
UPDATE public.videos v SET 
    comment_count = COALESCE((SELECT COUNT(*) FROM public.video_comments vc WHERE vc.video_id = v.id AND vc.deleted_at IS NULL), 0),
    bookmark_count = COALESCE((SELECT COUNT(*) FROM public.video_favorites vf WHERE vf.video_id = v.id), 0),
    share_count = COALESCE((SELECT COUNT(*) FROM public.video_shares vs WHERE vs.video_id = v.id), 0);

-- =============================================================================
-- 9. ADD FAN_VISIBLE COLUMN TO VIDEOS
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'videos'
        AND column_name = 'fan_visible'
    ) THEN
        ALTER TABLE public.videos ADD COLUMN fan_visible BOOLEAN DEFAULT false;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_videos_fan_visible ON public.videos(fan_visible) WHERE fan_visible = true;

COMMENT ON COLUMN public.videos.fan_visible IS 'Whether this video is visible to fans who follow the org/team';

-- =============================================================================
-- 10. CAN_EDIT_VIDEO FUNCTION - Already exists in baseline, skip
-- =============================================================================
-- Note: The can_edit_video(p_video_id, p_user_id) function already exists.
-- It checks: uploader, org_admin role via organization_members table.

-- =============================================================================
-- 11. ADD THUMBNAIL_TIMESTAMP COLUMN FOR CUSTOM THUMBNAILS
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'videos'
        AND column_name = 'thumbnail_timestamp'
    ) THEN
        ALTER TABLE public.videos ADD COLUMN thumbnail_timestamp NUMERIC;
    END IF;
END $$;

COMMENT ON COLUMN public.videos.thumbnail_timestamp IS 'Timestamp in seconds for custom thumbnail frame selection';

