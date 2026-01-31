-- ============================================================================
-- Add User Disabled Status to admin_users View
-- ============================================================================
-- This migration updates the admin_users view to include the disabled/banned
-- status from auth.users so the UI can display it and conditionally show buttons.
-- ============================================================================

DROP VIEW IF EXISTS admin_users;
CREATE OR REPLACE VIEW admin_users AS
SELECT 
  u.id,
  u.email,
  u.phone,
  u.display_name,
  u.created_at,
  u.updated_at,
  (
    SELECT COALESCE(json_agg(json_build_object(
      'org_id', om.org_id,
      'org_name', org.name,
      'role', om.role
    )), '[]'::json)
    FROM organization_members om
    JOIN organizations org ON org.id = om.org_id
    WHERE om.user_id = u.id
  ) AS organizations,
  (
    SELECT COALESCE(array_agg(DISTINCT om.role::text), ARRAY[]::text[])
    FROM organization_members om
    WHERE om.user_id = u.id
  ) AS roles,
  EXISTS (SELECT 1 FROM platform_admins pa2 WHERE pa2.user_id = u.id) AS is_platform_admin,
  (SELECT created_at FROM auth.users au WHERE au.id = u.id) AS last_sign_in_at,
  (SELECT email_confirmed_at IS NOT NULL FROM auth.users au WHERE au.id = u.id) AS email_confirmed,
  (SELECT banned_until IS NOT NULL AND banned_until > NOW() FROM auth.users au WHERE au.id = u.id) AS is_disabled
FROM users u
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());

-- Grant access
GRANT SELECT ON admin_users TO authenticated;

COMMENT ON VIEW admin_users IS 'Platform admin view: all users with roles, organizations, and disabled status. Only accessible by platform admins.';
