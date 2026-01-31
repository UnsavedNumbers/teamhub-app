-- Migration: RLS Policies for Athlete Sport Profiles
-- ====================================================
-- Purpose: Implement Row Level Security for all athlete profile tables
-- Security Goals:
--   - Parents can edit their own athlete data only
--   - Coaches can view relevant athletes for their teams (medical access controlled)
--   - Org admins can view and manage within their org
--   - Data is never exposed cross-org
--   - All writes are audited

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is an org admin (Wrapper)
CREATE OR REPLACE FUNCTION is_org_admin(org_id_param UUID, user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_is_org_admin(org_id_param, user_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is an org member (Wrapper)
CREATE OR REPLACE FUNCTION is_org_member(org_id_param UUID, user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_org_access(org_id_param, user_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is a coach for a team (Wrapper)
CREATE OR REPLACE FUNCTION is_coach_for_team(team_id_param UUID, user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN staff_can_access_team(team_id_param, user_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is a parent/guardian of an athlete
CREATE OR REPLACE FUNCTION is_parent_of_athlete(athlete_id_param UUID, user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM athlete_guardians ag
    WHERE ag.athlete_id = athlete_id_param
      AND ag.user_id = user_id_param
      AND ag.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_parent_of_athlete IS 
  'Returns true if the user is an active guardian of the specified athlete.';

-- Check if user can view an athlete (parent, coach, or org admin)
CREATE OR REPLACE FUNCTION can_view_athlete(athlete_id_param UUID, user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  athlete_org_id UUID;
BEGIN
  -- Try to get athlete's org_id via family
  SELECT f.org_id INTO athlete_org_id
  FROM athletes a
  JOIN families f ON f.id = a.family_id
  WHERE a.id = athlete_id_param;
  
  -- Check if user is org admin (if org known)
  IF athlete_org_id IS NOT NULL AND is_org_admin(athlete_org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is parent/guardian (works even without org/family)
  IF is_parent_of_athlete(athlete_id_param, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is coach for any team the athlete is on
  RETURN EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = athlete_id_param
      AND tm.deleted_at IS NULL
      AND t.deleted_at IS NULL
      AND is_coach_for_team(t.id, user_id_param)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_view_athlete IS 
  'Returns true if the user can view the athlete (parent, coach, or org admin).';

-- Check if user can edit an athlete (parent or org admin)
CREATE OR REPLACE FUNCTION can_edit_athlete(athlete_id_param UUID, user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  athlete_org_id UUID;
BEGIN
  -- Try to get athlete's org_id via family
  SELECT f.org_id INTO athlete_org_id
  FROM athletes a
  JOIN families f ON f.id = a.family_id
  WHERE a.id = athlete_id_param;
  
  -- Check if user is org admin (if org known)
  IF athlete_org_id IS NOT NULL AND is_org_admin(athlete_org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is parent/guardian (works even without org/family)
  RETURN is_parent_of_athlete(athlete_id_param, user_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_edit_athlete IS 
  'Returns true if the user can edit the athlete (parent or org admin).';

-- ============================================================================
-- RLS POLICIES: athlete_sport_profiles
-- ============================================================================

-- SELECT: Allow if user can view the athlete
DROP POLICY IF EXISTS athlete_sport_profiles_select_policy ON athlete_sport_profiles;
CREATE POLICY athlete_sport_profiles_select_policy
  ON athlete_sport_profiles
  FOR SELECT
  USING (
    can_view_athlete(athlete_id, auth.uid())
  );

-- INSERT: Allow if user can edit the athlete and org_id matches
DROP POLICY IF EXISTS athlete_sport_profiles_insert_policy ON athlete_sport_profiles;
CREATE POLICY athlete_sport_profiles_insert_policy
  ON athlete_sport_profiles
  FOR INSERT
  WITH CHECK (
    can_edit_athlete(athlete_id, auth.uid())
    AND org_id = (SELECT org_id FROM athletes WHERE id = athlete_id)
  );

-- UPDATE: Allow if user can edit the athlete
DROP POLICY IF EXISTS athlete_sport_profiles_update_policy ON athlete_sport_profiles;
CREATE POLICY athlete_sport_profiles_update_policy
  ON athlete_sport_profiles
  FOR UPDATE
  USING (
    can_edit_athlete(athlete_id, auth.uid())
  )
  WITH CHECK (
    can_edit_athlete(athlete_id, auth.uid())
    AND org_id = (SELECT org_id FROM athletes WHERE id = athlete_id)
  );

-- DELETE: Allow only org admins
DROP POLICY IF EXISTS athlete_sport_profiles_delete_policy ON athlete_sport_profiles;
CREATE POLICY athlete_sport_profiles_delete_policy
  ON athlete_sport_profiles
  FOR DELETE
  USING (
    is_org_admin(org_id, auth.uid())
  );

-- ============================================================================
-- RLS POLICIES: sport_field_definitions
-- ============================================================================
-- Read-only for all authenticated users (platform-managed data)

DROP POLICY IF EXISTS sport_field_definitions_select_policy ON sport_field_definitions;
CREATE POLICY sport_field_definitions_select_policy
  ON sport_field_definitions
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

-- No INSERT/UPDATE/DELETE policies - platform admin only via migrations

-- ============================================================================
-- RLS POLICIES: org_sport_profile_settings
-- ============================================================================

-- SELECT: Allow org members to view their org's settings
DROP POLICY IF EXISTS org_sport_profile_settings_select_policy ON org_sport_profile_settings;
CREATE POLICY org_sport_profile_settings_select_policy
  ON org_sport_profile_settings
  FOR SELECT
  USING (
    is_org_member(org_id, auth.uid())
  );

-- INSERT: Allow org admins only
DROP POLICY IF EXISTS org_sport_profile_settings_insert_policy ON org_sport_profile_settings;
CREATE POLICY org_sport_profile_settings_insert_policy
  ON org_sport_profile_settings
  FOR INSERT
  WITH CHECK (
    is_org_admin(org_id, auth.uid())
  );

-- UPDATE: Allow org admins only
DROP POLICY IF EXISTS org_sport_profile_settings_update_policy ON org_sport_profile_settings;
CREATE POLICY org_sport_profile_settings_update_policy
  ON org_sport_profile_settings
  FOR UPDATE
  USING (
    is_org_admin(org_id, auth.uid())
  )
  WITH CHECK (
    is_org_admin(org_id, auth.uid())
  );

-- DELETE: Allow org admins only
DROP POLICY IF EXISTS org_sport_profile_settings_delete_policy ON org_sport_profile_settings;
CREATE POLICY org_sport_profile_settings_delete_policy
  ON org_sport_profile_settings
  FOR DELETE
  USING (
    is_org_admin(org_id, auth.uid())
  );

-- ============================================================================
-- RLS POLICIES: athlete_medical_private
-- ============================================================================

-- Helper function: Check if coach has medical access based on org settings
CREATE OR REPLACE FUNCTION coach_has_medical_access(athlete_id_param UUID, user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  athlete_org_id UUID;
  coach_medical_access_enabled BOOLEAN;
BEGIN
  -- Get athlete's org_id via family
  SELECT f.org_id INTO athlete_org_id
  FROM athletes a
  JOIN families f ON f.id = a.family_id
  WHERE a.id = athlete_id_param;
  
  IF athlete_org_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check org settings for coach medical access
  -- TODO: This should check a specific org setting once that table is created
  -- For now, default to FALSE (coaches cannot see medical by default)
  coach_medical_access_enabled := FALSE;
  
  IF NOT coach_medical_access_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is coach for any team the athlete is on
  RETURN EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = athlete_id_param
      AND tm.deleted_at IS NULL
      AND t.deleted_at IS NULL
      AND is_coach_for_team(t.id, user_id_param)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION coach_has_medical_access IS 
  'Returns true if the user is a coach for the athlete AND the org allows coach medical access.';

-- SELECT: Allow parents, org admins, and coaches (if org setting allows)
DROP POLICY IF EXISTS athlete_medical_private_select_policy ON athlete_medical_private;
CREATE POLICY athlete_medical_private_select_policy
  ON athlete_medical_private
  FOR SELECT
  USING (
    is_org_admin(org_id, auth.uid())
    OR is_parent_of_athlete(athlete_id, auth.uid())
    OR coach_has_medical_access(athlete_id, auth.uid())
  );

-- INSERT: Allow parents and org admins
DROP POLICY IF EXISTS athlete_medical_private_insert_policy ON athlete_medical_private;
CREATE POLICY athlete_medical_private_insert_policy
  ON athlete_medical_private
  FOR INSERT
  WITH CHECK (
    (is_parent_of_athlete(athlete_id, auth.uid()) OR is_org_admin(org_id, auth.uid()))
    AND org_id = (SELECT org_id FROM athletes WHERE id = athlete_id)
  );

-- UPDATE: Allow parents and org admins
DROP POLICY IF EXISTS athlete_medical_private_update_policy ON athlete_medical_private;
CREATE POLICY athlete_medical_private_update_policy
  ON athlete_medical_private
  FOR UPDATE
  USING (
    is_parent_of_athlete(athlete_id, auth.uid()) OR is_org_admin(org_id, auth.uid())
  )
  WITH CHECK (
    (is_parent_of_athlete(athlete_id, auth.uid()) OR is_org_admin(org_id, auth.uid()))
    AND org_id = (SELECT org_id FROM athletes WHERE id = athlete_id)
  );

-- DELETE: Allow org admins only
DROP POLICY IF EXISTS athlete_medical_private_delete_policy ON athlete_medical_private;
CREATE POLICY athlete_medical_private_delete_policy
  ON athlete_medical_private
  FOR DELETE
  USING (
    is_org_admin(org_id, auth.uid())
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION is_parent_of_athlete TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_athlete TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_athlete TO authenticated;
GRANT EXECUTE ON FUNCTION coach_has_medical_access TO authenticated;

-- Grant table access to authenticated users (RLS will control actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON athlete_sport_profiles TO authenticated;
GRANT SELECT ON sport_field_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON org_sport_profile_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON athlete_medical_private TO authenticated;

-- ============================================================================
-- RLS POLICIES: athlete_sports (Legacy/Junction Table)
-- ============================================================================
-- Update policies to use new helper functions for consistency (fixes guardian access issues)

DROP POLICY IF EXISTS "Guardians can view their athletes sports" ON athlete_sports;
DROP POLICY IF EXISTS "Guardians can insert their athletes sports" ON athlete_sports;
DROP POLICY IF EXISTS "Guardians can update their athletes sports" ON athlete_sports;
DROP POLICY IF EXISTS "Guardians can delete their athletes sports" ON athlete_sports;
DROP POLICY IF EXISTS "Org admins can view org athlete sports" ON athlete_sports;
DROP POLICY IF EXISTS "Org admins can manage org athlete sports" ON athlete_sports;
DROP POLICY IF EXISTS "Platform admins can view all athlete sports" ON athlete_sports;
DROP POLICY IF EXISTS "Platform admins can manage all athlete sports" ON athlete_sports;

-- SELECT
DROP POLICY IF EXISTS athlete_sports_select_policy ON athlete_sports;
CREATE POLICY athlete_sports_select_policy ON athlete_sports
  FOR SELECT USING (can_view_athlete(athlete_id, auth.uid()));

-- INSERT
DROP POLICY IF EXISTS athlete_sports_insert_policy ON athlete_sports;
CREATE POLICY athlete_sports_insert_policy ON athlete_sports
  FOR INSERT WITH CHECK (can_edit_athlete(athlete_id, auth.uid()));

-- UPDATE
DROP POLICY IF EXISTS athlete_sports_update_policy ON athlete_sports;
CREATE POLICY athlete_sports_update_policy ON athlete_sports
  FOR UPDATE USING (can_edit_athlete(athlete_id, auth.uid()));

-- DELETE
DROP POLICY IF EXISTS athlete_sports_delete_policy ON athlete_sports;
CREATE POLICY athlete_sports_delete_policy ON athlete_sports
  FOR DELETE USING (can_edit_athlete(athlete_id, auth.uid()));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'RLS policies created successfully for athlete profile tables.';
  RAISE NOTICE 'Helper functions: is_parent_of_athlete, can_view_athlete, can_edit_athlete, coach_has_medical_access';
  RAISE NOTICE 'Tables secured: athlete_sport_profiles, sport_field_definitions, org_sport_profile_settings, athlete_medical_private';
END $$;
