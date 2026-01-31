-- Fix: resolve_travel_contacts_for_plan used organizations.email which does not exist.
-- Schema uses organizations.contact_email. Org phone fallback left as NULL if column missing.

CREATE OR REPLACE FUNCTION public.resolve_travel_contacts_for_plan(p_plan_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_org_email TEXT;
  v_org_phone TEXT;
  v_cat TEXT;
  v_categories TEXT[] := ARRAY['transportation','lodging','venue','emergency','general'];
  v_result JSONB := '{}'::jsonb;
  v_contact RECORD;
  v_default_first TEXT;
  v_default_last TEXT;
  v_default_email TEXT;
  v_default_phone TEXT;
BEGIN
  -- Get plan's org via team
  SELECT t.org_id INTO v_org_id
  FROM travel_plans tp
  JOIN teams t ON t.id = tp.team_id
  WHERE tp.id = p_plan_id;
  IF v_org_id IS NULL THEN
    RETURN v_result;
  END IF;

  -- Org fallback: organizations.contact_email (schema uses contact_email, not email).
  -- Do not reference o.phone so this works when organizations has no phone column.
  SELECT COALESCE(o.contact_email, ''), NULL::TEXT
  INTO v_org_email, v_org_phone
  FROM organizations o WHERE o.id = v_org_id;

  -- Org default contact (category = 'default')
  SELECT otc.first_name, otc.last_name, otc.email, otc.phone
  INTO v_default_first, v_default_last, v_default_email, v_default_phone
  FROM organization_travel_contacts otc
  WHERE otc.org_id = v_org_id AND otc.category = 'default'
  LIMIT 1;
  v_default_first := COALESCE(v_default_first, '');
  v_default_last  := COALESCE(v_default_last, '');
  v_default_email := COALESCE(v_default_email, v_org_email);
  v_default_phone := COALESCE(v_default_phone, v_org_phone);

  FOREACH v_cat IN ARRAY v_categories
  LOOP
    -- 1) Plan custom contact (is_custom = true and valid)
    SELECT tpc.first_name, tpc.last_name, tpc.email, tpc.phone INTO v_contact
    FROM travel_plan_contacts tpc
    WHERE tpc.travel_plan_id = p_plan_id AND tpc.category = v_cat
      AND tpc.is_custom = true
      AND tpc.first_name IS NOT NULL AND trim(tpc.first_name) <> ''
      AND tpc.last_name IS NOT NULL AND trim(tpc.last_name) <> ''
      AND tpc.email IS NOT NULL AND trim(tpc.email) <> ''
    LIMIT 1;

    IF FOUND THEN
      v_result := v_result || jsonb_build_object(v_cat, jsonb_build_object(
        'first_name', COALESCE(v_contact.first_name, ''),
        'last_name',  COALESCE(v_contact.last_name, ''),
        'email',      COALESCE(v_contact.email, ''),
        'phone',      v_contact.phone
      ));
      CONTINUE;
    END IF;

    -- 2) Org category contact
    SELECT otc.first_name, otc.last_name, otc.email, otc.phone INTO v_contact
    FROM organization_travel_contacts otc
    WHERE otc.org_id = v_org_id AND otc.category = v_cat
      AND otc.email IS NOT NULL AND trim(otc.email) <> ''
    LIMIT 1;

    IF FOUND THEN
      v_result := v_result || jsonb_build_object(v_cat, jsonb_build_object(
        'first_name', COALESCE(v_contact.first_name, ''),
        'last_name',  COALESCE(v_contact.last_name, ''),
        'email',      COALESCE(v_contact.email, ''),
        'phone',      v_contact.phone
      ));
      CONTINUE;
    END IF;

    -- 3) Org default contact
    v_result := v_result || jsonb_build_object(v_cat, jsonb_build_object(
      'first_name', v_default_first,
      'last_name',  v_default_last,
      'email',      v_default_email,
      'phone',      v_default_phone
    ));
  END LOOP;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.resolve_travel_contacts_for_plan(UUID) IS
  'Returns resolved travel contacts for all five categories for a plan. Uses organizations.contact_email for org fallback.';
