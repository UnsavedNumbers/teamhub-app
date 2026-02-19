-- Help Center Schema Migration
-- Creates tables for WordPress-integrated help center functionality

-- ============================================================================
-- WordPress Configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS help_wordpress_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url TEXT NOT NULL,
  auth_method TEXT NOT NULL CHECK (auth_method IN ('application_password', 'oauth_token', 'public')),
  credentials_encrypted TEXT, -- Encrypted credentials
  connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Ensure only one configuration row exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_help_wp_config_single ON help_wordpress_config((TRUE));

-- ============================================================================
-- Role to Category Mappings
-- ============================================================================

CREATE TABLE IF NOT EXISTS help_role_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('parent', 'coach', 'org_admin', 'athlete', 'platform_admin')),
  wordpress_category_id INTEGER NOT NULL,
  wordpress_category_slug TEXT NOT NULL,
  wordpress_category_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, wordpress_category_id)
);

CREATE INDEX IF NOT EXISTS idx_help_role_mappings_role ON help_role_category_mappings(role);
CREATE INDEX IF NOT EXISTS idx_help_role_mappings_category ON help_role_category_mappings(wordpress_category_id);

-- ============================================================================
-- Category to Page Mappings
-- ============================================================================

CREATE TABLE IF NOT EXISTS help_category_page_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug TEXT NOT NULL UNIQUE,
  wordpress_page_id INTEGER NOT NULL,
  featured_image_url TEXT,
  page_content_html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_category_page_slug ON help_category_page_mappings(category_slug);

-- ============================================================================
-- Help Sections
-- ============================================================================

CREATE TABLE IF NOT EXISTS help_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_sections_order ON help_sections(display_order, is_active);

-- ============================================================================
-- Section Tag Combinations
-- ============================================================================

CREATE TABLE IF NOT EXISTS help_section_tag_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES help_sections(id) ON DELETE CASCADE,
  tag_ids INTEGER[] NOT NULL, -- Array of WordPress tag IDs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(section_id, tag_ids)
);

CREATE INDEX IF NOT EXISTS idx_help_section_tags_section ON help_section_tag_combinations(section_id);

-- ============================================================================
-- WordPress Cache
-- ============================================================================

CREATE TABLE IF NOT EXISTS help_wordpress_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_type TEXT NOT NULL CHECK (cache_type IN ('category', 'tag', 'post', 'page')),
  wordpress_id INTEGER NOT NULL,
  wordpress_slug TEXT NOT NULL,
  data JSONB NOT NULL, -- Full WordPress object
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(cache_type, wordpress_id)
);

CREATE INDEX IF NOT EXISTS idx_help_cache_type_id ON help_wordpress_cache(cache_type, wordpress_id);
CREATE INDEX IF NOT EXISTS idx_help_cache_slug ON help_wordpress_cache(wordpress_slug);
CREATE INDEX IF NOT EXISTS idx_help_cache_expires ON help_wordpress_cache(expires_at);

-- Full-text search index for posts (for search functionality)
CREATE INDEX IF NOT EXISTS idx_help_cache_search ON help_wordpress_cache 
USING GIN (to_tsvector('english', (data->>'title') || ' ' || COALESCE(data->>'content', '') || ' ' || COALESCE(data->>'excerpt', '')))
WHERE cache_type = 'post';

-- ============================================================================
-- Updated At Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_help_wordpress_config_updated_at
  BEFORE UPDATE ON help_wordpress_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_help_role_category_mappings_updated_at
  BEFORE UPDATE ON help_role_category_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_help_category_page_mappings_updated_at
  BEFORE UPDATE ON help_category_page_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_help_sections_updated_at
  BEFORE UPDATE ON help_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE help_wordpress_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_role_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_category_page_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_section_tag_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_wordpress_cache ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage WordPress config
CREATE POLICY "Platform admins can manage WordPress config"
  ON help_wordpress_config
  FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- Platform admins can manage role mappings
CREATE POLICY "Platform admins can manage role mappings"
  ON help_role_category_mappings
  FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- Platform admins can manage category page mappings
CREATE POLICY "Platform admins can manage category page mappings"
  ON help_category_page_mappings
  FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- Platform admins can manage sections
CREATE POLICY "Platform admins can manage sections"
  ON help_sections
  FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- Platform admins can manage section tag combinations
CREATE POLICY "Platform admins can manage section tag combinations"
  ON help_section_tag_combinations
  FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- All authenticated users can read cache (for help center display)
CREATE POLICY "Authenticated users can read cache"
  ON help_wordpress_cache
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Platform admins can manage cache (for sync operations - INSERT/UPDATE/DELETE only)
CREATE POLICY "Platform admins can insert cache"
  ON help_wordpress_cache
  FOR INSERT
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update cache"
  ON help_wordpress_cache
  FOR UPDATE
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete cache"
  ON help_wordpress_cache
  FOR DELETE
  USING (public.is_platform_admin(auth.uid()));

-- ============================================================================
-- Storage Bucket for Category Thumbnails
-- ============================================================================

-- Create bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('help-center-thumbnails', 'help-center-thumbnails', TRUE)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage
CREATE POLICY "Help center thumbnails are readable by authenticated users"
ON storage.objects FOR SELECT
USING (bucket_id = 'help-center-thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Help center thumbnails are writable by platform admins"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'help-center-thumbnails' AND public.is_platform_admin(auth.uid())
);

CREATE POLICY "Help center thumbnails are updatable by platform admins"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'help-center-thumbnails' AND public.is_platform_admin(auth.uid())
);

CREATE POLICY "Help center thumbnails are deletable by platform admins"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'help-center-thumbnails' AND public.is_platform_admin(auth.uid())
);
