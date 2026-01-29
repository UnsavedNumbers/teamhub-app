-- Resolve travel contacts for a plan (RPC) and extend notification payload
-- =========================================================================
-- Single source of truth for resolution: plan custom -> org category -> org default -> organizations.email

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

  -- Org fallback: organizations.email and phone
  SELECT COALESCE(o.email, ''), COALESCE(o.phone, '')
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
  'Returns resolved travel contacts for all five categories for a plan. Used by trigger and app.';

-- Update trigger to include resolved_contacts in payload
CREATE OR REPLACE FUNCTION public.enqueue_travel_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_dedupe_key TEXT;
  v_should_update BOOLEAN := FALSE;
  v_resolved_contacts JSONB;
BEGIN
  -- Publish
  IF TG_OP = 'UPDATE' AND OLD.status <> 'published' AND NEW.status = 'published' THEN
    v_event_type := 'travel_published';
    v_dedupe_key := 'travel:' || NEW.id::text || ':published:' || COALESCE(NEW.updated_at::text, now()::text);
  -- Cancel
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    v_event_type := 'travel_cancelled';
    v_dedupe_key := 'travel:' || NEW.id::text || ':cancelled:' || COALESCE(NEW.updated_at::text, now()::text);
  -- Update (only when published and relevant fields changed)
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'published' THEN
    v_should_update :=
      (COALESCE(OLD.title,'') <> COALESCE(NEW.title,'')) OR
      (COALESCE(OLD.location,'') <> COALESCE(NEW.location,'')) OR
      (OLD.start_date <> NEW.start_date) OR
      (OLD.end_date <> NEW.end_date) OR
      (COALESCE(OLD.venue_name,'') <> COALESCE(NEW.venue_name,'')) OR
      (COALESCE(OLD.venue_address,'') <> COALESCE(NEW.venue_address,'')) OR
      (COALESCE(OLD.hotel_name,'') <> COALESCE(NEW.hotel_name,'')) OR
      (COALESCE(OLD.hotel_address,'') <> COALESCE(NEW.hotel_address,'')) OR
      (COALESCE(OLD.hotel_phone,'') <> COALESCE(NEW.hotel_phone,'')) OR
      (COALESCE(OLD.hotel_confirmation,'') <> COALESCE(NEW.hotel_confirmation,'')) OR
      (COALESCE(OLD.maps_url,'') <> COALESCE(NEW.maps_url,'')) OR
      (COALESCE(OLD.itinerary_file_path,'') <> COALESCE(NEW.itinerary_file_path,'')) OR
      (COALESCE(OLD.meeting_locations::text,'') <> COALESCE(NEW.meeting_locations::text,''));

    IF v_should_update THEN
      v_event_type := 'travel_updated';
      v_dedupe_key := 'travel:' || NEW.id::text || ':updated:' || COALESCE(NEW.updated_at::text, now()::text);
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  v_resolved_contacts := public.resolve_travel_contacts_for_plan(NEW.id);

  INSERT INTO public.notification_outbox (event_type, dedupe_key, travel_plan_id, team_id, season_id, payload)
  VALUES (
    v_event_type,
    v_dedupe_key,
    NEW.id,
    NEW.team_id,
    NEW.season_id,
    jsonb_build_object(
      'title', NEW.title,
      'location', NEW.location,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'status', NEW.status,
      'resolved_contacts', v_resolved_contacts
    )
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;
