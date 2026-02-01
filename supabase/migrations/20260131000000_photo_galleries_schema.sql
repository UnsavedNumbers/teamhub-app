-- Migration: Photo Galleries Schema and RLS
-- ===========================================
-- Purpose: Create gallery tables, RLS helpers, policies, and storage policies
-- Storage: Uses existing public-media bucket with path orgs/{org_id}/galleries/{gallery_id}/{photo_id}.jpg
-- Access: RLS ensures users only see galleries/photos they can access; public URLs for reads

-- ============================================================================
-- PART 1: ENUMS
-- ============================================================================

-- Gallery type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'gallery_type'
  ) THEN
    CREATE TYPE gallery_type AS ENUM ('org', 'team', 'athlete', 'event', 'travel');
  END IF;
END $$;

-- Photo status enum (for moderation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'photo_status'
  ) THEN
    CREATE TYPE photo_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- ============================================================================
-- PART 2: TABLES
-- ============================================================================

-- Galleries table
CREATE TABLE IF NOT EXISTS galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  gallery_type gallery_type NOT NULL,
  entity_id UUID, -- team_id, athlete_id, event_id, or travel_plan_id (nullable for org galleries)
  name TEXT NOT NULL,
  allow_contributions BOOLEAN NOT NULL DEFAULT false,
  require_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT galleries_name_not_empty CHECK (length(trim(name)) > 0),
  -- Unique constraint: one gallery per org + type + entity (where entity_id is set)
  CONSTRAINT galleries_unique_org_type_entity 
    UNIQUE NULLS NOT DISTINCT (org_id, gallery_type, entity_id)
);

