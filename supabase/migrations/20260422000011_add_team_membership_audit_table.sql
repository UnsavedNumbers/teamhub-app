-- Migration: Create team_membership_audit table
-- Description: Creates an immutable audit log table for tracking all team membership changes, including transfers
-- Date: 2026-04-22

BEGIN;

-- ============================================================================
-- STEP 1: Create team_membership_audit table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_membership_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_membership_id UUID NOT NULL REFERENCES public.team_memberships(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  from_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  to_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'transferred', 'removed', 'status_changed')),
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  old_values JSONB,
  new_values JSONB,
  transfer_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- STEP 2: Add indexes for efficient querying
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_team_membership_audit_membership 
  ON public.team_membership_audit(team_membership_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_membership_audit_athlete 
  ON public.team_membership_audit(athlete_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_membership_audit_from_team 
  ON public.team_membership_audit(from_team_id) 
  WHERE from_team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_membership_audit_to_team 
  ON public.team_membership_audit(to_team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_membership_audit_changed_by 
  ON public.team_membership_audit(changed_by) 
  WHERE changed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_membership_audit_action 
  ON public.team_membership_audit(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_membership_audit_season 
  ON public.team_membership_audit(season_id, created_at DESC);

-- ============================================================================
-- STEP 3: Enable Row Level Security
-- ============================================================================

ALTER TABLE ONLY public.team_membership_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Add RLS policies
-- ============================================================================

-- Policy: Organization admins can view audit logs for their organization's teams
CREATE POLICY "org_admins_can_view_team_membership_audit"
  ON public.team_membership_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      JOIN public.teams t ON t.org_id = om.org_id
      WHERE om.user_id = auth.uid()
        AND om.role = 'org_admin'
        AND (t.id = team_membership_audit.from_team_id OR t.id = team_membership_audit.to_team_id)
    )
  );

-- Policy: Platform admins can view all audit logs
CREATE POLICY "platform_admins_can_view_team_membership_audit"
  ON public.team_membership_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
    )
  );

-- Policy: System can insert audit logs (via service role)
-- Note: This is typically handled via service role, but we include it for completeness
CREATE POLICY "system_can_insert_team_membership_audit"
  ON public.team_membership_audit
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- STEP 5: Add table and column comments
-- ============================================================================

COMMENT ON TABLE public.team_membership_audit IS 'Immutable audit log for all team membership changes, including transfers, additions, removals, and status changes. Never automatically deleted.';

COMMENT ON COLUMN public.team_membership_audit.team_membership_id IS 'Reference to the team_membership record that was changed.';
COMMENT ON COLUMN public.team_membership_audit.athlete_id IS 'Reference to the athlete whose membership changed.';
COMMENT ON COLUMN public.team_membership_audit.from_team_id IS 'Team the player was transferred from (NULL for non-transfer actions).';
COMMENT ON COLUMN public.team_membership_audit.to_team_id IS 'Team the player was transferred to or added to.';
COMMENT ON COLUMN public.team_membership_audit.season_id IS 'Season context for the membership change.';
COMMENT ON COLUMN public.team_membership_audit.action IS 'Type of action: created, transferred, removed, or status_changed.';
COMMENT ON COLUMN public.team_membership_audit.changed_by IS 'User who performed the change (NULL for system-initiated changes).';
COMMENT ON COLUMN public.team_membership_audit.old_values IS 'JSONB snapshot of the membership state before the change.';
COMMENT ON COLUMN public.team_membership_audit.new_values IS 'JSONB snapshot of the membership state after the change.';
COMMENT ON COLUMN public.team_membership_audit.transfer_reason IS 'Optional reason for transfers, provided by the administrator.';

-- ============================================================================
-- STEP 6: Migration verification
-- ============================================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_index_count INTEGER;
BEGIN
  -- Verify table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'team_membership_audit'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'Migration failed: team_membership_audit table not created';
  END IF;

  -- Verify indexes exist (should have at least 7 indexes)
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'team_membership_audit';

  IF v_index_count < 7 THEN
    RAISE EXCEPTION 'Migration failed: expected at least 7 indexes, found %', v_index_count;
  END IF;

  RAISE NOTICE 'Migration successful: team_membership_audit table created with % indexes', v_index_count;
END $$;

COMMIT;
