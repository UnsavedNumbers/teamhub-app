-- Quick fix: Make update_org_slug SECURITY DEFINER and grant execute permissions
-- This fixes the slug persistence issue

-- Make resolve_org_from_slug SECURITY DEFINER (for public org resolution)
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
  WHERE o.slug = LOWER(p_slug)
    AND o.status != 'deleted';
  
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
      AND o.status != 'deleted'
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Make update_org_slug SECURITY DEFINER and add authorization check
CREATE OR REPLACE FUNCTION update_org_slug(
  p_org_id UUID,
  p_new_slug TEXT
)
RETURNS void AS $$
DECLARE
  v_old_slug TEXT;
BEGIN
  -- Enforce: only org admins or platform admins can update slug (function runs as DEFINER, so RLS is bypassed)
  IF NOT (user_is_org_admin(auth.uid(), p_org_id) OR is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to update this organization slug';
  END IF;

  -- Get current slug
  SELECT slug INTO v_old_slug
  FROM organizations
  WHERE id = p_org_id;
  
  -- Validate new slug is not in use
  IF EXISTS (
    SELECT 1 FROM organizations 
    WHERE slug = LOWER(p_new_slug) AND id != p_org_id
  ) THEN
    RAISE EXCEPTION 'Slug % is already in use', p_new_slug;
  END IF;
  
  -- Delete any existing history entries where previous_slug = new_slug (prevent cycles)
  DELETE FROM org_slug_history 
  WHERE previous_slug = LOWER(p_new_slug);
  
  -- If there was an old slug, add it to history
  IF v_old_slug IS NOT NULL AND v_old_slug != LOWER(p_new_slug) THEN
    INSERT INTO org_slug_history (org_id, previous_slug, expires_at)
    VALUES (
      p_org_id,
      v_old_slug,
      NOW() + INTERVAL '12 months'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Update org with new slug
  UPDATE organizations
  SET slug = LOWER(p_new_slug),
      updated_at = NOW()
  WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_org_slug(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_org_from_slug(TEXT) TO anon, authenticated;