-- Indexes for galleries
CREATE INDEX IF NOT EXISTS idx_galleries_org_id ON galleries(org_id);
CREATE INDEX IF NOT EXISTS idx_galleries_type ON galleries(gallery_type);
CREATE INDEX IF NOT EXISTS idx_galleries_entity_id ON galleries(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galleries_org_type ON galleries(org_id, gallery_type);

-- Gallery albums (optional organization within a gallery)
CREATE TABLE IF NOT EXISTS gallery_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT gallery_albums_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Indexes for gallery_albums
CREATE INDEX IF NOT EXISTS idx_gallery_albums_gallery_id ON gallery_albums(gallery_id);

-- Gallery photos
CREATE TABLE IF NOT EXISTS gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  album_id UUID REFERENCES gallery_albums(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL, -- Path in public-media bucket: orgs/{org_id}/galleries/{gallery_id}/{photo_id}.jpg
  thumbnail_path TEXT, -- Optional thumbnail path
  status photo_status NOT NULL DEFAULT 'pending',
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  taken_at TIMESTAMPTZ, -- EXIF date or user-provided
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT gallery_photos_storage_path_not_empty CHECK (length(trim(storage_path)) > 0)
);

-- Indexes for gallery_photos
CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery_id ON gallery_photos(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery_created ON gallery_photos(gallery_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_album_id ON gallery_photos(album_id) WHERE album_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gallery_photos_status ON gallery_photos(status);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_taken_at ON gallery_photos(taken_at) WHERE taken_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gallery_photos_uploaded_by ON gallery_photos(uploaded_by_user_id);

-- Gallery photo tags (athletes tagged in photos)
CREATE TABLE IF NOT EXISTS gallery_photo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES gallery_photos(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT gallery_photo_tags_unique_photo_athlete UNIQUE (photo_id, athlete_id)
);

-- Indexes for gallery_photo_tags
CREATE INDEX IF NOT EXISTS idx_gallery_photo_tags_photo_id ON gallery_photo_tags(photo_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_tags_athlete_id ON gallery_photo_tags(athlete_id);

-- Gallery downloads (optional audit table)
CREATE TABLE IF NOT EXISTS gallery_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES gallery_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for gallery_downloads
CREATE INDEX IF NOT EXISTS idx_gallery_downloads_photo_id ON gallery_downloads(photo_id);
CREATE INDEX IF NOT EXISTS idx_gallery_downloads_user_id ON gallery_downloads(user_id);

-- Gallery share links (optional feature for sharing galleries)
CREATE TABLE IF NOT EXISTS gallery_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT gallery_share_links_token_not_empty CHECK (length(trim(token)) > 0)
);

-- Indexes for gallery_share_links
CREATE INDEX IF NOT EXISTS idx_gallery_share_links_gallery_id ON gallery_share_links(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_share_links_token ON gallery_share_links(token);
CREATE INDEX IF NOT EXISTS idx_gallery_share_links_expires_at ON gallery_share_links(expires_at) WHERE expires_at IS NOT NULL;

-- Organization storage usage (for Stripe caps)
CREATE TABLE IF NOT EXISTS org_storage_usage (
  org_id UUID NOT NULL PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL DEFAULT 'public-media',
  bytes_used BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT org_storage_usage_bytes_non_negative CHECK (bytes_used >= 0)
);

-- Indexes for org_storage_usage
CREATE INDEX IF NOT EXISTS idx_org_storage_usage_bucket_id ON org_storage_usage(bucket_id);

-- ============================================================================
-- PART 3: TRIGGERS
-- ============================================================================

-- Update updated_at triggers
CREATE TRIGGER update_galleries_updated_at
  BEFORE UPDATE ON galleries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gallery_photos_updated_at
  BEFORE UPDATE ON gallery_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_storage_usage_updated_at
  BEFORE UPDATE ON org_storage_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 4: RLS HELPER FUNCTIONS
-- ============================================================================

-- Check if user can view a gallery
-- Returns true if:
--   - User is org_admin for the gallery's org
--   - User is coach for the linked team (if gallery_type = 'team')
--   - User is parent of the linked athlete (if gallery_type = 'athlete')
--   - User is member/coach of team linked to event/travel (if gallery_type = 'event'/'travel')
CREATE OR REPLACE FUNCTION can_view_gallery(
  gallery_id_param UUID,
  user_id_param UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery RECORD;
  v_team_id UUID;
  v_athlete_id UUID;
  v_event_id UUID;
  v_travel_plan_id UUID;
BEGIN
  -- Get gallery details
  SELECT g.org_id, g.gallery_type, g.entity_id
  INTO v_gallery
  FROM galleries g
  WHERE g.id = gallery_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Org admins can view all galleries in their org
  IF is_org_admin(v_gallery.org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check based on gallery type
  CASE v_gallery.gallery_type
    WHEN 'org' THEN
      -- Org galleries: org members can view
      RETURN is_org_member(v_gallery.org_id, user_id_param);
      
    WHEN 'team' THEN
      -- Team galleries: coaches of that team can view
      IF v_gallery.entity_id IS NOT NULL THEN
        RETURN is_coach_for_team(v_gallery.entity_id, user_id_param);
      END IF;
      RETURN FALSE;
      
    WHEN 'athlete' THEN
      -- Athlete galleries: parents of that athlete can view
      IF v_gallery.entity_id IS NOT NULL THEN
        RETURN is_parent_of_athlete(v_gallery.entity_id, user_id_param);
      END IF;
      RETURN FALSE;
      
    WHEN 'event' THEN
      -- Event galleries: members/coaches of the team linked to the event can view
      IF v_gallery.entity_id IS NOT NULL THEN
        SELECT team_id INTO v_team_id
        FROM events
        WHERE id = v_gallery.entity_id;
        
        IF v_team_id IS NOT NULL THEN
          -- Check if user is coach for the team
          IF is_coach_for_team(v_team_id, user_id_param) THEN
            RETURN TRUE;
          END IF;
          
          -- Check if user is parent of athlete on the team
          RETURN EXISTS (
            SELECT 1
            FROM team_memberships tm
            JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
            WHERE tm.team_id = v_team_id
              AND tm.deleted_at IS NULL
              AND ag.user_id = user_id_param
              AND ag.status = 'active'
          );
        END IF;
      END IF;
      RETURN FALSE;
      
    WHEN 'travel' THEN
      -- Travel galleries: members/coaches of the team linked to the travel plan can view
      IF v_gallery.entity_id IS NOT NULL THEN
        SELECT team_id INTO v_team_id
        FROM travel_plans
        WHERE id = v_gallery.entity_id;
        
        IF v_team_id IS NOT NULL THEN
          -- Check if user is coach for the team
          IF is_coach_for_team(v_team_id, user_id_param) THEN
            RETURN TRUE;
          END IF;
          
          -- Check if user is parent of athlete on the team
          RETURN EXISTS (
            SELECT 1
            FROM team_memberships tm
            JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
            WHERE tm.team_id = v_team_id
              AND tm.deleted_at IS NULL
              AND ag.user_id = user_id_param
              AND ag.status = 'active'
          );
        END IF;
      END IF;
      RETURN FALSE;
      
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

COMMENT ON FUNCTION can_view_gallery IS 
  'Returns true if the user can view the gallery (org_admin, coach, or parent based on gallery type).';

-- Check if user can upload to a gallery
-- Returns true if:
--   - User can view gallery AND (is org_admin OR coach)
--   - User can view gallery AND gallery.allow_contributions = true (for parents)
CREATE OR REPLACE FUNCTION can_upload_to_gallery(
  gallery_id_param UUID,
  user_id_param UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery RECORD;
BEGIN
  -- Get gallery details
  SELECT g.org_id, g.allow_contributions, g.gallery_type, g.entity_id
  INTO v_gallery
  FROM galleries g
  WHERE g.id = gallery_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Org admins and coaches can always upload (if they can view)
  IF is_org_admin(v_gallery.org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is coach for team-based galleries
  IF v_gallery.gallery_type = 'team' AND v_gallery.entity_id IS NOT NULL THEN
    IF is_coach_for_team(v_gallery.entity_id, user_id_param) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Parents can upload if allow_contributions is true
  IF v_gallery.allow_contributions THEN
    RETURN can_view_gallery(gallery_id_param, user_id_param);
  END IF;
  
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION can_upload_to_gallery IS 
  'Returns true if the user can upload photos to the gallery (org_admin/coach always, parents if allow_contributions=true).';

-- Check if user can moderate a gallery
-- Returns true if:
--   - User is org_admin for the gallery's org
--   - User is coach for the linked team (if gallery_type = 'team')
CREATE OR REPLACE FUNCTION can_moderate_gallery(
  gallery_id_param UUID,
  user_id_param UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery RECORD;
BEGIN
  -- Get gallery details
  SELECT g.org_id, g.gallery_type, g.entity_id
  INTO v_gallery
  FROM galleries g
  WHERE g.id = gallery_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Org admins can always moderate
  IF is_org_admin(v_gallery.org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Coaches can moderate team galleries
  IF v_gallery.gallery_type = 'team' AND v_gallery.entity_id IS NOT NULL THEN
    RETURN is_coach_for_team(v_gallery.entity_id, user_id_param);
  END IF;
  
  -- Coaches can moderate event/travel galleries if they coach the linked team
  IF v_gallery.gallery_type IN ('event', 'travel') AND v_gallery.entity_id IS NOT NULL THEN
    DECLARE
      v_team_id UUID;
    BEGIN
      IF v_gallery.gallery_type = 'event' THEN
        SELECT team_id INTO v_team_id FROM events WHERE id = v_gallery.entity_id;
      ELSIF v_gallery.gallery_type = 'travel' THEN
        SELECT team_id INTO v_team_id FROM travel_plans WHERE id = v_gallery.entity_id;
      END IF;
      
      IF v_team_id IS NOT NULL THEN
        RETURN is_coach_for_team(v_team_id, user_id_param);
      END IF;
    END;
  END IF;
  
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION can_moderate_gallery IS 
  'Returns true if the user can moderate the gallery (org_admin or coach, not parents).';

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION can_view_gallery(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_upload_to_gallery(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_moderate_gallery(UUID, UUID) TO authenticated;

-- ============================================================================
-- PART 5: RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_storage_usage ENABLE ROW LEVEL SECURITY;

-- Galleries policies
DROP POLICY IF EXISTS galleries_select_policy ON galleries;
CREATE POLICY galleries_select_policy ON galleries
  FOR SELECT
  USING (can_view_gallery(id, auth.uid()));

DROP POLICY IF EXISTS galleries_insert_policy ON galleries;
CREATE POLICY galleries_insert_policy ON galleries
  FOR INSERT
  WITH CHECK (
    is_org_admin(org_id, auth.uid())
    OR (
      gallery_type = 'team' AND entity_id IS NOT NULL AND is_coach_for_team(entity_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS galleries_update_policy ON galleries;
CREATE POLICY galleries_update_policy ON galleries
  FOR UPDATE
  USING (can_moderate_gallery(id, auth.uid()))
  WITH CHECK (can_moderate_gallery(id, auth.uid()));

DROP POLICY IF EXISTS galleries_delete_policy ON galleries;
CREATE POLICY galleries_delete_policy ON galleries
  FOR DELETE
  USING (can_moderate_gallery(id, auth.uid()));

-- Gallery albums policies (access via gallery)
DROP POLICY IF EXISTS gallery_albums_select_policy ON gallery_albums;
CREATE POLICY gallery_albums_select_policy ON gallery_albums
  FOR SELECT
  USING (can_view_gallery(gallery_id, auth.uid()));

DROP POLICY IF EXISTS gallery_albums_insert_policy ON gallery_albums;
CREATE POLICY gallery_albums_insert_policy ON gallery_albums
  FOR INSERT
  WITH CHECK (can_moderate_gallery(gallery_id, auth.uid()));

DROP POLICY IF EXISTS gallery_albums_update_policy ON gallery_albums;
CREATE POLICY gallery_albums_update_policy ON gallery_albums
  FOR UPDATE
  USING (can_moderate_gallery(gallery_id, auth.uid()))
  WITH CHECK (can_moderate_gallery(gallery_id, auth.uid()));

DROP POLICY IF EXISTS gallery_albums_delete_policy ON gallery_albums;
CREATE POLICY gallery_albums_delete_policy ON gallery_albums
  FOR DELETE
  USING (can_moderate_gallery(gallery_id, auth.uid()));

-- Gallery photos policies
-- Parents see only approved photos (unless they uploaded them)
DROP POLICY IF EXISTS gallery_photos_select_policy ON gallery_photos;
CREATE POLICY gallery_photos_select_policy ON gallery_photos
  FOR SELECT
  USING (
    can_view_gallery(gallery_id, auth.uid())
    AND (
      status = 'approved'
      OR uploaded_by_user_id = auth.uid() -- Users can see their own pending photos
      OR can_moderate_gallery(gallery_id, auth.uid()) -- Moderators see all
    )
  );

DROP POLICY IF EXISTS gallery_photos_insert_policy ON gallery_photos;
CREATE POLICY gallery_photos_insert_policy ON gallery_photos
  FOR INSERT
  WITH CHECK (can_upload_to_gallery(gallery_id, auth.uid()));

DROP POLICY IF EXISTS gallery_photos_update_policy ON gallery_photos;
CREATE POLICY gallery_photos_update_policy ON gallery_photos
  FOR UPDATE
  USING (
    can_moderate_gallery(gallery_id, auth.uid())
    OR (uploaded_by_user_id = auth.uid() AND status = 'pending') -- Uploader can update own pending photos
  )
  WITH CHECK (
    can_moderate_gallery(gallery_id, auth.uid())
    OR (uploaded_by_user_id = auth.uid() AND status = 'pending')
  );

DROP POLICY IF EXISTS gallery_photos_delete_policy ON gallery_photos;
CREATE POLICY gallery_photos_delete_policy ON gallery_photos
  FOR DELETE
  USING (
    can_moderate_gallery(gallery_id, auth.uid())
    OR uploaded_by_user_id = auth.uid() -- Uploader can delete own photos
  );

-- Gallery photo tags policies (access via photo)
DROP POLICY IF EXISTS gallery_photo_tags_select_policy ON gallery_photo_tags;
CREATE POLICY gallery_photo_tags_select_policy ON gallery_photo_tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gallery_photos gp
      WHERE gp.id = photo_id
        AND can_view_gallery(gp.gallery_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS gallery_photo_tags_insert_policy ON gallery_photo_tags;
CREATE POLICY gallery_photo_tags_insert_policy ON gallery_photo_tags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gallery_photos gp
      WHERE gp.id = photo_id
        AND can_moderate_gallery(gp.gallery_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS gallery_photo_tags_delete_policy ON gallery_photo_tags;
CREATE POLICY gallery_photo_tags_delete_policy ON gallery_photo_tags
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gallery_photos gp
      WHERE gp.id = photo_id
        AND can_moderate_gallery(gp.gallery_id, auth.uid())
    )
  );

-- Gallery downloads policies (access via photo)
DROP POLICY IF EXISTS gallery_downloads_select_policy ON gallery_downloads;
CREATE POLICY gallery_downloads_select_policy ON gallery_downloads
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM gallery_photos gp
      WHERE gp.id = photo_id
        AND can_moderate_gallery(gp.gallery_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS gallery_downloads_insert_policy ON gallery_downloads;
CREATE POLICY gallery_downloads_insert_policy ON gallery_downloads
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM gallery_photos gp
      WHERE gp.id = photo_id
        AND can_view_gallery(gp.gallery_id, auth.uid())
        AND gp.status = 'approved'
    )
  );

-- Gallery share links policies (access via gallery)
DROP POLICY IF EXISTS gallery_share_links_select_policy ON gallery_share_links;
CREATE POLICY gallery_share_links_select_policy ON gallery_share_links
  FOR SELECT
  USING (can_moderate_gallery(gallery_id, auth.uid()));

DROP POLICY IF EXISTS gallery_share_links_insert_policy ON gallery_share_links;
CREATE POLICY gallery_share_links_insert_policy ON gallery_share_links
  FOR INSERT
  WITH CHECK (can_moderate_gallery(gallery_id, auth.uid()));

DROP POLICY IF EXISTS gallery_share_links_delete_policy ON gallery_share_links;
CREATE POLICY gallery_share_links_delete_policy ON gallery_share_links
  FOR DELETE
  USING (can_moderate_gallery(gallery_id, auth.uid()));

-- Org storage usage policies (org admins only)
DROP POLICY IF EXISTS org_storage_usage_select_policy ON org_storage_usage;
CREATE POLICY org_storage_usage_select_policy ON org_storage_usage
  FOR SELECT
  USING (is_org_admin(org_id, auth.uid()));

DROP POLICY IF EXISTS org_storage_usage_update_policy ON org_storage_usage;
CREATE POLICY org_storage_usage_update_policy ON org_storage_usage
  FOR UPDATE
  USING (is_org_admin(org_id, auth.uid()))
  WITH CHECK (is_org_admin(org_id, auth.uid()));

-- ============================================================================
-- PART 6: GRANT PERMISSIONS
-- ============================================================================

-- Grant table access to authenticated users (RLS will control actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON galleries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON gallery_albums TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON gallery_photos TO authenticated;
GRANT SELECT, INSERT, DELETE ON gallery_photo_tags TO authenticated;
GRANT SELECT, INSERT ON gallery_downloads TO authenticated;
GRANT SELECT, INSERT, DELETE ON gallery_share_links TO authenticated;
GRANT SELECT, UPDATE ON org_storage_usage TO authenticated;

-- ============================================================================
-- PART 7: COMMENTS
-- ============================================================================

COMMENT ON TABLE galleries IS 
  'Photo galleries for organizations, teams, athletes, events, and travel plans.';

COMMENT ON TABLE gallery_albums IS 
  'Optional albums within galleries for organizing photos.';

COMMENT ON TABLE gallery_photos IS 
  'Photos in galleries. Storage path points to public-media bucket. Status controls moderation.';

COMMENT ON TABLE gallery_photo_tags IS 
  'Athletes tagged in photos for filtering and athlete-centric views.';

COMMENT ON TABLE gallery_downloads IS 
  'Audit log of photo downloads (optional).';

COMMENT ON TABLE gallery_share_links IS 
  'Shareable links for galleries (optional feature).';

COMMENT ON TABLE org_storage_usage IS 
  'Tracks storage usage per organization for Stripe billing caps.';
