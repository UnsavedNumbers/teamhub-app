-- ============================================================================
-- Fix admin_entitlement_overrides_list View
-- ============================================================================
-- Recreates the view to include the new version column and ensure proper grants
-- This fixes the PGRST205 error where the view is not found in schema cache
--
-- Note: Views inherit RLS from underlying tables, so we don't create policies
-- on the view itself. RLS is enforced through the entitlement_overrides table.

-- Drop any invalid RLS policy on the view (views don't support RLS policies)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'admin_entitlement_overrides_list') THEN
    DROP POLICY IF EXISTS "platform_admins_can_read_entitlement_overrides_list" ON admin_entitlement_overrides_list;
  END IF;
END $$;

-- Drop and recreate the view to include the version column
DROP VIEW IF EXISTS admin_entitlement_overrides_list CASCADE;

-- Recreate the view with all columns including the new version column
CREATE VIEW admin_entitlement_overrides_list AS
SELECT
  eo.id,
  eo.target_type,
  eo.target_id,
  CASE 
    WHEN eo.target_type = 'organization' THEN o.name
    WHEN eo.target_type = 'user' THEN COALESCE(u.display_name, u.email)
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
  eo.version, -- Include version column for optimistic locking
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

-- Grant SELECT permission to authenticated users
GRANT SELECT ON admin_entitlement_overrides_list TO authenticated;

-- Add comment
COMMENT ON VIEW admin_entitlement_overrides_list IS 'Admin view of entitlement overrides with enriched details including target names, feature names, status computation, and version for optimistic locking. Views inherit RLS from the underlying entitlement_overrides table.';

-- ============================================================================
-- Notes
-- ============================================================================
-- If you still see PGRST205 errors after running this migration:
-- 1. Restart PostgREST to refresh the schema cache
-- 2. Or wait a few minutes for the cache to refresh automatically
-- 3. Verify the view exists: SELECT * FROM information_schema.views WHERE table_name = 'admin_entitlement_overrides_list';
