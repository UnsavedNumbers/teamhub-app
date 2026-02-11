-- Photo gallery flow updates: downloads, thumbnails, bookmarks, entitlements

-- Download flags
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS can_download BOOLEAN DEFAULT false;
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS can_download BOOLEAN DEFAULT false;

-- Thumbnail paths + blurhash
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS thumbnail_sm_path TEXT;
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS thumbnail_md_path TEXT;
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS thumbnail_lg_path TEXT;
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS blurhash TEXT;

-- Photo bookmarks (favorites)
CREATE TABLE IF NOT EXISTS gallery_photo_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES gallery_photos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gallery_photo_bookmarks_user_id ON gallery_photo_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_bookmarks_photo_id ON gallery_photo_bookmarks(photo_id);

ALTER TABLE gallery_photo_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY gallery_photo_bookmarks_select_own
  ON gallery_photo_bookmarks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY gallery_photo_bookmarks_insert_own
  ON gallery_photo_bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY gallery_photo_bookmarks_delete_own
  ON gallery_photo_bookmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ZIP download tracking (rate limiting)
CREATE TABLE IF NOT EXISTS gallery_zip_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID REFERENCES galleries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  photo_count INTEGER DEFAULT 0,
  size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_zip_downloads_user_time ON gallery_zip_downloads(user_id, created_at);

ALTER TABLE gallery_zip_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY gallery_zip_downloads_select_own
  ON gallery_zip_downloads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY gallery_zip_downloads_insert_own
  ON gallery_zip_downloads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Feature entitlements
INSERT INTO feature_entitlements (
  feature_key,
  display_name,
  category,
  feature_type,
  description,
  rollout_status,
  is_toggleable,
  is_system_feature,
  platform_admin_only
) VALUES
  ('photos_zip_downloads', 'Photo ZIP Downloads', 'Admin & Permissions', 'permission', 'Allow bulk ZIP downloads of photos', 'live', true, false, false),
  ('photos_storage_limit', 'Photo Storage Limit', 'Reporting & Analytics', 'limit', 'Storage cap for photo uploads (GB)', 'live', true, false, false)
ON CONFLICT (feature_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  feature_type = EXCLUDED.feature_type,
  description = EXCLUDED.description,
  rollout_status = EXCLUDED.rollout_status,
  updated_at = now();
