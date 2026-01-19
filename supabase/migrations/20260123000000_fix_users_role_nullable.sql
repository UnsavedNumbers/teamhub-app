-- Migration: Fix users.role to be nullable
-- ==========================================
-- The role column in users table should be nullable as users are now
-- managed through organization_members table. The column is kept for
-- backward compatibility but shouldn't block new user creation.

-- Make role column nullable
ALTER TABLE users ALTER COLUMN role DROP NOT NULL;

-- Update the handle_new_user function to be defensive
-- and ensure it works regardless of role being required or not
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, display_name, requires_org_setup, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NULL),
    -- Set requires_org_setup from auth metadata if provided
    COALESCE((NEW.raw_user_meta_data->>'requires_org_setup')::boolean, false),
    -- Set role to NULL for new auth model (using organization_members instead)
    NULL
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

-- Add comment explaining the nullable role
COMMENT ON COLUMN users.role IS 'DEPRECATED: Legacy role column kept for backward compatibility. Use organization_members table for current role management. This column is nullable and should be NULL for new users.';
