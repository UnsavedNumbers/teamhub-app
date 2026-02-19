-- ============================================
-- STAFF AND FAN ROLES IMPLEMENTATION
-- ============================================
-- This migration implements:
-- 1. Staff role: org-scoped role with per-org permissions
-- 2. Fan capabilities: platform-wide capabilities for all authenticated users
-- 3. Ticket transfer system
-- 4. Event visibility controls
-- 5. Calendar aggregation for fans
-- ============================================

-- ============================================
-- PART 1: STAFF ROLE INFRASTRUCTURE
-- ============================================

-- Add 'staff' to org_member_role enum
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'staff' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'org_member_role')
  ) THEN
    ALTER TYPE public.org_member_role ADD VALUE 'staff';
  END IF;
END $$;

-- Add permissions JSONB column to organization_members
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Add audit and lifecycle fields to organization_members
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_reason VARCHAR(100),
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES public.users(id);

-- Create index for active org members queries
CREATE INDEX IF NOT EXISTS idx_org_members_active 
  ON public.organization_members(org_id, user_id, is_active) 
  WHERE is_active = true;

-- Create index for permissions queries
CREATE INDEX IF NOT EXISTS idx_org_members_permissions 
  ON public.organization_members USING GIN (permissions);

-- Create org_user_audit_log table
CREATE TABLE IF NOT EXISTS public.org_user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_user_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'revoked', 'ended')),
  changed_by UUID REFERENCES public.users(id),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_user_audit_log_org_user 
  ON public.org_user_audit_log(org_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_user_audit_log_changed_by 
  ON public.org_user_audit_log(changed_by);

ALTER TABLE ONLY public.org_user_audit_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.org_user_audit_log IS 'Audit trail for organization member role changes, permissions updates, and lifecycle events';

-- ============================================
-- PART 2: FAN CAPABILITIES INFRASTRUCTURE
-- ============================================

-- Create fan_org_follows table (platform-owned data)
CREATE TABLE IF NOT EXISTS public.fan_org_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'post_purchase', 'import')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_fan_follows_user 
  ON public.fan_org_follows(user_id);

CREATE INDEX IF NOT EXISTS idx_fan_follows_org 
  ON public.fan_org_follows(org_id);

ALTER TABLE ONLY public.fan_org_follows ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.fan_org_follows IS 'Platform-owned follows: users can follow organizations to see their public events';

-- Create fan_event_bookmarks table
CREATE TABLE IF NOT EXISTS public.fan_event_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_fan_bookmarks_user 
  ON public.fan_event_bookmarks(user_id);

CREATE INDEX IF NOT EXISTS idx_fan_bookmarks_event 
  ON public.fan_event_bookmarks(event_id);

ALTER TABLE ONLY public.fan_event_bookmarks ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.fan_event_bookmarks IS 'Users can bookmark specific events for quick access';

