-- ============================================================================
-- Add Validation Constraints for Override Data Integrity (Issue 8)
-- ============================================================================
-- Server-first validation to prevent invalid data
-- Complements client-side validation for better UX

-- Drop existing constraints if they exist (for re-runs)
ALTER TABLE entitlement_overrides 
DROP CONSTRAINT IF EXISTS check_limit_value_positive,
DROP CONSTRAINT IF EXISTS check_reason_not_empty,
DROP CONSTRAINT IF EXISTS check_limit_required_for_set_limit;

-- Constraint: limit_value must be positive if override_action is 'set_limit'
ALTER TABLE entitlement_overrides
ADD CONSTRAINT check_limit_value_positive
CHECK (
  (override_action != 'set_limit') OR 
  (override_action = 'set_limit' AND limit_value IS NOT NULL AND limit_value > 0)
);

-- Constraint: reason must not be empty
ALTER TABLE entitlement_overrides
ADD CONSTRAINT check_reason_not_empty
CHECK (reason IS NOT NULL AND length(trim(reason)) > 0);

-- Constraint: limit_value must be provided when override_action is 'set_limit'
ALTER TABLE entitlement_overrides
ADD CONSTRAINT check_limit_required_for_set_limit
CHECK (
  (override_action != 'set_limit') OR 
  (override_action = 'set_limit' AND limit_value IS NOT NULL)
);

-- Constraint: expires_at must be in the future if provided (optional - can be null)
-- Note: We allow past expires_at for historical data, but application should validate
-- This constraint is intentionally not added to allow flexibility

-- Add comments
COMMENT ON CONSTRAINT check_limit_value_positive ON entitlement_overrides IS 'Ensures limit_value is positive when override_action is set_limit.';
COMMENT ON CONSTRAINT check_reason_not_empty ON entitlement_overrides IS 'Ensures reason is provided and not empty.';
COMMENT ON CONSTRAINT check_limit_required_for_set_limit ON entitlement_overrides IS 'Ensures limit_value is provided when override_action is set_limit.';
