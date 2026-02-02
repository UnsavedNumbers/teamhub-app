-- Gallery admin enhancements: visibility, description, cover, metadata, ordering

-- Visibility enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gallery_visibility') THEN
    CREATE TYPE public.gallery_visibility AS ENUM ('public', 'team', 'private');
  END IF;
END $$;

ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS visibility public.gallery_visibility DEFAULT 'team',
  ADD COLUMN IF NOT EXISTS cover_photo_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

-- Cover FK (nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'galleries_cover_photo_fkey'
      AND conrelid = 'public.galleries'::regclass
  ) THEN
    ALTER TABLE public.galleries
      ADD CONSTRAINT galleries_cover_photo_fkey
      FOREIGN KEY (cover_photo_id) REFERENCES public.gallery_photos(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.gallery_photos
  ADD COLUMN IF NOT EXISTS filename text,
  ADD COLUMN IF NOT EXISTS size_bytes bigint,
  ADD COLUMN IF NOT EXISTS sort_order integer;

CREATE INDEX IF NOT EXISTS idx_gallery_photos_sort ON public.gallery_photos (gallery_id, sort_order NULLS LAST, created_at);
