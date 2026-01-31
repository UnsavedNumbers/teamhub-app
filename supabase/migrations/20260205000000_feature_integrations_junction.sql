-- Migration: Feature Integrations Junction Table
-- =============================================================
-- Creates a junction table to link features to integrations
-- This enables filtering features by integration dependencies
-- (Stripe, Email, Calendar, Files/Uploads, etc.)

-- ============================================================================
-- 1. Create feature_integration_assignments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_integration_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_entitlement_id UUID NOT NULL REFERENCES feature_entitlements(id) ON DELETE CASCADE,
  integration_name TEXT NOT NULL, -- 'Stripe', 'Email', 'Calendar', 'Files/Uploads'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_entitlement_id, integration_name)
);

-- ============================================================================
-- 2. Create Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feature_integration_assignments_feature 
  ON feature_integration_assignments(feature_entitlement_id);

CREATE INDEX IF NOT EXISTS idx_feature_integration_assignments_integration 
  ON feature_integration_assignments(integration_name);

-- ============================================================================
-- 3. Enable RLS
-- ============================================================================

ALTER TABLE feature_integration_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Create RLS Policy
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'feature_integration_assignments' 
      AND policyname = 'platform_admins_can_manage_feature_integrations'
  ) THEN
    CREATE POLICY "platform_admins_can_manage_feature_integrations"
      ON feature_integration_assignments
      FOR ALL
      TO authenticated
      USING (is_platform_admin(auth.uid()))
      WITH CHECK (is_platform_admin(auth.uid()));
  END IF;
END $$;

-- ============================================================================
-- 5. Grant Permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON feature_integration_assignments TO authenticated;
