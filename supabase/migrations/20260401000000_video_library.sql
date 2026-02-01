-- ============================================
-- Video Library Feature - Database Migration
-- ============================================
-- This migration creates the complete video library schema for Mux integration
-- including tables, enums, indexes, constraints, and RLS policies.

-- ============================================
-- ENUMS
-- ============================================

-- Video category enum
CREATE TYPE public.video_category AS ENUM (
  'practice',      -- Practice session recordings
  'game',          -- Game footage
  'highlight',     -- Highlight clips
  'training',      -- Training/instructional content
  'event',         -- General event recordings
  'other'          -- Miscellaneous
);

-- Video visibility enum
CREATE TYPE public.video_visibility AS ENUM (
  'private',       -- Only uploader and admins
  'team',          -- Team members only
  'organization',  -- All org members
  'guardians'      -- Guardians of tagged athletes
);

-- Video status enum (tracks Mux processing state)
CREATE TYPE public.video_status AS ENUM (
  'pending_upload',  -- Direct upload URL created, awaiting file
  'uploading',       -- File upload in progress
  'processing',      -- Mux is processing the asset
  'ready',           -- Ready for playback
  'errored',         -- Processing failed
  'deleted'          -- Soft deleted
);

-- Tag type enum
CREATE TYPE public.video_tag_type AS ENUM (
  'skill',         -- Skill tags (e.g., "dribbling", "passing")
  'drill',         -- Drill tags (e.g., "shooting drill")
  'play',          -- Play/formation tags
  'custom'         -- Custom user-defined tags
);

-- Video-athlete link type enum
CREATE TYPE public.video_link_type AS ENUM (
  'featured',      -- Athlete is prominently featured
  'appears',       -- Athlete appears in video
  'highlight'      -- Video is a highlight of this athlete
);

-- Note scope enum
CREATE TYPE public.video_note_scope AS ENUM (
  'private',       -- Only visible to note author
  'coaches',       -- Visible to coaches only
  'guardians',     -- Visible to guardians of tagged athletes
  'all'            -- Visible to all with video access
);

-- Bookmark visibility enum
CREATE TYPE public.video_bookmark_visibility AS ENUM (
  'private',       -- Only visible to bookmark creator
  'shared'         -- Visible to all with video access
);

-- Review status enum
CREATE TYPE public.video_review_status AS ENUM (
  'pending',       -- Awaiting guardian review
  'viewed',        -- Guardian has viewed
  'acknowledged',  -- Guardian acknowledged with response
  'dismissed'      -- Guardian dismissed notification
);

-- ============================================
-- TABLES
-- ============================================

-- Main videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  
  -- Mux identifiers
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  mux_upload_id TEXT,
  
  -- Video metadata
  title TEXT NOT NULL,
  description TEXT,
  category public.video_category NOT NULL DEFAULT 'practice',
  visibility public.video_visibility NOT NULL DEFAULT 'team',
  status public.video_status NOT NULL DEFAULT 'pending_upload',
  
  -- Duration and technical details
  duration_seconds NUMERIC(10, 2),
  aspect_ratio TEXT,
  resolution_tier TEXT,
  max_stored_resolution TEXT,
  max_stored_frame_rate NUMERIC(6, 2),
  
  -- Thumbnail
  thumbnail_url TEXT,
  thumbnail_time_offset NUMERIC(10, 2) DEFAULT 0,
  
  -- Upload tracking
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  upload_started_at TIMESTAMPTZ,
  upload_completed_at TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  
  -- Error tracking
  error_type TEXT,
  error_message TEXT,
  
  -- Passthrough data for webhook correlation
  passthrough JSONB,
  
  -- Timestamps
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT videos_mux_asset_id_unique UNIQUE (mux_asset_id),
  CONSTRAINT videos_mux_upload_id_unique UNIQUE (mux_upload_id)
);

