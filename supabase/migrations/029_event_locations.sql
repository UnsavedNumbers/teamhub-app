-- Phase 09: Event Locations (Structured Data)
-- ============================================
-- Replaces simple location string with structured, actionable location data

-- Create event_locations table
CREATE TABLE IF NOT EXISTS event_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  venue_name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  latitude DECIMAL(10, 8), -- Precision for GPS coordinates
  longitude DECIMAL(11, 8),
  is_tbd BOOLEAN DEFAULT false,
  is_virtual BOOLEAN DEFAULT false,
  virtual_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure location has meaningful data
  CONSTRAINT location_has_data CHECK (
    is_tbd = true OR 
    is_virtual = true OR 
    venue_name IS NOT NULL OR 
    address_line1 IS NOT NULL
  ),
  
  -- Ensure virtual events have a link
  CONSTRAINT virtual_has_link CHECK (
    is_virtual = false OR virtual_link IS NOT NULL
  ),
  
  -- Ensure GPS coordinates are valid
  CONSTRAINT valid_latitude CHECK (
    latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
  ),
  CONSTRAINT valid_longitude CHECK (
    longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
  ),
  
  -- Ensure one location per event
  UNIQUE(event_id)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_event_locations_event_id ON event_locations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_locations_city_state ON event_locations(city, state);
CREATE INDEX IF NOT EXISTS idx_event_locations_is_virtual ON event_locations(is_virtual);
CREATE INDEX IF NOT EXISTS idx_event_locations_is_tbd ON event_locations(is_tbd);

-- Add spatial index for GPS coordinates (if PostGIS is available)
-- CREATE INDEX IF NOT EXISTS idx_event_locations_coordinates ON event_locations USING GIST (
--   ll_to_earth(latitude, longitude)
-- );

-- Add trigger for updated_at
CREATE TRIGGER update_event_locations_updated_at
  BEFORE UPDATE ON event_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing location data from events.location to event_locations
-- This is a one-time migration that preserves backward compatibility
DO $$
DECLARE
  v_event RECORD;
  v_location_id UUID;
BEGIN
  FOR v_event IN 
    SELECT id, location 
    FROM events 
    WHERE location IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM event_locations WHERE event_id = events.id
    )
  LOOP
    -- Create a basic location record from the text field
    -- This assumes the location field contains either a venue name or address
    INSERT INTO event_locations (
      event_id,
      venue_name,
      is_tbd,
      is_virtual
    ) VALUES (
      v_event.id,
      v_event.location,
      false,
      false
    );
  END LOOP;
END $$;

-- Enable RLS on event_locations
ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;

-- Users can view event locations for events they can see
CREATE POLICY "Users can view event locations" ON event_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_locations.event_id
      -- RLS on events table handles visibility
    )
  );

-- Admins can manage event locations for their org's events
CREATE POLICY "Admins can manage event locations" ON event_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN teams t ON t.id = e.team_id
      JOIN users u ON u.id = auth.uid()
      WHERE e.id = event_locations.event_id
      AND u.role = 'admin'
      AND u.org_id = t.org_id
    )
  );

-- Helper function to format full address
CREATE OR REPLACE FUNCTION format_event_location_address(p_location_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_location RECORD;
  v_address TEXT := '';
BEGIN
  SELECT * INTO v_location
  FROM event_locations
  WHERE id = p_location_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Handle special cases
  IF v_location.is_tbd THEN
    RETURN 'Location TBD';
  END IF;
  
  IF v_location.is_virtual THEN
    RETURN 'Virtual Event';
  END IF;
  
  -- Build address string
  IF v_location.venue_name IS NOT NULL THEN
    v_address := v_location.venue_name;
  END IF;
  
  IF v_location.address_line1 IS NOT NULL THEN
    IF v_address != '' THEN
      v_address := v_address || ', ';
    END IF;
    v_address := v_address || v_location.address_line1;
  END IF;
  
  IF v_location.address_line2 IS NOT NULL THEN
    v_address := v_address || ', ' || v_location.address_line2;
  END IF;
  
  IF v_location.city IS NOT NULL THEN
    IF v_address != '' THEN
      v_address := v_address || ', ';
    END IF;
    v_address := v_address || v_location.city;
  END IF;
  
  IF v_location.state IS NOT NULL THEN
    IF v_location.city IS NOT NULL THEN
      v_address := v_address || ', ';
    ELSIF v_address != '' THEN
      v_address := v_address || ', ';
    END IF;
    v_address := v_address || v_location.state;
  END IF;
  
  IF v_location.postal_code IS NOT NULL THEN
    v_address := v_address || ' ' || v_location.postal_code;
  END IF;
  
  RETURN v_address;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to generate Google Maps URL
CREATE OR REPLACE FUNCTION get_event_location_maps_url(p_location_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_location RECORD;
  v_address TEXT;
BEGIN
  SELECT * INTO v_location
  FROM event_locations
  WHERE id = p_location_id;
  
  IF NOT FOUND OR v_location.is_tbd OR v_location.is_virtual THEN
    RETURN NULL;
  END IF;
  
  -- If GPS coordinates are available, use them
  IF v_location.latitude IS NOT NULL AND v_location.longitude IS NOT NULL THEN
    RETURN 'https://www.google.com/maps/search/?api=1&query=' || 
           v_location.latitude || ',' || v_location.longitude;
  END IF;
  
  -- Otherwise, use the formatted address
  v_address := format_event_location_address(p_location_id);
  IF v_address IS NOT NULL THEN
    RETURN 'https://www.google.com/maps/search/?api=1&query=' || 
           replace(v_address, ' ', '+');
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
