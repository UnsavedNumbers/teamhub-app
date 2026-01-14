-- Phase 1: Auth Restructure Migration
-- =====================================
-- This migration creates the multi-organization auth structure:
-- - organization_members: Links users to organizations with roles
-- - platform_admins: Global platform admins
-- - organization_invites: Invite tokens for org membership
-- - Updates users table to make org_id/role nullable
-- - Creates helper functions for RLS policies

-- ============================================
-- 1. Create org_member_role enum
-- ============================================
DO $$ BEGIN
  CREATE TYPE org_member_role AS ENUM ('parent', 'coach', 'org_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. Create organization_members table
-- ============================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role org_member_role NOT NULL DEFAULT 'parent',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: user can only have one role per org
  CONSTRAINT uq_org_member_user_org UNIQUE (organization_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON organization_members(user_id, organization_id, role);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_org_members_updated_at ON organization_members;
CREATE TRIGGER update_org_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Create platform_admins table
-- ============================================
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_platform_admins_user ON platform_admins(user_id);

-- Enable RLS
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Create organization_invites table
-- ============================================
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role org_member_role NOT NULL DEFAULT 'parent',
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON organization_invites(token) WHERE accepted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON organization_invites(organization_id);

-- Enable RLS
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Update users table
-- ============================================

-- Add display_name column if not exists
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN display_name TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Make org_id nullable (for new signups without org)
ALTER TABLE users ALTER COLUMN org_id DROP NOT NULL;

-- Note: We keep org_id and role for backward compatibility during migration
-- They will be deprecated after frontend is fully updated

-- ============================================
-- 6. Create STABLE helper functions for RLS
-- ============================================

-- Check if user is a platform admin
CREATE OR REPLACE FUNCTION is_platform_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins 
    WHERE user_id = check_user_id
  );
$$;

-- Check if user has access to an organization (any role)
CREATE OR REPLACE FUNCTION user_has_org_access(check_user_id UUID, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    is_platform_admin(check_user_id) OR
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = check_user_id 
      AND organization_id = check_org_id
    );
$$;

-- Check if user has specific role in organization
CREATE OR REPLACE FUNCTION user_has_org_role(check_user_id UUID, check_org_id UUID, check_role org_member_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    is_platform_admin(check_user_id) OR
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = check_user_id 
      AND organization_id = check_org_id
      AND role = check_role
    );
$$;

-- Check if user is org admin for a specific organization
CREATE OR REPLACE FUNCTION user_is_org_admin(check_user_id UUID, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT user_has_org_role(check_user_id, check_org_id, 'org_admin');
$$;

-- Get all organizations for a user
CREATE OR REPLACE FUNCTION get_user_organizations(check_user_id UUID)
RETURNS TABLE(organization_id UUID, org_name TEXT, role org_member_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    om.organization_id,
    o.name as org_name,
    om.role
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = check_user_id
  ORDER BY o.name;
$$;

-- ============================================
-- 7. Data Migration: Move existing users to organization_members
-- ============================================
DO $$
DECLARE
  migrated_count INTEGER;
  total_count INTEGER;
BEGIN
  -- Count users with org_id
  SELECT COUNT(*) INTO total_count FROM users WHERE org_id IS NOT NULL;
  
  -- Skip if no users to migrate
  IF total_count = 0 THEN
    RAISE NOTICE 'No users with org_id to migrate';
    RETURN;
  END IF;
  
  -- Migrate with conflict handling
  INSERT INTO organization_members (organization_id, user_id, role)
  SELECT 
    org_id,
    id,
    CASE 
      WHEN role::text = 'admin' THEN 'org_admin'::org_member_role
      WHEN role::text = 'coach' THEN 'coach'::org_member_role
      ELSE 'parent'::org_member_role
    END
  FROM users
  WHERE org_id IS NOT NULL
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  -- Verify migration
  SELECT COUNT(*) INTO migrated_count FROM organization_members;
  
  RAISE NOTICE 'Migrated % of % users to organization_members', migrated_count, total_count;
  
  IF migrated_count < total_count THEN
    RAISE WARNING 'Migration incomplete: % of % users migrated (some may have been duplicates)', migrated_count, total_count;
  END IF;
END $$;

-- ============================================
-- 8. Update handle_new_user() trigger
-- ============================================
-- Now only creates basic user record, no org/family assignment
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. Create backward compatibility view
-- ============================================
CREATE OR REPLACE VIEW users_legacy AS
SELECT 
  u.id,
  u.email,
  u.phone,
  u.display_name,
  u.family_id,
  u.created_at,
  u.updated_at,
  -- Get first org membership for backward compatibility
  COALESCE(u.org_id, om.organization_id) as org_id,
  COALESCE(
    CASE 
      WHEN u.role::text IS NOT NULL THEN u.role::text
      WHEN om.role = 'org_admin' THEN 'admin'
      ELSE om.role::text
    END,
    'parent'
  ) as role
FROM users u
LEFT JOIN LATERAL (
  SELECT organization_id, role 
  FROM organization_members 
  WHERE user_id = u.id 
  ORDER BY created_at 
  LIMIT 1
) om ON true;

-- Grant access to the view
GRANT SELECT ON users_legacy TO authenticated;
GRANT SELECT ON users_legacy TO service_role;

COMMENT ON VIEW users_legacy IS 'Backward compatibility view - DEPRECATED. Use organization_members for role checks.';

-- ============================================
-- 10. Add comments for documentation
-- ============================================
COMMENT ON TABLE organization_members IS 'Links users to organizations with role-based access. One user can belong to multiple orgs.';
COMMENT ON TABLE platform_admins IS 'Global platform administrators with access to all organizations.';
COMMENT ON TABLE organization_invites IS 'Invitation tokens for joining organizations. Tokens are one-time use.';
COMMENT ON FUNCTION is_platform_admin(UUID) IS 'STABLE: Check if user is a platform admin. Used by RLS policies.';
COMMENT ON FUNCTION user_has_org_access(UUID, UUID) IS 'STABLE: Check if user has any access to org. Used by RLS policies.';
COMMENT ON FUNCTION user_has_org_role(UUID, UUID, org_member_role) IS 'STABLE: Check if user has specific role in org. Used by RLS policies.';
