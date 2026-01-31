-- Fix multi-role constraint
-- Remove old constraint that only allows one role per user per org
-- Add new constraint that allows multiple roles per user per org

ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS uq_org_member_user_org;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_org_member_user_org_role'
  ) THEN
    ALTER TABLE organization_members ADD CONSTRAINT uq_org_member_user_org_role 
      UNIQUE (org_id, user_id, role);
  END IF;
END $$;

-- Verify constraint was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_org_member_user_org_role'
  ) THEN
    RAISE NOTICE 'Successfully created uq_org_member_user_org_role constraint';
  ELSE
    RAISE WARNING 'Constraint uq_org_member_user_org_role was not created';
  END IF;
END $$;
