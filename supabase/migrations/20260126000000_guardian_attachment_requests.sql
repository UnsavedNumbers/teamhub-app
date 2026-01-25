-- Migration: Guardian Attachment Requests
-- =========================================
-- Creates table and functions for guardian self-service attachment requests.
-- Allows guardians to search for existing athletes and request attachment,
-- with org admin approval workflow.

-- ==============================================
-- Create Enum Type
-- ==============================================
DO $$ BEGIN
  CREATE TYPE guardian_attachment_request_status AS ENUM ('pending', 'approved', 'denied');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================
-- Create guardian_attachment_requests Table
-- ==============================================
CREATE TABLE IF NOT EXISTS guardian_attachment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status guardian_attachment_request_status NOT NULL DEFAULT 'pending',
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  decision_reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (athlete_id, requested_by_user_id, org_id)
);

-- ==============================================
-- Create Indexes
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_guardian_attachment_requests_requested_by ON guardian_attachment_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_attachment_requests_athlete_org ON guardian_attachment_requests(athlete_id, org_id);
CREATE INDEX IF NOT EXISTS idx_guardian_attachment_requests_org_status ON guardian_attachment_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_guardian_attachment_requests_expires_at ON guardian_attachment_requests(expires_at);

-- ==============================================
-- Create Trigger for updated_at
-- ==============================================
DROP TRIGGER IF EXISTS update_guardian_attachment_requests_updated_at ON guardian_attachment_requests;

CREATE TRIGGER update_guardian_attachment_requests_updated_at
  BEFORE UPDATE ON guardian_attachment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- Disable RLS (access control via RPC functions)
-- ==============================================
ALTER TABLE guardian_attachment_requests DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- Comments
-- ==============================================
COMMENT ON TABLE guardian_attachment_requests IS 'Guardian requests to attach themselves to existing athletes. Requires admin approval.';
COMMENT ON COLUMN guardian_attachment_requests.expires_at IS 'Request expires after 30 days if not reviewed';
COMMENT ON COLUMN guardian_attachment_requests.status IS 'pending: awaiting admin review, approved: guardian attached, denied: request rejected';

-- ==============================================
-- RPC Functions
-- ==============================================

