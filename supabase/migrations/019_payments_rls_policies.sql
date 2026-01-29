-- =================================================================
-- PAYMENTS + FEES RLS POLICIES
-- YouthSports.team
-- =================================================================
-- Role-based access rules for all payment-related tables
-- 
-- Parents:
-- - Can read their own fee_assignments, charges, checkout_sessions, payments, refunds
-- - Can create checkout_sessions and pay
-- - Can view receipts
-- 
-- Coaches:
-- - Can read only "status flags" per child per fee_assignment (unpaid/partial/paid/etc)
-- - Cannot read amount_cents, charges, payments, refunds
-- - Cannot create fees or financial actions
-- 
-- Org Admins:
-- - Can create fees, publish fees, assign fees
-- - Can record offline payments
-- - Can apply waivers, scholarships, discounts (per policy)
-- - Can refund payments
-- - Can view totals and reports
-- - Cannot view card details
-- 
-- Platform Admin:
-- - Can see everything (handled via service_role key, not RLS)

-- =================================================================
-- ORGANIZATIONS (Payment Fields)
-- =================================================================
-- Note: Organizations RLS already exists in 017, but we ensure payment fields are accessible

-- =================================================================
-- INSTALLMENT PLANS
-- =================================================================

-- Admins can manage installment plans in their org
CREATE POLICY "Admins can manage installment plans" ON installment_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = installment_plans.org_id
    )
  );

-- Parents and coaches can view installment plans in their org (for reference)
CREATE POLICY "Users can view installment plans" ON installment_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = installment_plans.org_id
    )
  );

-- =================================================================
-- FEES
-- =================================================================

-- Admins can manage fees in their org
CREATE POLICY "Admins can manage fees" ON fees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = fees.org_id
    )
  );

-- Parents can view published fees for their children's teams/seasons
CREATE POLICY "Parents can view published fees" ON fees
  FOR SELECT
  USING (
    fees.status IN ('published', 'closed')
    AND (
      -- Fee is visible to all parents
      fees.visibility = 'all_parents'
      OR
      -- Fee is assigned to their children
      EXISTS (
        SELECT 1 FROM users u
        JOIN athletes c ON c.family_id = u.family_id
        JOIN fee_assignments fa ON fa.athlete_id = c.id
        WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND fa.fee_id = fees.id
      )
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = fees.org_id
    )
  );

-- Coaches can view published fees (for reference, no amounts needed)
CREATE POLICY "Coaches can view published fees" ON fees
  FOR SELECT
  USING (
    fees.status IN ('published', 'closed')
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'coach'
      AND users.org_id = fees.org_id
    )
  );

-- =================================================================
-- FEE ASSIGNMENTS
-- =================================================================

-- Parents can view their own fee assignments (full details)
CREATE POLICY "Parents can view their fee assignments" ON fee_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'parent'
      AND users.id = fee_assignments.parent_id
    )
  );

-- Coaches can view fee assignment STATUS ONLY (no amounts)
-- We'll use a view or function to restrict columns, but for now this allows SELECT
-- Application layer should filter out amount_cents, balance_cents, etc.
CREATE POLICY "Coaches can view fee assignment status" ON fee_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN athletes c ON c.id = fee_assignments.athlete_id
      JOIN families f ON f.id = c.family_id
      WHERE u.id = auth.uid()
      AND u.role = 'coach'
      AND u.org_id = f.org_id
    )
  );

-- Admins can manage all fee assignments in their org
CREATE POLICY "Admins can manage fee assignments" ON fee_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = fee_assignments.org_id
    )
  );

-- =================================================================
-- CHARGES
-- =================================================================

-- Parents can view charges for their fee assignments
CREATE POLICY "Parents can view their charges" ON charges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN fee_assignments fa ON fa.id = charges.fee_assignment_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND u.id = fa.parent_id
    )
    OR
    -- Charges without fee_assignment (direct to fee)
    (
      charges.fee_assignment_id IS NULL
      AND EXISTS (
        SELECT 1 FROM users u
        JOIN fees f ON f.id = charges.fee_id
        WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND u.org_id = f.org_id
      )
    )
  );

-- Admins can manage all charges in their org
CREATE POLICY "Admins can manage charges" ON charges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = charges.org_id
    )
  );

-- Coaches CANNOT view charges (no policy = no access)

-- =================================================================
-- CHECKOUT SESSIONS
-- =================================================================

-- Parents can create and view their own checkout sessions
CREATE POLICY "Parents can manage their checkout sessions" ON checkout_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'parent'
      AND users.id = checkout_sessions.parent_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'parent'
      AND users.id = checkout_sessions.parent_id
    )
  );

