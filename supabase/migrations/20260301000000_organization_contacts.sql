-- 1. Organization Travel Contacts
CREATE TABLE IF NOT EXISTS organization_travel_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('transportation', 'lodging', 'venue', 'emergency', 'general', 'default')),
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, category),
    CONSTRAINT email_required_if_present CHECK (
       (first_name IS NULL AND last_name IS NULL AND email IS NULL) OR (email IS NOT NULL AND email <> '')
    )
);

CREATE INDEX idx_org_travel_contacts_org_id ON organization_travel_contacts(org_id);

-- RLS for organization_travel_contacts
ALTER TABLE organization_travel_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage travel contacts" ON organization_travel_contacts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.org_id = organization_travel_contacts.org_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin') -- Assuming 'owner' or 'admin' based on standard roles, specific text said 'admin role'
        )
    );

CREATE POLICY "Org members can view travel contacts" ON organization_travel_contacts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.org_id = organization_travel_contacts.org_id
            AND om.user_id = auth.uid()
        )
    );

-- 2. Travel Plan Contacts
CREATE TABLE IF NOT EXISTS travel_plan_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    travel_plan_id UUID NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('transportation', 'lodging', 'venue', 'emergency', 'general')),
    is_custom BOOLEAN NOT NULL DEFAULT false,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(travel_plan_id, category),
    CONSTRAINT custom_contact_requirements CHECK (
        (is_custom = false) OR 
        (is_custom = true AND first_name IS NOT NULL AND first_name <> '' AND last_name IS NOT NULL AND last_name <> '' AND email IS NOT NULL AND email <> '')
    )
);

CREATE INDEX idx_travel_plan_contacts_plan_id ON travel_plan_contacts(travel_plan_id);

-- RLS for travel_plan_contacts
ALTER TABLE travel_plan_contacts ENABLE ROW LEVEL SECURITY;

-- Assuming policies similar to travel_plans. 
-- Coaches/Admins manage. 
CREATE POLICY "Coaches and admins manage plan contacts" ON travel_plan_contacts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM travel_plans tp
            JOIN organization_members om ON tp.team_id = (SELECT team_id FROM travel_plans WHERE id = travel_plan_contacts.travel_plan_id) -- This is complex, better to join via travel_plans
            WHERE tp.id = travel_plan_contacts.travel_plan_id
            AND om.org_id = (SELECT org_id FROM teams WHERE id = tp.team_id)
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin', 'coach') -- Standard roles
        )
    );

CREATE POLICY "Public/Parents read plan contacts" ON travel_plan_contacts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM travel_plans tp
            WHERE tp.id = travel_plan_contacts.travel_plan_id
            -- Add logic for visibility if travel plan is published or user has access
             AND (
                -- Org members
                EXISTS (
                    SELECT 1 FROM organization_members om 
                    WHERE om.org_id = (SELECT org_id FROM teams WHERE id = tp.team_id) 
                    AND om.user_id = auth.uid()
                )
             )
        )
    );

-- 3. Resolution Function
CREATE OR REPLACE FUNCTION resolve_travel_contact_for_plan(p_plan_id UUID, p_category TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_contact RECORD;
    v_default_contact RECORD;
    v_org_email TEXT;
    v_org_phone TEXT;
BEGIN
    -- Get Org ID from Plan
    SELECT t.org_id INTO v_org_id
    FROM travel_plans tp
    JOIN teams t ON tp.team_id = t.id
    WHERE tp.id = p_plan_id;

    -- 1. Try Travel Plan Custom Contact
    SELECT first_name, last_name, email, phone INTO v_contact
    FROM travel_plan_contacts
    WHERE travel_plan_id = p_plan_id 
    AND category = p_category
    AND is_custom = true;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'first_name', v_contact.first_name,
            'last_name', v_contact.last_name,
            'email', v_contact.email,
            'phone', v_contact.phone,
            'source', 'plan_custom'
        );
    END IF;

    -- 2. Try Organization Category Contact
    SELECT first_name, last_name, email, phone INTO v_contact
    FROM organization_travel_contacts
    WHERE org_id = v_org_id
    AND category = p_category;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'first_name', v_contact.first_name,
            'last_name', v_contact.last_name,
            'email', v_contact.email,
            'phone', v_contact.phone,
            'source', 'org_category'
        );
    END IF;

    -- 3. Try Organization Default Contact
    SELECT first_name, last_name, email, phone INTO v_default_contact
    FROM organization_travel_contacts
    WHERE org_id = v_org_id
    AND category = 'default';

    IF FOUND THEN
        RETURN jsonb_build_object(
            'first_name', v_default_contact.first_name,
            'last_name', v_default_contact.last_name,
            'email', v_default_contact.email,
            'phone', v_default_contact.phone,
            'source', 'org_default'
        );
    END IF;

    -- 4. Fallback to Organization Email
    SELECT email, phone INTO v_org_email, v_org_phone
    FROM organizations
    WHERE id = v_org_id;

    RETURN jsonb_build_object(
        'first_name', '',
        'last_name', '',
        'email', COALESCE(v_org_email, ''),
        'phone', v_org_phone,
        'source', 'org_fallback'
    );
END;
$$;

-- 4. Bulk Resolution Function
CREATE OR REPLACE FUNCTION resolve_all_travel_contacts_for_plan(p_plan_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_categories TEXT[] := ARRAY['transportation', 'lodging', 'venue', 'emergency', 'general'];
    v_cat TEXT;
    v_result JSONB := '{}'::JSONB;
BEGIN
    FOREACH v_cat IN ARRAY v_categories
    LOOP
        v_result := jsonb_set(
            v_result, 
            ARRAY[v_cat], 
            resolve_travel_contact_for_plan(p_plan_id, v_cat)
        );
    END LOOP;
    
    RETURN v_result;
END;
$$;
