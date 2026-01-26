-- ============================================================
-- FIX: Ensure auth.users → public.users → athlete_guardians
-- This migration fixes the trigger chain so new signups work
-- ============================================================

-- ===========================================
-- STEP 1: Create/replace handle_new_user function
-- Triggered when a new user signs up (auth.users INSERT)
-- Creates a corresponding row in public.users
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'parent',  -- Default role for new signups
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- ===========================================
-- STEP 2: Create trigger on auth.users
-- ===========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- STEP 3: Create/replace invite linking function
-- Triggered when a new public.users row is created
-- Links any pending invites to athlete_guardians
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_new_user_invite_linking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Find all pending invites for this user's email
  FOR v_invite IN
    SELECT id, athlete_id, org_id, email
    FROM parent_invites
    WHERE LOWER(email) = LOWER(NEW.email)
      AND status = 'pending'
  LOOP
    -- Create the athlete_guardians link
    INSERT INTO athlete_guardians (athlete_id, user_id, org_id, status, created_at, updated_at)
    VALUES (
      v_invite.athlete_id,
      NEW.id,
      v_invite.org_id,
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT (athlete_id, user_id) DO NOTHING;
    
    -- Note: We skip updating parent_invites.status due to trigger issues
    -- The link exists which is what matters for access
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- ===========================================
-- STEP 4: Create trigger on public.users
-- ===========================================
DROP TRIGGER IF EXISTS on_user_created_link_invites ON public.users;

CREATE TRIGGER on_user_created_link_invites
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_invite_linking();

-- ===========================================
-- STEP 5: Verify triggers are installed
-- ===========================================
DO $$
DECLARE
  v_auth_trigger_exists BOOLEAN;
  v_users_trigger_exists BOOLEAN;
BEGIN
  -- Check auth.users trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) INTO v_auth_trigger_exists;
  
  -- Check public.users trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_user_created_link_invites'
  ) INTO v_users_trigger_exists;
  
  IF v_auth_trigger_exists AND v_users_trigger_exists THEN
    RAISE NOTICE '✓ Both triggers installed successfully';
  ELSE
    RAISE WARNING 'Trigger installation issue: auth=%, users=%', 
      v_auth_trigger_exists, v_users_trigger_exists;
  END IF;
END;
$$;
