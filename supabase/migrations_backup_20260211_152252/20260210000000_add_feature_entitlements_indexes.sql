-- Add indexes to feature_entitlements table for query performance

-- Index for archived_at (most queries filter on this)
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_archived_at 
ON feature_entitlements(archived_at) 
WHERE archived_at IS NULL;

-- Index for category and display_name (used in ORDER BY)
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_category_display_name 
ON feature_entitlements(category, display_name);

-- Index for feature_type filter
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_feature_type 
ON feature_entitlements(feature_type);

-- Index for rollout_status filter
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_rollout_status 
ON feature_entitlements(rollout_status);

-- Index for is_system_feature filter
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_is_system_feature 
ON feature_entitlements(is_system_feature);

-- Index for platform_admin_only filter
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_platform_admin_only 
ON feature_entitlements(platform_admin_only);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_common_filters 
ON feature_entitlements(archived_at, category, feature_type, rollout_status)
WHERE archived_at IS NULL;

-- GIN index for text search on feature_key, display_name, description
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_text_search 
ON feature_entitlements USING gin((
  to_tsvector('english', 
    coalesce(feature_key, '') || ' ' || 
    coalesce(display_name, '') || ' ' || 
    coalesce(description, '')
  )
));

-- Index on tier_feature_assignments for join performance
CREATE INDEX IF NOT EXISTS idx_tier_feature_assignments_feature_id_included 
ON tier_feature_assignments(feature_entitlement_id, included)
WHERE included = true;

CREATE INDEX IF NOT EXISTS idx_tier_feature_assignments_feature_id_roles 
ON tier_feature_assignments(feature_entitlement_id, role_admin, role_coach, role_parent)
WHERE included = true;

-- Index on feature_integration_assignments for join performance
CREATE INDEX IF NOT EXISTS idx_feature_integration_assignments_feature_id 
ON feature_integration_assignments(feature_entitlement_id);
