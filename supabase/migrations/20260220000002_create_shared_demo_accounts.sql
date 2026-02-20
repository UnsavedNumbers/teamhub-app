-- ============================================
-- CREATE SHARED DEMO ACCOUNTS
-- ============================================
-- This migration documents the process for creating shared demo accounts.
-- 
-- IMPORTANT: Creating auth users requires Supabase Auth Admin API access.
-- This migration creates the demo_account_roles entries, but the actual
-- auth users must be created separately using:
-- 1. Run the automated script: npm run demo:create-accounts (RECOMMENDED)
-- 2. Supabase Dashboard > Authentication > Add User (manual)
-- 3. Or via Supabase Admin API /auth/v1/admin/users endpoint
--
-- After creating each auth user, insert their user_id into demo_account_roles.
-- ============================================

-- ============================================
-- AUTOMATED SETUP (RECOMMENDED)
-- ============================================
-- Run: npm run demo:create-accounts
-- 
-- This script will:
-- 1. Create 6 auth users with emails:
--    - demo_org_admin@youthsports.team
--    - demo_coach@youthsports.team
--    - demo_parent@youthsports.team
--    - demo_athlete@youthsports.team
--    - demo_staff@youthsports.team
--    - demo_fan@youthsports.team
-- 2. Generate strong random passwords for each
-- 3. Auto-confirm their emails
-- 4. Insert their user_ids into demo_account_roles
--
-- Required environment variables:
--   SUPABASE_URL or VITE_SUPABASE_URL
--   SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY

-- ============================================
-- MANUAL SETUP (Alternative)
-- ============================================
-- STEP 1: Create auth users via Dashboard or Admin API
-- For each role, create a user with email: demo_{role}@youthsports.team
-- Use strong random passwords (store securely, never expose to clients).
-- Set email_confirmed = true so they can sign in immediately.
--
-- STEP 2: Insert demo_account_roles entries
-- Once all 6 auth users are created, insert their user_ids here.
-- Replace the UUIDs below with the actual user_ids from auth.users.

-- Example (replace with actual user_ids):
-- INSERT INTO public.demo_account_roles (user_id, role) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'org_admin'),
--   ('00000000-0000-0000-0000-000000000002', 'coach'),
--   ('00000000-0000-0000-0000-000000000003', 'parent'),
--   ('00000000-0000-0000-0000-000000000004', 'athlete'),
--   ('00000000-0000-0000-0000-000000000005', 'staff'),
--   ('00000000-0000-0000-0000-000000000006', 'fan')
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- HELPER FUNCTION: Get demo user ID by role
-- ============================================
CREATE OR REPLACE FUNCTION public.get_demo_user_id_by_role(p_role text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT user_id
  FROM public.demo_account_roles
  WHERE role = p_role
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_demo_user_id_by_role(text) IS 'Returns the user_id of the shared demo account for a given role. Used by RLS and application code.';

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this after inserting demo_account_roles to verify all roles are configured:
-- SELECT role, user_id FROM public.demo_account_roles ORDER BY role;
