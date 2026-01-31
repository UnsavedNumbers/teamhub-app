-- ============================================================================
-- Add photo_urls column to venue_insights table
-- ============================================================================
-- Stores URLs to uploaded photos in Supabase Storage instead of relying on
-- direct Google Places API photo URLs (which fail due to referrer restrictions).

ALTER TABLE venue_insights
    ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN venue_insights.photo_urls IS 'Array of public URLs for uploaded venue photos in Supabase Storage';
