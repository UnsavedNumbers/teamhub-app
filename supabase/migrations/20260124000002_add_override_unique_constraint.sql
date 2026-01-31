-- ============================================================================
-- Add Unique Constraint for Duplicate Prevention (Issue 4)
-- ============================================================================
-- Prevents creating duplicate overrides for same target+feature+action
-- Only applies to active (non-revoked) overrides

-- Drop existing index if it exists (in case of re-run)
DROP INDEX IF EXISTS idx_override_unique_active;

-- Create partial unique index for active overrides only
-- This allows multiple revoked overrides for the same target+feature+action
CREATE UNIQUE INDEX idx_override_unique_active 
ON entitlement_overrides(target_type, target_id, feature_entitlement_id, override_action) 
WHERE revoked_at IS NULL;

-- Add comment
COMMENT ON INDEX idx_override_unique_active IS 'Prevents duplicate active overrides for the same target, feature, and action combination. Revoked overrides are excluded from this constraint.';
