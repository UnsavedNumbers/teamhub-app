-- ============================================
-- Audit Logging for Multi-Role and Parent Onboarding
-- ============================================
-- Add event types and triggers for role changes and parent onboarding flows

-- ============================================
-- 1. Add new event types to the event_log system
-- ============================================

-- Role management events
-- ROLE_ADDED, ROLE_REMOVED, ORG_JOINED, ORG_LEFT

-- Parent onboarding events
-- PARENT_INVITED, PARENT_ATTACHED, JOIN_LINK_CREATED, JOIN_REQUEST_SUBMITTED
-- JOIN_REQUEST_APPROVED, JOIN_REQUEST_DENIED, CHILD_CLAIM_TOKEN_CREATED, CHILD_CLAIMED

-- Note: These event types should be added to the EventCategory/EventType types
-- in the frontend (src/types/eventLog.types.ts)

-- ============================================
-- 2. Create trigger function for role changes
-- ============================================

CREATE OR REPLACE FUNCTION log_organization_member_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_idempotency_key TEXT;
  v_actor_role TEXT;
  v_is_first_role BOOLEAN;
  v_is_last_role BOOLEAN;
BEGIN
  -- Generate idempotency key based on operation and data
  v_idempotency_key := TG_OP || ':' ||
    COALESCE(NEW.user_id, OLD.user_id)::text || ':' ||
    COALESCE(NEW.org_id, OLD.org_id)::text || ':' ||
    COALESCE(NEW.role, OLD.role)::text || ':' ||
    statement_timestamp()::text;
  
  -- Check for duplicate in last second (idempotency)
  IF EXISTS (
    SELECT 1 FROM event_log
    WHERE metadata->>'idempotency_key' = v_idempotency_key
    AND created_at > NOW() - INTERVAL '1 second'
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get actor role (best guess - may be platform admin or org admin)
  SELECT 
    CASE 
      WHEN is_platform_admin(auth.uid()) THEN 'platform_admin'
      WHEN user_has_any_org_roles(auth.uid(), COALESCE(NEW.org_id, OLD.org_id), ARRAY['org_admin']::org_member_role[]) THEN 'org_admin'
      ELSE 'system'
    END INTO v_actor_role;
  
  IF TG_OP = 'INSERT' THEN
    -- Check if this is the first role for this user in this org
    SELECT NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = NEW.user_id
        AND org_id = NEW.org_id
        AND id != NEW.id
    ) INTO v_is_first_role;
    
    -- Log ROLE_ADDED
    PERFORM log_event(
      'ORGANIZATION',
      'ROLE_ADDED',
      COALESCE(auth.uid(), NEW.user_id), -- actor (may be self-add or admin-add)
      v_actor_role::text,
      NEW.org_id,
      'user',
      NEW.user_id::text,
      jsonb_build_object(
        'role', NEW.role,
        'idempotency_key', v_idempotency_key
      )
    );
    
    -- If first role, also log ORG_JOINED
    IF v_is_first_role THEN
      PERFORM log_event(
        'ORGANIZATION',
        'ORG_JOINED',
        COALESCE(auth.uid(), NEW.user_id),
        v_actor_role::text,
        NEW.org_id,
        'organization',
        NEW.org_id::text,
        jsonb_build_object(
          'first_role', NEW.role,
          'user_id', NEW.user_id,
          'idempotency_key', v_idempotency_key || ':joined'
        )
      );
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Check if this was the last role for this user in this org
    SELECT NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = OLD.user_id
        AND org_id = OLD.org_id
        AND id != OLD.id
    ) INTO v_is_last_role;
    
    -- Log ROLE_REMOVED
    PERFORM log_event(
      'ORGANIZATION',
      'ROLE_REMOVED',
      COALESCE(auth.uid(), OLD.user_id),
      v_actor_role::text,
      OLD.org_id,
      'user',
      OLD.user_id::text,
      jsonb_build_object(
        'role', OLD.role,
        'idempotency_key', v_idempotency_key
      )
    );
    
    -- If last role, also log ORG_LEFT
    IF v_is_last_role THEN
      PERFORM log_event(
        'ORGANIZATION',
        'ORG_LEFT',
        COALESCE(auth.uid(), OLD.user_id),
        v_actor_role::text,
        OLD.org_id,
        'organization',
        OLD.org_id::text,
        jsonb_build_object(
          'last_role', OLD.role,
          'user_id', OLD.user_id,
          'idempotency_key', v_idempotency_key || ':left'
        )
      );
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger on organization_members
DROP TRIGGER IF EXISTS organization_members_audit_log ON organization_members;
CREATE TRIGGER organization_members_audit_log
  AFTER INSERT OR DELETE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION log_organization_member_changes();

