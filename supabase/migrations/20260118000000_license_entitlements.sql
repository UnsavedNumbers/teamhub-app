-- ============================================================================
-- License Entitlements System Migration
-- ============================================================================
-- This migration creates the complete licenses & entitlements system:
-- 1. license_tiers - Basic and Power tier definitions with Stripe Price IDs
-- 2. feature_entitlements - Master catalog of all platform features
-- 3. tier_feature_assignments - Links features to license tiers
-- 4. entitlement_overrides - Org/user-level exceptions
-- 5. entitlement_audit_log - Immutable audit log
-- 6. Admin views for dashboard metrics
-- 7. RLS policies for platform admin access only

-- ============================================================================
-- 1. License Tiers Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS license_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key TEXT UNIQUE NOT NULL, -- 'basic', 'power'
  tier_name TEXT NOT NULL, -- 'Basic License', 'Power License'
  description TEXT,
  stripe_price_id TEXT UNIQUE NOT NULL,
  stripe_verified_at TIMESTAMPTZ,
  stripe_product_name TEXT,
  stripe_amount_cents INTEGER,
  stripe_interval TEXT, -- 'year', 'month'
  stripe_currency TEXT, -- 'usd'
  stripe_active BOOLEAN,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_tiers_tier_key ON license_tiers(tier_key);
CREATE INDEX IF NOT EXISTS idx_license_tiers_status ON license_tiers(status);
CREATE INDEX IF NOT EXISTS idx_license_tiers_stripe_price_id ON license_tiers(stripe_price_id);

-- ============================================================================
-- 2. Feature Entitlements Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL, -- 'travel_details_page'
  display_name TEXT NOT NULL, -- 'Travel Details'
  category TEXT NOT NULL, -- 'Travel', 'Payments', etc.
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
-- 3. Tier Feature Assignments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tier_feature_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_tier_id UUID NOT NULL REFERENCES license_tiers(id) ON DELETE CASCADE,
  feature_entitlement_id UUID NOT NULL REFERENCES feature_entitlements(id) ON DELETE CASCADE,
  included BOOLEAN DEFAULT true,
  limit_value INTEGER, -- For 'limit' type features
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
-- 4. Entitlement Overrides Table
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
-- 5. Entitlement Audit Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS entitlement_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL, -- 'tier_created', 'feature_assigned', 'override_created', etc.
  target_type TEXT, -- 'tier', 'feature', 'override'
  target_id UUID,
  before_state JSONB,
  after_state JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entitlement_audit_log_actor_id ON entitlement_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_log_target ON entitlement_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_log_created_at ON entitlement_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_log_action ON entitlement_audit_log(action);

-- ============================================================================
-- 6. Update Triggers
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_license_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_license_tiers_updated_at
  BEFORE UPDATE ON license_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_license_tiers_updated_at();

CREATE OR REPLACE FUNCTION update_feature_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feature_entitlements_updated_at
  BEFORE UPDATE ON feature_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_entitlements_updated_at();

CREATE OR REPLACE FUNCTION update_tier_feature_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tier_feature_assignments_updated_at
  BEFORE UPDATE ON tier_feature_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_tier_feature_assignments_updated_at();

CREATE OR REPLACE FUNCTION update_entitlement_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_entitlement_overrides_updated_at
  BEFORE UPDATE ON entitlement_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_entitlement_overrides_updated_at();

-- ============================================================================
-- 7. Admin Views
-- ============================================================================

-- Dashboard metrics view
CREATE OR REPLACE VIEW admin_license_metrics AS
SELECT
  (SELECT COUNT(*) FROM license_tiers WHERE status = 'active') AS active_tiers,
  (SELECT COUNT(*) FROM feature_entitlements WHERE archived_at IS NULL) AS total_features,
  (SELECT COUNT(*) FROM organizations WHERE license_plan = 'basic' OR license_plan = 'starter') AS orgs_on_basic,
  (SELECT COUNT(*) FROM organizations WHERE license_plan = 'power' OR license_plan = 'standard' OR license_plan = 'pro') AS orgs_on_power,
  (SELECT COUNT(*) FROM entitlement_overrides WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())) AS active_overrides,
  (SELECT COUNT(*) FROM license_tiers WHERE stripe_price_id IS NULL OR stripe_price_id = '') AS tiers_missing_price_id,
  (SELECT COUNT(*) FROM feature_entitlements WHERE archived_at IS NULL AND id NOT IN (SELECT DISTINCT feature_entitlement_id FROM tier_feature_assignments WHERE included = true)) AS features_without_assignment;

