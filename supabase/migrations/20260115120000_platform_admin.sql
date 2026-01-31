-- ============================================================================
-- Platform Admin Panel Migration
-- ============================================================================
-- This migration sets up the complete platform admin infrastructure:
-- 1. RBAC: platform_admin_role enum and role column on platform_admins
-- 2. Organization status: org_status enum if missing
-- 3. Audit logs: table, immutability policies, and indexes
-- 4. Feature flags: table for per-org feature toggles
-- 5. 8 guarded admin views with platform-admin predicate
-- 6. Audited RPCs for all mutations

-- ============================================================================
-- 1. RBAC: Platform Admin Roles
-- ============================================================================

-- Create platform_admin_role enum
DO $$ BEGIN
  CREATE TYPE platform_admin_role AS ENUM ('super_admin', 'support_admin', 'finance_admin', 'ops_admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add role column to platform_admins table
DO $$ BEGIN
  ALTER TABLE platform_admins ADD COLUMN role platform_admin_role NOT NULL DEFAULT 'support_admin';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_platform_admins_role ON platform_admins(role);

-- ============================================================================
-- 2. Organization Status Enum
-- ============================================================================

-- Create org_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE org_status AS ENUM ('trial', 'active', 'suspended', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add status column to organizations if not exists
DO $$ BEGIN
  ALTER TABLE organizations ADD COLUMN status org_status NOT NULL DEFAULT 'trial';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create index for status lookups
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- ============================================================================
-- 3. Audit Logs Table (Immutable, Indexed)
-- ============================================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all audit logs
DROP POLICY IF EXISTS "Platform admins can view audit logs" ON audit_logs;
CREATE POLICY "Platform admins can view audit logs" ON audit_logs
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()));

-- Platform admins can insert audit logs
DROP POLICY IF EXISTS "Platform admins can insert audit logs" ON audit_logs;
CREATE POLICY "Platform admins can insert audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()));

-- CRITICAL: Deny UPDATE on audit_logs (immutability)
DROP POLICY IF EXISTS "Deny update on audit logs" ON audit_logs;
CREATE POLICY "Deny update on audit logs" ON audit_logs
  FOR UPDATE
  USING (FALSE);

-- CRITICAL: Deny DELETE on audit_logs (immutability)
DROP POLICY IF EXISTS "Deny delete on audit logs" ON audit_logs;
CREATE POLICY "Deny delete on audit logs" ON audit_logs
  FOR DELETE
  USING (FALSE);

-- ============================================================================
-- 4. Feature Flags Table
-- ============================================================================

-- Create feature_flags table for per-org feature toggles
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one flag per feature per org
  CONSTRAINT uq_feature_flag_org_key UNIQUE (org_id, feature_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_org ON feature_flags(org_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(feature_key);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all feature flags
DROP POLICY IF EXISTS "Platform admins can view feature flags" ON feature_flags;
CREATE POLICY "Platform admins can view feature flags" ON feature_flags
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()));

-- Org admins can view their own org's feature flags
DROP POLICY IF EXISTS "Org admins can view own feature flags" ON feature_flags;
CREATE POLICY "Org admins can view own feature flags" ON feature_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.user_id = auth.uid() 
      AND om.org_id = feature_flags.org_id
      AND om.role = 'org_admin'
    )
  );

-- ============================================================================
-- 5. Guarded Admin Views (8 views)
-- ============================================================================

-- Each view includes the platform-admin guard:
-- WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())

-- 5.1 admin_organizations - Organization overview with counts
DROP VIEW IF EXISTS admin_organizations;
CREATE OR REPLACE VIEW admin_organizations AS
SELECT 
  o.id,
  o.name,
  o.org_type,
  o.status,
  o.license_status,
  o.license_plan,
  o.license_trial_ends_at,
  o.license_current_period_end,
  o.payout_account_id,
  o.payouts_enabled,
  o.created_at,
  o.updated_at,
  (SELECT COUNT(*) FROM teams t WHERE t.org_id = o.id) AS team_count,
      (SELECT COUNT(DISTINCT s.id) FROM teams t JOIN seasons s ON s.org_id = o.id WHERE t.org_id = o.id) AS sport_count,
      (SELECT COUNT(DISTINCT om.user_id) FROM organization_members om WHERE om.org_id = o.id) AS user_count,
  o.stripe_customer_id IS NOT NULL AS stripe_connected
FROM organizations o
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());

