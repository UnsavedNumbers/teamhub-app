-- Migration: Athlete Sports Preferences (Complete)
-- =================================================
-- Creates athlete_sports junction table and updates RPC function
-- to support sports selection when creating athletes.

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

-- Ensure RLS performance index exists for athlete_guardians (if org_id column exists)
-- Note: This index may already exist from previous migrations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_guardians' AND column_name = 'org_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_athlete_guardians_athlete_user_org ON athlete_guardians(athlete_id, user_id, org_id);
  END IF;
END $$;

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
-- Ensure athlete_guardians has org_id column
-- ==============================================
DO $$
BEGIN
  -- Check if org_id column exists, if not, check for organization_id and rename it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'athlete_guardians'
    AND column_name = 'org_id'
  ) THEN
    -- Try to rename organization_id to org_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'athlete_guardians'
      AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE athlete_guardians RENAME COLUMN organization_id TO org_id;
    ELSE
      -- If neither exists, add org_id column (shouldn't happen, but safety check)
      ALTER TABLE athlete_guardians ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

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
-- Update Create Athlete with Guardians RPC to include sports
-- ==============================================
CREATE OR REPLACE FUNCTION create_athlete_with_guardians(
  p_org_id UUID,
  p_athlete_data JSONB,
  p_guardians JSONB[] DEFAULT '{}',
  p_athlete_sports JSONB[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_athlete_id UUID;
  v_guardian JSONB;
  v_result JSONB;
  v_guardian_results JSONB[] := '{}';
  v_created_by UUID;
  v_sport JSONB;
  v_sport_id UUID;
  v_sport_type TEXT;
  v_sport_exists BOOLEAN;
BEGIN
  -- Get current user
  v_created_by := auth.uid();
  
  -- Validate required fields
  IF p_athlete_data->>'first_name' IS NULL OR TRIM(p_athlete_data->>'first_name') = '' THEN
    RAISE EXCEPTION 'first_name is required';
  END IF;
  
  IF p_athlete_data->>'last_name' IS NULL OR TRIM(p_athlete_data->>'last_name') = '' THEN
    RAISE EXCEPTION 'last_name is required';
  END IF;
  
  -- Create athlete
  INSERT INTO athletes (
    first_name,
    last_name,
    birthdate,
    gender,
    preferred_name,
    jersey_number,
    medical_notes,
    allergies,
    emergency_contact_name,
    emergency_contact_phone,
    family_id,  -- Still nullable, for backward compatibility
    created_at,
    updated_at
  )
  VALUES (
    TRIM(p_athlete_data->>'first_name'),
    TRIM(p_athlete_data->>'last_name'),
    NULLIF(p_athlete_data->>'birthdate', '')::DATE,
    NULLIF(p_athlete_data->>'gender', ''),
    NULLIF(p_athlete_data->>'preferred_name', ''),
    NULLIF(p_athlete_data->>'jersey_number', ''),
    NULLIF(p_athlete_data->>'medical_notes', ''),
    NULLIF(p_athlete_data->>'allergies', ''),
    NULLIF(p_athlete_data->>'emergency_contact_name', ''),
    NULLIF(p_athlete_data->>'emergency_contact_phone', ''),
    NULLIF(p_athlete_data->>'family_id', '')::UUID,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_athlete_id;
  
  -- Link each guardian (all must succeed or transaction rolls back)
  FOREACH v_guardian IN ARRAY p_guardians LOOP
    -- Validate guardian email
    IF v_guardian->>'email' IS NULL OR TRIM(v_guardian->>'email') = '' THEN
      RAISE EXCEPTION 'Guardian email is required';
    END IF;
    
    -- Link guardian
    v_result := link_guardian_to_athlete(
      v_athlete_id,
      v_guardian->>'email',
      p_org_id,
      COALESCE(v_guardian->>'relationship_type', 'parent'),
      v_created_by
    );
    
    -- Add to results array
    v_guardian_results := array_append(v_guardian_results, v_result);
  END LOOP;
  
  -- Link each sport (all must succeed or transaction rolls back)
  FOREACH v_sport IN ARRAY p_athlete_sports LOOP
    -- Extract sport_id and sport_type
    v_sport_id := (v_sport->>'sport_id')::UUID;
    v_sport_type := COALESCE(v_sport->>'sport_type', 'plays');
    
    -- Validate sport_id is provided
    IF v_sport_id IS NULL THEN
      RAISE EXCEPTION 'sport_id is required for each sport';
    END IF;
    
    -- Validate sport_type is valid
    IF v_sport_type NOT IN ('plays', 'interested') THEN
      RAISE EXCEPTION 'sport_type must be "plays" or "interested", got: %', v_sport_type;
    END IF;
    
    -- Validate sport exists and is a system sport
    SELECT EXISTS (
      SELECT 1 FROM sports 
      WHERE id = v_sport_id 
        AND (org_id IS NULL OR is_system = true)
    ) INTO v_sport_exists;
    
    IF NOT v_sport_exists THEN
      RAISE EXCEPTION 'Invalid sport_id: % (must be a system sport)', v_sport_id;
    END IF;
    
    -- Insert athlete sport relationship
    INSERT INTO athlete_sports (
      athlete_id,
      sport_id,
      org_id,
      sport_type
    )
    VALUES (
      v_athlete_id,
      v_sport_id,
      p_org_id,
      v_sport_type
    )
    ON CONFLICT (athlete_id, sport_id, org_id, sport_type) DO NOTHING;
  END LOOP;
  
  -- If team_id and season_id provided, create team membership
  IF p_athlete_data->>'team_id' IS NOT NULL 
     AND p_athlete_data->>'season_id' IS NOT NULL THEN
    INSERT INTO team_memberships (
      athlete_id,
      team_id,
      season_id,
      org_id,
      status,
      created_at
    )
    VALUES (
      v_athlete_id,
      (p_athlete_data->>'team_id')::UUID,
      (p_athlete_data->>'season_id')::UUID,
      p_org_id,
      'active',
      NOW()
    )
    ON CONFLICT (athlete_id, team_id, season_id) DO NOTHING;
  END IF;
  
  -- Return success with all details
  RETURN jsonb_build_object(
    'success', true,
    'athlete_id', v_athlete_id,
    'guardians', v_guardian_results,
    'guardian_count', ARRAY_LENGTH(v_guardian_results, 1),
    'sport_count', ARRAY_LENGTH(p_athlete_sports, 1)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception to rollback transaction
    RAISE;
END;
$$;

-- ==============================================
-- Comments
-- ==============================================
COMMENT ON TABLE athlete_sports IS 'Junction table linking athletes to sports with relationship type. Allows athletes to have sports marked as "plays" or "interested".';
COMMENT ON COLUMN athlete_sports.athlete_id IS 'Reference to the athlete';
COMMENT ON COLUMN athlete_sports.sport_id IS 'Reference to the sport (must be a system sport)';
COMMENT ON COLUMN athlete_sports.org_id IS 'Organization context for the relationship';
COMMENT ON COLUMN athlete_sports.sport_type IS 'Type of relationship: "plays" (athlete plays this sport) or "interested" (athlete is interested in playing)';
COMMENT ON FUNCTION create_athlete_with_guardians(UUID, JSONB, JSONB[], JSONB[]) IS 'Atomically creates an athlete, links guardians, and links sports. All operations succeed or fail together. Returns athlete_id, guardian linking results, and sport count.';
