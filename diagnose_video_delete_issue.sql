-- Targeted diagnostic script for video deletion RLS issue
-- Run this in Supabase SQL Editor

-- Variables (replace with actual values from debug output)
-- Video ID: 48911576-1c6a-479d-b70c-cc7bd2526aa0
-- User ID: eff2cd55-c4bf-47bb-9b9a-5fc29e5beb54

-- 1. Check current RLS policy on videos table
SELECT 
  'Current RLS Policy' as check_type,
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'videos' AND policyname = 'videos_update_policy';

-- 2. Check the specific video details
SELECT 
  'Video Details' as check_type,
  id,
  org_id,
  uploaded_by,
  status,
  deleted_at,
  title
FROM public.videos
WHERE id = '48911576-1c6a-479d-b70c-cc7bd2526aa0'::uuid;

-- 3. Test if user can edit this video (mimics the RLS check)
SELECT 
  'Can Edit Video Test' as check_type,
  public.can_edit_video('48911576-1c6a-479d-b70c-cc7bd2526aa0'::uuid, 'eff2cd55-c4bf-47bb-9b9a-5fc29e5beb54'::uuid) as can_edit;

-- 4. Check if user is the uploader
SELECT 
  'Is Uploader' as check_type,
  CASE 
    WHEN v.uploaded_by = 'eff2cd55-c4bf-47bb-9b9a-5fc29e5beb54'::uuid THEN true
    ELSE false
  END as is_uploader
FROM public.videos v
WHERE v.id = '48911576-1c6a-479d-b70c-cc7bd2526aa0'::uuid;

-- 5. Check user's organization membership and role
SELECT 
  'Org Membership' as check_type,
  om.user_id,
  om.org_id,
  om.role,
  om.is_active
FROM public.organization_members om
WHERE om.user_id = 'eff2cd55-c4bf-47bb-9b9a-5fc29e5beb54'::uuid
  AND om.org_id = (
    SELECT v.org_id FROM public.videos v 
    WHERE v.id = '48911576-1c6a-479d-b70c-cc7bd2526aa0'::uuid
  );

-- 6. Check which migrations have been applied (specifically the video-related ones)
SELECT 
  'Applied Migrations' as check_type,
  name,
  version
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%video%'
ORDER BY version DESC;

-- 7. Check can_edit_video function definition
SELECT 
  'Function Definition' as check_type,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'can_edit_video';
