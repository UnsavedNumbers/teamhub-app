-- DIAGNOSTIC: Check auth.users and public.users state
-- ====================================================

-- 1. Check auth.users (the guardian should be here after signup)
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email ILIKE '%iverson%' OR email ILIKE '%gandy%'
ORDER BY created_at DESC;

-- 2. Check public.users (should have been created by trigger)
SELECT 
  id,
  email,
  display_name,
  created_at
FROM public.users
WHERE email ILIKE '%iverson%' OR email ILIKE '%gandy%';

-- 3. Check the specific invite
SELECT * FROM parent_invites 
WHERE token = '68ee57a9-b432-4c13-a9b4-3951d044ed78';

-- 4. Check ALL auth.users created in last 24 hours
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 5. Check if handle_new_user trigger exists on auth.users
SELECT 
  tgname,
  tgenabled,
  pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass;

-- 6. Check athlete_guardians table
SELECT * FROM athlete_guardians LIMIT 5;

-- 7. Count records in key tables
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
  (SELECT COUNT(*) FROM public.users) AS public_users_count,
  (SELECT COUNT(*) FROM athlete_guardians) AS athlete_guardians_count,
  (SELECT COUNT(*) FROM parent_invites WHERE status = 'pending') AS pending_invites_count;
