-- Phase 1.1: Events Travel Fields Migration
-- ============================================
-- Transforms Travel from a separate entity into a computed view of events.
-- Events automatically become "travel events" based on their attributes.

-- ============================================================================
-- PART 1: Add Organization Primary Location Fields
-- ============================================================================
-- Enables distance-based travel detection (see Issue 5 in implementation plan)

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_city TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_state TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_region_radius_miles INTEGER DEFAULT 50;

COMMENT ON COLUMN organizations.primary_city IS 'Primary city location for the organization, used for travel detection';
COMMENT ON COLUMN organizations.primary_state IS 'Primary state location for the organization, used for travel detection';
COMMENT ON COLUMN organizations.primary_region_radius_miles IS 'Radius in miles for "local" events (default 50). Events outside this radius may be considered travel.';

-- ============================================================================
-- PART 2: Add Travel Fields to Events Table
-- ============================================================================
-- All columns are nullable to avoid breaking existing data

-- Explicit travel flag (high confidence indicator)
ALTER TABLE events ADD COLUMN IF NOT EXISTS requires_travel BOOLEAN DEFAULT false;
COMMENT ON COLUMN events.requires_travel IS 'Explicit flag indicating this event requires travel';

-- Overnight trip indicator
ALTER TABLE events ADD COLUMN IF NOT EXISTS overnight BOOLEAN DEFAULT false;
COMMENT ON COLUMN events.overnight IS 'Whether this is an overnight trip';

-- Travel times
ALTER TABLE events ADD COLUMN IF NOT EXISTS departure_time TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS return_time TIMESTAMPTZ;
COMMENT ON COLUMN events.departure_time IS 'When to depart for this event';
COMMENT ON COLUMN events.return_time IS 'When to return from this event';

-- Hotel information (all optional, null-safe - see Issue 7)
ALTER TABLE events ADD COLUMN IF NOT EXISTS hotel_name TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hotel_address TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hotel_phone TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hotel_confirmation TEXT;
COMMENT ON COLUMN events.hotel_name IS 'Name of the hotel for travel events';
COMMENT ON COLUMN events.hotel_address IS 'Full address of the hotel';
COMMENT ON COLUMN events.hotel_phone IS 'Hotel phone number';
COMMENT ON COLUMN events.hotel_confirmation IS 'Hotel reservation confirmation number';

-- Transportation and itinerary
ALTER TABLE events ADD COLUMN IF NOT EXISTS transportation_notes TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS itinerary_file_path TEXT;
COMMENT ON COLUMN events.transportation_notes IS 'Travel instructions and transportation details';
COMMENT ON COLUMN events.itinerary_file_path IS 'Path to itinerary file in storage';

-- Meeting locations (JSONB array of meeting location objects)
ALTER TABLE events ADD COLUMN IF NOT EXISTS meeting_locations JSONB;
COMMENT ON COLUMN events.meeting_locations IS 'Array of meeting location objects: [{name, address, time, notes, maps_url}]';

-- Admin override for travel classification (see Issue 4)
ALTER TABLE events ADD COLUMN IF NOT EXISTS travel_override JSONB;
COMMENT ON COLUMN events.travel_override IS 'Admin override: {is_travel: boolean, reason: string, overridden_by: uuid, overridden_at: timestamptz}';

-- ============================================================================
-- PART 3: Add Constraints for Travel Fields
-- ============================================================================

-- Constraint: return_time > departure_time (if both set)
ALTER TABLE events DROP CONSTRAINT IF EXISTS travel_return_after_departure;
ALTER TABLE events ADD CONSTRAINT travel_return_after_departure CHECK (
  (departure_time IS NULL OR return_time IS NULL) OR 
  (return_time > departure_time)
);

-- Constraint: departure_time < start_time (if set)
ALTER TABLE events DROP CONSTRAINT IF EXISTS travel_departure_before_start;
ALTER TABLE events ADD CONSTRAINT travel_departure_before_start CHECK (
  (departure_time IS NULL) OR 
  (departure_time < start_time)
);

-- Constraint: return_time > end_time (if set)
ALTER TABLE events DROP CONSTRAINT IF EXISTS travel_return_after_end;
ALTER TABLE events ADD CONSTRAINT travel_return_after_end CHECK (
  (return_time IS NULL) OR 
  (return_time > end_time)
);

-- Validate travel_override structure if present
ALTER TABLE events DROP CONSTRAINT IF EXISTS valid_travel_override;
ALTER TABLE events ADD CONSTRAINT valid_travel_override CHECK (
  travel_override IS NULL OR (
    travel_override ? 'is_travel' AND
    (travel_override->>'is_travel' IN ('true', 'false'))
  )
);

-- ============================================================================
-- PART 4: Add Indexes for Travel Queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_events_requires_travel ON events(requires_travel);
CREATE INDEX IF NOT EXISTS idx_events_overnight ON events(overnight);
CREATE INDEX IF NOT EXISTS idx_events_departure_time ON events(departure_time);

-- ============================================================================
-- PART 5: Travel Detection Function
-- ============================================================================
-- Determines if an event is a "travel event" based on various indicators
-- See Issue 1, 4, 5, 10 in implementation plan for design decisions

CREATE OR REPLACE FUNCTION is_travel_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_event RECORD;
  v_org RECORD;
  v_location RECORD;
  v_override JSONB;
  v_is_travel BOOLEAN := false;
