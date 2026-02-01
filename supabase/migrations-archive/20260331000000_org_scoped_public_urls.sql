-- Org-Scoped Public URL Architecture
-- ===================================
-- Implements org-scoped public URLs with slug history for redirects
-- URL pattern: /o/{org-slug}/{feature-path}

-- ============================================================================
-- 1. Ensure organizations.slug has proper constraints
-- ============================================================================

-- Make slug lowercase-only constraint (enforced at application level, but add check for safety)
-- Note: Application layer will normalize to lowercase, but DB check prevents edge cases
ALTER TABLE organizations 
  DROP CONSTRAINT IF EXISTS organizations_slug_lowercase_check;

ALTER TABLE organizations 
  ADD CONSTRAINT organizations_slug_lowercase_check 
  CHECK (slug IS NULL OR slug = LOWER(slug));

-- Ensure slug uniqueness is enforced (should already exist from 018_payments_expanded.sql)
-- Add index if missing
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_key ON organizations(slug) WHERE slug IS NOT NULL;

-- ============================================================================
-- 2. Create org_slug_history table for redirects
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_slug_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  previous_slug TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 months'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast slug redirect lookups
-- Note: Cannot use WHERE expires_at > NOW() in predicate (NOW() is not IMMUTABLE).
-- Lookup query filters by expires_at > now() at runtime; index is still used for previous_slug.
DROP INDEX IF EXISTS idx_slug_history_lookup;
CREATE INDEX idx_slug_history_lookup ON org_slug_history 
  (previous_slug, expires_at DESC) 
  INCLUDE (org_id);

-- Unique constraint: prevent circular redirects - a previous_slug cannot match any current org slug
-- This is enforced at application level, but add trigger for safety
CREATE OR REPLACE FUNCTION prevent_slug_collision()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the previous_slug matches any current org slug
  IF EXISTS (
    SELECT 1 FROM organizations 
    WHERE slug = NEW.previous_slug AND id != NEW.org_id
  ) THEN
    RAISE EXCEPTION 'Slug % is currently in use by another organization', NEW.previous_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_slug_collision_before_insert ON org_slug_history;

CREATE TRIGGER check_slug_collision_before_insert
  BEFORE INSERT ON org_slug_history
  FOR EACH ROW
  EXECUTE FUNCTION prevent_slug_collision();

-- ============================================================================
-- 3. Function to resolve org from slug (with redirect support)
-- ============================================================================

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

-- ============================================================================
-- 4. Function to handle slug changes with history tracking
-- ============================================================================

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
    ON CONFLICT DO NOTHING; -- Ignore if already exists
  END IF;
  
  -- Update org with new slug
  UPDATE organizations
  SET slug = LOWER(p_new_slug),
      updated_at = NOW()
  WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow authenticated org admins to call (authorization enforced inside function)
GRANT EXECUTE ON FUNCTION update_org_slug(UUID, TEXT) TO authenticated;

-- Public slug resolution (used by org-scoped public pages; anon may resolve by slug)
GRANT EXECUTE ON FUNCTION resolve_org_from_slug(TEXT) TO anon, authenticated;

-- ============================================================================
-- 5. Cleanup job for expired redirects (to be called by cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_slug_redirects()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM org_slug_history
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Reserved path segments (enforced at application level)
-- ============================================================================
-- These paths are reserved and cannot be used as org slugs:
-- login, signup, admin, api, webhooks, health, about, terms, privacy, portal, o
-- Application layer will validate against this list

COMMENT ON TABLE org_slug_history IS 'Tracks previous org slugs for redirect purposes. Redirects expire after 12 months.';
COMMENT ON FUNCTION resolve_org_from_slug IS 'Resolves an org from a slug, checking both current slugs and redirect history. Returns org_id, current_slug, status, and name.';
COMMENT ON FUNCTION update_org_slug IS 'Updates an org slug and automatically creates redirect history for the old slug. Prevents cycles and collisions.';
COMMENT ON FUNCTION cleanup_expired_slug_redirects IS 'Removes expired slug redirect entries. Should be called daily by cron job.';
