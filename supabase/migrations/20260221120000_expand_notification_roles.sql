-- Expand notification roles to support team_manager, athlete, staff, and platform_admin
-- This migration updates the user_notifications.role_context CHECK constraint to allow the new roles

-- Drop existing constraint
ALTER TABLE public.user_notifications 
  DROP CONSTRAINT IF EXISTS user_notifications_role_context_check;

-- Add updated constraint with all supported roles
ALTER TABLE public.user_notifications 
  ADD CONSTRAINT user_notifications_role_context_check 
  CHECK (role_context IN (
    'guardian', 
    'coach', 
    'org_admin', 
    'team_manager', 
    'athlete', 
    'staff', 
    'platform_admin'
  ));

-- Update comment to reflect new roles
COMMENT ON COLUMN public.user_notifications.role_context IS 
  'Role lens for this notification (guardian|coach|org_admin|team_manager|athlete|staff|platform_admin)';
