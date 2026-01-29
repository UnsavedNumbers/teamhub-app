-- Migration: Fix statement timeout (57014) for admin feature/license views
--
-- Cause: admin_feature_entitlements_list and admin_license_metrics use many
-- correlated subqueries; with ~200 rows the default authenticated role
-- statement_timeout (8s) can be exceeded.
--
-- 1. Indexes to speed up the admin_feature_entitlements_list view
-- 2. Increase statement_timeout for authenticated so admin dashboard queries succeed

-- ============================================================================
-- 1. GIN index on feature_discovery_cache.discovered_features
--    Speeds up: discovered_features::jsonb @> jsonb_build_array(...) in the view
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_feature_discovery_cache_discovered_features_gin
  ON feature_discovery_cache USING GIN (discovered_features jsonb_path_ops);

-- ============================================================================
-- 2. Composite index on tier_feature_assignments for view subqueries
--    Subqueries filter by feature_entitlement_id AND included = true
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tier_feature_assignments_feature_included
  ON tier_feature_assignments (feature_entitlement_id, included)
  WHERE included = true;

-- ============================================================================
-- 3. Increase statement_timeout for authenticated role (default 8s in Supabase)
--    Admin views (admin_feature_entitlements_list, admin_license_metrics)
--    can take longer; 30s is a reasonable cap for dashboard loads.
-- ============================================================================
ALTER ROLE authenticated SET statement_timeout = '30s';

-- Optional: if anon ever hits these views (e.g. public dashboard), uncomment:
-- ALTER ROLE anon SET statement_timeout = '30s';
