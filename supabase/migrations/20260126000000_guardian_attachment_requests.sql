-- Migration: Guardian Attachment Requests
-- =========================================
-- Creates table and functions for guardian self-service attachment requests.
-- Allows guardians to search for existing athletes and request attachment,
-- with org admin approval workflow.

-- ==============================================
-- Create Enum Type
-- ==============================================
DO $$ BEGIN
  CREATE TYPE guardian_attachment_request_status AS ENUM ('pending', 'approved', 'denied');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================
-- Create guardian_attachment_requests Table
-- ==============================================
CREATE TABLE IF NOT EXISTS guardian_attachment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status guardian_attachment_request_status NOT NULL DEFAULT 'pending',
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  decision_reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (athlete_id, requested_by_user_id, org_id)
);

-- ==============================================
-- Create Indexes
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_guardian_attachment_requests_requested_by ON guardian_attachment_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_attachment_requests_athlete_org ON guardian_attachment_requests(athlete_id, org_id);
CREATE INDEX IF NOT EXISTS idx_guardian_attachment_requests_org_status ON guardian_attachment_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_guardian_attachment_requests_expires_at ON guardian_attachment_requests(expires_at);

-- ==============================================
-- Create Trigger for updated_at
-- ==============================================
CREATE TRIGGER update_guardian_attachment_requests_updated_at
  BEFORE UPDATE ON guardian_attachment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- Disable RLS (access control via RPC functions)
-- ==============================================
ALTER TABLE guardian_attachment_requests DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- Comments
-- ==============================================
COMMENT ON TABLE guardian_attachment_requests IS 'Guardian requests to attach themselves to existing athletes. Requires admin approval.';
COMMENT ON COLUMN guardian_attachment_requests.expires_at IS 'Request expires after 30 days if not reviewed';
COMMENT ON COLUMN guardian_attachment_requests.status IS 'pending: awaiting admin review, approved: guardian attached, denied: request rejected';
