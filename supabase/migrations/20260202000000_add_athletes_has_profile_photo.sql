-- ============================================
-- Add profile photo columns to athletes table
-- ============================================
-- This migration adds profile_photo_updated_at and has_profile_photo columns
-- to track athlete profile photos stored in Supabase Storage.

-- Add profile_photo_updated_at column (timestamp when photo was last updated)
ALTER TABLE public.athletes 
  ADD COLUMN IF NOT EXISTS profile_photo_updated_at TIMESTAMPTZ;

-- Add has_profile_photo column (boolean flag for quick queries)
ALTER TABLE public.athletes 
  ADD COLUMN IF NOT EXISTS has_profile_photo BOOLEAN DEFAULT FALSE;

-- Add org_id column if it doesn't exist (needed for photo path generation)
ALTER TABLE public.athletes 
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Populate org_id for existing athletes from athlete_guardians table
-- This backfills org_id for athletes that already have guardian associations
UPDATE public.athletes a
SET org_id = ag.org_id
FROM public.athlete_guardians ag
WHERE a.id = ag.athlete_id 
  AND a.org_id IS NULL
  AND ag.org_id IS NOT NULL
  AND ag.status = 'active';

-- Fallback: If athlete still has no org_id, try to get it from their family
UPDATE public.athletes a
SET org_id = f.org_id
FROM public.families f
WHERE a.family_id = f.id
  AND a.org_id IS NULL
  AND f.org_id IS NOT NULL;

-- Add index for querying athletes with profile photos
CREATE INDEX IF NOT EXISTS idx_athletes_has_profile_photo 
  ON public.athletes(has_profile_photo) 
  WHERE has_profile_photo = TRUE;

-- Add index for org_id lookups
CREATE INDEX IF NOT EXISTS idx_athletes_org_id 
  ON public.athletes(org_id);

COMMENT ON COLUMN public.athletes.profile_photo_updated_at IS 'Timestamp when the athlete profile photo was last updated in storage.';
COMMENT ON COLUMN public.athletes.has_profile_photo IS 'Indicates whether the athlete has a profile photo uploaded. Used with profile_photo_updated_at timestamp.';
COMMENT ON COLUMN public.athletes.org_id IS 'Organization ID for the athlete. Used for generating photo storage paths and org-scoped queries.';
