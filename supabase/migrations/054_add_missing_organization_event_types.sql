-- ============================================================================
-- Add Missing Organization Event Types
-- ============================================================================
-- Adds event types used in 048_audit_logging.sql that are missing from
-- the organization_event_type enum and valid_event_types table.

-- Add new event types to organization_event_type enum
DO $$
BEGIN
  -- Add ROLE_ADDED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'ROLE_ADDED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_event_type')
  ) THEN
    ALTER TYPE organization_event_type ADD VALUE 'ROLE_ADDED';
  END IF;

  -- Add ROLE_REMOVED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'ROLE_REMOVED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_event_type')
  ) THEN
    ALTER TYPE organization_event_type ADD VALUE 'ROLE_REMOVED';
  END IF;

  -- Add ORG_JOINED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'ORG_JOINED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_event_type')
  ) THEN
    ALTER TYPE organization_event_type ADD VALUE 'ORG_JOINED';
  END IF;

  -- Add ORG_LEFT if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'ORG_LEFT' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_event_type')
  ) THEN
    ALTER TYPE organization_event_type ADD VALUE 'ORG_LEFT';
  END IF;

  -- Add PARENT_INVITED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'PARENT_INVITED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_event_type')
  ) THEN
    ALTER TYPE organization_event_type ADD VALUE 'PARENT_INVITED';
  END IF;

  -- Add PARENT_ATTACHED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'PARENT_ATTACHED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_event_type')
  ) THEN
    ALTER TYPE organization_event_type ADD VALUE 'PARENT_ATTACHED';
  END IF;

  -- Add JOIN_LINK_CREATED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'JOIN_LINK_CREATED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_event_type')
  ) THEN
    ALTER TYPE organization_event_type ADD VALUE 'JOIN_LINK_CREATED';
  END IF;

  -- Add JOIN_REQUEST_SUBMITTED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'JOIN_REQUEST_SUBMITTED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_event_type')
  ) THEN
    ALTER TYPE organization_event_type ADD VALUE 'JOIN_REQUEST_SUBMITTED';
  END IF;

  -- Add JOIN_REQUEST_APPROVED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'JOIN_REQUEST_APPROVED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_event_type')
  ) THEN
    ALTER TYPE organization_event_type ADD VALUE 'JOIN_REQUEST_APPROVED';
  END IF;

  -- Add JOIN_REQUEST_DENIED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'JOIN_REQUEST_DENIED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_event_type')
  ) THEN
    ALTER TYPE organization_event_type ADD VALUE 'JOIN_REQUEST_DENIED';
  END IF;

  -- Add CHILD_CLAIM_TOKEN_CREATED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'CHILD_CLAIM_TOKEN_CREATED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_event_type')
  ) THEN
    ALTER TYPE organization_event_type ADD VALUE 'CHILD_CLAIM_TOKEN_CREATED';
  END IF;

  -- Add CHILD_CLAIMED if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'CHILD_CLAIMED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_event_type')
  ) THEN
    ALTER TYPE organization_event_type ADD VALUE 'CHILD_CLAIMED';
  END IF;
END $$;

-- Add to valid_event_types table
INSERT INTO valid_event_types (category, event_type, enum_name, description) VALUES
('ORGANIZATION', 'ROLE_ADDED', 'organization_event_type', 'Role added to user in organization'),
('ORGANIZATION', 'ROLE_REMOVED', 'organization_event_type', 'Role removed from user in organization'),
('ORGANIZATION', 'ORG_JOINED', 'organization_event_type', 'User joined organization (first role)'),
('ORGANIZATION', 'ORG_LEFT', 'organization_event_type', 'User left organization (last role removed)'),
('ORGANIZATION', 'PARENT_INVITED', 'organization_event_type', 'Parent invited to organization'),
('ORGANIZATION', 'PARENT_ATTACHED', 'organization_event_type', 'Parent attached to athlete via invite acceptance'),
('ORGANIZATION', 'JOIN_LINK_CREATED', 'organization_event_type', 'Join link created for organization'),
('ORGANIZATION', 'JOIN_REQUEST_SUBMITTED', 'organization_event_type', 'Join request submitted by parent'),
('ORGANIZATION', 'JOIN_REQUEST_APPROVED', 'organization_event_type', 'Join request approved by org admin'),
('ORGANIZATION', 'JOIN_REQUEST_DENIED', 'organization_event_type', 'Join request denied by org admin'),
('ORGANIZATION', 'CHILD_CLAIM_TOKEN_CREATED', 'organization_event_type', 'Child claim token created'),
('ORGANIZATION', 'CHILD_CLAIMED', 'organization_event_type', 'Child claimed by parent via token')
ON CONFLICT (category, event_type) DO NOTHING;
