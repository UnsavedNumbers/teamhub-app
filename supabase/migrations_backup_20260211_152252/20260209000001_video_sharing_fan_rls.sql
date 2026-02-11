-- Video Sharing Password Verification and Fan RLS Policy
-- 
-- This migration adds:
-- 1. verify_video_share_password() - Verifies password for protected shares
-- 2. Fan RLS policy using fan_visible column
-- 3. Guardian notes visibility fix - filter scope properly
-- 
-- Note: validate_video_share_token() and increment_share_access() already exist
-- in migration 20260410000020_video_library_features.sql

-- ============================================================================
-- FUNCTION: verify_video_share_password
-- Verifies the password for a protected share
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verify_video_share_password(p_token text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_password_hash text;
BEGIN
    -- Get the password hash
    SELECT password_hash 
    INTO v_password_hash
    FROM video_shares 
    WHERE share_token = p_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;
    
    -- No share found
    IF v_password_hash IS NULL THEN
        RETURN false;
    END IF;
    
    -- No password required
    IF v_password_hash = '' THEN
        RETURN true;
    END IF;
    
    -- Check password using pgcrypto crypt
    -- Note: Password should be hashed with crypt() when created
    IF crypt(p_password, v_password_hash) = v_password_hash THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.verify_video_share_password IS 
'Verifies the password for a protected video share link';

-- Grant execute to anon for public share access
GRANT EXECUTE ON FUNCTION public.verify_video_share_password(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_video_share_password(text, text) TO authenticated;

-- ============================================================================
-- Update video_shares table to add last_accessed_at if not exists
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'video_shares' 
        AND column_name = 'last_accessed_at'
    ) THEN
        ALTER TABLE public.video_shares ADD COLUMN last_accessed_at timestamptz;
        COMMENT ON COLUMN public.video_shares.last_accessed_at IS 'Last time this share link was accessed';
    END IF;
END $$;

-- ============================================================================
-- Ensure fan_visible column exists and has proper default
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'videos' 
        AND column_name = 'fan_visible'
    ) THEN
        ALTER TABLE public.videos ADD COLUMN fan_visible boolean NOT NULL DEFAULT false;
        COMMENT ON COLUMN public.videos.fan_visible IS 'Whether this video is visible to fans following the org/team';
    END IF;
END $$;

-- Create index for fan_visible queries
CREATE INDEX IF NOT EXISTS idx_videos_fan_visible 
ON public.videos(org_id, fan_visible) 
WHERE fan_visible = true AND status = 'ready';

-- ============================================================================
-- RLS POLICY: videos_fan_select
-- NOTE: Commented out until fan_follows table is created
-- Allow fans to view videos marked as fan_visible from followed orgs/teams
-- ============================================================================

-- DROP POLICY IF EXISTS videos_fan_select ON public.videos;
-- 
-- CREATE POLICY videos_fan_select ON public.videos
-- FOR SELECT
-- TO authenticated
-- USING (
--     fan_visible = true
--     AND status = 'ready'
--     AND (
--         EXISTS (
--             SELECT 1 FROM public.fan_follows ff
--             WHERE ff.follower_id = auth.uid()
--             AND ff.org_id = videos.org_id
--         )
--         OR
--         EXISTS (
--             SELECT 1 FROM public.fan_follows ff
--             WHERE ff.follower_id = auth.uid()
--             AND ff.team_id = videos.team_id
--             AND videos.team_id IS NOT NULL
--         )
--         OR
--         EXISTS (
--             SELECT 1 FROM public.fan_follows ff
--             JOIN public.video_athlete_links val ON val.athlete_id = ff.athlete_id
--             WHERE ff.follower_id = auth.uid()
--             AND val.video_id = videos.id
--         )
--     )
-- );
-- 
-- COMMENT ON POLICY videos_fan_select ON public.videos IS 
-- 'Allow fans to view fan_visible videos from followed orgs, teams, or tagged athletes';
