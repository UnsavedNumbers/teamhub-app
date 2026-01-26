-- Check if auto-link trigger exists and is enabled
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled,
  tgtype AS trigger_type,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.users'::regclass
  AND tgname LIKE '%invite%'
ORDER BY tgname;

-- Check if the trigger function exists
SELECT 
  proname AS function_name,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'handle_new_user_invite_linking';

-- Check for pending invites that should have been linked
SELECT 
  pi.id,
  pi.email,
  pi.athlete_id,
  pi.org_id,
  pi.status,
  pi.created_at,
  u.id AS user_id,
  u.created_at AS user_created_at,
  ag.id AS guardian_link_id
FROM parent_invites pi
LEFT JOIN users u ON lower(u.email) = lower(pi.email)
LEFT JOIN athlete_guardians ag ON ag.user_id = u.id AND ag.athlete_id = pi.athlete_id
WHERE pi.created_at > NOW() - INTERVAL '7 days'
ORDER BY pi.created_at DESC
LIMIT 5;
