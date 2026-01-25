-- ============================================================================
-- Venue Insights Table
-- ============================================================================
-- Stores Google Places API data and AI-generated summaries for event venues.
-- Enables rich venue information display on event and travel pages.

CREATE TABLE IF NOT EXISTS venue_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL UNIQUE, -- Google Place ID
  place_details_json JSONB, -- Full Place Details API response
  photos_json JSONB, -- Array of {reference: string, width: number, height: number, attribution: string}
  ai_summary TEXT, -- Short venue summary (2-3 sentences)
  ai_what_to_expect TEXT, -- "What to expect" tips (bulleted list)
  ai_generated_at TIMESTAMPTZ, -- When AI summary was created
  ai_validation_status TEXT DEFAULT 'pending', -- 'valid', 'failed', 'pending'
  place_details_fetched_at TIMESTAMPTZ, -- Last Place Details fetch
  last_place_details_call_at TIMESTAMPTZ, -- Last API call timestamp (for rate limiting)
  last_gemini_call_at TIMESTAMPTZ, -- Last Gemini API call timestamp (for rate limiting)
  fetch_in_progress BOOLEAN DEFAULT false, -- Lock flag to prevent concurrent fetches
  place_id_valid BOOLEAN DEFAULT true, -- Whether place_id is still valid
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_venue_insights_place_id ON venue_insights(place_id);
CREATE INDEX IF NOT EXISTS idx_venue_insights_fetched_at ON venue_insights(place_details_fetched_at);
CREATE INDEX IF NOT EXISTS idx_venue_insights_fetch_in_progress ON venue_insights(place_id) WHERE fetch_in_progress = true;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_venue_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_insights_updated_at
  BEFORE UPDATE ON venue_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_venue_insights_updated_at();

-- RPC function for rate limiting checks
CREATE OR REPLACE FUNCTION can_fetch_place_details(p_place_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_call TIMESTAMPTZ;
BEGIN
  SELECT last_place_details_call_at INTO v_last_call
  FROM venue_insights
  WHERE place_id = p_place_id;
  
  -- NULL means never called, allow
  IF v_last_call IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if 24 hours have passed (database handles timezone)
  RETURN (NOW() - v_last_call) >= INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- RPC function to check if Gemini can be called
CREATE OR REPLACE FUNCTION can_fetch_gemini(p_place_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_call TIMESTAMPTZ;
BEGIN
  SELECT last_gemini_call_at INTO v_last_call
  FROM venue_insights
  WHERE place_id = p_place_id;
  
  -- NULL means never called, allow
  IF v_last_call IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if 24 hours have passed
  RETURN (NOW() - v_last_call) >= INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Advisory lock wrapper functions for deadlock prevention
CREATE OR REPLACE FUNCTION pg_advisory_lock_wrapper(key BIGINT)
RETURNS VOID AS $$
BEGIN
  PERFORM pg_advisory_lock(key);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_advisory_unlock_wrapper(key BIGINT)
RETURNS VOID AS $$
BEGIN
  PERFORM pg_advisory_unlock(key);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE venue_insights IS 'Stores Google Places API data and AI-generated summaries for event venues';
COMMENT ON COLUMN venue_insights.place_id IS 'Google Place ID from Places API';
COMMENT ON COLUMN venue_insights.place_details_json IS 'Full Place Details API response stored as JSONB';
COMMENT ON COLUMN venue_insights.photos_json IS 'Array of photo references with metadata: {reference, width, height, attribution}';
COMMENT ON COLUMN venue_insights.ai_summary IS 'AI-generated venue summary (2-3 sentences)';
COMMENT ON COLUMN venue_insights.ai_what_to_expect IS 'AI-generated tips for parents/guardians';
COMMENT ON COLUMN venue_insights.ai_validation_status IS 'Validation status of AI-generated content: valid, failed, pending';
COMMENT ON COLUMN venue_insights.fetch_in_progress IS 'Lock flag to prevent concurrent fetches for the same venue';
COMMENT ON COLUMN venue_insights.place_id_valid IS 'Whether the place_id is still valid (venue may have closed)';
