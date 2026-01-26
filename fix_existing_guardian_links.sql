-- One-time fix: Link existing users who have pending invites
-- Run this to fix guardians who signed up before the auto-link trigger was working

DO $$
DECLARE
  v_invite RECORD;
  v_user RECORD;
  v_linked_count INTEGER := 0;
BEGIN
  -- Find all pending invites where the user exists
  FOR v_invite IN 
    SELECT pi.*, u.id AS user_id
    FROM parent_invites pi
    JOIN users u ON lower(u.email) = lower(pi.email)
    WHERE pi.status = 'pending'
      AND pi.expires_at > NOW()
  LOOP
    RAISE NOTICE 'Processing invite % for user % (email: %)', v_invite.id, v_invite.user_id, v_invite.email;
    
    BEGIN
      -- Create the guardian link
      INSERT INTO athlete_guardians (athlete_id, user_id, org_id, status)
      VALUES (v_invite.athlete_id, v_invite.user_id, v_invite.org_id, 'active')
      ON CONFLICT (athlete_id, user_id, org_id) 
      DO UPDATE SET status = 'active', updated_at = NOW();
      
      -- Add org role
      PERFORM add_org_role(v_invite.user_id, v_invite.org_id, 'parent');
      
      -- Mark invite as accepted
      UPDATE parent_invites 
      SET 
        status = 'accepted', 
        accepted_by_user_id = v_invite.user_id, 
        accepted_at = NOW(),
        updated_at = NOW()
      WHERE id = v_invite.id;
      
      v_linked_count := v_linked_count + 1;
      RAISE NOTICE 'Successfully linked user % to athlete %', v_invite.user_id, v_invite.athlete_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'ERROR linking user % to athlete %: %', v_invite.user_id, v_invite.athlete_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Fixed % existing guardian links', v_linked_count;
END $$;

-- Verify the results
SELECT 
  u.email,
  a.first_name,
  a.last_name,
  ag.status,
  ag.created_at
FROM athlete_guardians ag
JOIN users u ON u.id = ag.user_id
JOIN athletes a ON a.id = ag.athlete_id
WHERE ag.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ag.created_at DESC;
