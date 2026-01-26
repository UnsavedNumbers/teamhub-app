-- Migration: Ensure auto-link trigger is properly installed
-- ==========================================================
-- This verifies and recreates the trigger that automatically links
-- new users to athletes when they have pending invites

-- First, recreate the function with proper error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user_invite_linking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_linked_count INTEGER := 0;
BEGIN
  RAISE LOG 'handle_new_user_invite_linking: START - Processing user % (email: %)', 
    NEW.id, NEW.email;

  -- Loop through pending invites for this email
  FOR v_invite IN 
    SELECT * FROM public.parent_invites 
    WHERE lower(email) = lower(NEW.email) 
    AND status = 'pending'
    AND expires_at > NOW()
  LOOP
    RAISE LOG 'handle_new_user_invite_linking: Found invite % for athlete % in org %', 
      v_invite.id, v_invite.athlete_id, v_invite.org_id;

    BEGIN
      -- Create the guardian link
      INSERT INTO public.athlete_guardians (athlete_id, user_id, org_id, status)
      VALUES (v_invite.athlete_id, NEW.id, v_invite.org_id, 'active')
      ON CONFLICT (athlete_id, user_id, org_id) 
      DO UPDATE SET status = 'active', updated_at = NOW();

      RAISE LOG 'handle_new_user_invite_linking: Created guardian link for athlete %', 
        v_invite.athlete_id;

      -- Add org role
      PERFORM public.add_org_role(NEW.id, v_invite.org_id, 'parent');
      
      -- Mark invite as accepted
      UPDATE public.parent_invites 
      SET 
        status = 'accepted', 
        accepted_by_user_id = NEW.id, 
        accepted_at = NOW(),
        updated_at = NOW()
      WHERE id = v_invite.id;

      v_linked_count := v_linked_count + 1;
      RAISE LOG 'handle_new_user_invite_linking: Successfully linked athlete %', v_invite.athlete_id;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user_invite_linking: ERROR linking user % to athlete %: % (SQLSTATE: %)',
        NEW.id, v_invite.athlete_id, SQLERRM, SQLSTATE;
      -- Continue processing other invites
    END;
  END LOOP;

  RAISE LOG 'handle_new_user_invite_linking: COMPLETE - Linked % athletes for user %', 
    v_linked_count, NEW.id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user_invite_linking() IS 
  'Automatically links new users to athletes if they have pending invites. Runs after INSERT on public.users.';

-- Drop and recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_user_created_link_invites ON public.users;

CREATE TRIGGER on_user_created_link_invites
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_invite_linking();

COMMENT ON TRIGGER on_user_created_link_invites ON public.users IS 
  'Automatically processes pending guardian invites when a new user signs up';

-- Verify trigger was created
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_user_created_link_invites' 
      AND tgrelid = 'public.users'::regclass
  ) INTO v_trigger_exists;

  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION 'Trigger on_user_created_link_invites was not created successfully';
  END IF;

  RAISE NOTICE 'Auto-link trigger successfully installed and verified';
END $$;
