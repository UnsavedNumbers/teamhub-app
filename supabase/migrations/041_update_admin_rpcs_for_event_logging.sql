-- ============================================================================
-- Update Admin RPCs to Use New Event Logging System
-- ============================================================================
-- This migration updates all admin RPC functions to use the new log_event
-- function instead of directly inserting into audit_logs.
-- ============================================================================

-- ============================================================================
-- Update admin_activate_organization
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_activate_organization(
  target_org_id UUID,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  org_exists BOOLEAN;
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
  
  -- Check org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id) INTO org_exists;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Perform update
  UPDATE organizations SET status = 'active', updated_at = NOW() WHERE id = target_org_id;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'ACTIVATE_ORGANIZATION',
    auth.uid(),
    'platform_admin'::event_actor_role,
    target_org_id,
    'organization',
    target_org_id,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- Update admin_suspend_organization
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_suspend_organization(
  target_org_id UUID,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  org_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id) INTO org_exists;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Perform update
  UPDATE organizations SET status = 'suspended', updated_at = NOW() WHERE id = target_org_id;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'SUSPEND_ORGANIZATION',
    auth.uid(),
    'platform_admin'::event_actor_role,
    target_org_id,
    'organization',
    target_org_id,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- Update admin_disable_user
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_disable_user(
  target_user_id UUID,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  user_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Ban user for 100 years (effectively permanent)
  UPDATE auth.users SET banned_until = NOW() + INTERVAL '100 years' WHERE id = target_user_id;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'DISABLE_USER',
    auth.uid(),
    'platform_admin'::event_actor_role,
    NULL,
    'user',
    target_user_id,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- Update admin_enable_user
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_enable_user(
  target_user_id UUID,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  user_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Unban user
  UPDATE auth.users SET banned_until = NULL WHERE id = target_user_id;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'ENABLE_USER',
    auth.uid(),
    'platform_admin'::event_actor_role,
    NULL,
    'user',
    target_user_id,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- Update admin_set_feature_flag
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_set_feature_flag(
  target_org_id UUID,
  target_feature_key TEXT,
  target_enabled BOOLEAN,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  org_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate inputs
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  IF target_feature_key IS NULL OR trim(target_feature_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature key is required');
  END IF;
  
  -- Check org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id) INTO org_exists;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Upsert feature flag
  INSERT INTO feature_flags (organization_id, feature_key, enabled)
  VALUES (target_org_id, target_feature_key, target_enabled)
  ON CONFLICT (organization_id, feature_key)
  DO UPDATE SET enabled = target_enabled, updated_at = NOW();
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'SET_FEATURE_FLAG',
    auth.uid(),
    'platform_admin'::event_actor_role,
    target_org_id,
    'feature_flag',
    target_org_id, -- Using org_id as entity_id since feature flags are per-org
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'feature_key', target_feature_key,
      'enabled', target_enabled
    ),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- Update admin_add_platform_admin
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_add_platform_admin(
  target_email TEXT,
  target_role platform_admin_role,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  target_user_id UUID;
  already_admin BOOLEAN;
  action_taken TEXT;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Only super_admin can manage platform admins
  IF admin_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires super_admin role');
  END IF;
  
  -- Validate inputs
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  IF target_email IS NULL OR trim(target_email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email is required');
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id FROM users WHERE email = target_email;
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found with that email');
  END IF;
  
  -- Check if already an admin
  SELECT EXISTS(SELECT 1 FROM platform_admins WHERE user_id = target_user_id) INTO already_admin;
  IF already_admin THEN
    -- Update role instead
    UPDATE platform_admins SET role = target_role WHERE user_id = target_user_id;
    action_taken := 'updated';
  ELSE
    -- Insert new admin
    INSERT INTO platform_admins (user_id, role) VALUES (target_user_id, target_role);
    action_taken := 'added';
  END IF;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    CASE WHEN already_admin THEN 'UPDATE_PLATFORM_ADMIN' ELSE 'ADD_PLATFORM_ADMIN' END,
    auth.uid(),
    'platform_admin'::event_actor_role,
    NULL,
    'platform_admin',
    target_user_id,
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'target_email', target_email,
      'target_role', target_role::text
    ),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true, 'action', action_taken);
END;
$$;

-- ============================================================================
-- Update admin_remove_platform_admin
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_remove_platform_admin(
  target_user_id UUID,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role platform_admin_role;
  target_role platform_admin_role;
  super_admin_count INTEGER;
  admin_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Only super_admin can manage platform admins
  IF admin_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check target exists as admin
  SELECT role INTO target_role FROM platform_admins WHERE user_id = target_user_id;
  IF target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a platform admin');
  END IF;
  
  -- Cannot remove yourself
  IF target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot remove yourself');
  END IF;
  
  -- Check if this would remove the last super_admin
  IF target_role = 'super_admin' THEN
    SELECT COUNT(*) INTO super_admin_count FROM platform_admins WHERE role = 'super_admin';
    IF super_admin_count <= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot remove the last super_admin');
    END IF;
  END IF;
  
  -- Remove admin
  DELETE FROM platform_admins WHERE user_id = target_user_id;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'REMOVE_PLATFORM_ADMIN',
    auth.uid(),
    'platform_admin'::event_actor_role,
    NULL,
    'platform_admin',
    target_user_id,
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'removed_role', target_role::text
    ),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION admin_activate_organization IS 'Updated to use new event logging system';
COMMENT ON FUNCTION admin_suspend_organization IS 'Updated to use new event logging system';
COMMENT ON FUNCTION admin_disable_user IS 'Updated to use new event logging system';
COMMENT ON FUNCTION admin_enable_user IS 'Updated to use new event logging system';
COMMENT ON FUNCTION admin_set_feature_flag IS 'Updated to use new event logging system';
COMMENT ON FUNCTION admin_add_platform_admin IS 'Updated to use new event logging system';
COMMENT ON FUNCTION admin_remove_platform_admin IS 'Updated to use new event logging system';
