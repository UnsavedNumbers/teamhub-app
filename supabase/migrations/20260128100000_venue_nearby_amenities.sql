-- ============================================================================
-- Venue Nearby Amenities Tables
-- ============================================================================
-- Stores nearby places cache and Gemini-curated amenities for event venues.
-- Enables context-aware nearby amenities display on event and travel pages.

-- ============================================================================
-- Table: venue_nearby_places
-- ============================================================================
-- Cache raw Nearby Search results per venue.
-- Uses venue_key for deduplication: "place_id:ChIJ..." when place_id available,
-- else "lat:<rounded>,lng:<rounded>" when only coordinates are provided.

CREATE TABLE IF NOT EXISTS venue_nearby_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_key TEXT NOT NULL UNIQUE, -- "place_id:ChIJ..." or "lat:32.1234,lng:-117.5678"
  latitude DECIMAL(10, 7), -- Venue latitude (may be null if resolved from place_id)
  longitude DECIMAL(10, 7), -- Venue longitude (may be null if resolved from place_id)
  raw_places_json JSONB, -- Normalized array of {place_id, name, location, types, walking_minutes} (max 40 items)
  fetched_at TIMESTAMPTZ, -- When raw places were fetched
  last_api_call_at TIMESTAMPTZ, -- Last Places API call timestamp (for rate limiting)
  fetch_in_progress BOOLEAN DEFAULT false, -- Lock flag to prevent concurrent fetches
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_venue_nearby_places_venue_key ON venue_nearby_places(venue_key);
CREATE INDEX IF NOT EXISTS idx_venue_nearby_places_fetched_at ON venue_nearby_places(fetched_at);
CREATE INDEX IF NOT EXISTS idx_venue_nearby_places_fetch_in_progress ON venue_nearby_places(venue_key) WHERE fetch_in_progress = true;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_venue_nearby_places_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_nearby_places_updated_at
  BEFORE UPDATE ON venue_nearby_places
  FOR EACH ROW
  EXECUTE FUNCTION update_venue_nearby_places_updated_at();

-- ============================================================================
-- Table: venue_nearby_amenities_summaries
-- ============================================================================
-- Cache Gemini-curated lists per venue and context (event_type, time_window).

CREATE TABLE IF NOT EXISTS venue_nearby_amenities_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_nearby_places_id UUID NOT NULL REFERENCES venue_nearby_places(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'game', 'practice', 'tournament', 'tryout', etc.
  time_window TEXT NOT NULL, -- 'morning', 'afternoon', 'evening'
  summaries_json JSONB, -- Array of {place_id, name, walking_minutes, category, description}
  gemini_called_at TIMESTAMPTZ, -- When Gemini was called for this context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for venue + context combination
  UNIQUE (venue_nearby_places_id, event_type, time_window)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_venue_nearby_amenities_summaries_venue_id ON venue_nearby_amenities_summaries(venue_nearby_places_id);
CREATE INDEX IF NOT EXISTS idx_venue_nearby_amenities_summaries_context ON venue_nearby_amenities_summaries(venue_nearby_places_id, event_type, time_window);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_venue_nearby_amenities_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_nearby_amenities_summaries_updated_at
  BEFORE UPDATE ON venue_nearby_amenities_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_venue_nearby_amenities_summaries_updated_at();

-- ============================================================================
-- RPC Functions for Rate Limiting
-- ============================================================================

-- Check if we can fetch nearby places (24h rate limit)
CREATE OR REPLACE FUNCTION can_fetch_nearby_places(p_venue_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_call TIMESTAMPTZ;
BEGIN
  SELECT last_api_call_at INTO v_last_call
  FROM venue_nearby_places
  WHERE venue_key = p_venue_key;
  
  -- NULL means never called, allow
  IF v_last_call IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if 24 hours have passed
  RETURN (NOW() - v_last_call) >= INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Check if we can call Gemini for a specific context (24h rate limit)
CREATE OR REPLACE FUNCTION can_fetch_nearby_gemini(p_venue_key TEXT, p_event_type TEXT, p_time_window TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_call TIMESTAMPTZ;
  v_places_id UUID;
BEGIN
  -- Get the venue_nearby_places_id for this venue_key
  SELECT id INTO v_places_id
  FROM venue_nearby_places
  WHERE venue_key = p_venue_key;
  
  -- If no places record exists, allow (we'll create it)
  IF v_places_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if Gemini was called for this context
  SELECT gemini_called_at INTO v_last_call
  FROM venue_nearby_amenities_summaries
  WHERE venue_nearby_places_id = v_places_id
    AND event_type = p_event_type
    AND time_window = p_time_window;
  
  -- NULL means never called for this context, allow
  IF v_last_call IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if 24 hours have passed
  RETURN (NOW() - v_last_call) >= INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE venue_nearby_places IS 'Caches Google Places Nearby Search results per venue';
COMMENT ON COLUMN venue_nearby_places.venue_key IS 'Unique key: "place_id:ChIJ..." when place_id available, else "lat:<lat>,lng:<lng>"';
COMMENT ON COLUMN venue_nearby_places.raw_places_json IS 'Normalized array of up to 40 nearby places with {place_id, name, location, types, walking_minutes}';
COMMENT ON COLUMN venue_nearby_places.fetch_in_progress IS 'Lock flag to prevent concurrent fetches for the same venue';

COMMENT ON TABLE venue_nearby_amenities_summaries IS 'Caches Gemini-curated amenity lists per venue and event context';
COMMENT ON COLUMN venue_nearby_amenities_summaries.event_type IS 'Event type: game, practice, tournament, tryout, etc.';
COMMENT ON COLUMN venue_nearby_amenities_summaries.time_window IS 'Time of day: morning (05-11), afternoon (11-17), evening (17-05)';
COMMENT ON COLUMN venue_nearby_amenities_summaries.summaries_json IS 'Array of curated amenities: {place_id, name, walking_minutes, category, description}';
