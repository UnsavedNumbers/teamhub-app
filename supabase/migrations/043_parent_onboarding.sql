-- Phase 0X: Parent Onboarding & Child Attachments
-- ===============================================
-- Adds the tables and enums required for parent onboarding flows A/B/C and
-- for attaching parents to children via guardianships rather than direct team
-- membership. Children can now be attached to organizations independent of the
-- legacy family table.

-- Allow children to exist outside of a legacy family so new flows can create
-- children before any family linkage.
ALTER TABLE children
  ALTER COLUMN family_id DROP NOT NULL;

-- ======================
-- Enums / Status types
-- ======================
DO $$ BEGIN
  CREATE TYPE child_guardian_status AS ENUM ('active', 'pending', 'removed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE parent_invite_status AS ENUM ('pending', 'accepted', 'cancelled', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE join_request_status AS ENUM ('pending', 'approved', 'denied');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ======================
-- Child Guardians
-- ======================
CREATE TABLE IF NOT EXISTS child_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status child_guardian_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (child_id, user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_child_guardians_child_user ON child_guardians(child_id, user_id);
CREATE INDEX IF NOT EXISTS idx_child_guardians_user_org ON child_guardians(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_child_guardians_org_child ON child_guardians(organization_id, child_id);

CREATE TRIGGER update_child_guardians_updated_at
  BEFORE UPDATE ON child_guardians
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE child_guardians ENABLE ROW LEVEL SECURITY;

-- ======================
-- Parent Invites (Flow A)
-- ======================
CREATE TABLE IF NOT EXISTS parent_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status parent_invite_status NOT NULL DEFAULT 'pending',
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_invites_org_email ON parent_invites(organization_id, LOWER(email));
CREATE INDEX IF NOT EXISTS idx_parent_invites_child_id ON parent_invites(child_id);

CREATE TRIGGER update_parent_invites_updated_at
  BEFORE UPDATE ON parent_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE parent_invites ENABLE ROW LEVEL SECURITY;

-- ======================
-- Join Links (Flow B)
-- ======================
CREATE TABLE IF NOT EXISTS join_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  auto_approve BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_join_links_org ON join_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_join_links_team ON join_links(team_id);

CREATE TRIGGER update_join_links_updated_at
  BEFORE UPDATE ON join_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE join_links ENABLE ROW LEVEL SECURITY;

-- ======================
-- Join Requests (Flow B)
-- ======================
CREATE TABLE IF NOT EXISTS join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  join_link_id UUID REFERENCES join_links(id) ON DELETE SET NULL,
  status join_request_status NOT NULL DEFAULT 'pending',
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  decision_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_join_requests_requester ON join_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_child_team ON join_requests(child_id, team_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_team_status ON join_requests(team_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_season ON join_requests(season_id);

CREATE TRIGGER update_join_requests_updated_at
  BEFORE UPDATE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- ======================
-- Child Claim Tokens (Flow C)
-- ======================
CREATE TABLE IF NOT EXISTS child_claim_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_claims_child_org ON child_claim_tokens(child_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_child_claims_token ON child_claim_tokens(token);
CREATE INDEX IF NOT EXISTS idx_child_claims_season ON child_claim_tokens(season_id);

CREATE TRIGGER update_child_claim_tokens_updated_at
  BEFORE UPDATE ON child_claim_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE child_claim_tokens ENABLE ROW LEVEL SECURITY;
