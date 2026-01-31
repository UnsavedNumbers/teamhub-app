-- ============================================================================
-- Reset Mock Organization RPC
-- ============================================================================
-- Platform Admin feature to reset mock/seed organizations: deletes all
-- org-scoped child data (no restore in RPC; re-run seed-all.ts to repopulate).
-- Reset is supported only for mock orgs created via seed-all.ts (UUID).
--
-- Mock org UUIDs: keep in sync with src/utils/mockOrganizationUtils.ts
-- ============================================================================

-- Add RESET_MOCK_ORGANIZATION to admin_event_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'RESET_MOCK_ORGANIZATION'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_event_type')
  ) THEN
    ALTER TYPE admin_event_type ADD VALUE 'RESET_MOCK_ORGANIZATION';
  END IF;
END $$;

-- Add to valid_event_types table
INSERT INTO valid_event_types (category, event_type, enum_name, description) VALUES
('ADMIN', 'RESET_MOCK_ORGANIZATION', 'admin_event_type', 'Mock organization reset to empty state by platform admin')
ON CONFLICT (category, event_type) DO NOTHING;

-- ============================================================================
-- is_mock_organization(org_id UUID) -> BOOLEAN
-- ============================================================================
CREATE OR REPLACE FUNCTION is_mock_organization(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT org_id IS NOT NULL AND org_id IN (
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid
  );
$$;

COMMENT ON FUNCTION is_mock_organization(UUID) IS 'Returns true if org_id is one of the three mock org UUIDs from seed-all.ts. Keep in sync with src/utils/mockOrganizationUtils.ts.';

-- ============================================================================
-- admin_reset_mock_organization(target_org_id UUID, reason TEXT) -> JSONB
-- ============================================================================
-- Deletes all org-scoped child data for the given mock org. Does not delete
-- the organization row. Explicit DELETE order (no CASCADE) for auditability.
-- Advisory lock (two bigints from UUID) prevents concurrent resets per org.
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_reset_mock_organization(
  target_org_id UUID,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  admin_role platform_admin_role;
  lock_key_1 bigint;
  lock_key_2 bigint;
BEGIN
  -- Require authenticated caller
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check caller is platform admin with ops_admin or super_admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;

  -- Require non-empty reason (audit)
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'A reason is required.');
  END IF;

  -- Only allow reset of known mock orgs (UUID from seed-all.ts)
  IF NOT is_mock_organization(target_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization is not a mock/seed organization. Reset is only allowed for mock orgs created via seed-all.ts.');
  END IF;

  -- Advisory lock: two bigints from UUID (first 16 hex chars -> high 64 bits, next 16 -> low 64 bits)
  lock_key_1 := ('x' || substr(replace(target_org_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  lock_key_2 := ('x' || substr(replace(target_org_id::text, '-', ''), 17, 16))::bit(64)::bigint;
  IF NOT pg_try_advisory_xact_lock(lock_key_1, lock_key_2) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A reset is already in progress for this organization.');
  END IF;

  -- Delete order: child tables first, then parents. Tables with org_id or FK to org-scoped entities.
  -- Payment-related (allocations and child rows before parents)
  DELETE FROM payment_allocations WHERE payment_id IN (SELECT id FROM payments WHERE org_id = target_org_id);
  DELETE FROM offline_payment_allocations WHERE offline_payment_id IN (SELECT id FROM offline_payments WHERE org_id = target_org_id);
  DELETE FROM checkout_session_items WHERE checkout_session_id IN (SELECT id FROM checkout_sessions WHERE org_id = target_org_id);
  DELETE FROM installments WHERE installment_schedule_id IN (SELECT id FROM installment_schedules WHERE installment_plan_id IN (SELECT id FROM installment_plans WHERE org_id = target_org_id));
  DELETE FROM installment_schedules WHERE installment_plan_id IN (SELECT id FROM installment_plans WHERE org_id = target_org_id);
  DELETE FROM discount_redemptions WHERE discount_code_id IN (SELECT id FROM discount_codes WHERE org_id = target_org_id);
  DELETE FROM scholarship_awards WHERE scholarship_program_id IN (SELECT id FROM scholarship_programs WHERE org_id = target_org_id);
  DELETE FROM payment_events WHERE org_id = target_org_id;
  DELETE FROM payments WHERE org_id = target_org_id;
  DELETE FROM offline_payments WHERE org_id = target_org_id;
  DELETE FROM checkout_sessions WHERE org_id = target_org_id;
  DELETE FROM installment_plans WHERE org_id = target_org_id;
  DELETE FROM fee_assignments WHERE org_id = target_org_id;
  DELETE FROM charges WHERE org_id = target_org_id;
  DELETE FROM discount_codes WHERE org_id = target_org_id;
  DELETE FROM waivers WHERE org_id = target_org_id;
  DELETE FROM scholarship_programs WHERE org_id = target_org_id;
  DELETE FROM refunds WHERE org_id = target_org_id;
  DELETE FROM org_payment_policies WHERE org_id = target_org_id;
  DELETE FROM fees WHERE org_id = target_org_id;

  -- Messages/announcements (by team or org_id)
  DELETE FROM messages WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id);
  DELETE FROM announcements WHERE org_id = target_org_id;
  DELETE FROM announcements WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id);

  -- Uniform submission items, submissions, kit items, then kits (by team)
  DELETE FROM uniform_submission_items WHERE submission_id IN (
    SELECT id FROM uniform_submissions WHERE kit_id IN (SELECT id FROM uniform_kits WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id))
  );
  DELETE FROM uniform_submissions WHERE kit_id IN (SELECT id FROM uniform_kits WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id));
  DELETE FROM uniform_kit_items WHERE kit_id IN (SELECT id FROM uniform_kits WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id));
  DELETE FROM uniform_kits WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id);

  -- Tryouts, team_seasons, teams, seasons, levels, programs
  DELETE FROM tryouts WHERE org_id = target_org_id;
  DELETE FROM team_seasons WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id);
  DELETE FROM teams WHERE org_id = target_org_id;
  DELETE FROM seasons WHERE org_id = target_org_id;
  DELETE FROM levels WHERE org_id = target_org_id;
  DELETE FROM programs WHERE org_id = target_org_id;

  -- Org-scoped tables
  DELETE FROM organization_sports WHERE org_id = target_org_id;
  DELETE FROM notification_jobs WHERE org_id = target_org_id;
  DELETE FROM guardian_attachment_requests WHERE org_id = target_org_id;
  DELETE FROM stream_channels WHERE org_id = target_org_id;
  DELETE FROM athlete_guardians WHERE org_id = target_org_id;
  DELETE FROM athlete_imports WHERE org_id = target_org_id;
  DELETE FROM organization_invites WHERE org_id = target_org_id;
  DELETE FROM organization_members WHERE org_id = target_org_id;
  DELETE FROM feature_flags WHERE org_id = target_org_id;
  DELETE FROM user_notifications WHERE org_id = target_org_id;

  -- Parent onboarding / invites (org_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parent_invites') THEN
    DELETE FROM parent_invites WHERE org_id = target_org_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'join_links') THEN
    DELETE FROM join_links WHERE org_id = target_org_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'join_requests') THEN
    DELETE FROM join_requests WHERE org_id = target_org_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'child_claim_tokens') THEN
    DELETE FROM child_claim_tokens WHERE org_id = target_org_id;
  END IF;

  -- Athletes in org families (families have org_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'athletes') THEN
    DELETE FROM athletes WHERE family_id IN (SELECT id FROM families WHERE org_id = target_org_id);
  END IF;
  DELETE FROM families WHERE org_id = target_org_id;

  -- Organization settings tables
  DELETE FROM organization_advanced_settings WHERE org_id = target_org_id;
  DELETE FROM organization_notification_settings WHERE org_id = target_org_id;
  DELETE FROM organization_visibility_settings WHERE org_id = target_org_id;
  DELETE FROM organization_registration_settings WHERE org_id = target_org_id;
  DELETE FROM organization_attendance_settings WHERE org_id = target_org_id;
  DELETE FROM organization_defaults WHERE org_id = target_org_id;
  DELETE FROM organization_settings WHERE org_id = target_org_id;

  -- Attendance (org_id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'org_id') THEN
    DELETE FROM attendance WHERE org_id = target_org_id;
  END IF;

  -- Log event
  PERFORM log_event(
    'ADMIN'::event_category,
    'RESET_MOCK_ORGANIZATION',
    'platform_admin'::event_actor_role,
    auth.uid(),
    target_org_id,
    'organization',
    target_org_id,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason),
    NULL,
    NULL,
    NULL
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION admin_reset_mock_organization(UUID, TEXT) IS 'Platform Admin: resets a mock/seed org by deleting all org-scoped child data. Does not delete the organization row. Re-run seed-all.ts to repopulate.';

-- Grant execute to authenticated (RLS and function checks enforce platform admin)
GRANT EXECUTE ON FUNCTION admin_reset_mock_organization(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_mock_organization(UUID) TO authenticated;