-- ============================================
-- 3. Create trigger function for parent_invites
-- ============================================

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
    SELECT 1 FROM event_log
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
      COALESCE(NEW.created_by_user_id, auth.uid()),
      'org_admin',
      NEW.org_id,
      'parent_invite',
      NEW.id::text,
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
    PERFORM log_event(
      'ORGANIZATION',
      'PARENT_ATTACHED',
      NEW.accepted_by_user_id,
      'parent',
      NEW.org_id,
      'parent_invite',
      NEW.id::text,
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

-- Create trigger on parent_invites
DROP TRIGGER IF EXISTS parent_invites_audit_log ON parent_invites;
CREATE TRIGGER parent_invites_audit_log
  AFTER INSERT OR UPDATE ON parent_invites
  FOR EACH ROW
  EXECUTE FUNCTION log_parent_invite_changes();

-- ============================================
-- 4. Create trigger function for join_links
-- ============================================

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
    IF EXISTS (
      SELECT 1 FROM event_log
      WHERE metadata->>'idempotency_key' = v_idempotency_key
      AND created_at > NOW() - INTERVAL '1 second'
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Log JOIN_LINK_CREATED
    PERFORM log_event(
      'ORGANIZATION',
      'JOIN_LINK_CREATED',
      COALESCE(NEW.created_by_user_id, auth.uid()),
      'org_admin',
      NEW.org_id,
      'join_link',
      NEW.id::text,
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

-- Create trigger on join_links
DROP TRIGGER IF EXISTS join_links_audit_log ON join_links;
CREATE TRIGGER join_links_audit_log
  AFTER INSERT ON join_links
  FOR EACH ROW
  EXECUTE FUNCTION log_join_link_changes();

-- ============================================
-- 5. Create trigger function for join_requests
-- ============================================

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
    SELECT 1 FROM event_log
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
      NEW.requested_by_user_id,
      'parent',
      NEW.org_id,
      'join_request',
      NEW.id::text,
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
    PERFORM log_event(
      'ORGANIZATION',
      'JOIN_REQUEST_APPROVED',
      NEW.reviewed_by_user_id,
      'org_admin',
      NEW.org_id,
      'join_request',
      NEW.id::text,
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
      NEW.reviewed_by_user_id,
      'org_admin',
      NEW.org_id,
      'join_request',
      NEW.id::text,
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

-- Create trigger on join_requests
DROP TRIGGER IF EXISTS join_requests_audit_log ON join_requests;
CREATE TRIGGER join_requests_audit_log
  AFTER INSERT OR UPDATE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_join_request_changes();

-- ============================================
-- 6. Create trigger function for child_claim_tokens
-- ============================================

CREATE OR REPLACE FUNCTION log_child_claim_token_changes()
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
    SELECT 1 FROM event_log
    WHERE metadata->>'idempotency_key' = v_idempotency_key
    AND created_at > NOW() - INTERVAL '1 second'
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    -- Log CHILD_CLAIM_TOKEN_CREATED
    PERFORM log_event(
      'ORGANIZATION',
      'CHILD_CLAIM_TOKEN_CREATED',
      COALESCE(NEW.created_by_user_id, auth.uid()),
      'org_admin',
      NEW.org_id,
      'claim_token',
      NEW.id::text,
      jsonb_build_object(
        'athlete_id', NEW.athlete_id,
        'team_id', NEW.team_id,
        'expires_at', NEW.expires_at,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.used_at IS NULL AND NEW.used_at IS NOT NULL THEN
    -- Log CHILD_CLAIMED (when token is redeemed)
    PERFORM log_event(
      'ORGANIZATION',
      'CHILD_CLAIMED',
      NEW.used_by_user_id,
      'parent',
      NEW.org_id,
      'claim_token',
      NEW.id::text,
      jsonb_build_object(
        'athlete_id', NEW.athlete_id,
        'team_id', NEW.team_id,
        'used_by_user_id', NEW.used_by_user_id,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on child_claim_tokens
DROP TRIGGER IF EXISTS child_claim_tokens_audit_log ON child_claim_tokens;
CREATE TRIGGER child_claim_tokens_audit_log
  AFTER INSERT OR UPDATE ON child_claim_tokens
  FOR EACH ROW
  EXECUTE FUNCTION log_child_claim_token_changes();

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION log_organization_member_changes() IS 'Audit trigger: logs ROLE_ADDED, ROLE_REMOVED, ORG_JOINED, ORG_LEFT events with idempotency';
COMMENT ON FUNCTION log_parent_invite_changes() IS 'Audit trigger: logs PARENT_INVITED, PARENT_ATTACHED events with idempotency';
COMMENT ON FUNCTION log_join_link_changes() IS 'Audit trigger: logs JOIN_LINK_CREATED events with idempotency';
COMMENT ON FUNCTION log_join_request_changes() IS 'Audit trigger: logs JOIN_REQUEST_SUBMITTED, JOIN_REQUEST_APPROVED, JOIN_REQUEST_DENIED events with idempotency';
COMMENT ON FUNCTION log_child_claim_token_changes() IS 'Audit trigger: logs CHILD_CLAIM_TOKEN_CREATED, CHILD_CLAIMED events with idempotency';
