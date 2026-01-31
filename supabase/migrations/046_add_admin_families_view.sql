-- ============================================================================
-- Add admin_families View
-- ============================================================================
-- This migration creates an admin view for families that platform admins can
-- use to view family information. The view includes family details and
-- aggregated counts of children and members.
-- ============================================================================

DROP VIEW IF EXISTS admin_families;

CREATE OR REPLACE VIEW admin_families AS
SELECT 
  f.id,
  f.org_id,
  f.name AS family_name,
  f.created_at,
  f.updated_at,
  o.name AS organization_name,
  -- Count of children (athletes) in this family
  (
    SELECT COUNT(*)
    FROM athletes a
    WHERE a.family_id = f.id
  ) AS children_count,
  -- Count of parent users in this family
  (
    SELECT COUNT(DISTINCT u.id)
    FROM users u
    WHERE u.family_id = f.id
  ) AS parent_count,
  -- List of children names (for quick reference)
  (
    SELECT COALESCE(json_agg(json_build_object(
      'id', a.id,
      'first_name', a.first_name,
      'last_name', a.last_name
    ) ORDER BY a.last_name, a.first_name), '[]'::json)
    FROM athletes a
    WHERE a.family_id = f.id
  ) AS children,
  -- List of parent emails (for quick reference)
  (
    SELECT COALESCE(json_agg(json_build_object(
      'id', u.id,
      'email', u.email,
      'display_name', u.display_name
    )), '[]'::json)
    FROM users u
    WHERE u.family_id = f.id
  ) AS parents
FROM families f
JOIN organizations o ON o.id = f.org_id
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());

-- Grant access
GRANT SELECT ON admin_families TO authenticated;

COMMENT ON VIEW admin_families IS 'Platform admin view: all families with children and parent counts. Only accessible by platform admins.';
