-- Sport Customizations and Event Logging
-- ===========================================
-- Adds organization-level customization for sport icons/colors
-- and adds sport-related event types to the event logging system

-- ============================================================================
-- 1. Create organization_sport_customizations table
-- ============================================================================
-- Allows organizations to override icon/color for system sports

CREATE TABLE IF NOT EXISTS organization_sport_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  icon_path TEXT, -- Path in storage bucket (e.g., "sports/{org_id}/{sport_id}/icon.png")
  color TEXT, -- Hex color override
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (org_id, sport_id)
);

CREATE INDEX IF NOT EXISTS idx_org_sport_customizations_org_id ON organization_sport_customizations(org_id);
CREATE INDEX IF NOT EXISTS idx_org_sport_customizations_sport_id ON organization_sport_customizations(sport_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_org_sport_customizations_updated_at ON organization_sport_customizations;
CREATE TRIGGER update_org_sport_customizations_updated_at
  BEFORE UPDATE ON organization_sport_customizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. RLS Policies for organization_sport_customizations
-- ============================================================================

ALTER TABLE organization_sport_customizations ENABLE ROW LEVEL SECURITY;

-- Select: Org members can view their org's customizations
DROP POLICY IF EXISTS "Org members can view sport customizations" ON organization_sport_customizations;
CREATE POLICY "Org members can view sport customizations"
  ON organization_sport_customizations
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Insert: Org admins can create customizations
DROP POLICY IF EXISTS "Org admins can create sport customizations" ON organization_sport_customizations;
CREATE POLICY "Org admins can create sport customizations"
  ON organization_sport_customizations
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'admin')
    )
    AND sport_id IN (
      SELECT sport_id 
      FROM organization_sports 
      WHERE org_id = organization_sport_customizations.org_id
    )
  );

-- Update: Org admins can update customizations
DROP POLICY IF EXISTS "Org admins can update sport customizations" ON organization_sport_customizations;
CREATE POLICY "Org admins can update sport customizations"
  ON organization_sport_customizations
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'admin')
    )
  );

-- Delete: Org admins can delete customizations
DROP POLICY IF EXISTS "Org admins can delete sport customizations" ON organization_sport_customizations;
CREATE POLICY "Org admins can delete sport customizations"
  ON organization_sport_customizations
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'admin')
    )
  );

-- ============================================================================
-- 3. Add SPORT category to event_category enum and sport event types
-- ============================================================================

-- Add SPORT to event_category enum
DO $$ 
BEGIN
  -- Check if SPORT value exists in event_category enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'SPORT' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_category')
  ) THEN
    ALTER TYPE event_category ADD VALUE 'SPORT';
  END IF;
END $$;

-- Create sport_event_type enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type 
    WHERE typname = 'sport_event_type'
  ) THEN
    CREATE TYPE sport_event_type AS ENUM (
      'SPORT_LINKED',
      'SPORT_UNLINKED',
      'SPORT_CUSTOMIZED',
      'SPORT_CUSTOMIZATION_UPDATED',
      'SPORT_CUSTOMIZATION_REMOVED',
      'SPORT_ICON_UPLOADED',
      'SPORT_ICON_DELETED'
    );
  END IF;
END $$;

-- Note: The validate_event_type function in the database should be updated
-- to include SPORT category and sport_event_type values. This is handled
-- in the application layer for now, but can be added to the database function.

-- ============================================================================
-- 4. Create storage bucket for sport icons (or use organization-assets)
-- ============================================================================
-- We'll use the existing organization-assets bucket with a sports/ prefix

-- Add storage policy for sport icons in organization-assets bucket
-- Path structure: sports/{org_id}/{sport_id}/icon.{ext}

DROP POLICY IF EXISTS "Org admins can manage sport icons" ON storage.objects;
CREATE POLICY "Org admins can manage sport icons"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'organization-assets'
    AND (storage.foldername(name))[1] = 'sports'
    AND EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('org_admin', 'admin')
        AND (storage.foldername(name))[2] = om.org_id::text
    )
  )
  WITH CHECK (
    bucket_id = 'organization-assets'
    AND (storage.foldername(name))[1] = 'sports'
    AND EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('org_admin', 'admin')
        AND (storage.foldername(name))[2] = om.org_id::text
    )
  );

-- Public read access for sport icons
DROP POLICY IF EXISTS "Public can read sport icons" ON storage.objects;
CREATE POLICY "Public can read sport icons"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'organization-assets'
    AND (storage.foldername(name))[1] = 'sports'
  );

-- ============================================================================
-- 5. Comments
-- ============================================================================

COMMENT ON TABLE organization_sport_customizations IS 'Organization-level customizations for system sports (icon/color overrides)';
COMMENT ON COLUMN organization_sport_customizations.icon_path IS 'Path to icon in organization-assets bucket: sports/{org_id}/{sport_id}/icon.{ext}';
COMMENT ON COLUMN organization_sport_customizations.color IS 'Hex color override for the sport';
