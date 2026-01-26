-- Migration: Fix athlete_guardians column name inconsistency
-- =============================================================
-- CRITICAL FIX: Renames organization_id to org_id in athlete_guardians table
-- This fixes the auto-linking trigger that fails on new guardian signups
--
-- Issue: handle_new_user_invite_linking() uses org_id but table has organization_id
-- Impact: New guardians don't see athletes after signup (100% failure rate)
-- 
-- Related: GUARDIAN_INVITE_FLOW_DEBUG_REPORT.md

-- Step 1: Rename the column
ALTER TABLE athlete_guardians 
RENAME COLUMN organization_id TO org_id;

-- Step 2: Update foreign key constraint name for consistency
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'athlete_guardians_organization_id_fkey'
  ) THEN
    ALTER TABLE athlete_guardians 
    RENAME CONSTRAINT athlete_guardians_organization_id_fkey 
    TO athlete_guardians_org_id_fkey;
  END IF;
END $$;

-- Step 3: Rebuild unique index with new column name
DROP INDEX IF EXISTS athlete_guardians_athlete_id_user_id_organization_id_key;
CREATE UNIQUE INDEX athlete_guardians_athlete_id_user_id_org_id_key 
ON athlete_guardians (athlete_id, user_id, org_id);

-- Step 4: Rebuild performance indexes
DROP INDEX IF EXISTS idx_athlete_guardians_org_athlete;
CREATE INDEX idx_athlete_guardians_org_athlete 
ON athlete_guardians (org_id, athlete_id);

DROP INDEX IF EXISTS idx_athlete_guardians_user_org;
CREATE INDEX idx_athlete_guardians_user_org 
ON athlete_guardians (user_id, org_id);

DROP INDEX IF EXISTS idx_athlete_guardians_athlete_org_status;
CREATE INDEX idx_athlete_guardians_athlete_org_status 
ON athlete_guardians (athlete_id, org_id, status) 
WHERE (status = 'active');

DROP INDEX IF EXISTS idx_athlete_guardians_user_org_status;
CREATE INDEX idx_athlete_guardians_user_org_status 
ON athlete_guardians (user_id, org_id, status) 
WHERE (status = 'active');

-- Step 5: Update find_guardian_by_email to use org_id
CREATE OR REPLACE FUNCTION find_guardian_by_email(
  p_email TEXT,
  p_org_id UUID
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  display_name TEXT,
  phone TEXT,
  linked_athletes JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_normalized_email TEXT;
BEGIN
  v_normalized_email := normalize_email(p_email);
  
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.email,
    u.display_name,
    u.phone,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'first_name', a.first_name,
          'last_name', a.last_name,
          'birthdate', a.birthdate
        )
        ORDER BY a.first_name, a.last_name
      ) FILTER (WHERE a.id IS NOT NULL),
      '[]'::jsonb
    ) AS linked_athletes
  FROM users u
  LEFT JOIN athlete_guardians ag ON ag.user_id = u.id 
    AND ag.org_id = p_org_id 
    AND ag.status = 'active'
  LEFT JOIN athletes a ON a.id = ag.athlete_id 
    AND a.deleted_at IS NULL
  WHERE normalize_email(u.email) = v_normalized_email
  GROUP BY u.id, u.email, u.display_name, u.phone;
END;
$$;

-- Step 6: Verify the auto-link trigger is using correct column
-- This was already updated in 20260210000000_auto_link_invites.sql
-- But let's ensure it's correct
CREATE OR REPLACE FUNCTION public.handle_new_user_invite_linking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_linked_count INTEGER := 0;
BEGIN
  RAISE LOG 'handle_new_user_invite_linking: Processing user % (email: %)', 
    NEW.id, NEW.email;

  FOR v_invite IN 
    SELECT * FROM public.parent_invites 
    WHERE lower(email) = lower(NEW.email) 
    AND status = 'pending'
    AND expires_at > NOW()
  LOOP
    RAISE LOG 'handle_new_user_invite_linking: Found pending invite % for athlete %', 
      v_invite.id, v_invite.athlete_id;

    BEGIN
      -- CRITICAL: Now uses org_id to match renamed column
      INSERT INTO public.athlete_guardians (athlete_id, user_id, org_id, status)
      VALUES (v_invite.athlete_id, NEW.id, v_invite.org_id, 'active')
      ON CONFLICT (athlete_id, user_id, org_id) 
      DO UPDATE SET status = 'active', updated_at = NOW();

      RAISE LOG 'handle_new_user_invite_linking: Created guardian link for athlete %', 
        v_invite.athlete_id;

      PERFORM public.add_org_role(NEW.id, v_invite.org_id, 'parent');
      
      UPDATE public.parent_invites 
      SET status = 'accepted', accepted_by_user_id = NEW.id, accepted_at = NOW()
      WHERE id = v_invite.id;

      v_linked_count := v_linked_count + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user_invite_linking: ERROR linking user % to athlete %: % (SQLSTATE: %)',
        NEW.id, v_invite.athlete_id, SQLERRM, SQLSTATE;
      -- Continue processing other invites
    END;
  END LOOP;

  RAISE LOG 'handle_new_user_invite_linking: Completed for user % - linked % athletes', 
    NEW.id, v_linked_count;

  RETURN NEW;
END;
$$;

-- Step 7: Update comments
COMMENT ON COLUMN athlete_guardians.org_id IS 
  'Organization context for this guardian-athlete relationship. Renamed from organization_id for consistency.';

COMMENT ON FUNCTION handle_new_user_invite_linking() IS 
  'Automatically links new users to athletes if they have pending invites matching their email. 
   Includes error handling and logging for production debugging.';

-- Step 8: Verify schema consistency
DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_old_column_exists BOOLEAN;
BEGIN
  -- Check that org_id exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'athlete_guardians' 
      AND column_name = 'org_id'
  ) INTO v_column_exists;

  -- Check that organization_id no longer exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'athlete_guardians' 
      AND column_name = 'organization_id'
  ) INTO v_old_column_exists;

  IF NOT v_column_exists THEN
    RAISE EXCEPTION 'Migration failed: org_id column does not exist in athlete_guardians';
  END IF;

  IF v_old_column_exists THEN
    RAISE EXCEPTION 'Migration failed: organization_id column still exists in athlete_guardians';
  END IF;

  RAISE NOTICE 'Migration successful: athlete_guardians now uses org_id';
END $$;
