-- ============================================================================
-- Add Version Field for Optimistic Locking (Issues 1 & 5)
-- ============================================================================
-- Prevents race conditions in concurrent revoke operations
-- Implements optimistic locking pattern used elsewhere in codebase

-- Add version column
ALTER TABLE entitlement_overrides 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- Update existing rows to have version 1
UPDATE entitlement_overrides 
SET version = 1 
WHERE version IS NULL;

-- Create trigger function to auto-increment version on update
CREATE OR REPLACE FUNCTION increment_override_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if this is not a revoke operation (revoke sets revoked_at)
  -- For revoke operations, we check version in the WHERE clause
  IF NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    -- Revoke operation - version check happens in application
    NEW.version = OLD.version + 1;
  ELSIF NEW.revoked_at IS NULL OR NEW.revoked_at = OLD.revoked_at THEN
    -- Regular update - increment version
    NEW.version = OLD.version + 1;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_increment_override_version ON entitlement_overrides;

-- Create trigger
CREATE TRIGGER trigger_increment_override_version
  BEFORE UPDATE ON entitlement_overrides
  FOR EACH ROW
  EXECUTE FUNCTION increment_override_version();

-- Add comment
COMMENT ON COLUMN entitlement_overrides.version IS 'Version number for optimistic locking. Increments on each update to detect concurrent modifications.';
