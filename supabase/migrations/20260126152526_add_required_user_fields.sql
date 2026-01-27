-- Migration: Add Required First Name, Last Name, and Phone to Users
-- ===================================================================
-- Adds first_name and last_name columns (both required)
-- Makes phone column required (NOT NULL)
-- Updates handle_new_user() trigger to extract and insert new fields
-- Backfills existing users with safe defaults

BEGIN;

-- ===========================================
-- STEP 1: Add first_name and last_name columns
-- ===========================================
-- Use NOT NULL DEFAULT '' for atomic operation (Issue 1 solution)
-- PostgreSQL automatically sets default for existing rows
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '';

-- Add length constraints (Bug 9 prevention - max 100 chars)
ALTER TABLE users 
  ADD CONSTRAINT IF NOT EXISTS users_first_name_length 
    CHECK (length(first_name) <= 100),
  ADD CONSTRAINT IF NOT EXISTS users_last_name_length 
    CHECK (length(last_name) <= 100);

-- Add indexes for search performance
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);

-- Add functional indexes for case-insensitive search (Bug 10 prevention)
CREATE INDEX IF NOT EXISTS idx_users_first_name_lower ON users(LOWER(first_name));
CREATE INDEX IF NOT EXISTS idx_users_last_name_lower ON users(LOWER(last_name));

-- ===========================================
-- STEP 2: Make phone required
-- ===========================================
-- First, set default for existing NULL values
UPDATE users SET phone = '' WHERE phone IS NULL;

-- Then make it NOT NULL with default
ALTER TABLE users 
  ALTER COLUMN phone SET DEFAULT '',
  ALTER COLUMN phone SET NOT NULL;

-- ===========================================
-- STEP 3: Backfill existing users from display_name
-- ===========================================
-- Attempt to split display_name into first/last (Issue 10 solution - simple split)
UPDATE users 
SET 
  first_name = COALESCE(
    NULLIF(TRIM(split_part(display_name, ' ', 1)), ''),
    ''
  ),
  last_name = COALESCE(
    NULLIF(TRIM(
      CASE 
        WHEN position(' ' in COALESCE(display_name, '')) > 0 
        THEN substring(display_name from position(' ' in display_name) + 1)
        ELSE ''
      END
    ), ''),
    ''
  )
WHERE (first_name = '' OR last_name = '')
  AND display_name IS NOT NULL 
  AND TRIM(display_name) != '';

-- ===========================================
-- STEP 4: Update handle_new_user() trigger function
-- ===========================================
-- Multi-level fallback for first_name, last_name, phone (Issue 2 solution)
-- Enhanced error handling (Bug 5 prevention)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_phone TEXT;
  v_display_name TEXT;
  v_requires_org_setup BOOLEAN := false;
  v_metadata_value JSONB;
BEGIN
  RAISE LOG 'handle_new_user: START - Processing auth user % (email: %)', NEW.id, NEW.email;

  -- Extract first_name with multi-level fallback (Issue 2 solution)
  v_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    split_part(COALESCE(NEW.raw_user_meta_data->>'display_name', ''), ' ', 1),
    ''
  );
  v_first_name := TRIM(v_first_name);

  -- Extract last_name with multi-level fallback (Issue 2 solution)
  v_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    CASE 
      WHEN position(' ' in COALESCE(NEW.raw_user_meta_data->>'display_name', '')) > 0 
      THEN substring(COALESCE(NEW.raw_user_meta_data->>'display_name', '') 
                     from position(' ' in COALESCE(NEW.raw_user_meta_data->>'display_name', '')) + 1)
      ELSE ''
    END,
    ''
  );
  v_last_name := TRIM(v_last_name);

  -- Extract phone from metadata or auth.phone
  v_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.phone,
    ''
  );
  v_phone := TRIM(v_phone);

  -- Extract display_name safely (for backward compatibility)
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    CASE 
      WHEN v_first_name != '' AND v_last_name != '' 
      THEN v_first_name || ' ' || v_last_name
      ELSE NULL
    END
  );

  -- Extract requires_org_setup from metadata - handle both JSON boolean and string
  v_metadata_value := NEW.raw_user_meta_data->'requires_org_setup';
  
  IF v_metadata_value IS NULL THEN
    v_requires_org_setup := false;
  ELSIF jsonb_typeof(v_metadata_value) = 'boolean' THEN
    v_requires_org_setup := v_metadata_value::boolean;
  ELSIF jsonb_typeof(v_metadata_value) = 'string' THEN
    IF v_metadata_value::text = '"true"' OR v_metadata_value::text = '"True"' OR v_metadata_value::text = '"TRUE"' THEN
      v_requires_org_setup := true;
    ELSE
      v_requires_org_setup := false;
    END IF;
  ELSE
    v_requires_org_setup := false;
  END IF;

  -- Insert user record with all required fields
  INSERT INTO public.users (
    id, 
    email, 
    phone, 
    first_name,
    last_name,
    display_name, 
    requires_org_setup, 
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_phone,
    v_first_name,
    v_last_name,
    v_display_name,
    v_requires_org_setup,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = COALESCE(NULLIF(TRIM(EXCLUDED.phone), ''), users.phone),
    first_name = COALESCE(NULLIF(TRIM(EXCLUDED.first_name), ''), users.first_name),
    last_name = COALESCE(NULLIF(TRIM(EXCLUDED.last_name), ''), users.last_name),
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    requires_org_setup = COALESCE(EXCLUDED.requires_org_setup, users.requires_org_setup),
    updated_at = NOW();

  RAISE LOG 'handle_new_user: SUCCESS - Created user % in public.users', NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Enhanced error handling (Bug 5 prevention)
    RAISE WARNING 'handle_new_user: ERROR for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    
    -- Create profile with safe defaults to allow auth creation to succeed
    BEGIN
      INSERT INTO public.users (
        id, 
        email, 
        phone, 
        first_name,
        last_name,
        display_name, 
        requires_org_setup, 
        role
      )
      VALUES (
        NEW.id,
        NEW.email,
        '',
        '',
        '',
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
        false,
        NULL
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: Failed to create fallback profile: %', SQLERRM;
    END;
    
    -- Return NEW to allow auth user creation to succeed
    RETURN NEW;
END;
$$;

-- ===========================================
-- STEP 5: Update views that reference users table
-- ===========================================
-- Check for views that need updating (Bug 8 prevention)
-- Note: Views will be updated in separate migration if needed
-- This migration ensures columns exist first

COMMIT;

-- ===========================================
-- Verification
-- ===========================================
DO $$
BEGIN
  -- Verify columns were added
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'first_name'
  ) THEN
    RAISE EXCEPTION 'Column first_name was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'last_name'
  ) THEN
    RAISE EXCEPTION 'Column last_name was not created';
  END IF;

  -- Verify phone is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'phone'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Column phone is still nullable';
  END IF;

  RAISE NOTICE 'Migration completed successfully: first_name, last_name, and phone (required) added to users table';
END $$;
