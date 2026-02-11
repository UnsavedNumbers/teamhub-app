-- Function to get org slug by ID, bypassing RLS
-- Used by portal pages to build public ticket links

CREATE OR REPLACE FUNCTION get_org_slug_by_id(p_org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT slug FROM organizations WHERE id = p_org_id;
$$;

GRANT EXECUTE ON FUNCTION get_org_slug_by_id(uuid) TO anon, authenticated, service_role;