-- ==============================================
-- Search Athletes for Guardian
-- ==============================================
CREATE OR REPLACE FUNCTION search_athletes_for_guardian(
  p_org_id UUID,
  p_search TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  first_name TEXT,
  last_name TEXT,
  birthdate DATE,
  gender TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID;
  v_escaped_search TEXT;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  
  -- Validate user is authenticated
  IF v_current_user IS NULL THEN
    RETURN;
  END IF;
  
  -- Validate user has parent role in org
  IF NOT user_has_any_org_roles(v_current_user, p_org_id, ARRAY['parent']::org_member_role[]) THEN
    RETURN;
  END IF;
  
  -- Validate search text (min 2 chars)
  IF p_search IS NULL OR LENGTH(TRIM(p_search)) < 2 THEN
    RETURN;
  END IF;
  
  -- Escape special characters for ILIKE
  v_escaped_search := REPLACE(REPLACE(TRIM(p_search), '%', '\%'), '_', '\_');
  
  -- Search athletes in org, excluding those with existing guardians or where user is already guardian
  RETURN QUERY
  SELECT 
    a.id,
    a.first_name,
    a.last_name,
    a.birthdate,
    a.gender
  FROM athletes a
  WHERE a.deleted_at IS NULL
    -- Athlete must be in this org (via team_memberships or athlete_guardians)
    AND (
      EXISTS (
        SELECT 1 FROM team_memberships tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.athlete_id = a.id
          AND t.org_id = p_org_id
      )
      OR EXISTS (
        SELECT 1 FROM athlete_guardians ag
        WHERE ag.athlete_id = a.id
          AND ag.org_id = p_org_id
      )
    )
    -- Exclude athletes where user is already a guardian
    AND NOT EXISTS (
      SELECT 1 FROM athlete_guardians ag
      WHERE ag.athlete_id = a.id
        AND ag.user_id = v_current_user
        AND ag.org_id = p_org_id
        AND ag.status = 'active'
    )
    -- Exclude athletes that have any active guardians in this org
    AND NOT EXISTS (
      SELECT 1 FROM athlete_guardians ag
      WHERE ag.athlete_id = a.id
        AND ag.org_id = p_org_id
        AND ag.status = 'active'
    )
    -- Search by name
    AND (
      a.first_name ILIKE '%' || v_escaped_search || '%' ESCAPE '\'
      OR a.last_name ILIKE '%' || v_escaped_search || '%' ESCAPE '\'
    )
  ORDER BY a.first_name, a.last_name
  LIMIT p_limit;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return empty on any error
    RETURN;
END;
$$;

COMMENT ON FUNCTION search_athletes_for_guardian IS 'Allows guardians to search for athletes in orgs where they have parent role. Excludes athletes with existing guardians. Uses SECURITY DEFINER with role validation.';

-- ==============================================
-- Submit Guardian Attachment Request
-- ==============================================
CREATE OR REPLACE FUNCTION submit_guardian_attachment_request(
  p_athlete_id UUID,
  p_org_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID;
  v_lock_key BIGINT;
  v_existing_request RECORD;
  v_request_id UUID;
  v_athlete_exists BOOLEAN;
  v_already_guardian BOOLEAN;
  v_athlete_has_guardians BOOLEAN;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  
  -- Validate user is authenticated
  IF v_current_user IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;
  
  -- Validate user has parent role in org
  IF NOT user_has_any_org_roles(v_current_user, p_org_id, ARRAY['parent']::org_member_role[]) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You must have parent role in this organization'
    );
  END IF;
  
  -- Acquire transaction-scoped advisory lock
  v_lock_key := hashtext(p_athlete_id::text || v_current_user::text || p_org_id::text);
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Check if athlete exists and is in the specified org
  SELECT EXISTS (
    SELECT 1 FROM athletes a
    WHERE a.id = p_athlete_id
      AND a.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM team_memberships tm
          JOIN teams t ON t.id = tm.team_id
          WHERE tm.athlete_id = a.id
            AND t.org_id = p_org_id
        )
        OR EXISTS (
          SELECT 1 FROM athlete_guardians ag
          WHERE ag.athlete_id = a.id
            AND ag.org_id = p_org_id
        )
      )
  ) INTO v_athlete_exists;
  
  IF NOT v_athlete_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Athlete not found in this organization'
    );
  END IF;
  
  -- Check if user is already a guardian of this athlete
  SELECT EXISTS (
    SELECT 1 FROM athlete_guardians ag
    WHERE ag.athlete_id = p_athlete_id
      AND ag.user_id = v_current_user
      AND ag.org_id = p_org_id
      AND ag.status = 'active'
  ) INTO v_already_guardian;
  
  IF v_already_guardian THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are already a guardian of this athlete'
    );
  END IF;
  
  -- Check if athlete already has active guardians
  SELECT EXISTS (
    SELECT 1 FROM athlete_guardians ag
    WHERE ag.athlete_id = p_athlete_id
      AND ag.org_id = p_org_id
      AND ag.status = 'active'
  ) INTO v_athlete_has_guardians;
  
  IF v_athlete_has_guardians THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This athlete already has guardians'
    );
  END IF;
  
  -- Check for existing request (idempotent)
  SELECT * INTO v_existing_request
  FROM guardian_attachment_requests
  WHERE athlete_id = p_athlete_id
    AND requested_by_user_id = v_current_user
    AND org_id = p_org_id;
  
  IF FOUND THEN
    -- Return existing request
    RETURN jsonb_build_object(
      'success', true,
      'id', v_existing_request.id,
      'status', v_existing_request.status,
      'expires_at', v_existing_request.expires_at,
      'created_at', v_existing_request.created_at,
      'already_existed', true
    );
  END IF;
  
  -- Create new request
  INSERT INTO guardian_attachment_requests (
    org_id,
    athlete_id,
    requested_by_user_id,
    status,
    expires_at
  )
  VALUES (
    p_org_id,
    p_athlete_id,
    v_current_user,
    'pending',
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO v_request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'id', v_request_id,
    'status', 'pending',
    'expires_at', NOW() + INTERVAL '30 days',
    'created_at', NOW(),
    'already_existed', false
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to submit request: ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION submit_guardian_attachment_request IS 'Submits a guardian attachment request. Idempotent - returns existing request if found. Uses advisory locks to prevent race conditions.';

-- ==============================================
-- Review Guardian Attachment Request
-- ==============================================
CREATE OR REPLACE FUNCTION review_guardian_attachment_request(
  p_request_id UUID,
  p_approve BOOLEAN,
  p_decision_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_current_user UUID;
  v_athlete_guardian_id UUID;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  
  -- Validate user is authenticated
  IF v_current_user IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;
  
  -- Lock and get request
  BEGIN
    SELECT * INTO v_request
    FROM guardian_attachment_requests
    WHERE id = p_request_id
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Request is being processed by another admin'
      );
  END;
  
  -- Check if request exists
  IF v_request IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found'
    );
  END IF;
  
  -- Validate reviewer is org admin
  IF NOT (user_is_org_admin(v_current_user, v_request.org_id) OR is_platform_admin(v_current_user)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only organization admins can review requests'
    );
  END IF;
  
  -- Check request not expired
  IF v_request.expires_at <= NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request has expired'
    );
  END IF;
  
  -- Check request status is pending
  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request has already been reviewed',
      'current_status', v_request.status
    );
  END IF;
  
  -- All operations in single transaction
  IF p_approve THEN
    -- Create athlete_guardians relationship
    INSERT INTO athlete_guardians (
      athlete_id,
      user_id,
      org_id,
      status
    )
    VALUES (
      v_request.athlete_id,
      v_request.requested_by_user_id,
      v_request.org_id,
      'active'
    )
    ON CONFLICT (athlete_id, user_id, org_id)
    DO UPDATE SET
      status = 'active',
      updated_at = NOW()
    RETURNING id INTO v_athlete_guardian_id;
    
    -- Ensure user has parent role
    PERFORM add_org_role(v_request.requested_by_user_id, v_request.org_id, 'parent');
    
    -- Update request status
    UPDATE guardian_attachment_requests
    SET 
      status = 'approved',
      reviewed_by_user_id = v_current_user,
      reviewed_at = NOW(),
      decision_reason = p_decision_reason
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'status', 'approved',
      'athlete_guardian_id', v_athlete_guardian_id,
      'message', 'Guardian attached successfully'
    );
  ELSE
    -- Deny request
    UPDATE guardian_attachment_requests
    SET 
      status = 'denied',
      reviewed_by_user_id = v_current_user,
      reviewed_at = NOW(),
      decision_reason = p_decision_reason
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'status', 'denied',
      'message', 'Request denied'
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Transaction will rollback automatically
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to review request: ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION review_guardian_attachment_request IS 'Reviews a guardian attachment request. Approves or denies with reason. All operations in single transaction. Uses row locks to prevent concurrent reviews.';

