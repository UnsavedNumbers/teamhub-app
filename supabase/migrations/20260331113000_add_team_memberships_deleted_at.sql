-- Add deleted_at column to team_memberships for soft deletes (used by RLS helpers)

ALTER TABLE team_memberships
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_team_memberships_deleted_at
  ON team_memberships(deleted_at);

COMMENT ON COLUMN team_memberships.deleted_at IS
  'Soft delete timestamp. NULL means active.';
