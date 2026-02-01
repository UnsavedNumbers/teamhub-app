-- Ticketing System RLS Policies
-- ===============================
-- Row Level Security policies for all ticketing tables
-- No direct client writes to orders/tickets/holds; guest access via Edge Functions only

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE ticketed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_access_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_staff_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_receipts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TICKETED_EVENTS POLICIES
-- ============================================================================

-- Public read for published events
CREATE POLICY "Public can view published ticketed events"
  ON ticketed_events
  FOR SELECT
  USING (status = 'published');

-- Org admins can read all events for their org
CREATE POLICY "Org admins can view their org's ticketed events"
  ON ticketed_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = ticketed_events.org_id
      AND users.role = 'admin'
    )
  );

-- Coaches can read ticketed events for their org
CREATE POLICY "Coaches can view team ticketed events"
  ON ticketed_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'coach'
      AND users.org_id = ticketed_events.org_id
    )
  );

-- Org admins can write (create/update/delete)
CREATE POLICY "Org admins can manage their org's ticketed events"
  ON ticketed_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = ticketed_events.org_id
      AND users.role = 'admin'
    )
  );

-- Coaches can write ticketed events for their org
CREATE POLICY "Coaches can manage team ticketed events"
  ON ticketed_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'coach'
      AND users.org_id = ticketed_events.org_id
    )
  );

-- ============================================================================
-- TICKET_TYPES POLICIES
-- ============================================================================

-- Read aligned with event visibility
CREATE POLICY "Users can view ticket types for visible events"
  ON ticket_types
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ticketed_events te
      WHERE te.id = ticket_types.ticketed_event_id
      -- Event visibility handled by ticketed_events policies
    )
  );

-- Org admins can write
CREATE POLICY "Org admins can manage ticket types"
  ON ticket_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = ticket_types.org_id
      AND users.role = 'admin'
    )
  );

-- Coaches can write ticket types for their org's events
CREATE POLICY "Coaches can manage ticket types for team events"
  ON ticket_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ticketed_events te
      JOIN users u ON u.id = auth.uid()
      WHERE te.id = ticket_types.ticketed_event_id
      AND u.role = 'coach'
      AND u.org_id = te.org_id
    )
  );

-- ============================================================================
-- TICKET_ORDERS POLICIES
-- ============================================================================

-- No direct client writes; only Edge Functions create/update
-- Org admins can read org-wide
CREATE POLICY "Org admins can view their org's ticket orders"
  ON ticket_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = ticket_orders.org_id
      AND users.role = 'admin'
    )
  );

-- Purchasers can read their own orders
CREATE POLICY "Purchasers can view their own ticket orders"
  ON ticket_orders
  FOR SELECT
  USING (
    purchaser_user_id = auth.uid()
    OR (
      purchaser_email = (
        SELECT email FROM users WHERE id = auth.uid()
      )
    )
  );

-- No INSERT/UPDATE/DELETE policies - only Edge Functions can write

-- ============================================================================
-- TICKET_ORDER_ITEMS POLICIES
-- ============================================================================

-- Read aligned with order visibility
CREATE POLICY "Users can view order items for visible orders"
  ON ticket_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ticket_orders ord
      WHERE ord.id = ticket_order_items.order_id
      -- Order visibility handled by ticket_orders policies
    )
  );

-- No INSERT/UPDATE/DELETE policies - only Edge Functions can write

-- ============================================================================
-- TICKETS POLICIES
-- ============================================================================

-- Org admins can read org-wide
CREATE POLICY "Org admins can view their org's tickets"
  ON tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = tickets.org_id
      AND users.role = 'admin'
    )
  );

-- Purchasers can read tickets from their own orders
CREATE POLICY "Purchasers can view their own tickets"
  ON tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ticket_orders ord
      WHERE ord.id = tickets.order_id
      AND (
        ord.purchaser_user_id = auth.uid()
        OR ord.purchaser_email = (SELECT email FROM users WHERE id = auth.uid())
      )
    )
  );

-- No UPDATE policies for status (used/refunded/voided) - only validate-scan Edge Function can update

-- ============================================================================
-- TICKET_SCANS POLICIES
-- ============================================================================

-- Org admins can read org-wide
CREATE POLICY "Org admins can view their org's ticket scans"
  ON ticket_scans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = ticket_scans.org_id
      AND users.role = 'admin'
    )
  );

-- Scanner users (admins/coaches) can read scans they made
CREATE POLICY "Scanner users can view their own scans"
  ON ticket_scans
  FOR SELECT
  USING (
    scanner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = ticket_scans.org_id
      AND users.role IN ('admin', 'coach')
    )
  );

-- No INSERT policies - only validate-scan Edge Function can insert

-- ============================================================================
-- TICKET_HOLDS POLICIES
-- ============================================================================

-- No client access - Edge Functions only
-- No policies needed (service role only)

-- ============================================================================
-- TICKET_ACCESS_LINKS POLICIES
-- ============================================================================

-- No client access - Edge Functions only
-- No policies needed (service role only)

-- ============================================================================
-- TICKET_STAFF_LINKS POLICIES
-- ============================================================================

-- Org admins can read/write their org's staff links
CREATE POLICY "Org admins can manage their org's staff links"
  ON ticket_staff_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = ticket_staff_links.org_id
      AND users.role = 'admin'
    )
  );

-- No client read of raw token - Edge Function validates and returns session context

-- ============================================================================
-- STRIPE_WEBHOOK_RECEIPTS POLICIES
-- ============================================================================

-- Platform admins only (or service role)
CREATE POLICY "Platform admins can view webhook receipts"
  ON stripe_webhook_receipts
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- No INSERT/UPDATE policies - only Edge Functions can write