-- 5.2 admin_users - User overview with roles and organizations
DROP VIEW IF EXISTS admin_users;
CREATE OR REPLACE VIEW admin_users AS
SELECT 
  u.id,
  u.email,
  u.phone,
  u.display_name,
  u.created_at,
  u.updated_at,
  (
    SELECT COALESCE(json_agg(json_build_object(
      'org_id', om.org_id,
      'org_name', org.name,
      'role', om.role
    )), '[]'::json)
    FROM organization_members om
    JOIN organizations org ON org.id = om.org_id
    WHERE om.user_id = u.id
  ) AS organizations,
  (
    SELECT COALESCE(array_agg(DISTINCT om.role::text), ARRAY[]::text[])
    FROM organization_members om
    WHERE om.user_id = u.id
  ) AS roles,
  EXISTS (SELECT 1 FROM platform_admins pa2 WHERE pa2.user_id = u.id) AS is_platform_admin,
  (SELECT created_at FROM auth.users au WHERE au.id = u.id) AS last_sign_in_at,
  (SELECT email_confirmed_at IS NOT NULL FROM auth.users au WHERE au.id = u.id) AS email_confirmed
FROM users u
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());

-- 5.3 admin_structure - Sports/Programs/Teams hierarchy
DROP VIEW IF EXISTS admin_structure;
CREATE OR REPLACE VIEW admin_structure AS
SELECT 
  o.id AS org_id,
  o.name AS organization_name,
  t.id AS team_id,
  t.name AS team_name,
  s.id AS season_id,
  s.name AS season_name,
  s.is_active AS season_active,
  (SELECT COUNT(*) FROM team_memberships tm WHERE tm.team_id = t.id) AS player_count
FROM organizations o
LEFT JOIN teams t ON t.org_id = o.id
LEFT JOIN seasons s ON s.org_id = o.id
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())
ORDER BY o.name, t.name, s.name;

-- 5.4 admin_payments - Payment transactions with details
DROP VIEW IF EXISTS admin_payments;
CREATE OR REPLACE VIEW admin_payments AS
SELECT 
  p.id,
  p.amount_cents,
  p.currency,
  p.stripe_payment_intent_id,
  p.status,
  p.created_at,
  p.org_id,
  o.name AS organization_name,
  fa.id AS fee_assignment_id,
  fa.fee_id,
  f.title AS fee_title,
  c.id AS child_id,
  c.first_name || ' ' || c.last_name AS child_name,
  u.email AS parent_email,
  u.display_name AS parent_name
FROM payments p
JOIN organizations o ON o.id = p.org_id
LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
LEFT JOIN fee_assignments fa ON fa.id = pa.fee_assignment_id
LEFT JOIN fees f ON f.id = fa.fee_id
LEFT JOIN athletes c ON c.id = fa.athlete_id
LEFT JOIN users u ON u.id = fa.parent_id
WHERE EXISTS (SELECT 1 FROM platform_admins pla WHERE pla.user_id = auth.uid());

-- 5.5 admin_fees_status - Fee assignment and payment status summary
DROP VIEW IF EXISTS admin_fees_status;
CREATE OR REPLACE VIEW admin_fees_status AS
SELECT 
  f.id AS fee_id,
  f.title AS fee_name,
  f.amount_cents,
  f.currency,
  f.due_date,
  f.status AS fee_status,
  o.id AS org_id,
  o.name AS organization_name,
  (SELECT COUNT(*) FROM fee_assignments fa WHERE fa.fee_id = f.id) AS assigned_count,
  (SELECT COUNT(*) FROM fee_assignments fa WHERE fa.fee_id = f.id AND fa.status = 'paid') AS paid_count,
  (SELECT COUNT(*) FROM fee_assignments fa WHERE fa.fee_id = f.id AND fa.status IN ('unpaid', 'partial')) AS unpaid_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM fee_assignments fa WHERE fa.fee_id = f.id) > 0 
    THEN ROUND(
      (SELECT COUNT(*) FROM fee_assignments fa WHERE fa.fee_id = f.id AND fa.status = 'paid')::numeric / 
      (SELECT COUNT(*) FROM fee_assignments fa WHERE fa.fee_id = f.id)::numeric * 100, 
      1
    )
    ELSE 0 
  END AS payment_rate_percent
FROM fees f
JOIN organizations o ON o.id = f.org_id
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());

-- 5.6 admin_audit_log - Audit log with actor information
DROP VIEW IF EXISTS admin_audit_log;
CREATE OR REPLACE VIEW admin_audit_log AS
SELECT 
  al.id,
  al.actor_id,
  u.email AS actor_email,
  u.display_name AS actor_name,
  al.action,
  al.entity_type,
  al.entity_id,
  al.metadata,
  al.created_at
FROM audit_logs al
LEFT JOIN users u ON u.id = al.actor_id
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())
ORDER BY al.created_at DESC;

