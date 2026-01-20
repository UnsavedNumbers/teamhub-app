-- Migration: Fix License Tiers Schema Issues
-- =============================================================
-- This migration fixes all schema issues related to license tiers:
-- 1. Fixes get_user_organizations function to use org_id
-- 2. Ensures admin_license_tiers_list view exists
-- 3. Ensures admin_feature_entitlements_list view exists
-- 4. Ensures feature_entitlements table exists
-- 5. Ensures all necessary grants are in place
--
-- This migration is idempotent and can be run multiple times safely.

-- ============================================================================
-- 1. Fix get_user_organizations function to use org_id
-- ============================================================================

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_user_organizations(UUID);

-- Recreate the function with correct return type
CREATE FUNCTION get_user_organizations(check_user_id UUID)
RETURNS TABLE(
  org_id UUID,
  org_name TEXT,
  roles org_member_role[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    om.org_id,
    o.name AS org_name,
    ARRAY_AGG(DISTINCT om.role ORDER BY om.role) AS roles
  FROM organization_members om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = check_user_id
  GROUP BY om.org_id, o.name
  ORDER BY o.name;
$$;

COMMENT ON FUNCTION get_user_organizations IS 'Returns all organizations for a user along with their roles per organization. Uses org_id column (renamed from organization_id).';

-- ============================================================================
-- 2. Ensure feature_entitlements table exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('module', 'permission', 'limit', 'visibility', 'integration')),
  description TEXT,
  rollout_status TEXT DEFAULT 'live' CHECK (rollout_status IN ('live', 'beta', 'hidden')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_feature_entitlements_feature_key ON feature_entitlements(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_category ON feature_entitlements(category);
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_feature_type ON feature_entitlements(feature_type);
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_archived_at ON feature_entitlements(archived_at) WHERE archived_at IS NULL;

-- ============================================================================
-- 3. Ensure license_tiers table exists (if not already created)
-- ============================================================================

CREATE TABLE IF NOT EXISTS license_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key TEXT UNIQUE NOT NULL,
  tier_name TEXT NOT NULL,
  description TEXT,
  stripe_price_id TEXT UNIQUE NOT NULL,
  stripe_verified_at TIMESTAMPTZ,
  stripe_product_name TEXT,
  stripe_amount_cents INTEGER,
  stripe_interval TEXT,
  stripe_currency TEXT,
  stripe_active BOOLEAN,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_tiers_tier_key ON license_tiers(tier_key);
CREATE INDEX IF NOT EXISTS idx_license_tiers_status ON license_tiers(status);
CREATE INDEX IF NOT EXISTS idx_license_tiers_stripe_price_id ON license_tiers(stripe_price_id);

-- ============================================================================
-- 4. Ensure tier_feature_assignments table exists (if not already created)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tier_feature_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_tier_id UUID NOT NULL REFERENCES license_tiers(id) ON DELETE CASCADE,
  feature_entitlement_id UUID NOT NULL REFERENCES feature_entitlements(id) ON DELETE CASCADE,
  included BOOLEAN DEFAULT true,
  limit_value INTEGER,
  role_admin BOOLEAN DEFAULT true,
  role_coach BOOLEAN DEFAULT true,
  role_parent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(license_tier_id, feature_entitlement_id)
);

CREATE INDEX IF NOT EXISTS idx_tier_feature_assignments_tier_id ON tier_feature_assignments(license_tier_id);
CREATE INDEX IF NOT EXISTS idx_tier_feature_assignments_feature_id ON tier_feature_assignments(feature_entitlement_id);

-- ============================================================================
-- 5. Ensure entitlement_overrides table exists (if not already created)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entitlement_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('organization', 'user')),
  target_id UUID NOT NULL,
  feature_entitlement_id UUID NOT NULL REFERENCES feature_entitlements(id) ON DELETE CASCADE,
  override_action TEXT NOT NULL CHECK (override_action IN ('enable', 'disable', 'set_limit')),
  limit_value INTEGER,
  role_admin BOOLEAN,
  role_coach BOOLEAN,
  role_parent BOOLEAN,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_entitlement_overrides_target ON entitlement_overrides(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_overrides_feature_id ON entitlement_overrides(feature_entitlement_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_overrides_revoked_at ON entitlement_overrides(revoked_at) WHERE revoked_at IS NULL;

-- ============================================================================
-- 6. Create/Recreate admin_license_tiers_list view
-- ============================================================================

CREATE OR REPLACE VIEW admin_license_tiers_list AS
SELECT
  lt.id,
  lt.tier_key,
  lt.tier_name,
  lt.description,
  lt.stripe_price_id,
  lt.stripe_verified_at,
  lt.stripe_product_name,
  lt.stripe_amount_cents,
  lt.stripe_interval,
  lt.stripe_currency,
  lt.stripe_active,
  lt.status,
  lt.created_at,
  lt.updated_at,
  (SELECT COUNT(*) FROM tier_feature_assignments tfa WHERE tfa.license_tier_id = lt.id AND tfa.included = true) AS included_features_count,
  (SELECT COUNT(*) FROM organizations o WHERE (o.license_plan::text = lt.tier_key OR (lt.tier_key = 'basic' AND o.license_plan::text = 'starter') OR (lt.tier_key = 'power' AND o.license_plan::text IN ('standard', 'pro')))) AS orgs_using_count
FROM license_tiers lt;

-- ============================================================================
-- 7. Create/Recreate admin_feature_entitlements_list view
-- ============================================================================

CREATE OR REPLACE VIEW admin_feature_entitlements_list AS
SELECT
  fe.id,
  fe.feature_key,
  fe.display_name,
  fe.category,
  fe.feature_type,
  fe.description,
  fe.rollout_status,
  fe.created_at,
  fe.updated_at,
  fe.archived_at,
  (SELECT COUNT(*) FROM tier_feature_assignments tfa WHERE tfa.feature_entitlement_id = fe.id AND tfa.included = true) AS tier_assignments_count,
  (SELECT COUNT(*) FROM entitlement_overrides eo WHERE eo.feature_entitlement_id = fe.id AND eo.revoked_at IS NULL AND (eo.expires_at IS NULL OR eo.expires_at > NOW())) AS active_overrides_count
FROM feature_entitlements fe;

-- ============================================================================
-- 8. Create/Recreate admin_license_metrics view (if needed)
-- ============================================================================

CREATE OR REPLACE VIEW admin_license_metrics AS
SELECT
  (SELECT COUNT(*) FROM license_tiers WHERE status = 'active') AS active_tiers,
  (SELECT COUNT(*) FROM feature_entitlements WHERE archived_at IS NULL) AS total_features,
  (SELECT COUNT(*) FROM organizations WHERE license_plan::text IN ('basic', 'starter')) AS orgs_on_basic,
  (SELECT COUNT(*) FROM organizations WHERE license_plan::text IN ('power', 'standard', 'pro')) AS orgs_on_power,
  (SELECT COUNT(*) FROM entitlement_overrides WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())) AS active_overrides,
  (SELECT COUNT(*) FROM license_tiers WHERE stripe_price_id IS NULL OR stripe_price_id = '') AS tiers_missing_price_id,
  (SELECT COUNT(*) FROM feature_entitlements WHERE archived_at IS NULL AND id NOT IN (SELECT DISTINCT feature_entitlement_id FROM tier_feature_assignments WHERE included = true)) AS features_without_assignment;

-- ============================================================================
-- 9. Enable RLS on tables (if not already enabled)
-- ============================================================================

ALTER TABLE license_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_feature_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlement_overrides ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. Create/Replace RLS Policies (idempotent)
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "platform_admins_can_manage_license_tiers" ON license_tiers;
DROP POLICY IF EXISTS "platform_admins_can_manage_feature_entitlements" ON feature_entitlements;
DROP POLICY IF EXISTS "platform_admins_can_manage_tier_feature_assignments" ON tier_feature_assignments;
DROP POLICY IF EXISTS "platform_admins_can_manage_entitlement_overrides" ON entitlement_overrides;

-- Create policies for tables only (views don't support RLS policies)
CREATE POLICY "platform_admins_can_manage_license_tiers"
  ON license_tiers
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "platform_admins_can_manage_feature_entitlements"
  ON feature_entitlements
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "platform_admins_can_manage_tier_feature_assignments"
  ON tier_feature_assignments
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "platform_admins_can_manage_entitlement_overrides"
  ON entitlement_overrides
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- ============================================================================
-- 11. Grant Permissions
-- ============================================================================

GRANT SELECT ON admin_license_metrics TO authenticated;
GRANT SELECT ON admin_license_tiers_list TO authenticated;
GRANT SELECT ON admin_feature_entitlements_list TO authenticated;

-- ============================================================================
-- 12. Add update triggers (if not already exist)
-- ============================================================================

-- Create update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_license_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_feature_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_license_tiers_updated_at ON license_tiers;
DROP TRIGGER IF EXISTS trigger_feature_entitlements_updated_at ON feature_entitlements;

-- Create triggers
CREATE TRIGGER trigger_license_tiers_updated_at
  BEFORE UPDATE ON license_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_license_tiers_updated_at();

CREATE TRIGGER trigger_feature_entitlements_updated_at
  BEFORE UPDATE ON feature_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_entitlements_updated_at();
