-- ============================================================================
-- Prevent Deletion of Organizations/Users/Features with Active Overrides (Issue 3)
-- ============================================================================
-- Prevents orphaned overrides and maintains referential integrity
-- Forces admins to explicitly handle overrides before deletion

-- Function to check for active overrides before organization deletion
CREATE OR REPLACE FUNCTION prevent_org_delete_with_active_overrides()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Count active overrides for this organization
  SELECT COUNT(*) INTO active_count
  FROM entitlement_overrides
  WHERE target_type = 'organization'
    AND target_id = OLD.id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF active_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete organization "%": % active override(s) exist. Please revoke or expire overrides first.', 
      OLD.name, active_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to check for active overrides before user deletion
CREATE OR REPLACE FUNCTION prevent_user_delete_with_active_overrides()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Count active overrides for this user
  SELECT COUNT(*) INTO active_count
  FROM entitlement_overrides
  WHERE target_type = 'user'
    AND target_id = OLD.id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF active_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete user "%": % active override(s) exist. Please revoke or expire overrides first.', 
      COALESCE(OLD.display_name, OLD.email, 'Unknown'), active_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to check for active overrides before feature archival
CREATE OR REPLACE FUNCTION prevent_feature_archive_with_active_overrides()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Only check if feature is being archived (archived_at set)
  IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
    -- Count active overrides for this feature
    SELECT COUNT(*) INTO active_count
    FROM entitlement_overrides
    WHERE feature_entitlement_id = NEW.id
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW());
    
    IF active_count > 0 THEN
      RAISE EXCEPTION 'Cannot archive feature "%": % active override(s) exist. Please revoke or expire overrides first.', 
        NEW.display_name, active_count;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_prevent_org_delete_with_overrides ON organizations;
DROP TRIGGER IF EXISTS trigger_prevent_user_delete_with_overrides ON users;
DROP TRIGGER IF EXISTS trigger_prevent_feature_archive_with_overrides ON feature_entitlements;

-- Create triggers
CREATE TRIGGER trigger_prevent_org_delete_with_overrides
  BEFORE DELETE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_org_delete_with_active_overrides();

CREATE TRIGGER trigger_prevent_user_delete_with_overrides
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_user_delete_with_active_overrides();

CREATE TRIGGER trigger_prevent_feature_archive_with_overrides
  BEFORE UPDATE ON feature_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_feature_archive_with_active_overrides();

-- Add comments
COMMENT ON FUNCTION prevent_org_delete_with_active_overrides() IS 'Prevents deletion of organizations that have active entitlement overrides.';
COMMENT ON FUNCTION prevent_user_delete_with_active_overrides() IS 'Prevents deletion of users that have active entitlement overrides.';
COMMENT ON FUNCTION prevent_feature_archive_with_active_overrides() IS 'Prevents archival of features that have active entitlement overrides.';
