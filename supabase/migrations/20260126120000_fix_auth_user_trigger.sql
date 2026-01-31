-- Fix: Ensure handle_new_user trigger is properly attached to auth.users
-- ======================================================================
-- The trigger that creates public.users from auth.users is missing or broken

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
  v_requires_org_setup BOOLEAN := false;
BEGIN
  RAISE LOG 'handle_new_user: START - Processing auth user % (email: %)', NEW.id, NEW.email;

  -- Extract display_name safely
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NULL
  );

  -- Extract requires_org_setup from metadata
  IF NEW.raw_user_meta_data ? 'requires_org_setup' THEN
    IF jsonb_typeof(NEW.raw_user_meta_data->'requires_org_setup') = 'boolean' THEN
      v_requires_org_setup := (NEW.raw_user_meta_data->>'requires_org_setup')::boolean;
    ELSIF NEW.raw_user_meta_data->>'requires_org_setup' = 'true' THEN
      v_requires_org_setup := true;
    END IF;
  END IF;

  -- Insert user record
  INSERT INTO public.users (id, email, phone, display_name, requires_org_setup, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    v_display_name,
    v_requires_org_setup,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    requires_org_setup = COALESCE(EXCLUDED.requires_org_setup, users.requires_org_setup),
    updated_at = NOW();

  RAISE LOG 'handle_new_user: SUCCESS - Created user % in public.users', NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: ERROR for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Drop and recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger was created
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
      AND tgrelid = 'auth.users'::regclass
  ) INTO v_trigger_exists;

  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created was NOT created on auth.users';
  END IF;

  RAISE NOTICE 'Trigger on_auth_user_created successfully created on auth.users';
END $$;

-- ALSO: Backfill any auth users that are missing from public.users
INSERT INTO public.users (id, email, phone, display_name, requires_org_setup, role)
SELECT 
  au.id,
  au.email,
  au.phone,
  COALESCE(au.raw_user_meta_data->>'display_name', au.raw_user_meta_data->>'full_name'),
  COALESCE((au.raw_user_meta_data->>'requires_org_setup')::boolean, false),
  NULL
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Now run the invite linking for any users that were just backfilled
DO $$
DECLARE
  v_invite RECORD;
  v_linked_count INTEGER := 0;
BEGIN
  FOR v_invite IN 
    SELECT pi.*, u.id AS user_id
    FROM parent_invites pi
    JOIN users u ON lower(u.email) = lower(pi.email)
    WHERE pi.status = 'pending'
      AND pi.expires_at > NOW()
  LOOP
    BEGIN
      INSERT INTO athlete_guardians (athlete_id, user_id, org_id, status)
      VALUES (v_invite.athlete_id, v_invite.user_id, v_invite.org_id, 'active')
      ON CONFLICT (athlete_id, user_id, org_id) 
      DO UPDATE SET status = 'active', updated_at = NOW();
      
      PERFORM add_org_role(v_invite.user_id, v_invite.org_id, 'parent');
      
      UPDATE parent_invites 
      SET status = 'accepted', accepted_by_user_id = v_invite.user_id, accepted_at = NOW()
      WHERE id = v_invite.id;
      
      v_linked_count := v_linked_count + 1;
      RAISE NOTICE 'Linked user % to athlete %', v_invite.user_id, v_invite.athlete_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error linking: %', SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete: linked % guardians', v_linked_count;
END $$;
