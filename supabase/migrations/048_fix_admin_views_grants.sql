-- ============================================================================
-- Migration: Fix Missing GRANT Permissions on Admin Views
-- ============================================================================
-- This migration fixes the issue where admin views were recreated without
-- GRANT statements, causing queries to hang indefinitely.
--
-- Background:
-- - Migration 20260129000001_fix_typescript_build_errors.sql recreated admin
--   views using CREATE OR REPLACE VIEW but didn't re-apply GRANT statements
-- - This caused all queries to these views to hang (permission denied)
-- - admin_organizations was later fixed in migration 045, but others weren't
--
-- This migration grants SELECT permission on all admin views to authenticated users.
-- The RLS policies in the view definitions still protect access (only platform admins).
-- ============================================================================

-- Grant SELECT on all admin views
GRANT SELECT ON admin_structure TO authenticated;
GRANT SELECT ON admin_payments TO authenticated;
GRANT SELECT ON admin_feature_flags TO authenticated;
GRANT SELECT ON admin_users TO authenticated;
GRANT SELECT ON admin_fees_status TO authenticated;
GRANT SELECT ON admin_platform_health TO authenticated;

-- Grant SELECT on event_logs views (from migration 039)
-- Note: admin_audit_log was dropped in migration 039 and replaced with admin_event_logs
GRANT SELECT ON admin_event_logs TO authenticated;
GRANT SELECT ON event_logs_recent TO authenticated;

-- Comments
COMMENT ON VIEW admin_structure IS 'Platform admin view: organization structure (teams and seasons). Protected by RLS - only accessible to platform admins via auth.uid() check in view definition.';
COMMENT ON VIEW admin_payments IS 'Platform admin view: payment history. Protected by RLS - only accessible to platform admins via auth.uid() check in view definition.';
COMMENT ON VIEW admin_feature_flags IS 'Platform admin view: feature flag status. Protected by RLS - only accessible to platform admins via auth.uid() check in view definition.';
COMMENT ON VIEW admin_users IS 'Platform admin view: user details and organization memberships. Protected by RLS - only accessible to platform admins via auth.uid() check in view definition.';
COMMENT ON VIEW admin_fees_status IS 'Platform admin view: fee status and payment rates. Protected by RLS - only accessible to platform admins via auth.uid() check in view definition.';
COMMENT ON VIEW admin_platform_health IS 'Platform admin view: platform-wide health metrics. Protected by RLS - only accessible to platform admins via auth.uid() check in view definition.';
COMMENT ON VIEW admin_event_logs IS 'Platform admin view: comprehensive event logging system. Protected by RLS - only accessible to platform admins via auth.uid() check in view definition.';
