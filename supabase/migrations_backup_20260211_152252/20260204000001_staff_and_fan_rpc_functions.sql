-- ============================================
-- RPC FUNCTIONS FOR STAFF AND FAN OPERATIONS
-- ============================================

-- ============================================
-- CALENDAR AGGREGATION FUNCTION
-- ============================================

-- Function to get aggregated fan calendar
CREATE OR REPLACE FUNCTION public.get_fan_calendar(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_org_ids UUID[] DEFAULT NULL,
  p_sources TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT,
  source TEXT[],
  org_id UUID,
  org_name TEXT,
  visibility public.event_visibility,
  event_type TEXT,
  description TEXT,
  venue_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Default date range: next 90 days
  v_start_date := COALESCE(p_start_date, NOW());
  v_end_date := COALESCE(p_end_date, NOW() + INTERVAL '90 days');

  RETURN QUERY
  WITH user_events AS (
    -- Events from followed orgs
    SELECT DISTINCT 
      e.id,
      e.title,
      e.start_time,
      e.end_time,
      e.location,
      ARRAY['followed']::TEXT[] as source,
      e.org_id,
      o.name as org_name,
      COALESCE(e.visibility, 'public'::public.event_visibility) as visibility,
      e.type::TEXT as event_type,
      e.description,
      NULL::TEXT as venue_name
    FROM public.events e
    INNER JOIN public.fan_org_follows fof ON e.org_id = fof.org_id
    INNER JOIN public.organizations o ON o.id = e.org_id
    WHERE fof.user_id = v_user_id
      AND COALESCE(e.visibility, 'public'::public.event_visibility) = 'public'
      AND e.start_time >= v_start_date
      AND e.start_time <= v_end_date
      AND (p_org_ids IS NULL OR e.org_id = ANY(p_org_ids))
      AND (p_sources IS NULL OR 'followed' = ANY(p_sources))
    
    UNION ALL
    
    -- Bookmarked events
    SELECT DISTINCT
      e.id,
      e.title,
      e.start_time,
      e.end_time,
      e.location,
      ARRAY['bookmarked']::TEXT[] as source,
      e.org_id,
      o.name as org_name,
      COALESCE(e.visibility, 'public'::public.event_visibility) as visibility,
      e.type::TEXT as event_type,
      e.description,
      NULL::TEXT as venue_name
    FROM public.events e
    INNER JOIN public.fan_event_bookmarks feb ON e.id = feb.event_id
    INNER JOIN public.organizations o ON o.id = e.org_id
    WHERE feb.user_id = v_user_id
      AND e.start_time >= v_start_date
      AND e.start_time <= v_end_date
      AND (p_org_ids IS NULL OR e.org_id = ANY(p_org_ids))
      AND (p_sources IS NULL OR 'bookmarked' = ANY(p_sources))
    
    UNION ALL
    
    -- Events with tickets (from ticketed_events)
    SELECT DISTINCT
      te.id,
      te.title,
      te.starts_at as start_time,
      te.ends_at as end_time,
      COALESCE(te.venue_address_line1, te.venue_name) as location,
      ARRAY['ticketed']::TEXT[] as source,
      te.org_id,
      o.name as org_name,
      COALESCE(te.visibility, 'public'::public.event_visibility) as visibility,
      te.event_type::TEXT as event_type,
      te.description,
      te.venue_name
    FROM public.ticketed_events te
    INNER JOIN public.tickets t ON te.id = t.ticketed_event_id
    INNER JOIN public.organizations o ON o.id = te.org_id
    WHERE (t.holder_user_id = v_user_id OR t.holder_email = (SELECT email FROM public.users WHERE id = v_user_id))
      AND t.status = 'active'
      AND te.starts_at >= v_start_date
      AND te.starts_at <= v_end_date
      AND (p_org_ids IS NULL OR te.org_id = ANY(p_org_ids))
      AND (p_sources IS NULL OR 'ticketed' = ANY(p_sources))
  )
  SELECT DISTINCT ON (event_id)
    event_id,
    title,
    start_time,
    end_time,
    location,
    -- Aggregate sources
    array_agg(DISTINCT unnest(source)) FILTER (WHERE unnest IS NOT NULL) as source,
    org_id,
    org_name,
    visibility,
    event_type,
    description,
    venue_name
  FROM (
    SELECT 
      id as event_id,
      title,
      start_time,
      end_time,
      location,
      source,
      org_id,
      org_name,
      visibility,
      event_type,
      description,
      venue_name
    FROM user_events
  ) subq
  GROUP BY event_id, title, start_time, end_time, location, org_id, org_name, visibility, event_type, description, venue_name
  ORDER BY event_id, start_time;
END;
$$;

COMMENT ON FUNCTION public.get_fan_calendar IS 'Returns aggregated calendar events from follows, bookmarks, and tickets. Checks cache first for heavy users.';

-- ============================================
-- STAFF MANAGEMENT FUNCTIONS
-- ============================================

-- Function to list staff for an org
CREATE OR REPLACE FUNCTION public.get_org_staff(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  org_id UUID,
  role public.org_member_role,
  permissions JSONB,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_email TEXT,
  user_display_name TEXT,
  user_first_name TEXT,
  user_last_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
BEGIN
  -- Check if user is org admin
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = v_current_user_id
      AND om.role = 'org_admin'
      AND om.is_active = true
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions: org_admin required';
  END IF;

  RETURN QUERY
  SELECT 
    om.id,
    om.user_id,
    om.org_id,
    om.role,
    om.permissions,
    om.is_active,
    om.created_at,
    om.updated_at,
    u.email as user_email,
    u.display_name as user_display_name,
    u.first_name as user_first_name,
    u.last_name as user_last_name
  FROM public.organization_members om
  INNER JOIN public.users u ON u.id = om.user_id
  WHERE om.org_id = p_org_id
    AND om.role = 'staff'
  ORDER BY om.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_org_staff(UUID) IS 'Returns all staff members for an organization. Requires org_admin role.';

-- Function to update staff permissions
CREATE OR REPLACE FUNCTION public.update_staff_permissions(
  p_org_id UUID,
  p_user_id UUID,
  p_permissions JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_org_user_id UUID;
  v_old_permissions JSONB;
BEGIN
  -- Check if current user is org admin
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = v_current_user_id
      AND om.role = 'org_admin'
      AND om.is_active = true
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions: org_admin required';
  END IF;

  -- Get existing record
  SELECT id, permissions INTO v_org_user_id, v_old_permissions
  FROM public.organization_members
  WHERE org_id = p_org_id
    AND user_id = p_user_id
    AND role = 'staff';

  IF v_org_user_id IS NULL THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;

  -- Update permissions
  UPDATE public.organization_members
  SET 
    permissions = p_permissions,
    updated_at = NOW()
  WHERE id = v_org_user_id
  RETURNING id INTO v_org_user_id;

  -- Log audit event
  INSERT INTO public.org_user_audit_log (
    org_user_id,
    action,
    changed_by,
    old_values,
    new_values
  )
  VALUES (
    v_org_user_id,
    'updated',
    v_current_user_id,
    jsonb_build_object('permissions', v_old_permissions),
    jsonb_build_object('permissions', p_permissions)
  );

  RETURN v_org_user_id;
END;
$$;

COMMENT ON FUNCTION public.update_staff_permissions(UUID, UUID, JSONB) IS 'Updates staff permissions for a user in an org. Requires org_admin role.';

-- Function to revoke staff access
CREATE OR REPLACE FUNCTION public.revoke_staff_access(
  p_org_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_org_user_id UUID;
  v_old_values JSONB;
BEGIN
  -- Check if current user is org admin
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = v_current_user_id
      AND om.role = 'org_admin'
      AND om.is_active = true
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions: org_admin required';
  END IF;

  -- Get existing record
  SELECT id, row_to_json(om.*)::jsonb INTO v_org_user_id, v_old_values
  FROM public.organization_members om
  WHERE om.org_id = p_org_id
    AND om.user_id = p_user_id
    AND om.role = 'staff';

  IF v_org_user_id IS NULL THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;

  -- Revoke access
  UPDATE public.organization_members
  SET 
    is_active = false,
    ended_at = NOW(),
    ended_reason = COALESCE(p_reason, 'revoked_by_admin'),
    revoked_by = v_current_user_id,
    updated_at = NOW()
  WHERE id = v_org_user_id
  RETURNING id INTO v_org_user_id;

  -- Log audit event
  INSERT INTO public.org_user_audit_log (
    org_user_id,
    action,
    changed_by,
    old_values,
    new_values
  )
  VALUES (
    v_org_user_id,
    'revoked',
    v_current_user_id,
    v_old_values,
    jsonb_build_object(
      'is_active', false,
      'ended_at', NOW(),
      'ended_reason', COALESCE(p_reason, 'revoked_by_admin'),
      'revoked_by', v_current_user_id
    )
  );

  RETURN v_org_user_id;
END;
$$;

COMMENT ON FUNCTION public.revoke_staff_access(UUID, UUID, TEXT) IS 'Revokes staff access for a user in an org. Requires org_admin role.';

-- ============================================
-- TICKET TRANSFER FUNCTION
-- ============================================

-- Function to transfer ticket
CREATE OR REPLACE FUNCTION public.transfer_ticket(
  p_ticket_id UUID,
  p_holder_email TEXT,
  p_holder_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_ticket RECORD;
  v_holder_user_id UUID;
BEGIN
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get ticket with purchase info
  SELECT 
    t.*,
    p.user_id as purchaser_user_id
  INTO v_ticket
  FROM public.tickets t
  LEFT JOIN public.purchases p ON p.id = t.purchase_id
  WHERE t.id = p_ticket_id;

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  -- Check if user owns the ticket (via purchase or current holder)
  IF v_ticket.purchaser_user_id IS NOT NULL AND v_ticket.purchaser_user_id != v_current_user_id THEN
    -- Check if user is current holder
    IF v_ticket.holder_user_id IS NULL OR v_ticket.holder_user_id != v_current_user_id THEN
      RAISE EXCEPTION 'You do not have permission to transfer this ticket';
    END IF;
  END IF;

  IF v_ticket.status != 'active' THEN
    RAISE EXCEPTION 'Only active tickets can be transferred';
  END IF;

  -- Find user by email (if exists)
  SELECT id INTO v_holder_user_id
  FROM public.users
  WHERE email = p_holder_email;

  -- Transfer ticket
  UPDATE public.tickets
  SET 
    holder_user_id = v_holder_user_id,
    holder_email = p_holder_email,
    holder_name = COALESCE(p_holder_name, ''),
    status = 'transferred',
    transferred_at = NOW(),
    updated_at = NOW()
  WHERE id = p_ticket_id;

  RETURN p_ticket_id;
END;
$$;

COMMENT ON FUNCTION public.transfer_ticket(UUID, TEXT, TEXT) IS 'Transfers a ticket to a new holder. Purchaser or current holder can transfer.';

-- ============================================
-- RESERVATION CLEANUP FUNCTION (for cron)
-- ============================================

-- Function to clean up expired reservations
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.ticket_reservations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_reservations() IS 'Marks expired reservations as expired. Should be called by cron job every minute.';
