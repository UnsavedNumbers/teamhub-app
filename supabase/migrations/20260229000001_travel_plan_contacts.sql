-- Travel Plan Contacts
-- =====================
-- Plan-specific contact overrides by category. When is_custom is true, this contact
-- is used; otherwise resolution falls back to organization_travel_contacts.

CREATE TABLE IF NOT EXISTS public.travel_plan_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_plan_id UUID NOT NULL REFERENCES public.travel_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'transportation', 'lodging', 'venue', 'emergency', 'general'
  )),
  is_custom BOOLEAN NOT NULL DEFAULT false,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(travel_plan_id, category),
  CONSTRAINT travel_plan_contacts_custom_required CHECK (
    (is_custom = false) OR (
      is_custom = true AND
      first_name IS NOT NULL AND first_name <> '' AND
      last_name IS NOT NULL AND last_name <> '' AND
      email IS NOT NULL AND email <> ''
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_travel_plan_contacts_travel_plan_id
  ON public.travel_plan_contacts(travel_plan_id);

CREATE TRIGGER travel_plan_contacts_updated_at
  BEFORE UPDATE ON public.travel_plan_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.travel_plan_contacts ENABLE ROW LEVEL SECURITY;

-- Admins can manage (same as travel_plans)
CREATE POLICY "Admins can manage travel plan contacts"
  ON public.travel_plan_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_plans tp
      JOIN public.teams t ON t.id = tp.team_id
      JOIN public.users u ON u.org_id = t.org_id AND u.id = auth.uid() AND u.role = 'admin'
      WHERE tp.id = travel_plan_contacts.travel_plan_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.travel_plans tp
      JOIN public.teams t ON t.id = tp.team_id
      JOIN public.users u ON u.org_id = t.org_id AND u.id = auth.uid() AND u.role = 'admin'
      WHERE tp.id = travel_plan_contacts.travel_plan_id
    )
  );

-- Parents can view (same as travel_plans)
CREATE POLICY "Parents can view travel plan contacts"
  ON public.travel_plan_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_plans tp
      JOIN public.athletes c ON c.family_id = (SELECT family_id FROM public.users WHERE id = auth.uid())
      JOIN public.team_memberships tm ON tm.athlete_id = c.id AND tm.team_id = tp.team_id AND tm.status = 'active'
      JOIN public.users u ON u.id = auth.uid() AND u.role = 'parent'
      WHERE tp.id = travel_plan_contacts.travel_plan_id
    )
  );

-- Coaches can view (same as travel_plans)
CREATE POLICY "Coaches can view travel plan contacts"
  ON public.travel_plan_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_plans tp
      JOIN public.teams t ON t.id = tp.team_id
      JOIN public.users u ON u.id = auth.uid() AND u.org_id = t.org_id AND u.role = 'coach'
      WHERE tp.id = travel_plan_contacts.travel_plan_id
    )
  );

COMMENT ON TABLE public.travel_plan_contacts IS
  'Per-plan contact overrides by category. is_custom true means use this row; else resolve from org.';
