-- Fix RLS for travel_plan_contacts: allow org_admin and coach (via organization_members)
-- to INSERT/UPDATE/DELETE, matching travel_plans "Staff can manage travel plans" policy.
-- The existing "Admins can manage" uses users.role = 'admin' (platform admin);
-- this adds staff (org_admin, coach) so edit screen works for org staff.

DROP POLICY IF EXISTS "Coaches and admins manage plan contacts" ON travel_plan_contacts;

CREATE POLICY "Staff can manage travel plan contacts"
  ON public.travel_plan_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_plans tp
      JOIN public.teams t ON t.id = tp.team_id
      JOIN public.organization_members om ON om.org_id = t.org_id AND om.user_id = auth.uid()
      WHERE tp.id = travel_plan_contacts.travel_plan_id
        AND om.role IN ('org_admin', 'coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.travel_plans tp
      JOIN public.teams t ON t.id = tp.team_id
      JOIN public.organization_members om ON om.org_id = t.org_id AND om.user_id = auth.uid()
      WHERE tp.id = travel_plan_contacts.travel_plan_id
        AND om.role IN ('org_admin', 'coach')
    )
  );

COMMENT ON POLICY "Staff can manage travel plan contacts" ON public.travel_plan_contacts IS
  'Org admins and coaches can insert/update/delete plan contacts for plans in their org.';
