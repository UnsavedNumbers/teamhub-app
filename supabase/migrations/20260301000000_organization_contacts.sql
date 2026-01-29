-- Organization Contacts Table
-- ===========================================
-- Stores organization contact information by category.

CREATE TABLE IF NOT EXISTS organization_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('default', 'billing', 'uniforms', 'scheduling', 'travel', 'registration', 'general')),
    is_custom BOOLEAN NOT NULL DEFAULT false,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, category)
);

-- Indexes
CREATE INDEX idx_organization_contacts_org_id ON organization_contacts(org_id);
CREATE INDEX idx_organization_contacts_org_category ON organization_contacts(org_id, category);

-- Enable RLS
ALTER TABLE organization_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Organization members can view contacts
CREATE POLICY "Organization members can view contacts" ON organization_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organization_contacts.org_id
      AND om.user_id = auth.uid()
    )
  );

-- Organization admins can manage contacts
CREATE POLICY "Organization admins can manage contacts" ON organization_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organization_contacts.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'org_admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_organization_contacts_updated_at
  BEFORE UPDATE ON organization_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
