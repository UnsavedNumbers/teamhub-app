-- ============================================================================
-- Add admin_resend_verification and admin_force_logout RPCs
-- ============================================================================
-- These functions allow platform admins to resend verification emails and
-- force logout users. Both require support_admin or super_admin role.
-- ============================================================================

-- ============================================================================
-- admin_resend_verification
-- ============================================================================
-- Resends email verification to a user.
-- NOTE: This requires Supabase Admin API access, which is typically done
-- via Edge Functions. For now, this function will log the event and return
-- success. The actual email sending should be handled by an Edge Function
-- that listens to this event or is called directly from the frontend.
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_resend_verification(
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
  user_email TEXT;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action (support_admin or super_admin)
  IF admin_role NOT IN ('support_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires support_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check user exists and get email
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id), 
         (SELECT email FROM users WHERE id = target_user_id)
  INTO user_exists, user_email;
  
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Log event (actual email sending should be done via Edge Function)
  PERFORM log_event(
    'ADMIN'::event_category,
    'RESEND_VERIFICATION',
    'platform_admin'::event_actor_role,
    auth.uid(),
    NULL,
    'user',
    target_user_id,
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'user_email', user_email
    ),
    NULL,
    NULL,
    NULL
  );
  
  -- Return success (actual email sending happens via Edge Function or webhook)
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Verification email request logged. Email will be sent shortly.'
  );
END;
$$;

-- ============================================================================
-- admin_force_logout
-- ============================================================================
-- Forces logout of all user sessions.
-- NOTE: This requires Supabase Admin API access to revoke sessions.
-- For now, this function will log the event and return success.
-- The actual session revocation should be handled by an Edge Function
-- that listens to this event or is called directly from the frontend.
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_force_logout(
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
  user_email TEXT;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action (support_admin or super_admin)
  IF admin_role NOT IN ('support_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires support_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check user exists and get email
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id),
         (SELECT email FROM users WHERE id = target_user_id)
  INTO user_exists, user_email;
  
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Log event (actual session revocation should be done via Edge Function)
  PERFORM log_event(
    'ADMIN'::event_category,
    'FORCE_LOGOUT',
    'platform_admin'::event_actor_role,
    auth.uid(),
    NULL,
    'user',
    target_user_id,
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'user_email', user_email
    ),
    NULL,
    NULL,
    NULL
  );
  
  -- Return success (actual session revocation happens via Edge Function)
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Force logout request logged. Sessions will be revoked shortly.'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_resend_verification(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_force_logout(UUID, TEXT) TO authenticated;

-- Comments
COMMENT ON FUNCTION admin_resend_verification IS 'Platform admin function to resend verification email. Requires support_admin or super_admin role. Logs event; actual email sending should be handled by Edge Function.';
COMMENT ON FUNCTION admin_force_logout IS 'Platform admin function to force logout all user sessions. Requires support_admin or super_admin role. Logs event; actual session revocation should be handled by Edge Function.';