-- Create indexes for videos
CREATE INDEX idx_videos_org_id ON public.videos(org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_videos_team_id ON public.videos(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_videos_event_id ON public.videos(event_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_videos_uploaded_by ON public.videos(uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_videos_status ON public.videos(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_videos_category ON public.videos(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_videos_mux_upload_id ON public.videos(mux_upload_id);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC) WHERE deleted_at IS NULL;

-- Video tags table (reusable tags per organization)
CREATE TABLE public.video_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  tag_type public.video_tag_type NOT NULL DEFAULT 'custom',
  color TEXT,
  description TEXT,
  
  -- Usage tracking
  usage_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Unique tag name per org
  CONSTRAINT video_tags_org_name_unique UNIQUE (org_id, name)
);

CREATE INDEX idx_video_tags_org_id ON public.video_tags(org_id);
CREATE INDEX idx_video_tags_tag_type ON public.video_tags(tag_type);

-- Video-tag link table (many-to-many)
CREATE TABLE public.video_tag_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.video_tags(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  CONSTRAINT video_tag_links_unique UNIQUE (video_id, tag_id)
);

CREATE INDEX idx_video_tag_links_video_id ON public.video_tag_links(video_id);
CREATE INDEX idx_video_tag_links_tag_id ON public.video_tag_links(tag_id);

-- Video-athlete link table (which athletes appear in a video)
CREATE TABLE public.video_athlete_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  
  link_type public.video_link_type NOT NULL DEFAULT 'appears',
  
  -- Optional timestamp ranges where athlete appears
  start_time_seconds NUMERIC(10, 2),
  end_time_seconds NUMERIC(10, 2),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  CONSTRAINT video_athlete_links_unique UNIQUE (video_id, athlete_id)
);

CREATE INDEX idx_video_athlete_links_video_id ON public.video_athlete_links(video_id);
CREATE INDEX idx_video_athlete_links_athlete_id ON public.video_athlete_links(athlete_id);

-- Video notes table (timestamped annotations)
CREATE TABLE public.video_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  
  -- Note content
  content TEXT NOT NULL,
  timestamp_seconds NUMERIC(10, 2),
  duration_seconds NUMERIC(10, 2),
  
  -- Visibility
  scope public.video_note_scope NOT NULL DEFAULT 'coaches',
  
  -- Drawing/annotation data (for future canvas overlays)
  drawing_data JSONB,
  
  -- Author
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_video_notes_video_id ON public.video_notes(video_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_video_notes_author_id ON public.video_notes(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_video_notes_timestamp ON public.video_notes(timestamp_seconds) WHERE deleted_at IS NULL;

-- Video note targets (which athletes a note is about)
CREATE TABLE public.video_note_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.video_notes(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT video_note_targets_unique UNIQUE (note_id, athlete_id)
);

CREATE INDEX idx_video_note_targets_note_id ON public.video_note_targets(note_id);
CREATE INDEX idx_video_note_targets_athlete_id ON public.video_note_targets(athlete_id);

-- Video bookmarks table (user-specific saved timestamps)
CREATE TABLE public.video_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Bookmark details
  label TEXT,
  timestamp_seconds NUMERIC(10, 2) NOT NULL,
  visibility public.video_bookmark_visibility NOT NULL DEFAULT 'private',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_video_bookmarks_video_id ON public.video_bookmarks(video_id);
CREATE INDEX idx_video_bookmarks_user_id ON public.video_bookmarks(user_id);
CREATE UNIQUE INDEX idx_video_bookmarks_unique ON public.video_bookmarks(video_id, user_id, timestamp_seconds);

-- Video comments table (discussion on videos)
CREATE TABLE public.video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.video_comments(id) ON DELETE CASCADE,
  
  -- Comment content
  content TEXT NOT NULL,
  timestamp_seconds NUMERIC(10, 2),
  
  -- Author
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_video_comments_video_id ON public.video_comments(video_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_video_comments_author_id ON public.video_comments(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_video_comments_parent_id ON public.video_comments(parent_comment_id) WHERE deleted_at IS NULL;

-- Video reviews table (guardian review workflow)
CREATE TABLE public.video_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  
  -- Review status
  status public.video_review_status NOT NULL DEFAULT 'pending',
  
  -- Guardian response
  response_text TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  -- Timestamps
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT video_reviews_unique UNIQUE (video_id, guardian_id, athlete_id)
);

CREATE INDEX idx_video_reviews_video_id ON public.video_reviews(video_id);
CREATE INDEX idx_video_reviews_guardian_id ON public.video_reviews(guardian_id);
CREATE INDEX idx_video_reviews_athlete_id ON public.video_reviews(athlete_id);
CREATE INDEX idx_video_reviews_status ON public.video_reviews(status);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user can view a video
CREATE OR REPLACE FUNCTION public.can_view_video(p_video_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_video RECORD;
  v_is_admin BOOLEAN;
  v_is_coach BOOLEAN;
  v_is_guardian_of_tagged BOOLEAN;
BEGIN
  -- Get video details
  SELECT v.*, v.org_id, v.team_id, v.visibility, v.uploaded_by
  INTO v_video
  FROM public.videos v
  WHERE v.id = p_video_id AND v.deleted_at IS NULL;
  
  IF v_video IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Uploader can always view
  IF v_video.uploaded_by = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is org admin
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = v_video.org_id
      AND om.user_id = p_user_id
      AND om.role IN ('org_admin')
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Check visibility rules
  CASE v_video.visibility
    WHEN 'private' THEN
      RETURN FALSE;
    
    WHEN 'organization' THEN
      -- Any org member can view
      RETURN EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.org_id = v_video.org_id AND om.user_id = p_user_id
      );
    
    WHEN 'team' THEN
      -- Team members (coaches or parents with athletes on team)
      RETURN EXISTS (
        SELECT 1 FROM public.team_memberships tm
        WHERE tm.team_id = v_video.team_id AND tm.user_id = p_user_id
      ) OR EXISTS (
        SELECT 1 FROM public.athlete_guardians ag
        JOIN public.athletes a ON a.id = ag.athlete_id
        WHERE ag.user_id = p_user_id
          AND ag.status = 'active'
          AND a.team_id = v_video.team_id
      );
    
    WHEN 'guardians' THEN
      -- Only guardians of tagged athletes
      RETURN EXISTS (
        SELECT 1 FROM public.video_athlete_links val
        JOIN public.athlete_guardians ag ON ag.athlete_id = val.athlete_id
        WHERE val.video_id = p_video_id
          AND ag.user_id = p_user_id
          AND ag.status = 'active'
      );
    
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- Function to check if user can edit a video
CREATE OR REPLACE FUNCTION public.can_edit_video(p_video_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_video RECORD;
BEGIN
  -- Get video details
  SELECT v.*, v.org_id, v.uploaded_by
  INTO v_video
  FROM public.videos v
  WHERE v.id = p_video_id AND v.deleted_at IS NULL;
  
  IF v_video IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Uploader can edit
  IF v_video.uploaded_by = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Org admin can edit
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = v_video.org_id
      AND om.user_id = p_user_id
      AND om.role IN ('org_admin')
  );
END;
$$;

-- Function to get athletes visible to a guardian in videos
CREATE OR REPLACE FUNCTION public.get_guardian_video_athletes(p_user_id UUID, p_org_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT ag.athlete_id
  FROM public.athlete_guardians ag
  WHERE ag.user_id = p_user_id
    AND ag.org_id = p_org_id
    AND ag.status = 'active';
$$;

-- Trigger function to update video_tags usage count
CREATE OR REPLACE FUNCTION public.update_video_tag_usage_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.video_tags SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.video_tags SET usage_count = GREATEST(usage_count - 1, 0), updated_at = NOW()
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_video_tag_links_usage
AFTER INSERT OR DELETE ON public.video_tag_links
FOR EACH ROW EXECUTE FUNCTION public.update_video_tag_usage_count();

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_video_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_videos_updated_at
BEFORE UPDATE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.update_video_updated_at();

CREATE TRIGGER trigger_video_notes_updated_at
BEFORE UPDATE ON public.video_notes
FOR EACH ROW EXECUTE FUNCTION public.update_video_updated_at();

CREATE TRIGGER trigger_video_bookmarks_updated_at
BEFORE UPDATE ON public.video_bookmarks
FOR EACH ROW EXECUTE FUNCTION public.update_video_updated_at();

CREATE TRIGGER trigger_video_comments_updated_at
BEFORE UPDATE ON public.video_comments
FOR EACH ROW EXECUTE FUNCTION public.update_video_updated_at();

CREATE TRIGGER trigger_video_reviews_updated_at
BEFORE UPDATE ON public.video_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_video_updated_at();

CREATE TRIGGER trigger_video_tags_updated_at
BEFORE UPDATE ON public.video_tags
FOR EACH ROW EXECUTE FUNCTION public.update_video_updated_at();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all video tables
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tag_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_athlete_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_note_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VIDEOS TABLE POLICIES
-- ============================================

-- Select: Users can view videos they have access to
CREATE POLICY videos_select_policy ON public.videos
FOR SELECT
USING (
  deleted_at IS NULL
  AND public.can_view_video(id, auth.uid())
);

-- Insert: Org admins and coaches can upload videos
CREATE POLICY videos_insert_policy ON public.videos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('org_admin', 'coach')
  )
);

-- Update: Uploaders and org admins can update
CREATE POLICY videos_update_policy ON public.videos
FOR UPDATE
USING (public.can_edit_video(id, auth.uid()))
WITH CHECK (public.can_edit_video(id, auth.uid()));

-- Delete: Uploaders and org admins can soft-delete
CREATE POLICY videos_delete_policy ON public.videos
FOR DELETE
USING (public.can_edit_video(id, auth.uid()));

-- ============================================
-- VIDEO_TAGS TABLE POLICIES
-- ============================================

-- Select: Org members can view tags
CREATE POLICY video_tags_select_policy ON public.video_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = video_tags.org_id AND om.user_id = auth.uid()
  )
);

-- Insert: Org admins and coaches can create tags
CREATE POLICY video_tags_insert_policy ON public.video_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('org_admin', 'coach')
  )
);

-- Update: Org admins can update tags
CREATE POLICY video_tags_update_policy ON public.video_tags
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = video_tags.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('org_admin')
  )
);

