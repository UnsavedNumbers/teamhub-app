-- ============================================================================
-- Fix parent_invites trigger log_event() parameter order and table name
-- ============================================================================
-- This migration fixes:
-- 1. Parameter order bug in log_parent_invite_changes() UPDATE case
--    (actor_user_id and actor_role were swapped)
-- 2. Table name inconsistency (event_log vs event_logs)
-- ============================================================================

-- Fix log_parent_invite_changes() function
CREATE OR REPLACE FUNCTION log_parent_invite_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_idempotency_key TEXT;
BEGIN
  v_idempotency_key := TG_OP || ':' ||
    COALESCE(NEW.id, OLD.id)::text || ':' ||
    statement_timestamp()::text;
  
  -- Check for duplicate
  IF EXISTS (
    SELECT 1 FROM event_logs
    WHERE metadata->>'idempotency_key' = v_idempotency_key
    AND created_at > NOW() - INTERVAL '1 second'
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    -- Log PARENT_INVITED
    PERFORM log_event(
      'ORGANIZATION',
      'PARENT_INVITED',
      'org_admin'::event_actor_role,
      COALESCE(NEW.created_by_user_id, auth.uid()),
      NEW.org_id,
      'parent_invite',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'athlete_id', NEW.athlete_id,
        'team_id', NEW.team_id,
        'expires_at', NEW.expires_at,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Log PARENT_ATTACHED (when invite is accepted)
    -- FIXED: Correct parameter order (actor_role before actor_user_id)
    PERFORM log_event(
      'ORGANIZATION',
      'PARENT_ATTACHED',
      'parent'::event_actor_role,
      NEW.accepted_by_user_id,
      NEW.org_id,
      'parent_invite',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'athlete_id', NEW.athlete_id,
        'team_id', NEW.team_id,
        'accepted_by_user_id', NEW.accepted_by_user_id,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Also fix the table name inconsistency in log_join_link_changes()
CREATE OR REPLACE FUNCTION log_join_link_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_idempotency_key TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_idempotency_key := 'INSERT:' || NEW.id::text || ':' || statement_timestamp()::text;
    
    -- Check for duplicate
    -- FIXED: Use event_logs (plural) instead of event_log
    IF EXISTS (
      SELECT 1 FROM event_logs
      WHERE metadata->>'idempotency_key' = v_idempotency_key
      AND created_at > NOW() - INTERVAL '1 second'
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Log JOIN_LINK_CREATED
    PERFORM log_event(
      'ORGANIZATION',
      'JOIN_LINK_CREATED',
      'org_admin'::event_actor_role,
      COALESCE(NEW.created_by_user_id, auth.uid()),
      NEW.org_id,
      'join_link',
      NEW.id,
      jsonb_build_object(
        'team_id', NEW.team_id,
        'auto_approve', NEW.auto_approve,
        'expires_at', NEW.expires_at,
        'idempotency_key', v_idempotency_key
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix parameter order bug in log_join_request_changes() JOIN_REQUEST_APPROVED case
CREATE OR REPLACE FUNCTION log_join_request_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_idempotency_key TEXT;
BEGIN
  v_idempotency_key := TG_OP || ':' ||
    COALESCE(NEW.id, OLD.id)::text || ':' ||
    statement_timestamp()::text;
  
  -- Check for duplicate
  IF EXISTS (
    SELECT 1 FROM event_logs
    WHERE metadata->>'idempotency_key' = v_idempotency_key
    AND created_at > NOW() - INTERVAL '1 second'
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    -- Log JOIN_REQUEST_SUBMITTED
    PERFORM log_event(
      'ORGANIZATION',
      'JOIN_REQUEST_SUBMITTED',
      'parent'::event_actor_role,
      NEW.requested_by_user_id,
      NEW.org_id,
      'join_request',
      NEW.id,
      jsonb_build_object(
        'athlete_id', NEW.athlete_id,
        'team_id', NEW.team_id,
        'season_id', NEW.season_id,
        'join_link_id', NEW.join_link_id,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
    -- Log JOIN_REQUEST_APPROVED
    -- FIXED: Correct parameter order (actor_role before actor_user_id)
    PERFORM log_event(
      'ORGANIZATION',
      'JOIN_REQUEST_APPROVED',
      'org_admin'::event_actor_role,
      NEW.reviewed_by_user_id,
      NEW.org_id,
      'join_request',
      NEW.id,
      jsonb_build_object(
        'athlete_id', NEW.athlete_id,
        'team_id', NEW.team_id,
        'season_id', NEW.season_id,
        'requested_by_user_id', NEW.requested_by_user_id,
        'decision_reason', NEW.decision_reason,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'denied' THEN
    -- Log JOIN_REQUEST_DENIED
    PERFORM log_event(
      'ORGANIZATION',
      'JOIN_REQUEST_DENIED',
      'org_admin'::event_actor_role,
      NEW.reviewed_by_user_id,
      NEW.org_id,
      'join_request',
      NEW.id,
      jsonb_build_object(
        'athlete_id', NEW.athlete_id,
        'team_id', NEW.team_id,
        'season_id', NEW.season_id,
        'requested_by_user_id', NEW.requested_by_user_id,
        'decision_reason', NEW.decision_reason,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION log_parent_invite_changes() IS 'Audit trigger: logs PARENT_INVITED, PARENT_ATTACHED events with idempotency. Fixed parameter order bug.';
COMMENT ON FUNCTION log_join_link_changes() IS 'Audit trigger: logs JOIN_LINK_CREATED events with idempotency. Fixed table name to event_logs.';
COMMENT ON FUNCTION log_join_request_changes() IS 'Audit trigger: logs JOIN_REQUEST_SUBMITTED, JOIN_REQUEST_APPROVED, JOIN_REQUEST_DENIED events with idempotency. Fixed parameter order bug in JOIN_REQUEST_APPROVED case.';
