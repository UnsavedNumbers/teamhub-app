-- ============================================================
-- COMPLETE FIX: All-in-one diagnostic and repair
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- STEP 1: Show current state
SELECT '=== STEP 1: CURRENT STATE ===' as step;

SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.users) as public_users,
  (SELECT COUNT(*) FROM athlete_guardians) as athlete_guardians,
  (SELECT COUNT(*) FROM parent_invites WHERE status = 'pending') as pending_invites;

-- STEP 2: Show missing users (in auth but not in public)
SELECT '=== STEP 2: MISSING USERS ===' as step;

SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- STEP 3: Show pending invites with details
SELECT '=== STEP 3: PENDING INVITES ===' as step;

SELECT pi.id, pi.email, pi.athlete_id, pi.org_id, pi.status
FROM parent_invites pi
WHERE pi.status = 'pending';

-- STEP 4: Check if triggers exist
SELECT '=== STEP 4: TRIGGERS ===' as step;

SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger 
WHERE tgname IN ('on_auth_user_created', 'on_user_created_link_invites')
ORDER BY tgname;

-- ============================================================
-- STEP 5: FORCE INSERT missing users into public.users
-- ============================================================
SELECT '=== STEP 5: INSERTING MISSING USERS ===' as step;

INSERT INTO public.users (id, email, display_name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ),
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 6: FORCE CREATE athlete_guardians links
-- ============================================================
SELECT '=== STEP 6: CREATING GUARDIAN LINKS ===' as step;

INSERT INTO athlete_guardians (athlete_id, user_id, org_id, status, created_at, updated_at)
SELECT 
  pi.athlete_id,
  u.id,
  pi.org_id,
  'active',
  NOW(),
  NOW()
FROM parent_invites pi
JOIN public.users u ON LOWER(u.email) = LOWER(pi.email)
WHERE pi.status = 'pending'
ON CONFLICT (athlete_id, user_id) DO NOTHING;

-- ============================================================
-- STEP 7: VERIFY FIX
-- ============================================================
SELECT '=== STEP 7: VERIFICATION ===' as step;

SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.users) as public_users,
  (SELECT COUNT(*) FROM athlete_guardians) as athlete_guardians,
  (SELECT COUNT(*) FROM parent_invites WHERE status = 'pending') as pending_invites;

-- Show created links
SELECT '=== CREATED LINKS ===' as step;

SELECT 
  ag.id,
  u.email as guardian_email,
  a.first_name || ' ' || a.last_name as athlete_name,
  ag.status,
  ag.created_at
FROM athlete_guardians ag
JOIN users u ON u.id = ag.user_id
JOIN athletes a ON a.id = ag.athlete_id
ORDER BY ag.created_at DESC;

-- Show if user now exists
SELECT '=== GUARDIAN USER CHECK ===' as step;

SELECT u.id, u.email, u.display_name, u.role
FROM users u
WHERE u.email IN (SELECT email FROM parent_invites WHERE status = 'pending')
   OR u.email IN (SELECT LOWER(email) FROM parent_invites WHERE status = 'pending');