-- Delete: Org admins can delete tags
CREATE POLICY video_tags_delete_policy ON public.video_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = video_tags.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('org_admin')
  )
);

-- ============================================
-- VIDEO_TAG_LINKS TABLE POLICIES
-- ============================================

-- Select: Users who can view the video can see its tags
CREATE POLICY video_tag_links_select_policy ON public.video_tag_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_tag_links.video_id
      AND v.deleted_at IS NULL
      AND public.can_view_video(v.id, auth.uid())
  )
);

-- Insert: Users who can edit the video can add tags
CREATE POLICY video_tag_links_insert_policy ON public.video_tag_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_id
      AND public.can_edit_video(v.id, auth.uid())
  )
);

-- Delete: Users who can edit the video can remove tags
CREATE POLICY video_tag_links_delete_policy ON public.video_tag_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_tag_links.video_id
      AND public.can_edit_video(v.id, auth.uid())
  )
);

-- ============================================
-- VIDEO_ATHLETE_LINKS TABLE POLICIES
-- ============================================

-- Select: Users who can view the video can see athlete links
CREATE POLICY video_athlete_links_select_policy ON public.video_athlete_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_athlete_links.video_id
      AND v.deleted_at IS NULL
      AND public.can_view_video(v.id, auth.uid())
  )
);

