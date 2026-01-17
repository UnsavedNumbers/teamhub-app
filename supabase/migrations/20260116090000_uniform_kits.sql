-- Phase 07+: Uniform Kits (Full Uniforms Feature)
-- ==============================================
-- Adds kit-based uniform sizing with items, deadlines, locking, and fulfillment.
-- Keeps existing uniform_orders table intact for backward compatibility.

-- ============================================
-- 1) Enums
-- ============================================
DO $$ BEGIN
  CREATE TYPE uniform_submission_status AS ENUM ('not_submitted', 'submitted', 'locked', 'fulfilled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2) Helper security functions (STABLE)
-- ============================================
-- Note: This project already defines user_has_org_access/user_has_org_role in 020_auth_restructure.sql.
-- These helpers reduce duplicated RLS joins and keep policies readable.

CREATE OR REPLACE FUNCTION is_parent_of_child(check_user_id UUID, check_child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN children c ON c.family_id = u.family_id
    WHERE u.id = check_user_id
      AND c.id = check_child_id
  );
$$;

CREATE OR REPLACE FUNCTION staff_can_access_team(check_user_id UUID, check_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM teams t
    WHERE t.id = check_team_id
      AND (
        -- Platform admins can access all orgs
        is_platform_admin(check_user_id)
        OR
        -- Org admins/coaches for the team's org can access
        user_has_org_role(check_user_id, t.org_id, 'org_admin')
        OR
        user_has_org_role(check_user_id, t.org_id, 'coach')
      )
  );
$$;

CREATE OR REPLACE FUNCTION parent_can_access_team_via_membership(check_user_id UUID, check_team_id UUID, check_season_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN children c ON c.family_id = u.family_id
    JOIN team_memberships tm ON tm.child_id = c.id
    WHERE u.id = check_user_id
      AND tm.team_id = check_team_id
      AND tm.season_id = check_season_id
      AND tm.status = 'active'
  );
$$;

-- ============================================
-- 3) Tables
-- ============================================

CREATE TABLE IF NOT EXISTS uniform_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  deadline_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_uniform_kits_team_season_name UNIQUE (team_id, season_id, name)
);

CREATE TABLE IF NOT EXISTS uniform_kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES uniform_kits(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  size_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_uniform_kit_items_kit_name UNIQUE (kit_id, name)
);

CREATE TABLE IF NOT EXISTS uniform_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES uniform_kits(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  status uniform_submission_status NOT NULL DEFAULT 'not_submitted',
  submitted_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_uniform_submissions_kit_child UNIQUE (kit_id, child_id)
);

CREATE TABLE IF NOT EXISTS uniform_submission_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES uniform_submissions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES uniform_kit_items(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_uniform_submission_items_submission_item UNIQUE (submission_id, item_id)
);

-- ============================================
-- 4) Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_uniform_kits_team_season ON uniform_kits(team_id, season_id);
CREATE INDEX IF NOT EXISTS idx_uniform_kits_locked_at ON uniform_kits(locked_at);

CREATE INDEX IF NOT EXISTS idx_uniform_kit_items_kit ON uniform_kit_items(kit_id);
CREATE INDEX IF NOT EXISTS idx_uniform_submissions_kit ON uniform_submissions(kit_id);
CREATE INDEX IF NOT EXISTS idx_uniform_submissions_child ON uniform_submissions(child_id);
CREATE INDEX IF NOT EXISTS idx_uniform_submissions_status ON uniform_submissions(status);
CREATE INDEX IF NOT EXISTS idx_uniform_submission_items_submission ON uniform_submission_items(submission_id);
CREATE INDEX IF NOT EXISTS idx_uniform_submission_items_item ON uniform_submission_items(item_id);

-- ============================================
-- 5) updated_at triggers
-- ============================================
DROP TRIGGER IF EXISTS update_uniform_kits_updated_at ON uniform_kits;
CREATE TRIGGER update_uniform_kits_updated_at
  BEFORE UPDATE ON uniform_kits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_uniform_kit_items_updated_at ON uniform_kit_items;
CREATE TRIGGER update_uniform_kit_items_updated_at
  BEFORE UPDATE ON uniform_kit_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_uniform_submissions_updated_at ON uniform_submissions;
CREATE TRIGGER update_uniform_submissions_updated_at
  BEFORE UPDATE ON uniform_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_uniform_submission_items_updated_at ON uniform_submission_items;
CREATE TRIGGER update_uniform_submission_items_updated_at
  BEFORE UPDATE ON uniform_submission_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6) Enable RLS (policies added separately)
-- ============================================
ALTER TABLE uniform_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE uniform_kit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE uniform_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uniform_submission_items ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS policies will be added in a follow-up migration, similar to 017_deferred_rls_policies.sql.

