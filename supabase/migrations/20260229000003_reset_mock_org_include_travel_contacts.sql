-- Extend admin_reset_mock_organization to delete organization_travel_contacts
-- ============================================================================
-- Add organization_travel_contacts to the reset so mock org reset clears travel contacts.

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
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;

  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'A reason is required.');
  END IF;

  IF NOT is_mock_organization(target_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization is not a mock/seed organization. Reset is only allowed for mock orgs created via seed-all.ts.');
  END IF;

  lock_key_1 := ('x' || substr(replace(target_org_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  lock_key_2 := ('x' || substr(replace(target_org_id::text, '-', ''), 17, 16))::bit(64)::bigint;
  IF NOT pg_try_advisory_xact_lock(lock_key_1, lock_key_2) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A reset is already in progress for this organization.');
  END IF;

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

  DELETE FROM messages WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id);
  DELETE FROM announcements WHERE org_id = target_org_id;
  DELETE FROM announcements WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id);

  DELETE FROM uniform_submission_items WHERE submission_id IN (
    SELECT id FROM uniform_submissions WHERE kit_id IN (SELECT id FROM uniform_kits WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id))
  );
  DELETE FROM uniform_submissions WHERE kit_id IN (SELECT id FROM uniform_kits WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id));
  DELETE FROM uniform_kit_items WHERE kit_id IN (SELECT id FROM uniform_kits WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id));
  DELETE FROM uniform_kits WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id);

  DELETE FROM tryouts WHERE org_id = target_org_id;
  DELETE FROM team_seasons WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id);
  DELETE FROM teams WHERE org_id = target_org_id;
  DELETE FROM seasons WHERE org_id = target_org_id;
  DELETE FROM levels WHERE org_id = target_org_id;
  DELETE FROM programs WHERE org_id = target_org_id;

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

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'athletes') THEN
    DELETE FROM athletes WHERE family_id IN (SELECT id FROM families WHERE org_id = target_org_id);
  END IF;
  DELETE FROM families WHERE org_id = target_org_id;

  DELETE FROM organization_advanced_settings WHERE org_id = target_org_id;
  DELETE FROM organization_notification_settings WHERE org_id = target_org_id;
  DELETE FROM organization_visibility_settings WHERE org_id = target_org_id;
  DELETE FROM organization_registration_settings WHERE org_id = target_org_id;
  DELETE FROM organization_attendance_settings WHERE org_id = target_org_id;
  DELETE FROM organization_defaults WHERE org_id = target_org_id;
  DELETE FROM organization_settings WHERE org_id = target_org_id;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_travel_contacts') THEN
    DELETE FROM organization_travel_contacts WHERE org_id = target_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'org_id') THEN
    DELETE FROM attendance WHERE org_id = target_org_id;
  END IF;

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
