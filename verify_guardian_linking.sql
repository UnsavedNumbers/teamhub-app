-- Verify the guardian auto-linking is working
-- Run this to check if new users have pending invites that should have been auto-linked

SELECT 
  u.id AS user_id,
  u.email,
  u.created_at AS user_created,
  pi.id AS invite_id,
  pi.athlete_id,
  pi.status AS invite_status,
  ag.id AS guardian_link_id,
  ag.status AS link_status,
  CASE 
    WHEN pi.id IS NULL THEN 'No invite found'
    WHEN pi.status = 'accepted' AND ag.id IS NOT NULL THEN '✅ Working - Auto-linked'
    WHEN pi.status = 'pending' AND u.created_at > pi.created_at THEN '❌ BROKEN - Should have auto-linked'
    ELSE 'Unknown state'
  END AS diagnosis
FROM users u
LEFT JOIN parent_invites pi ON lower(pi.email) = lower(u.email)
LEFT JOIN athlete_guardians ag ON ag.user_id = u.id AND ag.athlete_id = pi.athlete_id
WHERE u.created_at > NOW() - INTERVAL '7 days'
  AND (pi.id IS NOT NULL OR ag.id IS NOT NULL)
ORDER BY u.created_at DESC
LIMIT 10;