-- 5.7 admin_platform_health - Platform-wide metrics
DROP VIEW IF EXISTS admin_platform_health;
CREATE OR REPLACE VIEW admin_platform_health AS
SELECT 
  (SELECT COUNT(*) FROM organizations WHERE status = 'active') AS active_organizations,
  (SELECT COUNT(*) FROM organizations WHERE status = 'trial') AS trial_organizations,
  (SELECT COUNT(*) FROM organizations WHERE status = 'suspended') AS suspended_organizations,
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(*) FROM platform_admins) AS platform_admin_count,
  (SELECT COUNT(*) FROM payments WHERE status = 'succeeded') AS successful_payments,
  (SELECT COUNT(*) FROM payments WHERE status = 'failed') AS failed_payments,
  (SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE status = 'succeeded') AS total_payment_volume_cents,
  (SELECT COUNT(*) FROM teams) AS total_teams,
  (SELECT COUNT(*) FROM athletes) AS total_children
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());

-- 5.8 admin_feature_flags - Feature flags per organization
DROP VIEW IF EXISTS admin_feature_flags;
CREATE OR REPLACE VIEW admin_feature_flags AS
SELECT 
  ff.id,
  ff.org_id,
  o.name AS organization_name,
  ff.feature_key,
  ff.enabled,
  ff.created_at,
  ff.updated_at
FROM feature_flags ff
JOIN organizations o ON o.id = ff.org_id
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())
ORDER BY o.name, ff.feature_key;

-- ============================================================================
-- 6. Helper Functions for RPCs
-- ============================================================================

-- Get current user's platform admin role
CREATE OR REPLACE FUNCTION get_platform_admin_role()
RETURNS platform_admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM platform_admins WHERE user_id = auth.uid();
$$;

-- Check if current user can perform an action based on role
CREATE OR REPLACE FUNCTION can_perform_admin_action(required_roles platform_admin_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins 
    WHERE user_id = auth.uid() 
    AND role = ANY(required_roles)
  );
$$;

-- ============================================================================
-- 7. Audited RPCs for Mutations
-- ============================================================================

-- 7.1 admin_activate_organization
CREATE OR REPLACE FUNCTION admin_activate_organization(
  target_org_id UUID,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  org_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action (ops_admin or super_admin)
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id) INTO org_exists;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Perform update
  UPDATE organizations SET status = 'active', updated_at = NOW() WHERE id = target_org_id;
  
  -- Log audit entry
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'activate_organization',
    'organization',
    target_org_id::text,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7.2 admin_suspend_organization
CREATE OR REPLACE FUNCTION admin_suspend_organization(
  target_org_id UUID,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  org_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id) INTO org_exists;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Perform update
  UPDATE organizations SET status = 'suspended', updated_at = NOW() WHERE id = target_org_id;
  
  -- Log audit entry
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'suspend_organization',
    'organization',
    target_org_id::text,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7.3 admin_disable_user
