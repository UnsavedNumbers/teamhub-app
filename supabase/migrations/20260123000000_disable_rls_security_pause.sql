-- Security Pause: Disable RLS on all tables except auth
-- Date: 2026-01-23
-- Purpose: Temporarily pause RLS enforcement while preserving policies
-- EXCLUDED: auth tables only (RLS remains enabled)

BEGIN;

DO $$
DECLARE
  tbl RECORD;
  excluded_tables TEXT[] := ARRAY[
    -- Auth tables (keep RLS)
    'users',
    'platform_admins', 
    'organization_members',
    'organization_invites',
    'audit_logs_old'
  ];
  disabled_count INTEGER := 0;
  skipped_count INTEGER := 0;
  error_count INTEGER := 0;
  excluded_count INTEGER := 0;
BEGIN
  -- Pre-flight: Validate excluded tables exist and have RLS enabled
  RAISE NOTICE 'Validating excluded tables...';
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY(excluded_tables)
  LOOP
    excluded_count := excluded_count + 1;
    -- Check if RLS is actually enabled (should be true)
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = tbl.tablename 
        AND rowsecurity = true
    ) THEN
      RAISE WARNING 'Excluded table % does not have RLS enabled!', tbl.tablename;
    END IF;
  END LOOP;
  
  IF excluded_count != array_length(excluded_tables, 1) THEN
    RAISE WARNING 'Expected % excluded tables, found %. Review exclusion list.', 
      array_length(excluded_tables, 1), excluded_count;
  END IF;

  -- Disable RLS on non-excluded tables
  RAISE NOTICE 'Disabling RLS on non-excluded tables...';
  FOR tbl IN
    SELECT t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename != ALL(excluded_tables)
      -- Only process BASE TABLEs, exclude views
      AND EXISTS (
        SELECT 1 
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = t.tablename
          AND c.relkind = 'r'  -- 'r' = regular table
      )
  LOOP
    BEGIN
      -- Only disable if RLS is currently enabled (idempotent)
      IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename = tbl.tablename 
          AND rowsecurity = true
      ) THEN
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.tablename);
        disabled_count := disabled_count + 1;
        RAISE NOTICE 'Disabled RLS on: %', tbl.tablename;
      ELSE
        skipped_count := skipped_count + 1;
        RAISE NOTICE 'Skipped % (RLS already disabled)', tbl.tablename;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING 'Failed to disable RLS on %: %', tbl.tablename, SQLERRM;
    END;
  END LOOP;

  -- Summary
  RAISE NOTICE 'Migration complete: % disabled, % skipped, % errors, % excluded', 
    disabled_count, skipped_count, error_count, excluded_count;
  
  -- Warn about any tables with RLS still enabled that aren't in exclusion list
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = true
      AND tablename != ALL(excluded_tables)
  LOOP
    RAISE WARNING 'Table % still has RLS enabled but is not in exclusion list!', tbl.tablename;
  END LOOP;
END $$;

COMMIT;
