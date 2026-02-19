-- ============================================
-- ADD RLS POLICY FOR PUBLIC ORGANIZATION ACCESS
-- ============================================
-- This is a separate migration to ensure the RLS policy gets created
-- even if the previous migration was partially applied.
-- ============================================

-- Drop and recreate the policy to ensure it exists
DROP POLICY IF EXISTS "Authenticated users can view public organizations" ON public.organizations;

CREATE POLICY "Authenticated users can view public organizations"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if organization is public or unlisted  
    (privacy_level IS NULL OR privacy_level IN ('public', 'unlisted'))
    OR
    -- Also allow if user is a member of the organization
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

COMMENT ON POLICY "Authenticated users can view public organizations" ON public.organizations 
  IS 'Allows authenticated users to view public/unlisted organizations and organizations they are members of. Required for fan features.';
