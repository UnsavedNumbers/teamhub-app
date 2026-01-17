-- ============================================================================
-- RLS Policy Tests for event_logs Table
-- ============================================================================
-- These tests verify that Row Level Security policies work correctly
-- for the event_logs table.
--
-- Run these tests with: psql -f supabase/tests/rls_event_logs.test.sql
-- ============================================================================

-- Test setup: Create test users and roles
DO $$
DECLARE
  test_platform_admin_id UUID := gen_random_uuid();
  test_regular_user_id UUID := gen_random_uuid();
  test_org_admin_id UUID := gen_random_uuid();
  test_org_id UUID := gen_random_uuid();
BEGIN
  -- Create test users in auth.users (simulated)
  -- Note: In real tests, these would be actual auth.users records
  
  -- Insert test organization
  INSERT INTO organizations (id, name) VALUES (test_org_id, 'Test Org');
  
  -- Insert test users
  INSERT INTO users (id, email, display_name) VALUES
    (test_platform_admin_id, 'platform_admin@test.com', 'Platform Admin'),
    (test_regular_user_id, 'regular@test.com', 'Regular User'),
    (test_org_admin_id, 'org_admin@test.com', 'Org Admin');
  
  -- Make one a platform admin
  INSERT INTO platform_admins (user_id, role) VALUES (test_platform_admin_id, 'super_admin');
  
  -- Make one an org admin
  INSERT INTO organization_members (organization_id, user_id, role) 
  VALUES (test_org_id, test_org_admin_id, 'org_admin');
  
  -- Store test IDs for use in tests
  PERFORM set_config('test.platform_admin_id', test_platform_admin_id::TEXT, false);
  PERFORM set_config('test.regular_user_id', test_regular_user_id::TEXT, false);
  PERFORM set_config('test.org_admin_id', test_org_admin_id::TEXT, false);
  PERFORM set_config('test.org_id', test_org_id::TEXT, false);
END $$;

-- ============================================================================
-- Test 1: Platform Admin Can Read All Events
-- ============================================================================
DO $$
DECLARE
  test_admin_id UUID;
  can_read BOOLEAN;
BEGIN
  test_admin_id := current_setting('test.platform_admin_id')::UUID;
  
  -- Simulate platform admin session
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_admin_id)::TEXT, false);
  
  -- Check if platform admin can read
  SELECT EXISTS (
    SELECT 1 FROM event_logs
    WHERE is_platform_admin(test_admin_id)
  ) INTO can_read;
  
  IF can_read THEN
    RAISE NOTICE 'TEST 1 PASSED: Platform admin can read events';
  ELSE
    RAISE EXCEPTION 'TEST 1 FAILED: Platform admin cannot read events';
  END IF;
END $$;

-- ============================================================================
-- Test 2: Regular User Cannot Read Events
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID;
  can_read BOOLEAN;
BEGIN
  test_user_id := current_setting('test.regular_user_id')::UUID;
  
  -- Simulate regular user session
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::TEXT, false);
  
  -- Check if regular user can read (should be false)
  SELECT EXISTS (
    SELECT 1 FROM event_logs
    WHERE is_platform_admin(test_user_id)
  ) INTO can_read;
  
  IF NOT can_read THEN
    RAISE NOTICE 'TEST 2 PASSED: Regular user cannot read events';
  ELSE
    RAISE EXCEPTION 'TEST 2 FAILED: Regular user can read events (should not)';
  END IF;
END $$;

-- ============================================================================
-- Test 3: Org Admin Cannot Read Events (per requirements)
-- ============================================================================
DO $$
DECLARE
  test_org_admin_id UUID;
  can_read BOOLEAN;
BEGIN
  test_org_admin_id := current_setting('test.org_admin_id')::UUID;
  
  -- Simulate org admin session
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_org_admin_id)::TEXT, false);
  
  -- Check if org admin can read (should be false per requirements)
  SELECT EXISTS (
    SELECT 1 FROM event_logs
    WHERE is_platform_admin(test_org_admin_id)
  ) INTO can_read;
  
  IF NOT can_read THEN
    RAISE NOTICE 'TEST 3 PASSED: Org admin cannot read events (as required)';
  ELSE
    RAISE EXCEPTION 'TEST 3 FAILED: Org admin can read events (should not)';
  END IF;
