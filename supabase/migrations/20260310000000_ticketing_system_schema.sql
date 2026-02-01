-- Ticketing System Schema
-- =======================
-- Phase 1: General admission tickets with QR codes and manual entry codes
-- Supports event sales via Stripe Checkout, digital tickets, guest/guardian flows,
-- and manual validation interface for gate staff

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Ticketed event type
DO $$ BEGIN
  CREATE TYPE ticketed_event_type AS ENUM ('game', 'tournament', 'concert', 'fundraiser', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ticketed event status
DO $$ BEGIN
  CREATE TYPE ticketed_event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ticket order status
DO $$ BEGIN
  CREATE TYPE ticket_order_status AS ENUM ('pending_payment', 'paid', 'refunded', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ticket status
DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('active', 'used', 'refunded', 'voided');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ticket scan result
DO $$ BEGIN
  CREATE TYPE ticket_scan_result AS ENUM ('valid', 'already_used', 'invalid', 'wrong_event', 'refunded', 'voided', 'not_found');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Scan method (optional, for analytics)
DO $$ BEGIN
  CREATE TYPE scan_method AS ENUM ('qr', 'manual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Ticketed events (separate from events table to avoid breaking existing flows)
CREATE TABLE IF NOT EXISTS ticketed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- Optional link to existing calendar event
  event_type ticketed_event_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  
  -- Venue information
  venue_name TEXT,
  venue_address_line1 TEXT,
  venue_address_line2 TEXT,
  venue_city TEXT,
  venue_state TEXT,
  venue_postal_code TEXT,
  venue_country TEXT DEFAULT 'US',
  venue_is_virtual BOOLEAN DEFAULT false,
  venue_virtual_link TEXT,
  
  -- Sales window
  sales_start_at TIMESTAMPTZ,
  sales_end_at TIMESTAMPTZ,
  
  -- Media
  cover_image_path TEXT,
  
  -- Status
  status ticketed_event_status NOT NULL DEFAULT 'draft',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_order CHECK (ends_at > starts_at),
  CONSTRAINT valid_sales_window CHECK (sales_end_at IS NULL OR sales_start_at IS NULL OR sales_end_at > sales_start_at),
  CONSTRAINT valid_timezone CHECK (timezone ~ '^[A-Za-z]+/[A-Za-z_]+$' OR timezone = 'UTC')
);

-- Indexes for ticketed_events
CREATE INDEX idx_ticketed_events_org_id_starts_at ON ticketed_events(org_id, starts_at);
CREATE INDEX idx_ticketed_events_team_id_starts_at ON ticketed_events(team_id, starts_at) WHERE team_id IS NOT NULL;
CREATE INDEX idx_ticketed_events_status_starts_at ON ticketed_events(status, starts_at);
CREATE INDEX idx_ticketed_events_event_id ON ticketed_events(event_id) WHERE event_id IS NOT NULL;

-- Ticket types (pricing tiers for an event)
CREATE TABLE IF NOT EXISTS ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticketed_event_id UUID NOT NULL REFERENCES ticketed_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  capacity_total INTEGER CHECK (capacity_total > 0),
  capacity_remaining INTEGER CHECK (capacity_remaining >= 0),
  sales_start_at TIMESTAMPTZ,
  sales_end_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT capacity_remaining_within_total CHECK (capacity_remaining IS NULL OR capacity_total IS NULL OR capacity_remaining <= capacity_total),
  CONSTRAINT valid_sales_window CHECK (sales_end_at IS NULL OR sales_start_at IS NULL OR sales_end_at > sales_start_at)
);

-- Indexes for ticket_types
CREATE INDEX idx_ticket_types_ticketed_event_id_sort_order ON ticket_types(ticketed_event_id, sort_order);
CREATE INDEX idx_ticket_types_org_id_ticketed_event_id ON ticket_types(org_id, ticketed_event_id);

-- Ticket orders (must exist before ticket_holds, which references order_id)
CREATE TABLE IF NOT EXISTS ticket_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticketed_event_id UUID NOT NULL REFERENCES ticketed_events(id) ON DELETE CASCADE,
  purchaser_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  purchaser_email TEXT NOT NULL,
  purchaser_name TEXT,
  status ticket_order_status NOT NULL DEFAULT 'pending_payment',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  fees_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT UNIQUE,
  receipt_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ticket_orders
CREATE INDEX idx_ticket_orders_org_id_created_at ON ticket_orders(org_id, created_at DESC);
CREATE INDEX idx_ticket_orders_ticketed_event_id_created_at ON ticket_orders(ticketed_event_id, created_at DESC);
CREATE INDEX idx_ticket_orders_purchaser_email_created_at ON ticket_orders(purchaser_email, created_at DESC);
CREATE INDEX idx_ticket_orders_status ON ticket_orders(status);

-- Ticket holds (reservations with expiry to prevent overselling)
CREATE TABLE IF NOT EXISTS ticket_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticketed_event_id UUID NOT NULL REFERENCES ticketed_events(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  order_id UUID REFERENCES ticket_orders(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ticket_holds
CREATE INDEX idx_ticket_holds_ticketed_event_id ON ticket_holds(ticketed_event_id);
CREATE INDEX idx_ticket_holds_ticket_type_id ON ticket_holds(ticket_type_id);
CREATE INDEX idx_ticket_holds_order_id ON ticket_holds(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_ticket_holds_expires_at ON ticket_holds(expires_at);

-- Ticket order items
CREATE TABLE IF NOT EXISTS ticket_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ticket_order_items
CREATE INDEX idx_ticket_order_items_order_id ON ticket_order_items(order_id);

-- Tickets (individual tickets issued to purchasers)
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticketed_event_id UUID NOT NULL REFERENCES ticketed_events(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  status ticket_status NOT NULL DEFAULT 'active',
  qr_token_hash TEXT UNIQUE NOT NULL, -- Hash of QR code token (opaque, 128-bit+)
  entry_code TEXT UNIQUE NOT NULL, -- Human-readable code (8-10 chars, safe alphabet, normalized uppercase no dashes)
  used_at TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tickets
CREATE INDEX idx_tickets_ticketed_event_id_status ON tickets(ticketed_event_id, status);
CREATE INDEX idx_tickets_order_id ON tickets(order_id);
CREATE INDEX idx_tickets_qr_token_hash ON tickets(qr_token_hash);
CREATE INDEX idx_tickets_entry_code ON tickets(entry_code);

-- Ticket scans (audit trail of validation attempts)
CREATE TABLE IF NOT EXISTS ticket_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticketed_event_id UUID NOT NULL REFERENCES ticketed_events(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  scanner_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Null for staff-link sessions
  scan_result ticket_scan_result NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  client_device_id TEXT, -- Device/session identifier for staff-link audits
  raw_payload_hash TEXT, -- Hash of QR token or entry code used
  scan_method scan_method, -- Optional: 'qr' or 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ticket_scans
CREATE INDEX idx_ticket_scans_ticketed_event_id_scanned_at ON ticket_scans(ticketed_event_id, scanned_at DESC);
CREATE INDEX idx_ticket_scans_scanner_user_id_scanned_at ON ticket_scans(scanner_user_id, scanned_at DESC) WHERE scanner_user_id IS NOT NULL;
CREATE INDEX idx_ticket_scans_ticket_id ON ticket_scans(ticket_id) WHERE ticket_id IS NOT NULL;

-- Ticket access links (magic links for guest ticket access)
CREATE TABLE IF NOT EXISTS ticket_access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ticket_access_links
CREATE INDEX idx_ticket_access_links_order_id ON ticket_access_links(order_id);
CREATE INDEX idx_ticket_access_links_token_hash ON ticket_access_links(token_hash);
CREATE INDEX idx_ticket_access_links_expires_at ON ticket_access_links(expires_at);

-- Ticket staff links (time-limited access for gate staff without login)
CREATE TABLE IF NOT EXISTS ticket_staff_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticketed_event_id UUID NOT NULL REFERENCES ticketed_events(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_uses INTEGER, -- Optional limit on number of uses
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ticket_staff_links
CREATE INDEX idx_ticket_staff_links_token_hash ON ticket_staff_links(token_hash);
CREATE INDEX idx_ticket_staff_links_org_id ON ticket_staff_links(org_id);
CREATE INDEX idx_ticket_staff_links_ticketed_event_id ON ticket_staff_links(ticketed_event_id);
CREATE INDEX idx_ticket_staff_links_expires_at ON ticket_staff_links(expires_at);

-- Stripe webhook receipts (idempotency tracking)
CREATE TABLE IF NOT EXISTS stripe_webhook_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  outcome TEXT NOT NULL, -- 'success', 'error', 'skipped'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for stripe_webhook_receipts
CREATE INDEX idx_stripe_webhook_receipts_stripe_event_id ON stripe_webhook_receipts(stripe_event_id);
CREATE INDEX idx_stripe_webhook_receipts_processed_at ON stripe_webhook_receipts(processed_at);

-- ============================================================================
-- ORGANIZATIONS COLUMNS
-- ============================================================================

-- Add ticketing columns to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ticketing_enabled BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_ticket_fees_cents INTEGER;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ticket_terms TEXT;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at triggers
CREATE TRIGGER update_ticketed_events_updated_at
  BEFORE UPDATE ON ticketed_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_types_updated_at
  BEFORE UPDATE ON ticket_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_orders_updated_at
  BEFORE UPDATE ON ticket_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate a safe entry code (8-10 chars, no ambiguous characters)
CREATE OR REPLACE FUNCTION generate_entry_code()
RETURNS TEXT AS $$
DECLARE
  safe_alphabet TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code_length INTEGER := 8 + floor(random() * 3)::INTEGER; -- 8-10 chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..code_length LOOP
    result := result || substr(safe_alphabet, floor(random() * length(safe_alphabet))::INTEGER + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to normalize entry code (uppercase, remove dashes/spaces)
CREATE OR REPLACE FUNCTION normalize_entry_code(code TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN upper(regexp_replace(code, '[^A-Z0-9]', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to format entry code with dashes (for display)
CREATE OR REPLACE FUNCTION format_entry_code(code TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := normalize_entry_code(code);
  -- Format as XXXX-XXXX-XXXX if 12 chars, or XXXX-XXXX if 8 chars, etc.
  IF length(normalized) >= 12 THEN
    RETURN substr(normalized, 1, 4) || '-' || substr(normalized, 5, 4) || '-' || substr(normalized, 9);
  ELSIF length(normalized) >= 8 THEN
    RETURN substr(normalized, 1, 4) || '-' || substr(normalized, 5);
  ELSE
    RETURN normalized;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
