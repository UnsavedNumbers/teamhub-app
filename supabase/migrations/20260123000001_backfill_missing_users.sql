-- Migration: Backfill missing users from auth.users
-- ===================================================
-- This migration ensures all users in auth.users have corresponding
-- records in public.users table. This handles cases where users were
-- created before the handle_new_user trigger was fixed.

-- Disable event logging for this operation to avoid trigger issues
SET session_replication_role = replica;

-- Insert missing users from auth.users into public.users
INSERT INTO public.users (id, email, phone, display_name, requires_org_setup, role)
SELECT 
  au.id,
  au.email,
  au.phone,
  COALESCE(au.raw_user_meta_data->>'display_name', au.raw_user_meta_data->>'full_name', NULL),
  COALESCE((au.raw_user_meta_data->>'requires_org_setup')::boolean, false),
  NULL -- role is nullable in new auth model
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL  -- Only insert if not already in public.users
ON CONFLICT (id) DO NOTHING;

-- Re-enable triggers
SET session_replication_role = DEFAULT;