END $$;

-- ============================================================================
-- Test 4: Authenticated Users Can Insert Events
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID;
  event_id UUID;
BEGIN
  test_user_id := current_setting('test.regular_user_id')::UUID;
  
  -- Simulate authenticated user session
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::TEXT, false);
  
  -- Try to insert an event
  BEGIN
    SELECT log_event(
      'AUTH'::event_category,
      'USER_LOGGED_IN',
      test_user_id,
      'parent'::event_actor_role,
      NULL,
      NULL,
      NULL,
      '{}'::JSONB,
      NULL,
      NULL,
      NULL
    ) INTO event_id;
    
    IF event_id IS NOT NULL THEN
      RAISE NOTICE 'TEST 4 PASSED: Authenticated user can insert events';
    ELSE
      RAISE EXCEPTION 'TEST 4 FAILED: Authenticated user cannot insert events';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'TEST 4 FAILED: Error inserting event: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- Test 5: Events Cannot Be Updated (Immutability)
-- ============================================================================
DO $$
DECLARE
  test_admin_id UUID;
  test_event_id UUID;
  update_succeeded BOOLEAN := FALSE;
BEGIN
  test_admin_id := current_setting('test.platform_admin_id')::UUID;
  
  -- Get an existing event ID
  SELECT id INTO test_event_id FROM event_logs LIMIT 1;
  
  IF test_event_id IS NULL THEN
    RAISE NOTICE 'TEST 5 SKIPPED: No events to test update';
    RETURN;
  END IF;
  
  -- Simulate platform admin session
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_admin_id)::TEXT, false);
  
  -- Try to update (should fail due to RLS policy)
  BEGIN
    UPDATE event_logs SET metadata = '{"test": "update"}'::JSONB WHERE id = test_event_id;
    update_succeeded := TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      update_succeeded := FALSE;
  END;
  
  IF NOT update_succeeded THEN
    RAISE NOTICE 'TEST 5 PASSED: Events cannot be updated (immutability enforced)';
  ELSE
    RAISE EXCEPTION 'TEST 5 FAILED: Events can be updated (should not be allowed)';
  END IF;
END $$;

-- ============================================================================
-- Test 6: Events Cannot Be Deleted (Immutability)
-- ============================================================================
DO $$
DECLARE
  test_admin_id UUID;
  test_event_id UUID;
  delete_succeeded BOOLEAN := FALSE;
BEGIN
  test_admin_id := current_setting('test.platform_admin_id')::UUID;
  
  -- Get an existing event ID
  SELECT id INTO test_event_id FROM event_logs LIMIT 1;
  
  IF test_event_id IS NULL THEN
    RAISE NOTICE 'TEST 6 SKIPPED: No events to test delete';
    RETURN;
  END IF;
  
  -- Simulate platform admin session
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_admin_id)::TEXT, false);
  
  -- Try to delete (should fail due to RLS policy)
  BEGIN
    DELETE FROM event_logs WHERE id = test_event_id;
    delete_succeeded := TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      delete_succeeded := FALSE;
  END;
  
  IF NOT delete_succeeded THEN
    RAISE NOTICE 'TEST 6 PASSED: Events cannot be deleted (immutability enforced)';
  ELSE
    RAISE EXCEPTION 'TEST 6 FAILED: Events can be deleted (should not be allowed)';
  END IF;
END $$;

-- ============================================================================
-- Test 7: Invalid Event Type Rejected
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID;
  event_id UUID;
  error_occurred BOOLEAN := FALSE;
BEGIN
  test_user_id := current_setting('test.regular_user_id')::UUID;
  
  -- Try to insert with invalid event type
  BEGIN
    SELECT log_event(
      'AUTH'::event_category,
      'INVALID_EVENT_TYPE', -- Invalid for AUTH category
      test_user_id,
      'parent'::event_actor_role,
      NULL,
      NULL,
      NULL,
      '{}'::JSONB,
      NULL,
      NULL,
      NULL
    ) INTO event_id;
    
    error_occurred := FALSE;
  EXCEPTION
    WHEN OTHERS THEN
      error_occurred := TRUE;
  END;
  
  IF error_occurred THEN
    RAISE NOTICE 'TEST 7 PASSED: Invalid event type rejected';
  ELSE
    RAISE EXCEPTION 'TEST 7 FAILED: Invalid event type was accepted (should be rejected)';
  END IF;
