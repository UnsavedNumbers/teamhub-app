-- Compatibility migration for PROD drift.
-- Ensures seasons.is_active exists for calendar performance indexes.

ALTER TABLE public.seasons
ADD COLUMN IF NOT EXISTS is_active boolean;

UPDATE public.seasons
SET is_active = true
WHERE is_active IS NULL;

ALTER TABLE public.seasons
ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE public.seasons
ALTER COLUMN is_active SET NOT NULL;