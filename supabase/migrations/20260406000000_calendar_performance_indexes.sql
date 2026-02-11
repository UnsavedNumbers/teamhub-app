-- Migration: Calendar Performance Optimization
-- Purpose: Add composite indexes for common calendar query patterns
-- 
-- The portal calendar queries filter by team_id, season_id, and date ranges (start_time).
-- Current single-column indexes don't efficiently support these combined filters.

-- ============================================================================
-- Composite Indexes for Events Table
-- ============================================================================

-- Index for team + date range queries (most common calendar pattern)
-- Covers: WHERE team_id = X AND start_time BETWEEN Y AND Z ORDER BY start_time
CREATE INDEX IF NOT EXISTS idx_events_team_start_time 
    ON public.events (team_id, start_time);

-- Index for season + date range queries
-- Covers: WHERE season_id = X AND start_time BETWEEN Y AND Z ORDER BY start_time
CREATE INDEX IF NOT EXISTS idx_events_season_start_time 
    ON public.events (season_id, start_time);

-- Index for non-cancelled events with team filtering (common for active calendar views)
-- Covers: WHERE team_id = X AND is_cancelled = false ORDER BY start_time
CREATE INDEX IF NOT EXISTS idx_events_team_active 
    ON public.events (team_id, start_time) 
    WHERE is_cancelled = false;

-- Index for upcoming events query pattern
-- Covers: WHERE start_time >= NOW() AND is_cancelled = false ORDER BY start_time
CREATE INDEX IF NOT EXISTS idx_events_upcoming_active 
    ON public.events (start_time) 
    WHERE is_cancelled = false;

-- ============================================================================
-- Composite Indexes for Event RSVPs (frequently joined)
-- ============================================================================

-- Index for event RSVP lookups (joined in buildEventQuery)
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_athlete 
    ON public.event_rsvps (event_id, athlete_id);

-- Index for general RSVPs by event
CREATE INDEX IF NOT EXISTS idx_event_general_rsvps_event 
    ON public.event_general_rsvps (event_id);

-- ============================================================================
-- Indexes for Related Tables Joined in Calendar Queries
-- ============================================================================

-- Teams lookup by org (for team dropdown filters)
CREATE INDEX IF NOT EXISTS idx_teams_org_id 
    ON public.teams (org_id);

-- Seasons lookup by team (already linked via team_seasons, but useful for direct queries)
CREATE INDEX IF NOT EXISTS idx_seasons_team_active 
    ON public.seasons (team_id) 
    WHERE is_active = true;

-- ============================================================================
-- Analyze tables to update statistics after index creation
-- ============================================================================
ANALYZE public.events;
ANALYZE public.event_rsvps;
ANALYZE public.event_general_rsvps;
ANALYZE public.teams;
ANALYZE public.seasons;