-- ==============================================
-- Get Pending Guardian Attachment Count
-- ==============================================
CREATE OR REPLACE FUNCTION get_pending_guardian_attachment_count(
  p_org_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID;
  v_count INTEGER;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  
  -- Validate user is org admin
  IF NOT (user_is_org_admin(v_current_user, p_org_id) OR is_platform_admin(v_current_user)) THEN
    RETURN 0;
  END IF;
  
  -- Count pending requests
  SELECT COUNT(*) INTO v_count
  FROM guardian_attachment_requests
  WHERE org_id = p_org_id
    AND status = 'pending'
    AND expires_at > NOW();
  
  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION get_pending_guardian_attachment_count IS 'Returns count of pending guardian attachment requests for an organization. Only accessible to org admins.';

-- ==============================================
-- Get Guardian Attachment Requests for Admin (with enriched data)
-- ==============================================
CREATE OR REPLACE FUNCTION get_guardian_attachment_requests_for_admin(
  p_org_id UUID,
  p_status guardian_attachment_request_status DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  org_id UUID,
  athlete_id UUID,
  athlete_first_name TEXT,
  athlete_last_name TEXT,
  athlete_birthdate DATE,
  requested_by_user_id UUID,
  requester_email TEXT,
  requester_display_name TEXT,
  status guardian_attachment_request_status,
  reviewed_by_user_id UUID,
  reviewer_email TEXT,
  reviewer_display_name TEXT,
  reviewed_at TIMESTAMPTZ,
  decision_reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  
  -- Validate user is org admin
  IF NOT (user_is_org_admin(v_current_user, p_org_id) OR is_platform_admin(v_current_user)) THEN
    RETURN;
  END IF;
  
  -- Return enriched request data
  RETURN QUERY
  SELECT 
    gar.id,
    gar.org_id,
    gar.athlete_id,
    a.first_name AS athlete_first_name,
    a.last_name AS athlete_last_name,
    a.birthdate AS athlete_birthdate,
    gar.requested_by_user_id,
    u.email AS requester_email,
    u.display_name AS requester_display_name,
    gar.status,
    gar.reviewed_by_user_id,
    reviewer.email AS reviewer_email,
    reviewer.display_name AS reviewer_display_name,
    gar.reviewed_at,
    gar.decision_reason,
    gar.expires_at,
    gar.created_at,
    gar.updated_at
  FROM guardian_attachment_requests gar
  JOIN athletes a ON a.id = gar.athlete_id
  JOIN users u ON u.id = gar.requested_by_user_id
  LEFT JOIN users reviewer ON reviewer.id = gar.reviewed_by_user_id
  WHERE gar.org_id = p_org_id
    AND (p_status IS NULL OR gar.status = p_status)
  ORDER BY gar.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_guardian_attachment_requests_for_admin IS 'Returns guardian attachment requests with enriched athlete and user data for admin review. Only accessible to org admins.';

-- ==============================================
-- Notification System Integration
-- ==============================================

-- Add notification types to enum
DO $$ BEGIN
  ALTER TYPE notification_job_type ADD VALUE IF NOT EXISTS 'guardian_attachment_request_submitted';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_job_type ADD VALUE IF NOT EXISTS 'guardian_attachment_request_reviewed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Function: Queue guardian attachment notification
-- Queues notifications for:
-- - INSERT: Notify org admins of new request
-- - UPDATE (status change): Notify requester of review decision
CREATE OR REPLACE FUNCTION queue_guardian_attachment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_athlete RECORD;
  v_organization RECORD;
  v_requester RECORD;
  v_reviewer RECORD;
  v_app_url TEXT;
  v_review_url TEXT;
BEGIN
  -- Get app URL
  v_app_url := COALESCE(
    current_setting('app.settings.app_url', true),
    'https://youthsports.team'
  );
  v_review_url := v_app_url || '/admin/guardian-requests';
  
  -- Handle INSERT: Notify org admins
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    BEGIN
      -- Get athlete details
      SELECT first_name, last_name
      INTO v_athlete
      FROM athletes
      WHERE id = NEW.athlete_id;
      
      -- Get organization details
      SELECT name
      INTO v_organization
      FROM organizations
      WHERE id = NEW.org_id;
      
      -- Get requester details
      SELECT email, display_name
      INTO v_requester
      FROM users
      WHERE id = NEW.requested_by_user_id;
      
      -- Queue notification for each org admin
      INSERT INTO notification_jobs (
        org_id,
        user_id,
        email,
        type,
        payload,
        status
      )
      SELECT 
        NEW.org_id,
        om.user_id,
        u.email,
        'guardian_attachment_request_submitted',
        jsonb_build_object(
          'recipient_email', u.email,
          'athlete_first_name', COALESCE(v_athlete.first_name, ''),
          'athlete_last_name', COALESCE(v_athlete.last_name, ''),
          'athlete_name', COALESCE(v_athlete.first_name || ' ' || v_athlete.last_name, 'an athlete'),
          'organization_name', COALESCE(v_organization.name, 'the organization'),
          'requester_email', COALESCE(v_requester.email, ''),
          'requester_display_name', COALESCE(v_requester.display_name, ''),
          'request_id', NEW.id,
          'review_url', v_review_url,
          'expires_at', NEW.expires_at
        ),
        'queued'
      FROM org_members om
      JOIN users u ON u.id = om.user_id
      WHERE om.org_id = NEW.org_id
        AND om.role = 'admin'
        AND om.status = 'active'
        AND u.email IS NOT NULL;
        
    EXCEPTION
      WHEN OTHERS THEN
        -- Log warning but don't fail the transaction
        RAISE WARNING 'Failed to queue notification for guardian attachment request submission: %', SQLERRM;
    END;
  END IF;
  
  -- Handle UPDATE: Notify requester of status change
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status <> OLD.status THEN
    BEGIN
      -- Get athlete details
      SELECT first_name, last_name
      INTO v_athlete
      FROM athletes
      WHERE id = NEW.athlete_id;
      
      -- Get organization details
      SELECT name
      INTO v_organization
      FROM organizations
      WHERE id = NEW.org_id;
      
      -- Get requester details
      SELECT email, display_name
      INTO v_requester
      FROM users
      WHERE id = NEW.requested_by_user_id;
      
      -- Get reviewer details (if reviewed)
      IF NEW.reviewed_by_user_id IS NOT NULL THEN
        SELECT email, display_name
        INTO v_reviewer
        FROM users
        WHERE id = NEW.reviewed_by_user_id;
      END IF;
      
      -- Queue notification to requester
      INSERT INTO notification_jobs (
        org_id,
        user_id,
        email,
        type,
        payload,
        status
      ) VALUES (
        NEW.org_id,
        NEW.requested_by_user_id,
        v_requester.email,
        'guardian_attachment_request_reviewed',
        jsonb_build_object(
          'recipient_email', v_requester.email,
          'athlete_first_name', COALESCE(v_athlete.first_name, ''),
          'athlete_last_name', COALESCE(v_athlete.last_name, ''),
          'athlete_name', COALESCE(v_athlete.first_name || ' ' || v_athlete.last_name, 'an athlete'),
          'organization_name', COALESCE(v_organization.name, 'the organization'),
          'status', NEW.status,
          'decision_reason', COALESCE(NEW.decision_reason, ''),
          'reviewer_email', COALESCE(v_reviewer.email, ''),
          'reviewer_display_name', COALESCE(v_reviewer.display_name, ''),
          'reviewed_at', NEW.reviewed_at,
          'request_id', NEW.id
        ),
        'queued'
      );
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log warning but don't fail the transaction
        RAISE WARNING 'Failed to queue notification for guardian attachment request review: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION queue_guardian_attachment_notification IS 
  'Queues email notifications for guardian attachment requests. On INSERT, notifies org admins. On UPDATE (status change), notifies requester. Non-blocking - failures are logged as warnings.';

-- Create trigger
DROP TRIGGER IF EXISTS guardian_attachment_request_notification ON guardian_attachment_requests;

CREATE TRIGGER guardian_attachment_request_notification
  AFTER INSERT OR UPDATE ON guardian_attachment_requests
  FOR EACH ROW
  EXECUTE FUNCTION queue_guardian_attachment_notification();

COMMENT ON TRIGGER guardian_attachment_request_notification ON guardian_attachment_requests IS 
  'Automatically queues email notifications when guardian attachment requests are created or reviewed.';

-- ==============================================
-- Grant Execute Permissions
-- ==============================================
GRANT EXECUTE ON FUNCTION search_athletes_for_guardian(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_guardian_attachment_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION review_guardian_attachment_request(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_guardian_attachment_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guardian_attachment_requests_for_admin(UUID, guardian_attachment_request_status) TO authenticated;