-- Admins can view all checkout sessions in their org (for support)
CREATE POLICY "Admins can view checkout sessions" ON checkout_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = checkout_sessions.org_id
    )
  );

-- Coaches CANNOT view checkout sessions (no policy = no access)

-- =================================================================
-- CHECKOUT SESSION ITEMS
-- =================================================================

-- Parents can view items for their checkout sessions
CREATE POLICY "Parents can view their checkout session items" ON checkout_session_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN checkout_sessions cs ON cs.id = checkout_session_items.checkout_session_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND u.id = cs.parent_id
    )
  );

-- Admins can view all checkout session items in their org
CREATE POLICY "Admins can view checkout session items" ON checkout_session_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN checkout_sessions cs ON cs.id = checkout_session_items.checkout_session_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = cs.org_id
    )
  );

-- =================================================================
-- PAYMENTS (ONLINE)
-- =================================================================

-- Parents can view their own payments
CREATE POLICY "Parents can view their payments" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'parent'
      AND users.id = payments.parent_id
    )
  );

-- Admins can view all payments in their org
CREATE POLICY "Admins can view payments" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = payments.org_id
    )
  );

-- Coaches CANNOT view payments (no policy = no access)

-- =================================================================
-- PAYMENT ALLOCATIONS
-- =================================================================

-- Parents can view allocations for their payments
CREATE POLICY "Parents can view their payment allocations" ON payment_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN payments p ON p.id = payment_allocations.payment_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND u.id = p.parent_id
    )
  );

-- Admins can view all payment allocations in their org
CREATE POLICY "Admins can view payment allocations" ON payment_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN payments p ON p.id = payment_allocations.payment_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = p.org_id
    )
  );

-- =================================================================
-- OFFLINE PAYMENTS
-- =================================================================

-- Parents can view their own offline payments
CREATE POLICY "Parents can view their offline payments" ON offline_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'parent'
      AND users.id = offline_payments.parent_id
    )
  );

-- Admins can manage all offline payments in their org
CREATE POLICY "Admins can manage offline payments" ON offline_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = offline_payments.org_id
    )
  );

-- Coaches CANNOT view offline payments (no policy = no access)

-- =================================================================
-- OFFLINE PAYMENT ALLOCATIONS
-- =================================================================

-- Parents can view allocations for their offline payments
CREATE POLICY "Parents can view their offline payment allocations" ON offline_payment_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN offline_payments op ON op.id = offline_payment_allocations.offline_payment_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND u.id = op.parent_id
    )
  );

-- Admins can view all offline payment allocations in their org
CREATE POLICY "Admins can view offline payment allocations" ON offline_payment_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN offline_payments op ON op.id = offline_payment_allocations.offline_payment_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = op.org_id
    )
  );

-- =================================================================
-- INSTALLMENT SCHEDULES
-- =================================================================

-- Parents can view their installment schedules
CREATE POLICY "Parents can view their installment schedules" ON installment_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN fee_assignments fa ON fa.id = installment_schedules.fee_assignment_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND u.id = fa.parent_id
    )
  );

-- Admins can manage all installment schedules in their org
CREATE POLICY "Admins can manage installment schedules" ON installment_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN fee_assignments fa ON fa.id = installment_schedules.fee_assignment_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = fa.org_id
    )
  );

-- Coaches CANNOT view installment schedules (no policy = no access)

-- =================================================================
-- INSTALLMENTS
-- =================================================================

-- Parents can view their installments
CREATE POLICY "Parents can view their installments" ON installments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN installment_schedules isch ON isch.id = installments.installment_schedule_id
      JOIN fee_assignments fa ON fa.id = isch.fee_assignment_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND u.id = fa.parent_id
    )
  );

-- Admins can manage all installments in their org
CREATE POLICY "Admins can manage installments" ON installments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN installment_schedules isch ON isch.id = installments.installment_schedule_id
      JOIN fee_assignments fa ON fa.id = isch.fee_assignment_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = fa.org_id
    )
  );

-- Coaches CANNOT view installments (no policy = no access)

-- =================================================================
-- DISCOUNT CODES
-- =================================================================

-- Admins can manage discount codes in their org
CREATE POLICY "Admins can manage discount codes" ON discount_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = discount_codes.org_id
    )
  );

-- Parents can view active discount codes in their org (for checkout)
CREATE POLICY "Parents can view active discount codes" ON discount_codes
  FOR SELECT
  USING (
    discount_codes.status = 'active'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'parent'
      AND users.org_id = discount_codes.org_id
    )
  );

-- Coaches can view discount codes (for reference)
CREATE POLICY "Coaches can view discount codes" ON discount_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'coach'
      AND users.org_id = discount_codes.org_id
    )
  );

