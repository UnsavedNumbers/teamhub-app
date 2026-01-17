-- Phase 2: Migrate travel_plans to events
-- =========================================
-- Migrates existing travel_plans data into events table
-- Implements Issue 2 & 9 solutions: Transaction-based with validation and rollback

-- ============================================================================
-- PART 1: Migration Log Table for Conflict Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT NOT NULL,
  travel_plan_id UUID,
  conflict_type TEXT,
  conflict_details JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_migration_log_migration_name ON migration_log(migration_name);
CREATE INDEX IF NOT EXISTS idx_migration_log_travel_plan_id ON migration_log(travel_plan_id);

-- ============================================================================
-- PART 2: Dry-Run Function (Returns preview without inserting)
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_travel_plans_to_events_dry_run()
RETURNS TABLE (
  travel_plan_id UUID,
  would_create_event BOOLEAN,
  validation_errors TEXT[],
  event_preview JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id,
    true,
    ARRAY[]::TEXT[] || 
      CASE WHEN tp.team_id IS NULL THEN ARRAY['Missing team_id'] ELSE ARRAY[]::TEXT[] END ||
      CASE WHEN tp.season_id IS NULL THEN ARRAY['Missing season_id'] ELSE ARRAY[]::TEXT[] END ||
      CASE WHEN tp.title IS NULL OR tp.title = '' THEN ARRAY['Missing title'] ELSE ARRAY[]::TEXT[] END ||
      CASE WHEN tp.start_date IS NULL THEN ARRAY['Missing start_date'] ELSE ARRAY[]::TEXT[] END ||
      CASE WHEN tp.end_date IS NULL THEN ARRAY['Missing end_date'] ELSE ARRAY[]::TEXT[] END ||
      CASE WHEN tp.end_date < tp.start_date THEN ARRAY['Invalid date range: end_date before start_date'] ELSE ARRAY[]::TEXT[] END,
    jsonb_build_object(
      'team_id', tp.team_id,
      'season_id', tp.season_id,
      'title', tp.title,
      'type', 'tournament',
      'start_time', tp.start_date::timestamptz,
      'end_time', (tp.end_date + interval '1 day' - interval '1 second')::timestamptz,
      'requires_travel', true,
      'overnight', tp.end_date > tp.start_date,
      'hotel_name', tp.hotel_name,
      'hotel_address', tp.hotel_address,
      'hotel_phone', tp.hotel_phone,
      'hotel_confirmation', tp.hotel_confirmation,
      'destination_city', tp.destination_city,
      'destination_state', tp.destination_state
    ) AS event_preview
  FROM travel_plans tp
  WHERE tp.status IN ('published', 'cancelled');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_travel_plans_to_events_dry_run() IS 
  'Preview migration results without actually inserting data. Use to verify before running actual migration.';

-- ============================================================================
-- PART 3: Validation Before Migration
-- ============================================================================

DO $$
DECLARE
  v_invalid_count INT;
  v_total_count INT;
  v_error_details TEXT;
BEGIN
  -- Check if travel_plans table exists (might not in fresh installs)
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_plans') THEN
    RAISE NOTICE 'travel_plans table does not exist. Skipping migration.';
    RETURN;
  END IF;
  
  -- Count total travel plans to migrate
  SELECT COUNT(*) INTO v_total_count
  FROM travel_plans tp
  WHERE tp.status IN ('published', 'cancelled');
  
  IF v_total_count = 0 THEN
    RAISE NOTICE 'No travel_plans to migrate.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found % travel_plans to migrate', v_total_count;
  
  -- Validate before migration
  SELECT COUNT(*) INTO v_invalid_count
  FROM travel_plans tp
  WHERE tp.status IN ('published', 'cancelled')
    AND (
      tp.team_id IS NULL OR 
      tp.season_id IS NULL OR 
      tp.title IS NULL OR 
      tp.start_date IS NULL OR 
      tp.end_date IS NULL OR 
      tp.end_date < tp.start_date
    );
  
  IF v_invalid_count > 0 THEN
    -- Log invalid records but continue (we'll skip them)
    RAISE WARNING 'Found % invalid travel_plans that will be skipped. Run migrate_travel_plans_to_events_dry_run() for details.', v_invalid_count;
    
    -- Log conflicts to migration_log
    INSERT INTO migration_log (migration_name, travel_plan_id, conflict_type, conflict_details)
    SELECT 
      'migrate_travel_plans_to_events',
      tp.id,
      'validation_error',
      jsonb_build_object(
        'missing_team_id', tp.team_id IS NULL,
        'missing_season_id', tp.season_id IS NULL,
        'missing_title', tp.title IS NULL OR tp.title = '',
        'missing_start_date', tp.start_date IS NULL,
        'missing_end_date', tp.end_date IS NULL,
        'invalid_date_range', tp.end_date < tp.start_date
      )
    FROM travel_plans tp
    WHERE tp.status IN ('published', 'cancelled')
      AND (
        tp.team_id IS NULL OR 
        tp.season_id IS NULL OR 
        tp.title IS NULL OR 
        tp.start_date IS NULL OR 
        tp.end_date IS NULL OR 
        tp.end_date < tp.start_date
      );
  END IF;
END $$;

-- ============================================================================
-- PART 4: Migrate Travel Plans to Events (Wrapped in Transaction)
-- ============================================================================
-- ON CONFLICT DO NOTHING handles duplicates gracefully

DO $$
DECLARE
  v_migrated_count INT;
  v_location_count INT;
BEGIN
  -- Check if travel_plans table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_plans') THEN
    RETURN;
  END IF;
  
  -- Migrate travel_plans to events
  -- Only migrate valid records (skip those with validation errors)
  INSERT INTO events (
    team_id, 
    season_id, 
    title, 
    type, 
    start_time, 
    end_time,
    timezone,
    location,
    requires_travel, 
    overnight, 
    hotel_name, 
    hotel_address, 
    hotel_phone, 
    hotel_confirmation, 
    notes, 
    itinerary_file_path,
    meeting_locations, 
    created_at, 
    updated_at, 
    is_cancelled
  )
  SELECT 
    tp.team_id,
    tp.season_id,
    tp.title,
    'tournament'::event_type,
    tp.start_date::timestamptz,
    (tp.end_date + interval '1 day' - interval '1 second')::timestamptz,
    'America/New_York', -- Default timezone
    tp.location, -- Legacy location field
    true, -- requires_travel
    CASE WHEN tp.end_date > tp.start_date THEN true ELSE false END, -- overnight
    tp.hotel_name,
    tp.hotel_address,
    tp.hotel_phone,
    tp.hotel_confirmation,
    tp.notes,
    tp.itinerary_file_path,
    tp.meeting_locations,
    tp.created_at,
    tp.updated_at,
    CASE WHEN tp.status = 'cancelled' THEN true ELSE false END -- is_cancelled
  FROM travel_plans tp
  WHERE tp.status IN ('published', 'cancelled')
    -- Only migrate valid records
    AND tp.team_id IS NOT NULL
    AND tp.season_id IS NOT NULL
    AND tp.title IS NOT NULL
    AND tp.start_date IS NOT NULL
    AND tp.end_date IS NOT NULL
    AND tp.end_date >= tp.start_date
    -- Skip if already migrated (matching title, team, and approximate time)
    AND NOT EXISTS (
      SELECT 1 FROM events e
      WHERE e.team_id = tp.team_id
        AND e.title = tp.title
        AND DATE(e.start_time) = tp.start_date
        AND e.requires_travel = true
    );
  
  GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % travel_plans to events', v_migrated_count;
  
  -- Create event_locations for migrated events
  INSERT INTO event_locations (event_id, venue_name, city, state, is_tbd, is_virtual)
  SELECT 
    e.id,
    tp.venue_name,
    tp.destination_city,
    tp.destination_state,
    false,
    false
  FROM events e
  JOIN travel_plans tp ON 
    tp.team_id = e.team_id 
    AND tp.title = e.title
    AND tp.start_date = DATE(e.start_time)
  WHERE e.requires_travel = true
    AND tp.status IN ('published', 'cancelled')
    AND NOT EXISTS (SELECT 1 FROM event_locations WHERE event_id = e.id)
    -- Only create if we have location data
    AND (tp.venue_name IS NOT NULL OR tp.destination_city IS NOT NULL OR tp.destination_state IS NOT NULL)
  ON CONFLICT (event_id) DO NOTHING;
  
  GET DIAGNOSTICS v_location_count = ROW_COUNT;
  RAISE NOTICE 'Created % event_locations for migrated travel events', v_location_count;
  
  -- Log successful migration
  INSERT INTO migration_log (migration_name, conflict_type, conflict_details)
  VALUES (
    'migrate_travel_plans_to_events',
    'success',
    jsonb_build_object(
      'events_created', v_migrated_count,
      'locations_created', v_location_count,
      'completed_at', now()
    )
  );
END $$;

-- ============================================================================
-- PART 5: Mark travel_plans as Deprecated
-- ============================================================================

COMMENT ON TABLE travel_plans IS 
  'DEPRECATED: Use events table with travel detection instead. This table is kept for backward compatibility only. Events with requires_travel=true or detected as travel via is_travel_event() function replace this table''s functionality.';

-- ============================================================================
-- PART 6: Add reference column linking old travel_plan to new event (optional)
-- ============================================================================
-- This helps with any backward compatibility needs

ALTER TABLE events ADD COLUMN IF NOT EXISTS migrated_from_travel_plan_id UUID;
COMMENT ON COLUMN events.migrated_from_travel_plan_id IS 'Reference to original travel_plan ID if this event was migrated';

-- Update migrated events with their source travel_plan_id
UPDATE events e
SET migrated_from_travel_plan_id = tp.id
FROM travel_plans tp
WHERE e.team_id = tp.team_id
  AND e.title = tp.title
  AND DATE(e.start_time) = tp.start_date
  AND e.requires_travel = true
  AND e.migrated_from_travel_plan_id IS NULL
  AND tp.status IN ('published', 'cancelled');

-- ============================================================================
-- PART 7: Create Rollback Function (for emergency use)
-- ============================================================================

CREATE OR REPLACE FUNCTION rollback_travel_migration()
RETURNS TABLE (
  events_deleted INT,
  locations_deleted INT
) AS $$
DECLARE
  v_events_deleted INT;
  v_locations_deleted INT;
BEGIN
  -- Delete event_locations for migrated events
  DELETE FROM event_locations
  WHERE event_id IN (
    SELECT id FROM events WHERE migrated_from_travel_plan_id IS NOT NULL
  );
  GET DIAGNOSTICS v_locations_deleted = ROW_COUNT;
  
  -- Delete migrated events
  DELETE FROM events
  WHERE migrated_from_travel_plan_id IS NOT NULL;
  GET DIAGNOSTICS v_events_deleted = ROW_COUNT;
  
  -- Log rollback
  INSERT INTO migration_log (migration_name, conflict_type, conflict_details)
  VALUES (
    'migrate_travel_plans_to_events',
    'rollback',
    jsonb_build_object(
      'events_deleted', v_events_deleted,
      'locations_deleted', v_locations_deleted,
      'rolled_back_at', now()
    )
  );
  
  RETURN QUERY SELECT v_events_deleted, v_locations_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_travel_migration() IS 
  'Emergency rollback function to delete all migrated events. Use with caution - this will delete events that were created from travel_plans.';