BEGIN
  -- Load event with team relation
  SELECT 
    e.*,
    t.org_id
  INTO v_event
  FROM events e
  JOIN teams t ON t.id = e.team_id
  WHERE e.id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check for admin override first (see Issue 4)
  v_override := v_event.travel_override;
  IF v_override IS NOT NULL AND v_override->>'is_travel' IS NOT NULL THEN
    RETURN (v_override->>'is_travel')::boolean;
  END IF;
  
  -- Rule 1: Explicit travel flag (high confidence)
  IF v_event.requires_travel = true THEN
    RETURN true;
  END IF;
  
  -- Rule 2: Overnight flag (high confidence)
  IF v_event.overnight = true THEN
    RETURN true;
  END IF;
  
  -- Rule 3: Hotel information present (high confidence)
  IF v_event.hotel_name IS NOT NULL OR v_event.hotel_address IS NOT NULL THEN
    RETURN true;
  END IF;
  
  -- Rule 4: Travel times specified (medium confidence)
  IF v_event.departure_time IS NOT NULL OR v_event.return_time IS NOT NULL THEN
    RETURN true;
  END IF;
  
  -- Rule 5: Transportation notes or itinerary present
  IF v_event.transportation_notes IS NOT NULL OR v_event.itinerary_file_path IS NOT NULL THEN
    RETURN true;
  END IF;
  
  -- Rule 6: Event type 'travel' is explicit indicator (see Issue 10)
  IF v_event.type = 'travel' THEN
    RETURN true;
  END IF;
  
  -- Rule 7: Location-based detection (if org has primary location - see Issue 5)
  -- Location is a supporting indicator, not a requirement
  IF v_event.org_id IS NOT NULL THEN
    -- Load org location settings
    SELECT primary_city, primary_state, primary_region_radius_miles
    INTO v_org
    FROM organizations
    WHERE id = v_event.org_id;
    
    -- Only use location detection if org has primary location set
    IF v_org.primary_city IS NOT NULL AND v_org.primary_state IS NOT NULL THEN
      -- Load event location if exists
      SELECT * INTO v_location
      FROM event_locations
      WHERE event_id = p_event_id;
      
      IF FOUND THEN
        -- Different state is strong indicator
        IF v_location.state IS NOT NULL AND v_location.state != v_org.primary_state THEN
          RETURN true;
        END IF;
        
        -- Different city + tournament type suggests travel
        IF v_location.city IS NOT NULL AND v_location.city != v_org.primary_city THEN
          IF v_event.type = 'tournament' THEN
            RETURN true;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- Rule 8: Multi-day events (>24 hours) with away location
  IF EXTRACT(EPOCH FROM (v_event.end_time - v_event.start_time)) > 86400 THEN
    -- Check if location is different from org's primary
    SELECT * INTO v_location FROM event_locations WHERE event_id = p_event_id;
    
    IF FOUND AND v_location.city IS NOT NULL THEN
      SELECT primary_city INTO v_org FROM organizations WHERE id = v_event.org_id;
      IF v_org.primary_city IS NOT NULL AND v_location.city != v_org.primary_city THEN
        RETURN true;
      END IF;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

COMMENT ON FUNCTION is_travel_event(UUID) IS 
  'Determines if an event is a travel event based on various indicators including explicit flags, hotel info, location, and event type.';

-- ============================================================================
-- PART 6: Travel Override Functions (with audit logging - see Issue 4)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_travel_override(
  p_event_id UUID,
  p_is_travel BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update override
  UPDATE events
  SET travel_override = jsonb_build_object(
    'is_travel', p_is_travel,
    'reason', COALESCE(p_reason, 'No reason provided'),
    'overridden_by', auth.uid(),
    'overridden_at', now()
  )
  WHERE id = p_event_id;
  
  -- Log override action to event_logs if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_logs') THEN
    INSERT INTO event_logs (
      category, event_type, actor_user_id, org_id, target_entity_type, target_entity_id, metadata
    )
    SELECT 
      'TRAVEL',
      'TRAVEL_OVERRIDE_SET',
      auth.uid(),
      t.org_id,
      'event',
      p_event_id,
      jsonb_build_object(
        'is_travel', p_is_travel,
        'reason', p_reason,
        'computed_value', is_travel_event(p_event_id)
      )
    FROM events e
    JOIN teams t ON t.id = e.team_id
    WHERE e.id = p_event_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION set_travel_override(UUID, BOOLEAN, TEXT) IS 
  'Sets an admin override for travel classification on an event';

-- Function to clear travel override
CREATE OR REPLACE FUNCTION clear_travel_override(p_event_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE events
  SET travel_override = NULL
  WHERE id = p_event_id;
END;
$$;

COMMENT ON FUNCTION clear_travel_override(UUID) IS 
  'Clears the travel override, reverting to computed travel status';

-- ============================================================================
-- PART 7: Helper function to get travel events for a team
-- ============================================================================

CREATE OR REPLACE FUNCTION get_travel_events_for_team(
  p_team_id UUID,
  p_upcoming_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  hotel_name TEXT,
  hotel_address TEXT,
  location_city TEXT,
  location_state TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.start_time,
    e.end_time,
    e.hotel_name,
    e.hotel_address,
    el.city,
    el.state
  FROM events e
  LEFT JOIN event_locations el ON el.event_id = e.id
  WHERE e.team_id = p_team_id
    AND is_travel_event(e.id) = true
    AND (NOT p_upcoming_only OR e.start_time >= now())
    AND e.is_cancelled = false
  ORDER BY e.start_time ASC;
END;
$$;

COMMENT ON FUNCTION get_travel_events_for_team(UUID, BOOLEAN) IS 
  'Returns travel events for a given team, optionally filtering to upcoming only';
