-- Allow guardians and org admins to UPDATE athletes (e.g. basic info, profile photo fields).
-- Fixes PGRST116 "0 rows" when guardians upload profile photo or save basic info.
-- SELECT is already allowed via athletes_select_policy / athletes__guardian_select;
-- platform admins have full access via athletes__platform_admin_all.

CREATE POLICY athletes__guardian_org_admin_update ON public.athletes
    FOR UPDATE TO authenticated
    USING (
        public.user_is_guardian_of_child(auth.uid(), id)
        OR public.user_is_org_admin(auth.uid(), org_id)
    )
    WITH CHECK (
        public.user_is_guardian_of_child(auth.uid(), id)
        OR public.user_is_org_admin(auth.uid(), org_id)
    );

COMMENT ON POLICY athletes__guardian_org_admin_update ON public.athletes IS
    'Guardians can update their linked athletes; org admins can update athletes in their org.';