-- Create purchases table (financial owner, separate from ticket_orders)
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  event_id UUID NOT NULL REFERENCES public.ticketed_events(id),
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  payment_intent_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded', 'partial_refund')),
  refund_eligible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user 
  ON public.purchases(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchases_event 
  ON public.purchases(event_id);

CREATE INDEX IF NOT EXISTS idx_purchases_org 
  ON public.purchases(org_id, created_at DESC);

ALTER TABLE ONLY public.purchases ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.purchases IS 'Financial ownership record for ticket purchases. Refunds go to purchaser.';

-- ============================================
-- PART 3: TICKET TRANSFER SYSTEM
-- ============================================

-- Add transfer fields to tickets table
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES public.purchases(id),
  ADD COLUMN IF NOT EXISTS holder_user_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS holder_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS holder_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;

-- Update tickets status enum if needed (check if 'transferred' exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'transferred' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ticket_status')
  ) THEN
    ALTER TYPE public.ticket_status ADD VALUE 'transferred';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tickets_holder_user 
  ON public.tickets(holder_user_id) 
  WHERE holder_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_holder_email 
  ON public.tickets(holder_email) 
  WHERE holder_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_purchase 
  ON public.tickets(purchase_id);

-- ============================================
-- PART 4: TICKET RESERVATION SYSTEM
-- ============================================

-- Create ticket_reservations table (prevent overselling)
CREATE TABLE IF NOT EXISTS public.ticket_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.ticketed_events(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_event 
  ON public.ticket_reservations(event_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_reservations_expires 
  ON public.ticket_reservations(expires_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_reservations_user 
  ON public.ticket_reservations(user_id, created_at DESC);

ALTER TABLE ONLY public.ticket_reservations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ticket_reservations IS 'Temporary ticket reservations (10-minute hold) to prevent overselling during checkout';

-- ============================================
-- PART 5: FAN CALENDAR CACHE
-- ============================================

-- Create fan_calendar_cache table (performance optimization)
CREATE TABLE IF NOT EXISTS public.fan_calendar_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  calendar_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_fan_calendar_cache_expires 
  ON public.fan_calendar_cache(expires_at);

ALTER TABLE ONLY public.fan_calendar_cache ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.fan_calendar_cache IS 'Cached calendar data for users with >100 calendar items. Refreshed every 15 minutes.';

-- ============================================
-- PART 6: EVENT VISIBILITY ENHANCEMENTS
-- ============================================

-- Create event_visibility enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_visibility') THEN
    CREATE TYPE public.event_visibility AS ENUM (
      'public',
      'unlisted',
      'members',
      'ticket_holders',
      'private'
    );
  END IF;
END $$;

-- Add visibility column to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS visibility public.event_visibility DEFAULT 'public';

-- Add visibility column to ticketed_events table
ALTER TABLE public.ticketed_events
  ADD COLUMN IF NOT EXISTS visibility public.event_visibility DEFAULT 'public';

CREATE INDEX IF NOT EXISTS idx_events_visibility 
  ON public.events(visibility, start_time) 
  WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_ticketed_events_visibility 
  ON public.ticketed_events(visibility, starts_at) 
  WHERE visibility = 'public';

-- ============================================
-- PART 7: USER PREFERENCES
-- ============================================

-- Add user-level deactivation and timezone preference
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS preferred_timezone VARCHAR(50) DEFAULT 'America/New_York';

CREATE INDEX IF NOT EXISTS idx_users_active 
  ON public.users(is_active) 
  WHERE is_active = false;

COMMENT ON COLUMN public.users.is_active IS 'Platform-level kill switch. When false, user cannot access any org features but retains fan capabilities.';
COMMENT ON COLUMN public.users.preferred_timezone IS 'User preference for displaying event times. Defaults to America/New_York.';

-- ============================================
-- PART 8: HELPER FUNCTIONS
-- ============================================

-- Function to get default staff permissions
CREATE OR REPLACE FUNCTION public.get_default_staff_permissions()
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN jsonb_build_object(
    'can_scan_tickets', true,
    'can_view_attendees', true,
    'can_manage_events', false,
    'can_view_financials', false,
    'can_manage_roster', false,
    'can_send_notifications', false,
    'can_manage_staff', false
  );
END;
$$;

COMMENT ON FUNCTION public.get_default_staff_permissions() IS 'Returns default permission set for staff role. Can be overridden per org_user.';

-- Function to add org role with permissions (idempotent)
CREATE OR REPLACE FUNCTION public.add_org_role_with_permissions(
  p_user_id UUID,
  p_org_id UUID,
  p_role public.org_member_role,
  p_permissions JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_org_user_id UUID;
  v_default_permissions JSONB;
BEGIN
  -- Use advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(
    hashtext('org_role_' || p_user_id::text || '_' || p_org_id::text || '_' || p_role::text)
  );

  -- Get default permissions for staff role
  IF p_role = 'staff' AND p_permissions IS NULL THEN
    v_default_permissions := get_default_staff_permissions();
  ELSE
    v_default_permissions := COALESCE(p_permissions, '{}'::jsonb);
  END IF;

  -- Insert or update (idempotent)
  INSERT INTO public.organization_members (
    user_id,
    org_id,
    role,
    permissions,
    is_active
  )
  VALUES (
    p_user_id,
    p_org_id,
    p_role,
    v_default_permissions,
    true
  )
  ON CONFLICT (user_id, org_id, role) 
  DO UPDATE SET
    permissions = COALESCE(EXCLUDED.permissions, organization_members.permissions),
    is_active = true,
    ended_at = NULL,
    ended_reason = NULL,
    updated_at = NOW()
  RETURNING id INTO v_org_user_id;

  -- Log audit event
  INSERT INTO public.org_user_audit_log (
    org_user_id,
    action,
    changed_by,
    new_values
  )
  VALUES (
    v_org_user_id,
    'created',
    auth.uid(),
    jsonb_build_object(
      'user_id', p_user_id,
      'org_id', p_org_id,
      'role', p_role,
      'permissions', v_default_permissions
    )
  );

  RETURN v_org_user_id;
END;
$$;

COMMENT ON FUNCTION public.add_org_role_with_permissions(UUID, UUID, public.org_member_role, JSONB) IS 'Adds or updates an org role with permissions. Idempotent. Uses advisory locks to prevent race conditions.';

-- Function to follow an org (idempotent)
CREATE OR REPLACE FUNCTION public.follow_org(
  p_org_id UUID,
  p_source VARCHAR(50) DEFAULT 'manual'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.fan_org_follows (user_id, org_id, source)
  VALUES (v_user_id, p_org_id, p_source)
  ON CONFLICT (user_id, org_id) DO NOTHING;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.follow_org(UUID, VARCHAR) IS 'Follows an organization. Idempotent - returns success even if already following.';

-- Function to unfollow an org
CREATE OR REPLACE FUNCTION public.unfollow_org(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.fan_org_follows
  WHERE user_id = v_user_id AND org_id = p_org_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.unfollow_org(UUID) IS 'Unfollows an organization.';

-- Function to bookmark an event (idempotent)
CREATE OR REPLACE FUNCTION public.bookmark_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.fan_event_bookmarks (user_id, event_id)
  VALUES (v_user_id, p_event_id)
  ON CONFLICT (user_id, event_id) DO NOTHING;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.bookmark_event(UUID) IS 'Bookmarks an event. Idempotent - returns success even if already bookmarked.';

-- Function to remove bookmark
CREATE OR REPLACE FUNCTION public.remove_bookmark(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.fan_event_bookmarks
  WHERE user_id = v_user_id AND event_id = p_event_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.remove_bookmark(UUID) IS 'Removes an event bookmark.';

-- ============================================
-- PART 9: RLS POLICIES
-- ============================================

-- RLS for org_user_audit_log (org admins can view their org's audit logs)
DROP POLICY IF EXISTS "Org admins can view audit logs" ON public.org_user_audit_log;
CREATE POLICY "Org admins can view audit logs"
  ON public.org_user_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.id = org_user_audit_log.org_user_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
        AND om.is_active = true
    )
  );

-- RLS for fan_org_follows (users can manage their own follows)
DROP POLICY IF EXISTS "Users can manage their own follows" ON public.fan_org_follows;
CREATE POLICY "Users can manage their own follows"
  ON public.fan_org_follows
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS for fan_event_bookmarks (users can manage their own bookmarks)
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON public.fan_event_bookmarks;
CREATE POLICY "Users can manage their own bookmarks"
  ON public.fan_event_bookmarks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS for purchases (users can view their own purchases)
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchases;
CREATE POLICY "Users can view their own purchases"
  ON public.purchases
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Org admins can view purchases for their org
DROP POLICY IF EXISTS "Org admins can view org purchases" ON public.purchases;
CREATE POLICY "Org admins can view org purchases"
  ON public.purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = purchases.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
        AND om.is_active = true
    )
  );

-- RLS for ticket_reservations (users can manage their own reservations)
DROP POLICY IF EXISTS "Users can manage their own reservations" ON public.ticket_reservations;
CREATE POLICY "Users can manage their own reservations"
  ON public.ticket_reservations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS for fan_calendar_cache (users can view their own cache)
DROP POLICY IF EXISTS "Users can view their own calendar cache" ON public.fan_calendar_cache;
CREATE POLICY "Users can view their own calendar cache"
  ON public.fan_calendar_cache
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- PART 10: COMMENTS
-- ============================================

COMMENT ON COLUMN public.organization_members.permissions IS 'Per-org permission overrides for staff role. JSONB object with boolean flags.';
COMMENT ON COLUMN public.organization_members.is_active IS 'Org-level revocation flag. When false, user loses access to this org but retains other org roles.';
COMMENT ON COLUMN public.organization_members.ended_at IS 'Timestamp when role ended. Used for graduated access decay.';
COMMENT ON COLUMN public.organization_members.ended_reason IS 'Reason for role ending (e.g., "user_deleted", "voluntary", "terminated").';
COMMENT ON COLUMN public.organization_members.revoked_by IS 'User who revoked this role (for audit trail).';

COMMENT ON COLUMN public.fan_org_follows.source IS 'How the follow was created: manual (user clicked), post_purchase (after buying ticket), import (bulk import).';

COMMENT ON COLUMN public.purchases.refund_eligible IS 'Whether this purchase is eligible for refunds. Set to false for non-refundable purchases.';

COMMENT ON COLUMN public.tickets.holder_user_id IS 'User who currently holds this ticket (nullable for guest tickets).';
COMMENT ON COLUMN public.tickets.holder_email IS 'Email of ticket holder (required, even if holder_user_id is set).';
COMMENT ON COLUMN public.tickets.holder_name IS 'Name of ticket holder (optional, for display).';
COMMENT ON COLUMN public.tickets.transferred_at IS 'Timestamp when ticket was transferred to current holder.';

COMMENT ON COLUMN public.ticket_reservations.expires_at IS 'Reservation expires at this time. Background job releases expired reservations.';
COMMENT ON COLUMN public.ticket_reservations.status IS 'pending: active reservation, completed: converted to tickets, expired: released.';

COMMENT ON COLUMN public.fan_calendar_cache.expires_at IS 'Cache expires at this time. Background job refreshes cache for active users.';

COMMENT ON TYPE public.event_visibility IS 'public: anyone can see, unlisted: direct link only, members: org members only, ticket_holders: ticket holders only, private: admins/coaches only';
