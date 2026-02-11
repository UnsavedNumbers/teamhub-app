-- Diagnose video_notes INSERT RLS issue
-- Run this in Supabase SQL Editor while logged in as the user experiencing the error

-- 1. Check current user
SELECT auth.uid() AS current_user_id;

-- 2. Check if user is platform admin
SELECT is_platform_admin(auth.uid()) AS is_platform_admin;

-- 3. Check ALL organization memberships for current user
-- THIS IS CRITICAL: User MUST have 'coach' or 'org_admin' role to create notes
SELECT 
  om.org_id,
  o.name AS org_name,
  om.role,
  om.created_at,
  CASE 
    WHEN om.role IN ('org_admin', 'coach') THEN '✅ CAN CREATE NOTES'
    ELSE '❌ CANNOT CREATE NOTES (role is ' || om.role::text || ')'
  END AS note_creation_status
FROM public.organization_members om
JOIN public.organizations o ON o.id = om.org_id
WHERE om.user_id = auth.uid()
ORDER BY om.created_at DESC;

-- 4. For a specific video (replace YOUR_VIDEO_ID_HERE with actual video ID)
-- Check if can_view_video returns true
SELECT 
  public.can_view_video('YOUR_VIDEO_ID_HERE'::uuid, auth.uid()) AS can_view_video;

-- 5. Debug can_view_video for specific video
SELECT 
  v.id AS video_id,
  v.title,
  v.org_id,
  v.visibility,
  v.uploaded_by,
  v.uploaded_by = auth.uid() AS is_uploader,
  is_platform_admin(auth.uid()) AS is_platform_admin,
  user_has_org_role(auth.uid(), v.org_id, 'org_admin') AS is_org_admin,
  user_has_org_role(auth.uid(), v.org_id, 'coach') AS is_coach,
  EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.org_id = v.org_id AND om.user_id = auth.uid()
  ) AS is_org_member
FROM public.videos v
WHERE v.id = 'YOUR_VIDEO_ID_HERE'::uuid;

-- 6. Quick fix: If you need to add user as coach to an org
-- UNCOMMENT and run to add yourself as coach:
-- INSERT INTO organization_members (org_id, user_id, role)
-- VALUES ('YOUR_ORG_ID_HERE'::uuid, auth.uid(), 'coach')
-- ON CONFLICT (org_id, user_id) DO UPDATE SET role = 'coach';
