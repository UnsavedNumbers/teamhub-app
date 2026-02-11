-- Diagnostic script to check video deletion RLS issue
-- Run this in Supabase SQL Editor to diagnose the problem

-- 1. Check current RLS policies on videos table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'videos';

-- 2. Check if can_edit_video function exists and its definition
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'can_edit_video';

-- 3. Test the can_edit_video function with the specific video ID
-- Replace 'bb2f32b9-97c7-4317-83b1-1379b636fe27' with the actual video ID from the error
-- Replace 'YOUR_USER_ID' with the actual user ID (get from auth.uid())

-- Uncomment and run these with actual values:
-- SELECT public.can_edit_video('bb2f32b9-97c7-4317-83b1-1379b636fe27'::uuid, 'YOUR_USER_ID'::uuid);

-- 4. Check the video record details
SELECT 
  id,
  org_id,
  uploaded_by,
  status,
  deleted_at,
  title
FROM public.videos
WHERE id = 'bb2f32b9-97c7-4317-83b1-1379b636fe27'::uuid;

-- 5. Check if user is an org member with appropriate role
-- Replace 'YOUR_USER_ID' with actual user ID and 'VIDEO_ORG_ID' with the video's org_id
-- Uncomment and run:
-- SELECT 
--   om.user_id,
--   om.org_id,
--   om.role,
--   om.is_active
-- FROM public.organization_members om
-- WHERE om.user_id = 'YOUR_USER_ID'::uuid
--   AND om.org_id = 'VIDEO_ORG_ID'::uuid;

-- 6. Check which migrations have been applied
SELECT name, version
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;
