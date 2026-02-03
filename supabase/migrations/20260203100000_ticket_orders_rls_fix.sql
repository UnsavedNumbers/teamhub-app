-- Fix RLS policies for ticket_orders to allow org_admins and coaches to view orders
-- This fixes the issue where the admin orders page shows no results

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view ticket orders for their org" ON ticket_orders;
DROP POLICY IF EXISTS "Users can select ticket orders" ON ticket_orders;
DROP POLICY IF EXISTS "Users can insert ticket orders" ON ticket_orders;
DROP POLICY IF EXISTS "Users can update ticket orders" ON ticket_orders;
DROP POLICY IF EXISTS "Users can delete ticket orders" ON ticket_orders;

-- Enable RLS
ALTER TABLE ticket_orders ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Allow org_admins, coaches, platform admins, and order owners to view orders
CREATE POLICY "Users can view ticket orders for their org"
ON ticket_orders
FOR SELECT
TO authenticated
USING (
  -- Platform admins can see everything
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('platform_admin', 'admin')
  )
  OR
  -- Org members with admin/coach roles can see their org's orders
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.org_id = ticket_orders.org_id
    AND organization_members.role IN ('org_admin', 'coach')
  )
  OR
  -- Users whose own orders (by email match)
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.email = ticket_orders.purchaser_email
  )
);

-- INSERT policy: Only service role can insert (via webhooks)
CREATE POLICY "Only service role can insert ticket orders"
ON ticket_orders
FOR INSERT
TO authenticated
WITH CHECK (false);

-- UPDATE policy: Only service role can update orders (via webhooks)
CREATE POLICY "Only service role can update ticket orders"
ON ticket_orders
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- DELETE policy: Only service role can delete orders (via API)
CREATE POLICY "Only service role can delete ticket orders"
ON ticket_orders
FOR DELETE
TO authenticated
USING (false);