-- Insert: Users who can edit the video can tag athletes
CREATE POLICY video_athlete_links_insert_policy ON public.video_athlete_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_id
      AND public.can_edit_video(v.id, auth.uid())
  )
);

-- Update: Users who can edit the video can update athlete links
CREATE POLICY video_athlete_links_update_policy ON public.video_athlete_links
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_athlete_links.video_id
      AND public.can_edit_video(v.id, auth.uid())
  )
);

-- Delete: Users who can edit the video can remove athlete tags
CREATE POLICY video_athlete_links_delete_policy ON public.video_athlete_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_athlete_links.video_id
      AND public.can_edit_video(v.id, auth.uid())
  )
);

-- ============================================
-- VIDEO_NOTES TABLE POLICIES
-- ============================================

-- Select: Based on note scope
CREATE POLICY video_notes_select_policy ON public.video_notes
FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_notes.video_id
      AND v.deleted_at IS NULL
      AND public.can_view_video(v.id, auth.uid())
  )
  AND (
    -- Author can always see their notes
    author_id = auth.uid()
    -- Or based on scope
    OR scope = 'all'
    OR (scope = 'coaches' AND EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.organization_members om ON om.org_id = v.org_id
      WHERE v.id = video_notes.video_id
        AND om.user_id = auth.uid()
        AND om.role IN ('org_admin', 'coach')
    ))
    OR (scope = 'guardians' AND EXISTS (
      SELECT 1 FROM public.video_note_targets vnt
      JOIN public.athlete_guardians ag ON ag.athlete_id = vnt.athlete_id
      WHERE vnt.note_id = video_notes.id
        AND ag.user_id = auth.uid()
        AND ag.status = 'active'
    ))
  )
);

