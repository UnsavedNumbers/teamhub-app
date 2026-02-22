-- Update RLS policies for user_notifications to support team_manager, staff, and athlete roles
-- These roles should see their own notifications AND team-scoped notifications

-- Drop the existing coach_select policy (we'll recreate it with expanded role support)
DROP POLICY IF EXISTS user_notifications__coach_select ON public.user_notifications;

-- Create comprehensive SELECT policy for all roles including new ones
CREATE POLICY user_notifications__role_select ON public.user_notifications
    FOR SELECT TO authenticated
    USING (
        -- Platform admins see everything
        is_platform_admin(auth.uid())
        
        -- Users always see their own notifications (regardless of role_context)
        OR user_id = auth.uid()
        
        -- Org admins see org_admin role_context notifications in their orgs
        OR (
            user_is_org_admin(auth.uid(), org_id)
            AND role_context = 'org_admin'
        )
        
        -- Coaches see coach role_context notifications for their teams
        OR (
            role_context = 'coach'
            AND user_id = auth.uid()
            AND (
                team_id IS NULL  -- Coach-level org notifications
                OR team_id = ANY(SELECT coach_team_ids(auth.uid()))  -- Team-specific
            )
        )
        
        -- Team managers see team_manager role_context notifications for their teams
        OR (
            role_context = 'team_manager'
            AND user_id = auth.uid()
            AND (
                team_id IS NULL  -- Team manager-level org notifications
                OR team_id = ANY(
                    SELECT team_id 
                    FROM public.team_coaches 
                    WHERE coach_user_id = auth.uid() 
                    AND role = 'team_manager'
                )
            )
        )
        
        -- Staff see staff role_context notifications for teams they can access
        OR (
            role_context = 'staff'
            AND user_id = auth.uid()
            AND (
                team_id IS NULL  -- Staff-level org notifications
                OR team_id = ANY(
                    SELECT team_id 
                    FROM public.team_coaches 
                    WHERE coach_user_id = auth.uid()
                )
                OR staff_can_access_team(auth.uid(), team_id)  -- Team-specific via staff permissions
            )
        )
        
        -- Athletes see athlete role_context notifications for their teams
        -- Note: Currently athletes don't have user accounts, so these notifications
        -- are sent to guardians. When athletes get user accounts, they'll see their own.
        OR (
            role_context = 'athlete'
            AND user_id = auth.uid()
            AND (
                team_id IS NULL  -- Athlete-level org notifications
                OR team_id = ANY(
                    SELECT tm.team_id 
                    FROM public.team_memberships tm
                    JOIN public.athletes a ON a.id = tm.athlete_id
                    JOIN public.athlete_guardians ag ON ag.athlete_id = a.id
                    WHERE ag.user_id = auth.uid()
                    AND ag.status = 'active'
                )
            )
        )
        -- Exclude soft-deleted notifications
        AND deleted_at IS NULL
    );

-- Update UPDATE policy to allow users to update their own notifications (for read_at, archived_at)
DROP POLICY IF EXISTS user_notifications__org_update ON public.user_notifications;

CREATE POLICY user_notifications__user_update ON public.user_notifications
    FOR UPDATE TO authenticated
    USING (
        -- Platform admins can update anything
        is_platform_admin(auth.uid())
        
        -- Users can update their own notifications (for read_at, archived_at)
        OR user_id = auth.uid()
        
        -- Org admins can update org_admin role_context notifications in their orgs
        OR (
            user_is_org_admin(auth.uid(), org_id)
            AND role_context = 'org_admin'
        )
    )
    WITH CHECK (
        -- Same conditions for WITH CHECK
        is_platform_admin(auth.uid())
        OR user_id = auth.uid()
        OR (
            user_is_org_admin(auth.uid(), org_id)
            AND role_context = 'org_admin'
        )
    );
