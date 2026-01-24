-- Migration: Fix admin_feature_entitlements_list View
-- =============================================================
-- This migration ensures the admin_feature_entitlements_list view exists
-- and is properly configured. The view was defined in earlier migrations
-- but may not exist in the database, causing PGRST205 errors.
--
-- This migration is idempotent and can be run multiple times safely.

-- ============================================================================
-- 1. Drop and Recreate admin_feature_entitlements_list View
-- ============================================================================

DROP VIEW IF EXISTS admin_feature_entitlements_list CASCADE;

CREATE VIEW admin_feature_entitlements_list AS
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
  (SELECT COUNT(*) 
   FROM tier_feature_assignments tfa 
   WHERE tfa.feature_entitlement_id = fe.id 
     AND tfa.included = true) AS tier_assignments_count,
  (SELECT COUNT(*) 
   FROM entitlement_overrides eo 
   WHERE eo.feature_entitlement_id = fe.id 
     AND eo.revoked_at IS NULL 
     AND (eo.expires_at IS NULL OR eo.expires_at > NOW())) AS active_overrides_count
FROM feature_entitlements fe;

-- ============================================================================
-- 2. Grant Permissions
-- ============================================================================
-- Views inherit RLS from underlying tables, but we still need to grant SELECT
-- access to authenticated users. The RLS policy on feature_entitlements will
-- control actual access.

GRANT SELECT ON admin_feature_entitlements_list TO authenticated;

-- ============================================================================
-- 3. Ensure RLS Policy on feature_entitlements Allows Platform Admins
-- ============================================================================
-- The view inherits RLS from feature_entitlements, so we need to ensure
-- platform admins can read from the underlying table.

DO $$
BEGIN
  -- Check if policy exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'feature_entitlements' 
      AND policyname = 'platform_admins_can_manage_feature_entitlements'
  ) THEN
    CREATE POLICY "platform_admins_can_manage_feature_entitlements"
      ON feature_entitlements
      FOR ALL
      TO authenticated
      USING (is_platform_admin(auth.uid()))
      WITH CHECK (is_platform_admin(auth.uid()));
  END IF;
END $$;

-- ============================================================================
-- Notes
-- ============================================================================
-- Views in PostgreSQL inherit RLS from their underlying tables. When you query
-- admin_feature_entitlements_list, PostgreSQL applies the RLS policy from
-- feature_entitlements. Platform admins should be able to see all features
-- through the view because the policy allows them to SELECT from the table.
