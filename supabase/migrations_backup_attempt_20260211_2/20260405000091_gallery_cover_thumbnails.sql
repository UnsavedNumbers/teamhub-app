-- Migration: Add cover photo support to galleries

-- 1. Add columns to galleries table
ALTER TABLE public.galleries
ADD COLUMN IF NOT EXISTS cover_photo_id UUID REFERENCES public.gallery_photos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cover_thumbnails JSONB,
ADD COLUMN IF NOT EXISTS cover_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cover_generation_status TEXT CHECK (cover_generation_status IN ('pending', 'processing', 'completed', 'failed'));

-- 2. Add indexes
CREATE INDEX IF NOT EXISTS idx_galleries_cover_generation_status ON public.galleries(cover_generation_status);
CREATE INDEX IF NOT EXISTS idx_galleries_cover_photo_id ON public.galleries(cover_photo_id);

-- 3. Comment on columns
COMMENT ON COLUMN public.galleries.cover_photo_id IS 'Reference to the photo used as the gallery cover';
COMMENT ON COLUMN public.galleries.cover_thumbnails IS 'JSON object containing URLs for different thumbnail sizes';
COMMENT ON COLUMN public.galleries.cover_generated_at IS 'Timestamp when the cover thumbnails were last generated';
COMMENT ON COLUMN public.galleries.cover_generation_status IS 'Status of the thumbnail generation process';
