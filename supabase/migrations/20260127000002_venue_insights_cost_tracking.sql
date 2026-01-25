-- ============================================================================
-- Venue Insights Cost Tracking
-- ============================================================================
-- Adds cost tracking columns to organization_settings table for API usage monitoring.

-- Check if organization_settings table exists before adding columns
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'organization_settings'
  ) THEN
    -- Add cost tracking columns
    ALTER TABLE organization_settings 
    ADD COLUMN IF NOT EXISTS venue_insights_daily_limit INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS venue_insights_monthly_limit INTEGER DEFAULT 2000,
    ADD COLUMN IF NOT EXISTS venue_insights_daily_usage INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS venue_insights_monthly_usage INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS venue_insights_last_reset_date DATE DEFAULT CURRENT_DATE;
    
    COMMENT ON COLUMN organization_settings.venue_insights_daily_limit IS 'Maximum venue insights API calls allowed per day';
    COMMENT ON COLUMN organization_settings.venue_insights_monthly_limit IS 'Maximum venue insights API calls allowed per month';
    COMMENT ON COLUMN organization_settings.venue_insights_daily_usage IS 'Current daily API call count';
    COMMENT ON COLUMN organization_settings.venue_insights_monthly_usage IS 'Current monthly API call count';
    COMMENT ON COLUMN organization_settings.venue_insights_last_reset_date IS 'Last date when daily usage was reset';
  END IF;
END $$;
