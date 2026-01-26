-- ============================================================
-- FIX: Backfill missing users and link pending invites
-- ============================================================

-- Step 1: Show which auth.users are missing from public.users
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name' as full_name,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Step 2: Insert missing users into public.users
INSERT INTO public.users (id, email, display_name, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ) as display_name,
  NULL as role,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Step 3: Now link any pending invites to the newly created users
-- This finds invites where the email matches a user and links them
INSERT INTO athlete_guardians (athlete_id, user_id, org_id, status, created_at, updated_at)
SELECT 
  pi.athlete_id,
  u.id as user_id,
  pi.org_id,
  'active' as status,
  NOW(),
  NOW()
FROM parent_invites pi
JOIN public.users u ON LOWER(u.email) = LOWER(pi.email)
WHERE pi.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM athlete_guardians ag 
    WHERE ag.athlete_id = pi.athlete_id 
    AND ag.user_id = u.id
  );

-- Step 4: Mark linked invites as accepted
-- Skip for now due to trigger issues - the link is what matters
-- UPDATE parent_invites pi
-- SET status = 'accepted', updated_at = NOW()
-- FROM public.users u
-- WHERE LOWER(pi.email) = LOWER(u.email)
--   AND pi.status = 'pending'
--   AND EXISTS (
--     SELECT 1 FROM athlete_guardians ag 
--     WHERE ag.athlete_id = pi.athlete_id 
--     AND ag.user_id = u.id
--   );

-- Step 5: Verify the fix worked
SELECT '--- VERIFICATION ---' as section;

SELECT 'Missing users (should be 0):' as check_name, 
  COUNT(*) as count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

SELECT 'Athlete guardians count:' as check_name, 
  COUNT(*) as count
FROM athlete_guardians;

SELECT 'Pending invites remaining:' as check_name, 
  COUNT(*) as count
FROM parent_invites
WHERE status = 'pending';

-- Show the newly created links
SELECT 
  ag.id,
  a.first_name || ' ' || a.last_name as athlete_name,
  u.email as guardian_email,
  ag.status,
  ag.created_at
FROM athlete_guardians ag
JOIN athletes a ON a.id = ag.athlete_id
JOIN users u ON u.id = ag.user_id
ORDER BY ag.created_at DESC
LIMIT 5;