-- License tiers with feature counts
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
  (SELECT COUNT(*) FROM organizations o WHERE (o.license_plan = lt.tier_key OR (lt.tier_key = 'basic' AND o.license_plan = 'starter') OR (lt.tier_key = 'power' AND o.license_plan IN ('standard', 'pro')))) AS orgs_using_count
FROM license_tiers lt;

-- Feature entitlements with tier assignments
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

-- Entitlement overrides with details
CREATE OR REPLACE VIEW admin_entitlement_overrides_list AS
SELECT
  eo.id,
  eo.target_type,
  eo.target_id,
  CASE 
    WHEN eo.target_type = 'organization' THEN o.name
    WHEN eo.target_type = 'user' THEN u.email
    ELSE NULL
  END AS target_name,
  eo.feature_entitlement_id,
  fe.feature_key,
  fe.display_name AS feature_name,
  eo.override_action,
  eo.limit_value,
  eo.role_admin,
  eo.role_coach,
  eo.role_parent,
  eo.reason,
  eo.expires_at,
  eo.created_by,
  creator.email AS created_by_email,
  eo.created_at,
  eo.updated_at,
  eo.revoked_at,
  eo.revoked_by,
  revoker.email AS revoked_by_email,
  eo.revoked_reason,
  CASE 
    WHEN eo.revoked_at IS NOT NULL THEN 'revoked'
    WHEN eo.expires_at IS NOT NULL AND eo.expires_at < NOW() THEN 'expired'
    ELSE 'active'
  END AS status
FROM entitlement_overrides eo
LEFT JOIN feature_entitlements fe ON eo.feature_entitlement_id = fe.id
LEFT JOIN organizations o ON eo.target_type = 'organization' AND eo.target_id = o.id
LEFT JOIN users u ON eo.target_type = 'user' AND eo.target_id = u.id
LEFT JOIN auth.users creator ON eo.created_by = creator.id
LEFT JOIN auth.users revoker ON eo.revoked_by = revoker.id;

-- ============================================================================
-- 8. RLS Policies (Platform Admin Only)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE license_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_feature_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlement_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlement_audit_log ENABLE ROW LEVEL SECURITY;

-- License tiers: Platform admins can read/write
CREATE POLICY "platform_admins_can_manage_license_tiers"
  ON license_tiers
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- Feature entitlements: Platform admins can read/write
CREATE POLICY "platform_admins_can_manage_feature_entitlements"
  ON feature_entitlements
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- Tier feature assignments: Platform admins can read/write
CREATE POLICY "platform_admins_can_manage_tier_feature_assignments"
  ON tier_feature_assignments
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- Entitlement overrides: Platform admins can read/write
CREATE POLICY "platform_admins_can_manage_entitlement_overrides"
  ON entitlement_overrides
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- Audit log: Platform admins can read only (immutable)
CREATE POLICY "platform_admins_can_read_audit_log"
  ON entitlement_audit_log
  FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

-- Views: Platform admins can read
CREATE POLICY "platform_admins_can_read_license_metrics"
  ON admin_license_metrics
  FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "platform_admins_can_read_license_tiers_list"
  ON admin_license_tiers_list
  FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "platform_admins_can_read_feature_entitlements_list"
  ON admin_feature_entitlements_list
  FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "platform_admins_can_read_entitlement_overrides_list"
  ON admin_entitlement_overrides_list
  FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

-- ============================================================================
-- 9. Grant Permissions
-- ============================================================================

-- Grant access to views
GRANT SELECT ON admin_license_metrics TO authenticated;
GRANT SELECT ON admin_license_tiers_list TO authenticated;
GRANT SELECT ON admin_feature_entitlements_list TO authenticated;
GRANT SELECT ON admin_entitlement_overrides_list TO authenticated;
