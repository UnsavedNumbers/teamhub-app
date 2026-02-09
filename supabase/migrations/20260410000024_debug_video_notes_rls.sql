-- Temporary debug functions for video_notes INSERT RLS issue

-- 1. Check what auth.uid() returns
CREATE OR REPLACE FUNCTION public.auth_debug_uid()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'auth_uid', auth.uid()::text,
    'auth_role', auth.role(),
    'auth_jwt', auth.jwt()->'role'
  );
END;
$$;

-- 2. Check all RLS policies on video_notes
CREATE OR REPLACE FUNCTION public.get_video_notes_policies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'policyname', pol.policyname,
    'cmd', pol.cmd,
    'permissive', pol.permissive,
    'roles', pol.roles::text[],
    'qual', pol.qual,
    'with_check', pol.with_check
  ))
  INTO result
  FROM pg_policies pol
  WHERE pol.tablename = 'video_notes' AND pol.schemaname = 'public';
  
  RETURN result;
END;
$$;

-- 3. Test the INSERT policy conditions manually
CREATE OR REPLACE FUNCTION public.check_video_notes_insert_policy(
  p_author_id uuid,
  p_video_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_auth_uid uuid;
  v_author_matches boolean;
  v_rls_enabled boolean;
BEGIN
  v_auth_uid := auth.uid();
  v_author_matches := (p_author_id = v_auth_uid);
  
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'video_notes' AND relnamespace = 'public'::regnamespace;
  
  RETURN jsonb_build_object(
    'auth_uid', v_auth_uid::text,
    'p_author_id', p_author_id::text,
    'author_matches_auth_uid', v_author_matches,
    'rls_enabled', v_rls_enabled,
    'current_user', current_user,
    'session_user', session_user
  );
END;
$$;
