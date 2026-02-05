-- Fix populate_fan_feed_on_follow trigger
-- events table has team_id, not org_id - must join through teams
--
-- VALIDATED TABLE STRUCTURES:
-- fan_org_follows: id, user_id (UUID), org_id (UUID), source, created_at
-- fan_feed: id, fan_user_id (UUID), content_type (VARCHAR 50), content_id (UUID), 
--           source_entity_type (VARCHAR 50), source_entity_id (UUID), source_entity_name (VARCHAR 255),
--           created_at (TIMESTAMPTZ), read (BOOLEAN), expires_at (TIMESTAMPTZ)
-- events: id, team_id (UUID), title, type, start_time, end_time, visibility (event_visibility enum), created_at, ...
-- teams: id, org_id (UUID), name, ...
-- organizations: id, name, ...
--
-- VALIDATED ENUM VALUES:
-- event_visibility: 'public', 'unlisted', 'members', 'ticket_holders', 'private'
-- content_type CHECK: 'event', 'announcement', 'photo', 'video', 'result'
-- source_entity_type CHECK: 'org', 'team', 'athlete'

CREATE OR REPLACE FUNCTION public.populate_fan_feed_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  -- This function is called by a trigger when a user follows an organization
  -- It backfills recent content from that org into the fan's feed
  
  -- Insert recent events from the followed org (last 30 days, limit 10)
  -- NEW.user_id = from fan_org_follows.user_id (UUID)
  -- NEW.org_id = from fan_org_follows.org_id (UUID)
  INSERT INTO public.fan_feed (
    fan_user_id,        -- UUID from NEW.user_id
    content_type,       -- VARCHAR(50) - valid: 'event'
    content_id,         -- UUID from events.id
    source_entity_type, -- VARCHAR(50) - valid: 'org'
    source_entity_id,   -- UUID from teams.org_id
    source_entity_name, -- VARCHAR(255) from organizations.name
    created_at          -- TIMESTAMPTZ from events.created_at
  )
  SELECT 
    NEW.user_id,                  -- fan_org_follows.user_id (UUID)
    'event'::VARCHAR(50),         -- content_type (matches CHECK constraint)
    e.id,                         -- events.id (UUID)
    'org'::VARCHAR(50),           -- source_entity_type (matches CHECK constraint)
    t.org_id,                     -- teams.org_id (UUID)
    o.name,                       -- organizations.name (TEXT, cast to VARCHAR 255)
    e.created_at                  -- events.created_at (TIMESTAMPTZ)
  FROM public.events e
  JOIN public.teams t ON t.id = e.team_id        -- events.team_id -> teams.id
  JOIN public.organizations o ON o.id = t.org_id -- teams.org_id -> organizations.id
  WHERE t.org_id = NEW.org_id                    -- filter by followed org
    AND e.visibility = 'public'                  -- event_visibility enum value
    AND e.start_time > NOW()                     -- only upcoming events
    AND e.created_at > NOW() - INTERVAL '30 days' -- only recent events
  ORDER BY e.created_at DESC
  LIMIT 10
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.populate_fan_feed_on_follow() IS 'Backfills fan feed with recent content when user follows an organization. Joins events->teams->organizations.';
