-- Migration: Add Feature Lock Fields
-- =============================================================
-- Adds support for non-toggleable and non-removable features
-- to prevent accidental disabling or removal of critical functionality.

-- ============================================================================
-- 1. Add Lock Fields to feature_entitlements
-- ============================================================================

ALTER TABLE feature_entitlements
  ADD COLUMN IF NOT EXISTS is_toggleable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_removable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lock_reason TEXT;

-- ============================================================================
-- 2. Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN feature_entitlements.is_toggleable IS 'If false, feature status cannot be changed (always enabled)';
COMMENT ON COLUMN feature_entitlements.is_removable IS 'If false, feature cannot be deleted or removed from tiers';
COMMENT ON COLUMN feature_entitlements.lock_reason IS 'Explanation for why feature is locked (shown to admins)';

-- ============================================================================
-- 3. Mark Core Features as Non-Toggleable/Non-Removable
-- ============================================================================
-- Update critical features that should never be disabled or removed

UPDATE feature_entitlements
SET 
  is_toggleable = false,
  is_removable = false,
  lock_reason = 'Required for platform authentication and core functionality'
WHERE feature_key IN (
  'auth.login',
  'auth.signup',
  'auth.session',
  'users.profile',
  'organizations.basic'
);

-- ============================================================================
-- 4. Create Index for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feature_entitlements_toggleable 
  ON feature_entitlements(is_toggleable) 
  WHERE is_toggleable = false;

CREATE INDEX IF NOT EXISTS idx_feature_entitlements_removable 
  ON feature_entitlements(is_removable) 
  WHERE is_removable = false;
