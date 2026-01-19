-- Migration: Fix handle_new_user() trigger to handle boolean casting and NULL values safely
-- ========================================================================================
-- The trigger was failing when casting requires_org_setup from JSON metadata.
-- This migration adds proper error handling and ensures all values are set correctly.

-- Ensure role column is nullable (idempotent - safe to run multiple times)
DO $$ 
BEGIN
  -- Try to drop NOT NULL constraint if it exists
  ALTER TABLE users ALTER COLUMN role DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Column might already be nullable, ignore error
    NULL;
END $$;

-- Update handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_display_name TEXT;
  v_requires_org_setup BOOLEAN;
  v_metadata_value JSONB;
BEGIN
  -- Extract display_name safely
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NULL
  );

  -- Extract requires_org_setup from metadata - handle both JSON boolean and string
  v_metadata_value := NEW.raw_user_meta_data->'requires_org_setup';
  
  -- Handle boolean conversion safely
  -- JSON can have boolean true/false or string "true"/"false"
  IF v_metadata_value IS NULL THEN
    v_requires_org_setup := false;
  ELSIF jsonb_typeof(v_metadata_value) = 'boolean' THEN
    -- Direct boolean value in JSON
    v_requires_org_setup := v_metadata_value::boolean;
  ELSIF jsonb_typeof(v_metadata_value) = 'string' THEN
    -- String representation of boolean
    IF v_metadata_value::text = '"true"' OR v_metadata_value::text = '"True"' OR v_metadata_value::text = '"TRUE"' THEN
      v_requires_org_setup := true;
    ELSE
      v_requires_org_setup := false;
    END IF;
  ELSE
    -- Fallback to false for any other type
    v_requires_org_setup := false;
  END IF;

  -- Insert user record with all required fields
  INSERT INTO public.users (id, email, phone, display_name, requires_org_setup, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    v_display_name,
    v_requires_org_setup,
    NULL  -- role is nullable, set to NULL for new auth model
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    requires_org_setup = COALESCE(EXCLUDED.requires_org_setup, users.requires_org_setup);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error with full details for debugging
    RAISE WARNING 'Error in handle_new_user() trigger for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    -- Still return NEW to allow auth user creation to succeed
    -- The profile can be created manually if needed
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the function
COMMENT ON FUNCTION handle_new_user() IS 'Creates user profile record when auth user is created. Handles requires_org_setup flag from metadata safely. Sets role to NULL for new multi-org auth model.';
