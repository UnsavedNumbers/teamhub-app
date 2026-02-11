-- Fix infinite recursion in video_note_targets / video_notes RLS policies
-- Problem: video_notes_select_policy queries video_note_targets
--          video_note_targets_select_policy queries video_notes
--          This creates circular dependency
--
-- Solution: Use SECURITY DEFINER functions to break the recursion chain
-- 
-- VALIDATED TABLES:
-- video_notes: id, video_id, author_id, deleted_at, scope (video_note_scope enum)
-- video_note_targets: id, note_id, athlete_id
-- videos: id, org_id, deleted_at
-- organization_members: org_id, user_id, role (org_member_role enum)
-- athlete_guardians: athlete_id, user_id, status (athlete_guardian_status enum)
--
-- VALIDATED ENUM VALUES:
-- video_note_scope: 'private', 'all', 'coaches', 'guardians'
-- org_member_role: 'org_admin', 'coach', etc.
-- athlete_guardian_status: 'active', 'pending', 'inactive'

-- Create helper function to check if user can view a video note
-- Uses SECURITY DEFINER to bypass RLS on sub-queries
CREATE OR REPLACE FUNCTION public.can_view_video_note(p_note_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_note RECORD;
  v_can_view BOOLEAN := FALSE;
BEGIN
  -- Get note details (bypass RLS with SECURITY DEFINER)
  SELECT vn.id, vn.video_id, vn.author_id, vn.scope, vn.deleted_at
  INTO v_note
  FROM public.video_notes vn
  WHERE vn.id = p_note_id;
  
  IF v_note.id IS NULL OR v_note.deleted_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if video is viewable
  IF NOT EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = v_note.video_id 
      AND v.deleted_at IS NULL
      AND public.can_view_video(v.id, p_user_id)
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Author can always see their notes
  IF v_note.author_id = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check based on scope
  CASE v_note.scope
    WHEN 'all' THEN
      RETURN TRUE;
    WHEN 'coaches' THEN
      -- Check if user is coach/admin for this org
      RETURN EXISTS (
        SELECT 1 
        FROM public.videos v
        JOIN public.organization_members om ON om.org_id = v.org_id
        WHERE v.id = v_note.video_id
          AND om.user_id = p_user_id
          AND om.role IN ('org_admin', 'coach')
      );
    WHEN 'guardians' THEN
      -- Check if user is guardian of any targeted athlete
      RETURN EXISTS (
        SELECT 1
        FROM public.video_note_targets vnt
        JOIN public.athlete_guardians ag ON ag.athlete_id = vnt.athlete_id
        WHERE vnt.note_id = p_note_id
          AND ag.user_id = p_user_id
          AND ag.status = 'active'
      );
    ELSE
      -- 'private' or unknown - only author can see
      RETURN FALSE;
  END CASE;
END;
$$;

-- Create helper function to check if user can view a video_note_target
CREATE OR REPLACE FUNCTION public.can_view_video_note_target(p_target_note_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  -- Target is viewable if the parent note is viewable
  RETURN public.can_view_video_note(p_target_note_id, p_user_id);
END;
$$;

-- Drop and recreate video_notes SELECT policy using helper function
DROP POLICY IF EXISTS video_notes_select_policy ON public.video_notes;
CREATE POLICY video_notes_select_policy ON public.video_notes 
FOR SELECT 
USING (
  public.can_view_video_note(id, auth.uid())
);

-- Drop and recreate video_note_targets SELECT policy - simplified to avoid recursion
DROP POLICY IF EXISTS video_note_targets_select_policy ON public.video_note_targets;
CREATE POLICY video_note_targets_select_policy ON public.video_note_targets 
FOR SELECT 
USING (
  public.can_view_video_note_target(note_id, auth.uid())
);

COMMENT ON FUNCTION public.can_view_video_note(UUID, UUID) IS 
'Checks if a user can view a video note. Uses SECURITY DEFINER to avoid RLS recursion.';

COMMENT ON FUNCTION public.can_view_video_note_target(UUID, UUID) IS 
'Checks if a user can view a video note target. Delegates to can_view_video_note.';
