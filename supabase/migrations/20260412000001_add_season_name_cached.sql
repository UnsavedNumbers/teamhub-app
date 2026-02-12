-- Add season_name_cached to ticketed_events (mirrors program_name_cached for display fallbacks)
ALTER TABLE public.ticketed_events
  ADD COLUMN IF NOT EXISTS season_name_cached text;

-- Update trigger to populate season_name_cached
CREATE OR REPLACE FUNCTION public.update_ticketed_events_search()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  program_name text;
  season_name text;
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    SELECT name INTO program_name FROM public.programs WHERE id = NEW.program_id LIMIT 1;
  END IF;
  IF NEW.season_id IS NOT NULL THEN
    SELECT name INTO season_name FROM public.seasons WHERE id = NEW.season_id LIMIT 1;
  END IF;

  NEW.program_name_cached := COALESCE(program_name, NEW.program_name_cached);
  NEW.season_name_cached := COALESCE(season_name, NEW.season_name_cached);

  NEW.search_vector :=
    to_tsvector(
      'english',
      COALESCE(NEW.title, '') || ' ' ||
      COALESCE(NEW.description, '') || ' ' ||
      COALESCE(NEW.opponent, '') || ' ' ||
      COALESCE(NEW.venue_name, '') || ' ' ||
      COALESCE(NEW.program_name_cached, '') || ' ' ||
      COALESCE(NEW.season_name_cached, '')
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

-- Refresh cached season names when seasons are renamed
CREATE OR REPLACE FUNCTION public.refresh_ticketed_event_season_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.ticketed_events AS te
  SET season_name_cached = NEW.name,
      search_vector = to_tsvector(
        'english',
        COALESCE(te.title, '') || ' ' ||
        COALESCE(te.description, '') || ' ' ||
        COALESCE(te.opponent, '') || ' ' ||
        COALESCE(te.venue_name, '') || ' ' ||
        COALESCE(te.program_name_cached, '') || ' ' ||
        COALESCE(NEW.name, '')
      )
  WHERE te.season_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticketed_events_season_refresh ON public.seasons;
CREATE TRIGGER ticketed_events_season_refresh
AFTER UPDATE OF name ON public.seasons
FOR EACH ROW
EXECUTE FUNCTION public.refresh_ticketed_event_season_name();

-- Backfill season_name_cached for existing rows
UPDATE public.ticketed_events
SET season_name_cached = COALESCE(season_name_cached, (SELECT name FROM public.seasons s WHERE s.id = ticketed_events.season_id LIMIT 1))
WHERE season_id IS NOT NULL;
