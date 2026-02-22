-- Add archived_at and deleted_at columns to user_notifications for soft delete and archiving
-- This migration adds support for archiving notifications and soft deletion

-- Add archived_at column (nullable timestamp)
ALTER TABLE public.user_notifications 
  ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Add deleted_at column (nullable timestamp for soft delete)
ALTER TABLE public.user_notifications 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Create index on archived_at for efficient filtering
CREATE INDEX IF NOT EXISTS idx_user_notifications_archived_at 
  ON public.user_notifications(archived_at) 
  WHERE archived_at IS NOT NULL;

-- Create index on deleted_at for efficient filtering
CREATE INDEX IF NOT EXISTS idx_user_notifications_deleted_at 
  ON public.user_notifications(deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- Create composite index for cursor-based pagination (user_id, created_at, id)
CREATE INDEX IF NOT EXISTS idx_user_notifications_cursor_pagination 
  ON public.user_notifications(user_id, created_at DESC, id DESC) 
  WHERE deleted_at IS NULL;

-- Update comment for archived_at
COMMENT ON COLUMN public.user_notifications.archived_at IS 
  'Timestamp when notification was archived. NULL means not archived.';

-- Update comment for deleted_at
COMMENT ON COLUMN public.user_notifications.deleted_at IS 
  'Timestamp when notification was soft deleted. NULL means not deleted.';
