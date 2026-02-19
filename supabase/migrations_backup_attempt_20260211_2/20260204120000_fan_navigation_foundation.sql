-- ============================================
-- FAN NAVIGATION FOUNDATION
-- ============================================
-- This migration implements foundation tables and columns for 
-- the comprehensive fan navigation system.
--
-- Features:
-- 1. Fan feed table (denormalized for home page performance)
-- 2. Gallery visibility controls (fans_can_see boolean)
-- 3. Entity privacy levels (public/unlisted/private)
-- 4. QR code security fields for tickets
-- 5. Notification preferences expansion
-- ============================================

-- ============================================
-- PART 1: FAN FEED TABLE
-- ============================================
-- Denormalized feed table for fan home page performance
-- Populated by background jobs when new content is created

CREATE TABLE IF NOT EXISTS public.fan_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('event', 'announcement', 'photo', 'video', 'result')),
  content_id UUID NOT NULL,
  source_entity_type VARCHAR(50) NOT NULL CHECK (source_entity_type IN ('org', 'team', 'athlete')),
  source_entity_id UUID NOT NULL,
  source_entity_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Indexes for fan feed
CREATE INDEX IF NOT EXISTS idx_fan_feed_user_created 
  ON public.fan_feed(fan_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fan_feed_expires 
  ON public.fan_feed(expires_at);

CREATE INDEX IF NOT EXISTS idx_fan_feed_content 
  ON public.fan_feed(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_fan_feed_source 
  ON public.fan_feed(source_entity_type, source_entity_id);

ALTER TABLE ONLY public.fan_feed ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.fan_feed IS 'Denormalized feed for fan home page. Aggregates content from followed entities. Entries expire after 30 days.';
COMMENT ON COLUMN public.fan_feed.fan_user_id IS 'User who should see this feed item (based on their follows)';
COMMENT ON COLUMN public.fan_feed.content_type IS 'Type of content: event, announcement, photo, video, result';
COMMENT ON COLUMN public.fan_feed.content_id IS 'ID of the content item (foreign key to events, announcements, etc)';
COMMENT ON COLUMN public.fan_feed.source_entity_type IS 'Type of entity that created this content: org, team, athlete';
COMMENT ON COLUMN public.fan_feed.source_entity_id IS 'ID of the entity that created this content';
COMMENT ON COLUMN public.fan_feed.expires_at IS 'Feed entries expire after 30 days to keep feed manageable';

-- ============================================
-- PART 2: GALLERY VISIBILITY CONTROLS
-- ============================================
-- Add fans_can_see column to galleries
-- Default: FALSE for new galleries
-- Migration sets existing galleries to TRUE (non-breaking)

ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS fans_can_see BOOLEAN DEFAULT FALSE NOT NULL;

-- Set existing galleries to fans_can_see = TRUE (non-breaking migration)
UPDATE public.galleries 
SET fans_can_see = TRUE 
WHERE fans_can_see IS NULL OR fans_can_see = FALSE;

-- Create index for fan-visible galleries
CREATE INDEX IF NOT EXISTS idx_galleries_fans_can_see 
  ON public.galleries(fans_can_see, created_at DESC) 
  WHERE fans_can_see = TRUE;

COMMENT ON COLUMN public.galleries.fans_can_see IS 'When TRUE, fans following the parent entity can see this gallery. Default FALSE for new galleries.';

-- ============================================
-- PART 3: ENTITY PRIVACY LEVELS
-- ============================================
-- Add privacy_level to organizations, teams, athletes
-- Levels: public (appears in search), unlisted (direct link only), private (requires approval)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_privacy_level') THEN
    CREATE TYPE public.entity_privacy_level AS ENUM (
      'public',
      'unlisted',
      'private'
    );
  END IF;
END $$;

-- Add privacy_level to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS privacy_level public.entity_privacy_level DEFAULT 'public' NOT NULL;

-- Add privacy_level to teams
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS privacy_level public.entity_privacy_level DEFAULT 'public' NOT NULL;

-- Add privacy_level to athletes
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS privacy_level public.entity_privacy_level DEFAULT 'public' NOT NULL;

-- Indexes for privacy-aware discovery
CREATE INDEX IF NOT EXISTS idx_organizations_privacy 
  ON public.organizations(privacy_level) 
  WHERE privacy_level = 'public';

CREATE INDEX IF NOT EXISTS idx_teams_privacy 
  ON public.teams(privacy_level) 
  WHERE privacy_level = 'public';

CREATE INDEX IF NOT EXISTS idx_athletes_privacy 
  ON public.athletes(privacy_level) 
  WHERE privacy_level = 'public';

COMMENT ON TYPE public.entity_privacy_level IS 'public: appears in discover search, anyone can follow. unlisted: direct link required, no search visibility. private: requires invite/approval to follow.';

-- ============================================
-- PART 4: QR CODE SECURITY FOR TICKETS
-- ============================================
-- Add HMAC secret key and rotation support for dynamic QR codes

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS qr_hmac_key VARCHAR(64),
  ADD COLUMN IF NOT EXISTS qr_key_rotated_at TIMESTAMPTZ;

-- Generate HMAC key for existing tickets
UPDATE public.tickets 
SET qr_hmac_key = encode(gen_random_bytes(32), 'hex')
WHERE qr_hmac_key IS NULL;

-- Create index for QR validation queries
CREATE INDEX IF NOT EXISTS idx_tickets_qr_hmac_key 
  ON public.tickets(qr_hmac_key) 
  WHERE status = 'active';

COMMENT ON COLUMN public.tickets.qr_hmac_key IS 'HMAC secret key for generating dynamic QR codes. Rotated on transfer.';
COMMENT ON COLUMN public.tickets.qr_key_rotated_at IS 'Timestamp of last HMAC key rotation. Old QR codes invalid after rotation.';

-- ============================================
-- PART 5: NOTIFICATION PREFERENCES EXPANSION
-- ============================================
-- Add fan-specific notification preferences

-- Create notification preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Default channels
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  
  -- Fan-specific preferences
  schedule_changes_channel VARCHAR(50) DEFAULT 'real_time' CHECK (schedule_changes_channel IN ('real_time', 'digest', 'off')),
  ticket_updates_channel VARCHAR(50) DEFAULT 'real_time' CHECK (ticket_updates_channel IN ('real_time', 'digest', 'off')),
  game_results_channel VARCHAR(50) DEFAULT 'real_time' CHECK (game_results_channel IN ('real_time', 'digest', 'off')),
  photos_added_channel VARCHAR(50) DEFAULT 'daily_digest' CHECK (photos_added_channel IN ('real_time', 'digest', 'off')),
  announcements_channel VARCHAR(50) DEFAULT 'daily_digest' CHECK (announcements_channel IN ('real_time', 'digest', 'off')),
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  -- Per-entity mute list (array of entity IDs to mute)
  muted_entities JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_user 
  ON public.user_notification_preferences(user_id);

ALTER TABLE ONLY public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.user_notification_preferences IS 'User notification preferences for fan and member notifications';
COMMENT ON COLUMN public.user_notification_preferences.muted_entities IS 'Array of entity IDs (orgs/teams/athletes) that user has muted';

-- ============================================
-- PART 6: RLS POLICIES
-- ============================================

-- Fan feed: users can view their own feed
DROP POLICY IF EXISTS "Users can view their own feed" ON public.fan_feed;
CREATE POLICY "Users can view their own feed"
  ON public.fan_feed
  FOR SELECT
  TO authenticated
  USING (fan_user_id = auth.uid());

-- Fan feed: users can update read status
DROP POLICY IF EXISTS "Users can update their own feed read status" ON public.fan_feed;
CREATE POLICY "Users can update their own feed read status"
  ON public.fan_feed
  FOR UPDATE
  TO authenticated
  USING (fan_user_id = auth.uid())
  WITH CHECK (fan_user_id = auth.uid());

-- Notification preferences: users can manage their own preferences
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can manage their own notification preferences"
  ON public.user_notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- PART 7: HELPER FUNCTIONS
-- ============================================

-- Function to populate fan feed for a new follow
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
  INSERT INTO public.fan_feed (fan_user_id, content_type, content_id, source_entity_type, source_entity_id, source_entity_name, created_at)
  SELECT 
    NEW.user_id,
    'event'::VARCHAR(50),
    e.id,
    'org'::VARCHAR(50),
    e.org_id,
    o.name,
    e.created_at
  FROM public.events e
  JOIN public.organizations o ON o.id = e.org_id
  WHERE e.org_id = NEW.org_id
    AND e.visibility = 'public'
    AND e.start_time > NOW()
    AND e.created_at > NOW() - INTERVAL '30 days'
  ORDER BY e.created_at DESC
  LIMIT 10
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for fan feed population on follow
DROP TRIGGER IF EXISTS trg_populate_fan_feed_on_follow ON public.fan_org_follows;
CREATE TRIGGER trg_populate_fan_feed_on_follow
  AFTER INSERT ON public.fan_org_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_fan_feed_on_follow();

COMMENT ON FUNCTION public.populate_fan_feed_on_follow() IS 'Backfills fan feed with recent content when user follows an organization';

-- Function to clean up expired feed entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_fan_feed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  DELETE FROM public.fan_feed
  WHERE expires_at < NOW();
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_fan_feed() IS 'Deletes expired fan feed entries. Should be run by a cron job daily.';

-- ============================================
-- PART 8: DATA INTEGRITY
-- ============================================

-- Ensure all existing tickets have HMAC keys
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.tickets
  WHERE qr_hmac_key IS NULL;
  
  IF v_count > 0 THEN
    UPDATE public.tickets
    SET qr_hmac_key = encode(gen_random_bytes(32), 'hex')
    WHERE qr_hmac_key IS NULL;
    
    RAISE NOTICE 'Generated HMAC keys for % existing tickets', v_count;
  END IF;
END $$;
