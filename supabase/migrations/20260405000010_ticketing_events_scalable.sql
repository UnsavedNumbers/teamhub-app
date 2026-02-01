-- Ticketing events scalability upgrade
-- Adds program/season/venue hierarchy, search, sale status, and supporting indexes

-- 1) Sale status enum (searchable sale lifecycle separate from event status)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_sale_status') THEN
    CREATE TYPE public.ticket_sale_status AS ENUM ('off', 'scheduled', 'on_sale', 'ended', 'sold_out');
  END IF;
END $$;

-- 2) Programs enhancements
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS sport text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Backfill slug for existing rows (best-effort)
UPDATE public.programs
SET slug = COALESCE(slug, LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_org_slug ON public.programs (org_id, slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_programs_org_active ON public.programs (org_id, is_active);

-- 3) Seasons enhancements
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

UPDATE public.seasons
SET slug = COALESCE(slug, LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_org_slug ON public.seasons (org_id, slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seasons_org_active ON public.seasons (org_id, is_active);

-- 4) Venues table
CREATE TABLE IF NOT EXISTS public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  state text,
  capacity integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ONLY public.venues ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_venues_org ON public.venues (org_id);
CREATE INDEX IF NOT EXISTS idx_venues_name_search ON public.venues (LOWER(name));

-- 5) Ticketed events: hierarchy + search + sale status
ALTER TABLE public.ticketed_events
  ADD COLUMN IF NOT EXISTS program_id uuid,
  ADD COLUMN IF NOT EXISTS season_id uuid,
  ADD COLUMN IF NOT EXISTS venue_id uuid,
  ADD COLUMN IF NOT EXISTS opponent text,
  ADD COLUMN IF NOT EXISTS is_home boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS program_name_cached text,
  ADD COLUMN IF NOT EXISTS sale_status public.ticket_sale_status DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Foreign keys (nullable, cascade-friendly)
ALTER TABLE public.ticketed_events
  ADD CONSTRAINT IF NOT EXISTS ticketed_events_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE SET NULL;

ALTER TABLE public.ticketed_events
  ADD CONSTRAINT IF NOT EXISTS ticketed_events_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE SET NULL;

ALTER TABLE public.ticketed_events
  ADD CONSTRAINT IF NOT EXISTS ticketed_events_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ticketed_events_program ON public.ticketed_events (program_id);
CREATE INDEX IF NOT EXISTS idx_ticketed_events_season ON public.ticketed_events (season_id);
CREATE INDEX IF NOT EXISTS idx_ticketed_events_venue ON public.ticketed_events (venue_id);

-- Helper: basic slugify function for reuse
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
BEGIN
  result := LOWER(REGEXP_REPLACE(COALESCE(input, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  result := REGEXP_REPLACE(result, '-{2,}', '-', 'g');
  result := TRIM(BOTH '-' FROM result);
  RETURN NULLIF(result, '');
END;
$$;

-- Search + cached program name update trigger
CREATE OR REPLACE FUNCTION public.update_ticketed_events_search()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  program_name text;
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    SELECT name INTO program_name FROM public.programs WHERE id = NEW.program_id LIMIT 1;
  END IF;

  NEW.program_name_cached := COALESCE(program_name, NEW.program_name_cached);

  NEW.search_vector :=
    to_tsvector(
      'english',
      COALESCE(NEW.title, '') || ' ' ||
      COALESCE(NEW.description, '') || ' ' ||
      COALESCE(NEW.opponent, '') || ' ' ||
      COALESCE(NEW.venue_name, '') || ' ' ||
      COALESCE(NEW.program_name_cached, '')
    );

  -- Lightweight sale status baseline (capacity-aware status recalculated in API layer)
  IF NEW.status = 'published' THEN
    IF NEW.sales_start_at IS NOT NULL AND NEW.sales_start_at > now() THEN
      NEW.sale_status := 'scheduled';
    ELSIF NEW.sales_end_at IS NOT NULL AND NEW.sales_end_at < now() THEN
      NEW.sale_status := 'ended';
    ELSE
      NEW.sale_status := 'on_sale';
    END IF;
  ELSE
    NEW.sale_status := 'off';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticketed_events_search_tsv ON public.ticketed_events;
CREATE TRIGGER ticketed_events_search_tsv
BEFORE INSERT OR UPDATE ON public.ticketed_events
FOR EACH ROW
EXECUTE FUNCTION public.update_ticketed_events_search();

-- Refresh cached program names when programs are renamed
CREATE OR REPLACE FUNCTION public.refresh_ticketed_event_program_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.ticketed_events AS te
  SET program_name_cached = NEW.name,
      search_vector = to_tsvector(
        'english',
        COALESCE(te.title, '') || ' ' ||
        COALESCE(te.description, '') || ' ' ||
        COALESCE(te.opponent, '') || ' ' ||
        COALESCE(te.venue_name, '') || ' ' ||
        COALESCE(NEW.name, '')
      )
  WHERE te.program_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticketed_events_program_refresh ON public.programs;
CREATE TRIGGER ticketed_events_program_refresh
AFTER UPDATE OF name ON public.programs
FOR EACH ROW
EXECUTE FUNCTION public.refresh_ticketed_event_program_name();

-- Backfill search vectors for existing data
UPDATE public.ticketed_events
SET program_name_cached = COALESCE(program_name_cached, (SELECT name FROM public.programs p WHERE p.id = ticketed_events.program_id LIMIT 1)),
    search_vector = to_tsvector(
      'english',
      COALESCE(title, '') || ' ' ||
      COALESCE(description, '') || ' ' ||
      COALESCE(opponent, '') || ' ' ||
      COALESCE(venue_name, '') || ' ' ||
      COALESCE((SELECT name FROM public.programs p WHERE p.id = ticketed_events.program_id LIMIT 1), '')
    ),
    sale_status = CASE
      WHEN status = 'published' AND sales_start_at IS NOT NULL AND sales_start_at > now() THEN 'scheduled'
      WHEN status = 'published' AND sales_end_at IS NOT NULL AND sales_end_at < now() THEN 'ended'
      WHEN status = 'published' THEN 'on_sale'
      ELSE 'off'
    END;

CREATE INDEX IF NOT EXISTS idx_ticketed_events_search_vector ON public.ticketed_events USING GIN (search_vector);