-- Insert: Coaches and admins can create notes
CREATE POLICY video_notes_insert_policy ON public.video_notes
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.organization_members om ON om.org_id = v.org_id
    WHERE v.id = video_id
      AND om.user_id = auth.uid()
      AND om.role IN ('org_admin', 'coach')
  )
);

-- Update: Authors can update their notes
CREATE POLICY video_notes_update_policy ON public.video_notes
FOR UPDATE
USING (author_id = auth.uid() AND deleted_at IS NULL)
WITH CHECK (author_id = auth.uid());

-- Delete: Authors can delete their notes (soft delete)
CREATE POLICY video_notes_delete_policy ON public.video_notes
FOR DELETE
USING (author_id = auth.uid());

-- ============================================
-- VIDEO_NOTE_TARGETS TABLE POLICIES
-- ============================================

-- Select: Users who can see the note can see its targets
CREATE POLICY video_note_targets_select_policy ON public.video_note_targets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.video_notes vn
    WHERE vn.id = video_note_targets.note_id
      AND vn.deleted_at IS NULL
  )
);

-- Insert: Note authors can add targets
CREATE POLICY video_note_targets_insert_policy ON public.video_note_targets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.video_notes vn
    WHERE vn.id = note_id AND vn.author_id = auth.uid()
  )
);

-- Delete: Note authors can remove targets
CREATE POLICY video_note_targets_delete_policy ON public.video_note_targets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.video_notes vn
    WHERE vn.id = video_note_targets.note_id AND vn.author_id = auth.uid()
  )
);

-- ============================================
-- VIDEO_BOOKMARKS TABLE POLICIES
-- ============================================

-- Select: Users can see their own bookmarks and shared bookmarks on videos they can view
CREATE POLICY video_bookmarks_select_policy ON public.video_bookmarks
FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    visibility = 'shared'
    AND EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_bookmarks.video_id
        AND v.deleted_at IS NULL
        AND public.can_view_video(v.id, auth.uid())
    )
  )
);

