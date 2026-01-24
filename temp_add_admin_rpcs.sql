-- Add platform admin RPC functions for role management

CREATE OR REPLACE FUNCTION admin_add_org_role(
  target_user_id UUID,
  target_org_id UUID,
  target_role org_member_role,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  user_exists BOOLEAN;
  org_exists BOOLEAN;
  role_added BOOLEAN;
  user_email TEXT;
  org_name TEXT;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action (ops_admin or super_admin)
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Validate user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id), 
         (SELECT email FROM users WHERE id = target_user_id)
  INTO user_exists, user_email;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Validate org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id),
         (SELECT name FROM organizations WHERE id = target_org_id)
  INTO org_exists, org_name;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Add role (idempotent - if role already exists, returns true but no error)
  SELECT add_org_role(target_user_id, target_org_id, target_role) INTO role_added;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'ADD_ORG_ROLE',
    'platform_admin'::event_actor_role,
    auth.uid(),
    target_org_id,
    'user',
    target_user_id,
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'org_role', target_role::text,
      'user_email', user_email,
      'org_name', org_name
    ),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true, 'role_added', role_added);
END;
$$;

CREATE OR REPLACE FUNCTION admin_remove_org_role(
  target_user_id UUID,
  target_org_id UUID,
  target_role org_member_role,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  user_exists BOOLEAN;
  org_exists BOOLEAN;
  role_exists BOOLEAN;
  role_removed BOOLEAN;
  user_email TEXT;
  org_name TEXT;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action (ops_admin or super_admin)
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Validate user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id),
         (SELECT email FROM users WHERE id = target_user_id)
  INTO user_exists, user_email;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Validate org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id),
         (SELECT name FROM organizations WHERE id = target_org_id)
  INTO org_exists, org_name;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Check if role exists
  SELECT EXISTS(
    SELECT 1 FROM organization_members 
    WHERE user_id = target_user_id 
      AND org_id = target_org_id 
      AND role = target_role
  ) INTO role_exists;
  
  IF NOT role_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User does not have this role in the organization');
  END IF;
  
  -- Remove role
  SELECT remove_org_role(target_user_id, target_org_id, target_role) INTO role_removed;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'REMOVE_ORG_ROLE',
    'platform_admin'::event_actor_role,
    auth.uid(),
    target_org_id,
    'user',
    target_user_id,
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'org_role', target_role::text,
      'user_email', user_email,
      'org_name', org_name
    ),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true, 'role_removed', role_removed);
END;
$$;

CREATE OR REPLACE FUNCTION admin_change_org_role(
  target_user_id UUID,
  target_org_id UUID,
  old_role org_member_role,
  new_role org_member_role,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  user_exists BOOLEAN;
  org_exists BOOLEAN;
  role_exists BOOLEAN;
  role_removed BOOLEAN;
  role_added BOOLEAN;
  user_email TEXT;
  org_name TEXT;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action (ops_admin or super_admin)
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Validate old_role != new_role
  IF old_role = new_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Old role and new role cannot be the same');
  END IF;
  
  -- Validate user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id),
         (SELECT email FROM users WHERE id = target_user_id)
  INTO user_exists, user_email;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Validate org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id),
         (SELECT name FROM organizations WHERE id = target_org_id)
  INTO org_exists, org_name;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Check if old role exists
  SELECT EXISTS(
    SELECT 1 FROM organization_members 
    WHERE user_id = target_user_id 
      AND org_id = target_org_id 
      AND role = old_role
  ) INTO role_exists;
  
  IF NOT role_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User does not have the specified old role in the organization');
  END IF;
  
  -- Remove old role
  SELECT remove_org_role(target_user_id, target_org_id, old_role) INTO role_removed;
  
  -- Add new role
  SELECT add_org_role(target_user_id, target_org_id, new_role) INTO role_added;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'CHANGE_ORG_ROLE',
    'platform_admin'::event_actor_role,
    auth.uid(),
    target_org_id,
    'user',
    target_user_id,
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'old_role', old_role::text,
      'new_role', new_role::text,
      'user_email', user_email,
      'org_name', org_name
    ),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true, 'role_changed', role_removed AND role_added);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_add_org_role(UUID, UUID, org_member_role, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_remove_org_role(UUID, UUID, org_member_role, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_change_org_role(UUID, UUID, org_member_role, org_member_role, TEXT) TO authenticated;
