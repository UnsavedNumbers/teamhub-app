-- Migration: Add INSERT Policy for License Change Log
-- Description: Allows org admins to insert license_change_log entries for their organization
-- Date: 2026-04-12

BEGIN;

-- Org admins can insert license change log entries for their organization
CREATE POLICY license_change_log__org_admin_insert ON license_change_log
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_is_org_admin(auth.uid(), org_id)
  );

COMMENT ON POLICY license_change_log__org_admin_insert ON license_change_log IS
'Allows org admins to create license change log entries when upgrading their organization''s license tier.';

COMMIT;
