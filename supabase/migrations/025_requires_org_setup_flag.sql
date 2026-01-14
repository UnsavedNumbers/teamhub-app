-- Migration: Add requires_org_setup flag to users table
-- =====================================================
-- This flag ensures users who sign up to create an organization
-- must complete organization setup before accessing portal features.
-- The flag is set during signup (via auth metadata) and cleared when
-- the user creates their first organization.

-- ============================================
-- 1. Add requires_org_setup column to users table
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_org_setup BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.requires_org_setup IS 'If true, user must complete organization setup before accessing portal features. Set during signup with org intent, cleared when org is created.';

-- Create partial index for efficient queries (only indexes true values)
CREATE INDEX IF NOT EXISTS idx_users_requires_org_setup 
ON users(requires_org_setup) 
WHERE requires_org_setup = true;

-- Set default for any NULLs (shouldn't exist, but safety)
UPDATE users SET requires_org_setup = false WHERE requires_org_setup IS NULL;

-- ============================================
-- 2. Update handle_new_user() trigger to set flag from metadata
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, display_name, requires_org_setup)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NULL),
    -- Set requires_org_setup from auth metadata if provided
    COALESCE((NEW.raw_user_meta_data->>'requires_org_setup')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    -- Also update flag on conflict (in case metadata is updated)
    requires_org_setup = COALESCE(
      (NEW.raw_user_meta_data->>'requires_org_setup')::boolean,
      users.requires_org_setup
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Create trigger to auto-clear flag when organization_members is created
-- ============================================
-- This ensures the flag is cleared regardless of how the org membership is created

CREATE OR REPLACE FUNCTION clear_org_setup_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- Only clear if user has the flag set (optimization)
  UPDATE users 
  SET requires_org_setup = false 
  WHERE id = NEW.user_id 
  AND requires_org_setup = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_org_member_created_clear_flag ON organization_members;

-- Create the trigger
CREATE TRIGGER on_org_member_created_clear_flag
  AFTER INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION clear_org_setup_flag();

-- Add comment for documentation
COMMENT ON FUNCTION clear_org_setup_flag() IS 'Automatically clears requires_org_setup flag when user is added to an organization.';

-- ============================================
-- 4. Grant permissions
-- ============================================
-- Users need to be able to read and update their own requires_org_setup flag
-- This is already covered by existing users RLS policies
