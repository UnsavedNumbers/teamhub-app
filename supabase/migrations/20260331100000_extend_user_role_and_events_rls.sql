-- Extend user_role enum to include org_admin and platform_admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('parent', 'coach', 'admin');
  END IF;

  BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'org_admin';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'platform_admin';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