-- =================================================================
-- DISCOUNT REDEMPTIONS
-- =================================================================

-- Parents can view their own discount redemptions
CREATE POLICY "Parents can view their discount redemptions" ON discount_redemptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'parent'
      AND users.id = discount_redemptions.redeemed_by_parent_id
    )
  );

-- Admins can view all discount redemptions in their org
CREATE POLICY "Admins can view discount redemptions" ON discount_redemptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN discount_codes dc ON dc.id = discount_redemptions.discount_code_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = dc.org_id
    )
  );

-- Coaches CANNOT view discount redemptions (no policy = no access)

-- =================================================================
-- WAIVERS
-- =================================================================

-- Parents can view waivers for their fee assignments
CREATE POLICY "Parents can view their waivers" ON waivers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN fee_assignments fa ON fa.id = waivers.fee_assignment_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND u.id = fa.parent_id
    )
  );

-- Admins can manage all waivers in their org
CREATE POLICY "Admins can manage waivers" ON waivers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = waivers.org_id
    )
  );

-- Coaches CANNOT view waivers (no policy = no access)

-- =================================================================
-- SCHOLARSHIP PROGRAMS
-- =================================================================

-- Admins can manage scholarship programs in their org
CREATE POLICY "Admins can manage scholarship programs" ON scholarship_programs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = scholarship_programs.org_id
    )
  );

-- Parents can view active scholarship programs (to see if they're eligible)
CREATE POLICY "Parents can view active scholarship programs" ON scholarship_programs
  FOR SELECT
  USING (
    scholarship_programs.status = 'active'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'parent'
      AND users.org_id = scholarship_programs.org_id
    )
  );

-- Coaches can view scholarship programs (for reference)
CREATE POLICY "Coaches can view scholarship programs" ON scholarship_programs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'coach'
      AND users.org_id = scholarship_programs.org_id
    )
  );

-- =================================================================
-- SCHOLARSHIP AWARDS
-- =================================================================

-- Parents can view scholarship awards for their fee assignments
CREATE POLICY "Parents can view their scholarship awards" ON scholarship_awards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN fee_assignments fa ON fa.id = scholarship_awards.fee_assignment_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND u.id = fa.parent_id
    )
  );

-- Admins can manage all scholarship awards in their org
CREATE POLICY "Admins can manage scholarship awards" ON scholarship_awards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN scholarship_programs sp ON sp.id = scholarship_awards.scholarship_program_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = sp.org_id
    )
  );

-- Coaches CANNOT view scholarship awards (no policy = no access)

-- =================================================================
-- REFUNDS
-- =================================================================

-- Parents can view refunds for their payments
CREATE POLICY "Parents can view their refunds" ON refunds
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN payments p ON p.id = refunds.payment_id
      LEFT JOIN offline_payments op ON op.id = refunds.offline_payment_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND (
        (p.id IS NOT NULL AND u.id = p.parent_id)
        OR
        (op.id IS NOT NULL AND u.id = op.parent_id)
      )
    )
  );

-- Admins can manage all refunds in their org
CREATE POLICY "Admins can manage refunds" ON refunds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = refunds.org_id
    )
  );

-- Coaches CANNOT view refunds (no policy = no access)

-- =================================================================
-- ORG PAYMENT POLICIES
-- =================================================================

-- Admins can manage payment policies for their org
CREATE POLICY "Admins can manage payment policies" ON org_payment_policies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = org_payment_policies.org_id
    )
  );

-- All authenticated users can view payment policies in their org
CREATE POLICY "Users can view payment policies" ON org_payment_policies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = org_payment_policies.org_id
    )
  );

-- =================================================================
-- PAYMENT EVENTS (AUDIT LOG)
-- =================================================================

-- Payment events are write-only for normal users
-- Only admins can read payment events (for audit/reporting)

-- Admins can view payment events in their org
CREATE POLICY "Admins can view payment events" ON payment_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.org_id = payment_events.org_id
    )
  );

-- System can insert payment events (via service_role or triggers)
-- Note: Application layer should handle inserts with service_role key
-- or use SECURITY DEFINER functions

-- =================================================================
-- NOTES
-- =================================================================
-- 
-- IMPORTANT: Coaches have LIMITED access to payment data:
-- - They can see fee_assignment.status (unpaid/partial/paid/etc)
-- - They CANNOT see amount_cents, balance_cents, or any financial details
-- - Application layer should filter out sensitive columns when coaches query
-- 
-- To enforce this at the database level, consider creating views that
-- only expose status columns for coaches, or use column-level security
-- (PostgreSQL 15+ feature).
-- 
-- For now, application layer must enforce column filtering for coaches.
-- 
-- =================================================================