-- Insert: Users can create bookmarks on videos they can view
CREATE POLICY video_bookmarks_insert_policy ON public.video_bookmarks
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_id
      AND v.deleted_at IS NULL
      AND public.can_view_video(v.id, auth.uid())
  )
);

-- Update: Users can update their own bookmarks
CREATE POLICY video_bookmarks_update_policy ON public.video_bookmarks
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Delete: Users can delete their own bookmarks
CREATE POLICY video_bookmarks_delete_policy ON public.video_bookmarks
FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- VIDEO_COMMENTS TABLE POLICIES
-- ============================================

-- Select: Users who can view the video can see comments
CREATE POLICY video_comments_select_policy ON public.video_comments
FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_comments.video_id
      AND v.deleted_at IS NULL
      AND public.can_view_video(v.id, auth.uid())
  )
);

-- Insert: Users who can view the video can comment
CREATE POLICY video_comments_insert_policy ON public.video_comments
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_id
      AND v.deleted_at IS NULL
      AND public.can_view_video(v.id, auth.uid())
  )
);

-- Update: Authors can update their comments
CREATE POLICY video_comments_update_policy ON public.video_comments
FOR UPDATE
USING (author_id = auth.uid() AND deleted_at IS NULL)
WITH CHECK (author_id = auth.uid());

-- Delete: Authors can delete their comments
CREATE POLICY video_comments_delete_policy ON public.video_comments
FOR DELETE
USING (author_id = auth.uid());

-- ============================================
-- VIDEO_REVIEWS TABLE POLICIES
-- ============================================

-- Select: Guardians can see their own reviews, coaches/admins can see all
CREATE POLICY video_reviews_select_policy ON public.video_reviews
FOR SELECT
USING (
  guardian_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.organization_members om ON om.org_id = v.org_id
    WHERE v.id = video_reviews.video_id
      AND om.user_id = auth.uid()
      AND om.role IN ('org_admin', 'coach')
  )
);

-- Insert: System/coaches can create review requests
CREATE POLICY video_reviews_insert_policy ON public.video_reviews
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.organization_members om ON om.org_id = v.org_id
    WHERE v.id = video_id
      AND om.user_id = auth.uid()
      AND om.role IN ('org_admin', 'coach')
  )
);

-- Update: Guardians can update their own reviews (respond/acknowledge)
CREATE POLICY video_reviews_update_policy ON public.video_reviews
FOR UPDATE
USING (guardian_id = auth.uid())
WITH CHECK (guardian_id = auth.uid());

-- ============================================
-- SERVICE ROLE BYPASS POLICIES (for webhooks)
-- ============================================

-- Allow service role full access for webhook processing
CREATE POLICY videos_service_role_policy ON public.videos
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.videos IS 'Main table for video metadata and Mux asset tracking';
COMMENT ON TABLE public.video_tags IS 'Reusable tags for organizing videos within an organization';
COMMENT ON TABLE public.video_tag_links IS 'Many-to-many relationship between videos and tags';
COMMENT ON TABLE public.video_athlete_links IS 'Links athletes to videos they appear in';
COMMENT ON TABLE public.video_notes IS 'Timestamped annotations on videos';
COMMENT ON TABLE public.video_note_targets IS 'Which athletes a note is about';
COMMENT ON TABLE public.video_bookmarks IS 'User-specific saved timestamps in videos';
COMMENT ON TABLE public.video_comments IS 'Discussion comments on videos';
COMMENT ON TABLE public.video_reviews IS 'Guardian review workflow for practice videos';

COMMENT ON COLUMN public.videos.mux_asset_id IS 'Mux Asset ID after processing completes';
COMMENT ON COLUMN public.videos.mux_playback_id IS 'Mux Playback ID for streaming';
COMMENT ON COLUMN public.videos.mux_upload_id IS 'Mux Direct Upload ID for correlating uploads';
COMMENT ON COLUMN public.videos.passthrough IS 'JSON data passed through Mux webhooks for correlation';


