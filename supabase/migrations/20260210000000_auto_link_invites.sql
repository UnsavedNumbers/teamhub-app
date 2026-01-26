-- Migration: Auto-link pending invites for new users
-- ==================================================
-- This trigger ensures that when a new user signs up, any pending invites matching
-- their email are automatically accepted and processed, even if the frontend
-- tracking (localStorage/sessionStorage) fails.

CREATE OR REPLACE FUNCTION public.handle_new_user_invite_linking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Loop through any pending invites for this email (case-insensitive)
  -- Uses lower() to ensure case-insensitive matching
  FOR v_invite IN 
    SELECT * FROM public.parent_invites 
    WHERE lower(email) = lower(NEW.email) 
    AND status = 'pending'
    AND expires_at > NOW()
  LOOP
    -- 1. Create the guardian link (ACTIVE status)
    INSERT INTO public.athlete_guardians (athlete_id, user_id, org_id, status)
    VALUES (v_invite.athlete_id, NEW.id, v_invite.org_id, 'active')
    ON CONFLICT (athlete_id, user_id, org_id) 
    DO UPDATE SET status = 'active', updated_at = NOW();

    -- 2. Ensure they have the parent role in the org
    -- Helper function add_org_role is already idempotent
    PERFORM public.add_org_role(NEW.id, v_invite.org_id, 'parent');

    -- 3. Mark invite as accepted
    UPDATE public.parent_invites 
    SET 
      status = 'accepted', 
      accepted_by_user_id = NEW.id, 
      accepted_at = NOW(),
      updated_at = NOW()
    WHERE id = v_invite.id;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user_invite_linking() IS 'Automatically links new users to athletes if they have pending invites matching their email.';

-- Attach trigger to public.users table
-- This runs AFTER the user is inserted into public.users (which happens via the handle_new_user trigger on auth.users)
DROP TRIGGER IF EXISTS on_user_created_link_invites ON public.users;
CREATE TRIGGER on_user_created_link_invites
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_invite_linking();
