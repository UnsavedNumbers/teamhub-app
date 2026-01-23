-- Migration: Fix Seasons RLS Policy for Org Admins
-- =============================================================
-- This migration adds a missing RLS policy that allows org admins
-- to SELECT seasons by org_id directly. The existing seasons_select_policy
-- only allows access via team_id relationships, but seasons can be
-- org-scoped with team_id = NULL.
--
-- This migration is idempotent and can be run multiple times safely.

-- ============================================================================
-- Add policy for org admins to view seasons in their organization
-- ============================================================================

-- Drop the policy if it exists (for idempotency)
DROP POLICY IF EXISTS "org_admins_can_view_seasons" ON seasons;

-- Create policy that allows org admins to view seasons in their organization
-- This complements the existing seasons_select_policy which handles other access patterns
CREATE POLICY "org_admins_can_view_seasons" ON seasons
  FOR SELECT
  USING (
    -- Allow org admins to view seasons in their organization
    user_is_org_admin(auth.uid(), org_id)
  );

-- Add comment explaining the policy
COMMENT ON POLICY "org_admins_can_view_seasons" ON seasons IS 
  'Allows organization administrators to view all seasons in their organization by org_id. This is needed because seasons can be org-scoped (team_id = NULL) and the existing seasons_select_policy only handles access via team relationships.';
