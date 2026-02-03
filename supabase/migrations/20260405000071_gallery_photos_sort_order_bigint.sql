-- gallery_photos.sort_order was integer; Date.now() (ms since epoch) overflows 32-bit.
-- Use bigint so millisecond timestamps are valid.
ALTER TABLE public.gallery_photos
  ALTER COLUMN sort_order TYPE bigint USING sort_order::bigint;
