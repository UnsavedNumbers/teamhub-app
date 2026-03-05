-- Create team_coaches table for explicit coach-to-team assignments
-- This replaces org-wide coach access with team-scoped access

CREATE TABLE public.team_coaches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    coach_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text DEFAULT 'head_coach' CHECK (role IN ('head_coach', 'assistant_coach', 'team_manager')),
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')) NOT NULL,
    start_at timestamptz,
    end_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES public.users(id),
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_team_coaches_team_id ON public.team_coaches(team_id);
CREATE INDEX idx_team_coaches_coach_user_id ON public.team_coaches(coach_user_id);
CREATE INDEX idx_team_coaches_org_id ON public.team_coaches(org_id);
CREATE INDEX idx_team_coaches_status ON public.team_coaches(status) WHERE status = 'active';

-- Unique constraint: only one active assignment per (org, team, coach)
-- Using partial unique index to allow multiple inactive assignments
CREATE UNIQUE INDEX team_coaches_unique_active 
    ON public.team_coaches(org_id, team_id, coach_user_id) 
    WHERE status = 'active';

-- RLS
ALTER TABLE public.team_coaches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Org admins can manage all coach assignments in their org
CREATE POLICY team_coaches__org_admin_all ON public.team_coaches
    FOR ALL TO authenticated
    USING (public.user_is_org_admin(auth.uid(), org_id))
    WITH CHECK (public.user_is_org_admin(auth.uid(), org_id));

-- Coaches can read their own assignments
CREATE POLICY team_coaches__coach_read_own ON public.team_coaches
    FOR SELECT TO authenticated
    USING (coach_user_id = auth.uid());

-- Platform admins have full access
CREATE POLICY team_coaches__platform_admin_all ON public.team_coaches
    FOR ALL TO authenticated
    USING (public.is_platform_admin(auth.uid()))
    WITH CHECK (public.is_platform_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER team_coaches_updated_at
    BEFORE UPDATE ON public.team_coaches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.team_coaches IS 'Explicit coach-to-team assignments. Coaches can only access data for teams they are assigned to.';
COMMENT ON COLUMN public.team_coaches.role IS 'Coach role: head_coach, assistant_coach, or team_manager';
COMMENT ON COLUMN public.team_coaches.status IS 'Assignment status: active or inactive';
COMMENT ON COLUMN public.team_coaches.created_by IS 'User who created this assignment (for audit trail)';