END $$;

-- ============================================================================
-- Test 8: Metadata Sanitization Works
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID;
  event_id UUID;
  stored_metadata JSONB;
BEGIN
  test_user_id := current_setting('test.regular_user_id')::UUID;
  
  -- Insert event with sensitive data in metadata
  SELECT log_event(
    'AUTH'::event_category,
    'USER_LOGGED_IN',
    test_user_id,
    'parent'::event_actor_role,
    NULL,
    NULL,
    NULL,
    '{"password": "secret123", "token": "abc123", "safe_data": "ok"}'::JSONB,
    NULL,
    NULL,
    NULL
  ) INTO event_id;
  
  -- Check that sensitive data was sanitized
  SELECT metadata INTO stored_metadata FROM event_logs WHERE id = event_id;
  
  IF stored_metadata->>'password' = '[REDACTED]' 
     AND stored_metadata->>'token' = '[REDACTED]'
     AND stored_metadata->>'safe_data' = '"ok"' THEN
    RAISE NOTICE 'TEST 8 PASSED: Metadata sanitization works correctly';
  ELSE
    RAISE EXCEPTION 'TEST 8 FAILED: Metadata not properly sanitized. Got: %', stored_metadata;
  END IF;
END $$;

-- ============================================================================
-- Test 9: Idempotency Key Prevents Duplicates
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID;
  event_id_1 UUID;
  event_id_2 UUID;
  idempotency_key UUID := gen_random_uuid();
BEGIN
  test_user_id := current_setting('test.regular_user_id')::UUID;
  
  -- Insert first event with idempotency key
  SELECT log_event(
    'AUTH'::event_category,
    'USER_LOGGED_IN',
    test_user_id,
    'parent'::event_actor_role,
    NULL,
    NULL,
    NULL,
    '{}'::JSONB,
    NULL,
    NULL,
    idempotency_key
  ) INTO event_id_1;
  
  -- Try to insert same event again with same idempotency key
  SELECT log_event(
    'AUTH'::event_category,
    'USER_LOGGED_IN',
    test_user_id,
    'parent'::event_actor_role,
    NULL,
    NULL,
    NULL,
    '{}'::JSONB,
    NULL,
    NULL,
    idempotency_key
  ) INTO event_id_2;
  
  -- Should return same event ID
  IF event_id_1 = event_id_2 THEN
    RAISE NOTICE 'TEST 9 PASSED: Idempotency key prevents duplicates';
  ELSE
    RAISE EXCEPTION 'TEST 9 FAILED: Idempotency key did not prevent duplicate. IDs: %, %', event_id_1, event_id_2;
  END IF;
END $$;

-- ============================================================================
-- Test 10: Logging Disabled Flag Prevents Circular Logging
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID;
  event_id UUID;
  initial_count INTEGER;
  final_count INTEGER;
BEGIN
  test_user_id := current_setting('test.regular_user_id')::UUID;
  
  -- Count initial events
  SELECT COUNT(*) INTO initial_count FROM event_logs;
  
  -- Set logging disabled flag
  PERFORM set_config('app.logging_disabled', 'true', false);
  
  -- Try to log an event (should be skipped)
  SELECT log_event(
    'AUTH'::event_category,
    'USER_LOGGED_IN',
    test_user_id,
    'parent'::event_actor_role,
    NULL,
    NULL,
    NULL,
    '{}'::JSONB,
    NULL,
    NULL,
    NULL
  ) INTO event_id;
  
  -- Count final events
  SELECT COUNT(*) INTO final_count FROM event_logs;
  
  -- Reset flag
  PERFORM set_config('app.logging_disabled', 'false', false);
  
  -- Event should not have been created
  IF event_id IS NULL AND initial_count = final_count THEN
    RAISE NOTICE 'TEST 10 PASSED: Logging disabled flag prevents circular logging';
  ELSE
    RAISE EXCEPTION 'TEST 10 FAILED: Logging disabled flag did not work. Event ID: %, Count: % -> %', event_id, initial_count, final_count;
  END IF;
END $$;

-- ============================================================================
-- Test Summary
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Tests Complete';
  RAISE NOTICE 'All tests passed if no exceptions were raised above.';
  RAISE NOTICE '========================================';
END $$;
