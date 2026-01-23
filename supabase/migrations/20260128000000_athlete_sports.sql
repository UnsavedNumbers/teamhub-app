-- Migration: Athlete Sports Preferences
-- ======================================
-- Creates athlete_sports junction table to link athletes to sports with
-- relationship type ('plays' or 'interested'). Allows guardians to select
-- sports when creating athletes and view/edit them later.

-- ==============================================
-- Create athlete_sports Table
-- ==============================================
CREATE TABLE IF NOT EXISTS athlete_sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sport_type TEXT NOT NULL DEFAULT 'plays' CHECK (sport_type IN ('plays', 'interested')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (athlete_id, sport_id, org_id, sport_type)
);

-- ==============================================
-- Create Indexes for Performance
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_athlete_sports_athlete_id ON athlete_sports(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_sports_sport_id ON athlete_sports(sport_id);
CREATE INDEX IF NOT EXISTS idx_athlete_sports_org_id ON athlete_sports(org_id);
CREATE INDEX IF NOT EXISTS idx_athlete_sports_athlete_org ON athlete_sports(athlete_id, org_id);

-- Ensure RLS performance index exists for athlete_guardians
CREATE INDEX IF NOT EXISTS idx_athlete_guardians_athlete_user_org ON athlete_guardians(athlete_id, user_id, org_id);

-- ==============================================
-- Create Updated At Trigger
-- ==============================================
CREATE OR REPLACE FUNCTION update_athlete_sports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS athlete_sports_updated_at_trigger ON athlete_sports;
CREATE TRIGGER athlete_sports_updated_at_trigger
  BEFORE UPDATE ON athlete_sports
  FOR EACH ROW
  EXECUTE FUNCTION update_athlete_sports_updated_at();

-- ==============================================
-- Enable RLS
-- ==============================================
ALTER TABLE athlete_sports ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS Policies for athlete_sports
-- ==============================================

-- Guardians can view sports for their athletes
CREATE POLICY "Guardians can view their athletes sports" ON athlete_sports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM athlete_guardians 
      WHERE athlete_guardians.athlete_id = athlete_sports.athlete_id 
        AND athlete_guardians.user_id = auth.uid() 
        AND athlete_guardians.org_id = athlete_sports.org_id
        AND athlete_guardians.status = 'active'
    )
  );

-- Guardians can insert sports for their athletes
CREATE POLICY "Guardians can insert their athletes sports" ON athlete_sports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM athlete_guardians 
      WHERE athlete_guardians.athlete_id = athlete_sports.athlete_id 
        AND athlete_guardians.user_id = auth.uid() 
        AND athlete_guardians.org_id = athlete_sports.org_id
        AND athlete_guardians.status = 'active'
    )
  );

-- Guardians can update sports for their athletes
CREATE POLICY "Guardians can update their athletes sports" ON athlete_sports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM athlete_guardians 
      WHERE athlete_guardians.athlete_id = athlete_sports.athlete_id 
        AND athlete_guardians.user_id = auth.uid() 
        AND athlete_guardians.org_id = athlete_sports.org_id
        AND athlete_guardians.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM athlete_guardians 
      WHERE athlete_guardians.athlete_id = athlete_sports.athlete_id 
        AND athlete_guardians.user_id = auth.uid() 
        AND athlete_guardians.org_id = athlete_sports.org_id
        AND athlete_guardians.status = 'active'
    )
  );

-- Guardians can delete sports for their athletes
CREATE POLICY "Guardians can delete their athletes sports" ON athlete_sports
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM athlete_guardians 
      WHERE athlete_guardians.athlete_id = athlete_sports.athlete_id 
        AND athlete_guardians.user_id = auth.uid() 
        AND athlete_guardians.org_id = athlete_sports.org_id
        AND athlete_guardians.status = 'active'
    )
  );

-- Org admins can view all athlete sports in their org
CREATE POLICY "Org admins can view org athlete sports" ON athlete_sports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
        AND users.org_id = athlete_sports.org_id 
        AND users.role = 'admin'
    )
  );

-- Org admins can manage all athlete sports in their org
CREATE POLICY "Org admins can manage org athlete sports" ON athlete_sports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
        AND users.org_id = athlete_sports.org_id 
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
        AND users.org_id = athlete_sports.org_id 
        AND users.role = 'admin'
    )
  );

-- Platform admins can view all athlete sports
CREATE POLICY "Platform admins can view all athlete sports" ON athlete_sports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
        AND is_platform_admin(users.id)
    )
  );

-- Platform admins can manage all athlete sports
CREATE POLICY "Platform admins can manage all athlete sports" ON athlete_sports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
        AND is_platform_admin(users.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
        AND is_platform_admin(users.id)
    )
  );

-- ==============================================
-- Comments
-- ==============================================
COMMENT ON TABLE athlete_sports IS 'Junction table linking athletes to sports with relationship type. Allows athletes to have sports marked as "plays" or "interested".';
COMMENT ON COLUMN athlete_sports.athlete_id IS 'Reference to the athlete';
COMMENT ON COLUMN athlete_sports.sport_id IS 'Reference to the sport (must be a system sport)';
COMMENT ON COLUMN athlete_sports.org_id IS 'Organization context for the relationship';
COMMENT ON COLUMN athlete_sports.sport_type IS 'Type of relationship: "plays" (athlete plays this sport) or "interested" (athlete is interested in playing)';