CREATE OR REPLACE FUNCTION admin_disable_user(
  target_user_id UUID,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  user_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Ban user for 100 years (effectively permanent)
  UPDATE auth.users SET banned_until = NOW() + INTERVAL '100 years' WHERE id = target_user_id;
  
  -- Log audit entry
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'disable_user',
    'user',
    target_user_id::text,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7.4 admin_enable_user
CREATE OR REPLACE FUNCTION admin_enable_user(
  target_user_id UUID,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  user_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Unban user
  UPDATE auth.users SET banned_until = NULL WHERE id = target_user_id;
  
  -- Log audit entry
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'enable_user',
    'user',
    target_user_id::text,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7.5 admin_set_feature_flag
CREATE OR REPLACE FUNCTION admin_set_feature_flag(
  target_org_id UUID,
  target_feature_key TEXT,
  target_enabled BOOLEAN,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  org_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate inputs
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  IF target_feature_key IS NULL OR trim(target_feature_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature key is required');
  END IF;
  
  -- Check org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id) INTO org_exists;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Upsert feature flag
  INSERT INTO feature_flags (org_id, feature_key, enabled)
  VALUES (target_org_id, target_feature_key, target_enabled)
  ON CONFLICT (org_id, feature_key)
  DO UPDATE SET enabled = target_enabled, updated_at = NOW();
  
  -- Log audit entry
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'set_feature_flag',
    'feature_flag',
    target_org_id::text || ':' || target_feature_key,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason, 'feature_key', target_feature_key, 'enabled', target_enabled)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7.6 admin_add_platform_admin
CREATE OR REPLACE FUNCTION admin_add_platform_admin(
  target_email TEXT,
  target_role platform_admin_role,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  target_user_id UUID;
  already_admin BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Only super_admin can manage platform admins
  IF admin_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires super_admin role');
  END IF;
  
  -- Validate inputs
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  IF target_email IS NULL OR trim(target_email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email is required');
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id FROM users WHERE email = target_email;
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found with that email');
  END IF;
  
  -- Check if already an admin
  SELECT EXISTS(SELECT 1 FROM platform_admins WHERE user_id = target_user_id) INTO already_admin;
  IF already_admin THEN
    -- Update role instead
    UPDATE platform_admins SET role = target_role WHERE user_id = target_user_id;
  ELSE
    -- Insert new admin
    INSERT INTO platform_admins (user_id, role) VALUES (target_user_id, target_role);
  END IF;
  
  -- Log audit entry
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN already_admin THEN 'update_platform_admin' ELSE 'add_platform_admin' END,
    'platform_admin',
    target_user_id::text,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason, 'target_email', target_email, 'target_role', target_role::text)
  );
  
  RETURN jsonb_build_object('success', true, 'action', CASE WHEN already_admin THEN 'updated' ELSE 'added' END);
END;
$$;

-- 7.7 admin_remove_platform_admin
CREATE OR REPLACE FUNCTION admin_remove_platform_admin(
  target_user_id UUID,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  target_role platform_admin_role;
  super_admin_count INTEGER;
  admin_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Only super_admin can manage platform admins
  IF admin_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check target exists as admin
  SELECT role INTO target_role FROM platform_admins WHERE user_id = target_user_id;
  IF target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a platform admin');
  END IF;
  
  -- Cannot remove yourself
  IF target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot remove yourself');
  END IF;
  
  -- Check if this would remove the last super_admin
  IF target_role = 'super_admin' THEN
    SELECT COUNT(*) INTO super_admin_count FROM platform_admins WHERE role = 'super_admin';
    IF super_admin_count <= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot remove the last super_admin');
    END IF;
  END IF;
  
  -- Remove admin
  DELETE FROM platform_admins WHERE user_id = target_user_id;
  
  -- Log audit entry
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'remove_platform_admin',
    'platform_admin',
    target_user_id::text,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason, 'removed_role', target_role::text)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- 8. Grant Permissions
-- ============================================================================

-- Grant access to views for authenticated users (views handle their own access control)
GRANT SELECT ON admin_organizations TO authenticated;
GRANT SELECT ON admin_users TO authenticated;
GRANT SELECT ON admin_structure TO authenticated;
GRANT SELECT ON admin_payments TO authenticated;
GRANT SELECT ON admin_fees_status TO authenticated;
GRANT SELECT ON admin_audit_log TO authenticated;
GRANT SELECT ON admin_platform_health TO authenticated;
GRANT SELECT ON admin_feature_flags TO authenticated;

-- Grant execute on RPCs
GRANT EXECUTE ON FUNCTION get_platform_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION can_perform_admin_action(platform_admin_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_activate_organization(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_suspend_organization(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_disable_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_enable_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_feature_flag(UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_add_platform_admin(TEXT, platform_admin_role, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_remove_platform_admin(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 9. Documentation
-- ============================================================================

COMMENT ON TYPE platform_admin_role IS 'Platform admin roles: super_admin (full access), support_admin (read + support), finance_admin (read + refunds), ops_admin (read + org/user management)';
COMMENT ON TYPE org_status IS 'Organization status: trial, active, suspended, expired';
COMMENT ON TABLE audit_logs IS 'Immutable audit log for all platform admin actions. No updates or deletes allowed.';
COMMENT ON TABLE feature_flags IS 'Per-organization feature flags. Managed by platform admins.';
COMMENT ON VIEW admin_organizations IS 'Platform admin view: all organizations with counts. Only accessible by platform admins.';
COMMENT ON VIEW admin_users IS 'Platform admin view: all users with roles and organizations. Only accessible by platform admins.';
COMMENT ON VIEW admin_structure IS 'Platform admin view: hierarchical structure of orgs/teams/seasons. Only accessible by platform admins.';
COMMENT ON VIEW admin_payments IS 'Platform admin view: all payment transactions. Only accessible by platform admins.';
COMMENT ON VIEW admin_fees_status IS 'Platform admin view: fee assignment and payment status summary. Only accessible by platform admins.';
COMMENT ON VIEW admin_audit_log IS 'Platform admin view: audit log with actor info. Only accessible by platform admins.';
COMMENT ON VIEW admin_platform_health IS 'Platform admin view: platform-wide metrics. Only accessible by platform admins.';
COMMENT ON VIEW admin_feature_flags IS 'Platform admin view: feature flags per organization. Only accessible by platform admins.';
