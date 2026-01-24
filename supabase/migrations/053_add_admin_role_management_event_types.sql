-- ============================================================================
-- Add Role Management Event Types to ADMIN Category
-- ============================================================================
-- Adds ADD_ORG_ROLE, REMOVE_ORG_ROLE, and CHANGE_ORG_ROLE event types
-- to the admin_event_type enum and valid_event_types table.

-- Add new event types to admin_event_type enum
DO $$
BEGIN
  -- Add ADD_ORG_ROLE if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'ADD_ORG_ROLE' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_event_type')
  ) THEN
    ALTER TYPE admin_event_type ADD VALUE 'ADD_ORG_ROLE';
  END IF;

  -- Add REMOVE_ORG_ROLE if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'REMOVE_ORG_ROLE' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_event_type')
  ) THEN
    ALTER TYPE admin_event_type ADD VALUE 'REMOVE_ORG_ROLE';
  END IF;

  -- Add CHANGE_ORG_ROLE if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'CHANGE_ORG_ROLE' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_event_type')
  ) THEN
    ALTER TYPE admin_event_type ADD VALUE 'CHANGE_ORG_ROLE';
  END IF;
END $$;

-- Add to valid_event_types table
INSERT INTO valid_event_types (category, event_type, enum_name, description) VALUES
('ADMIN', 'ADD_ORG_ROLE', 'admin_event_type', 'Organization role added to user by platform admin'),
('ADMIN', 'REMOVE_ORG_ROLE', 'admin_event_type', 'Organization role removed from user by platform admin'),
('ADMIN', 'CHANGE_ORG_ROLE', 'admin_event_type', 'User organization role changed by platform admin')
ON CONFLICT (category, event_type) DO NOTHING;
