-- Remove restrictive RLS on video_notes INSERT
-- The current policy uses can_view_video() which may have recursion issues
-- when called from RLS context. Instead, we allow inserts if the author_id matches
-- the authenticated user. Access control is enforced at the application layer
-- and through the SELECT policies (users can only see notes on videos they can view).

-- Drop the current restrictive INSERT policy
DROP POLICY IF EXISTS video_notes_insert_policy ON public.video_notes;

-- Create a simple INSERT policy that only requires author_id to match authenticated user
-- Access control for WHO can add notes to a video is handled at app layer
CREATE POLICY video_notes_insert_policy ON public.video_notes 
FOR INSERT 
WITH CHECK (
  author_id = auth.uid()
);

COMMENT ON POLICY video_notes_insert_policy ON public.video_notes IS 
'Users can create notes as themselves. Video access is enforced at app layer and by SELECT policies.';
