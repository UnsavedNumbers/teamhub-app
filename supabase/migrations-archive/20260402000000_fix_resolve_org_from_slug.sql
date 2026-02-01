-- Fix resolve_org_from_slug to avoid invalid enum literal 'deleted'
-- Keeps SECURITY DEFINER so public pages can resolve orgs by slug

CREATE OR REPLACE FUNCTION resolve_org_from_slug(p_slug TEXT)
RETURNS TABLE (
  org_id UUID,
  current_slug TEXT,
  status org_status,
  name TEXT
) AS $$
BEGIN
  -- First, try to find org by current slug
  RETURN QUERY
  SELECT
    o.id,
    o.slug,
    o.status,
    o.name
  FROM organizations o
  WHERE o.slug = LOWER(p_slug);

  -- If not found, check slug history for redirects
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      o.id,
      o.slug as current_slug,
      o.status,
      o.name
    FROM org_slug_history h
    JOIN organizations o ON h.org_id = o.id
    WHERE h.previous_slug = LOWER(p_slug)
      AND h.expires_at > NOW()
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION resolve_org_from_slug(TEXT) TO anon, authenticated;
