-- Migration: Add Home Zipcode to Users
-- ====================================
-- Adds home_zipcode column to users table (optional field)
-- Updates handle_new_user() trigger to extract zipcode from metadata
-- Adds index for potential location-based queries

BEGIN;

-- ===========================================
-- STEP 1: Add home_zipcode column
-- ===========================================
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS home_zipcode TEXT;

-- ===========================================
-- STEP 2: Add length constraint
-- ===========================================
-- Max 10 characters to support both 5-digit and extended formats (e.g., 12345-6789)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_home_zipcode_length'
  ) THEN
    ALTER TABLE users 
      ADD CONSTRAINT users_home_zipcode_length 
        CHECK (home_zipcode IS NULL OR length(home_zipcode) <= 10);
  END IF;
END $$;

-- ===========================================
-- STEP 3: Add index for location-based queries
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_users_home_zipcode ON users(home_zipcode);

-- ===========================================
-- STEP 4: Update handle_new_user() trigger function
-- ===========================================
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
  v_home_zipcode TEXT;
  v_display_name TEXT;
  v_requires_org_setup BOOLEAN := false;
  v_metadata_value JSONB;
BEGIN
  RAISE LOG 'handle_new_user: START - Processing auth user % (email: %)', NEW.id, NEW.email;

  -- Extract first_name with multi-level fallback
  v_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    split_part(COALESCE(NEW.raw_user_meta_data->>'display_name', ''), ' ', 1),
    ''
  );
  v_first_name := TRIM(v_first_name);

  -- Extract last_name with multi-level fallback
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

  -- Extract home_zipcode from metadata
  v_home_zipcode := NEW.raw_user_meta_data->>'home_zipcode';
  IF v_home_zipcode IS NOT NULL THEN
    v_home_zipcode := TRIM(v_home_zipcode);
    -- Validate length (max 10 characters)
    IF length(v_home_zipcode) > 10 THEN
      v_home_zipcode := NULL; -- Set to NULL if invalid
    END IF;
  END IF;

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
    home_zipcode,
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
    v_home_zipcode,
    v_display_name,
    v_requires_org_setup,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = COALESCE(NULLIF(TRIM(EXCLUDED.phone), ''), users.phone),
    first_name = COALESCE(NULLIF(TRIM(EXCLUDED.first_name), ''), users.first_name),
    last_name = COALESCE(NULLIF(TRIM(EXCLUDED.last_name), ''), users.last_name),
    home_zipcode = COALESCE(EXCLUDED.home_zipcode, users.home_zipcode),
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    requires_org_setup = COALESCE(EXCLUDED.requires_org_setup, users.requires_org_setup),
    updated_at = NOW();

  RAISE LOG 'handle_new_user: SUCCESS - Created user % in public.users', NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Enhanced error handling
    RAISE WARNING 'handle_new_user: ERROR for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    
    -- Create profile with safe defaults to allow auth creation to succeed
    BEGIN
      INSERT INTO public.users (
        id, 
        email, 
        phone, 
        first_name,
        last_name,
        home_zipcode,
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
        NULL,
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

COMMIT;

-- ===========================================
-- Verification
-- ===========================================
DO $$
BEGIN
  -- Verify column was added
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'home_zipcode'
  ) THEN
    RAISE EXCEPTION 'Column home_zipcode was not created';
  END IF;

  -- Verify index was created
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'users' 
      AND indexname = 'idx_users_home_zipcode'
  ) THEN
    RAISE EXCEPTION 'Index idx_users_home_zipcode was not created';
  END IF;

  RAISE NOTICE 'Migration completed successfully: home_zipcode column added to users table';
END $$;
