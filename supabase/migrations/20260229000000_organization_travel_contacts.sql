-- Organization Travel Contacts
-- =============================
-- Category-based travel contacts at org level. Used as fallback when a travel plan
-- does not override with a custom contact. Category 'default' is the final fallback.

CREATE TABLE IF NOT EXISTS public.organization_travel_contacts (
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'transportation', 'lodging', 'venue', 'emergency', 'general', 'default'
  )),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, category)
);

CREATE INDEX IF NOT EXISTS idx_organization_travel_contacts_org_id
  ON public.organization_travel_contacts(org_id);

CREATE TRIGGER organization_travel_contacts_updated_at
  BEFORE UPDATE ON public.organization_travel_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.organization_travel_contacts ENABLE ROW LEVEL SECURITY;

-- Users in org can read
CREATE POLICY "Users can view org travel contacts"
  ON public.organization_travel_contacts
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Only org admins can insert/update
CREATE POLICY "Org admins can insert org travel contacts"
  ON public.organization_travel_contacts
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Org admins can update org travel contacts"
  ON public.organization_travel_contacts
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.organization_travel_contacts IS
  'Travel contact by category per organization. Category default is used when a plan category has no contact.';
