-- ============================================================================
-- Event Logger Auto-Logging Triggers
-- ============================================================================
-- This migration adds database triggers that automatically log events
-- when critical tables are modified.
--
-- Triggers prevent circular logging by setting app.logging_disabled flag.
-- ============================================================================

-- ============================================================================
-- Helper Function: Get Actor Role from User
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_actor_role(p_user_id UUID)
RETURNS event_actor_role
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM platform_admins WHERE user_id = p_user_id) THEN 'platform_admin'::event_actor_role
    WHEN EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = p_user_id AND role = 'org_admin'
    ) THEN 'org_admin'::event_actor_role
    WHEN EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = p_user_id AND role = 'coach'
    ) THEN 'coach'::event_actor_role
    WHEN EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = p_user_id AND role = 'parent'
    ) THEN 'parent'::event_actor_role
    ELSE 'parent'::event_actor_role
  END;
$$;

-- ============================================================================
-- Trigger Function: Log Organization Changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_organization_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_actor_role event_actor_role;
BEGIN
  -- Prevent circular logging
  PERFORM set_config('app.logging_disabled', 'true', true);

  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'ORG_CREATED';
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'ORG_UPDATED';
    -- Check for specific status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'active' THEN
        v_event_type := 'ORG_ACTIVATED';
      ELSIF NEW.status = 'suspended' THEN
        v_event_type := 'ORG_SUSPENDED';
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'ORG_DELETED';
  END IF;

  -- Get actor role
  v_actor_role := get_user_actor_role(auth.uid());

  -- Log the event
  PERFORM log_event(
    'ORGANIZATION'::event_category,
    v_event_type,
    auth.uid(),
    v_actor_role,
    COALESCE(NEW.id, OLD.id),
    'organization',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_name', OLD.name,
      'new_name', NEW.name
    ),
    NULL,
    NULL,
    NULL
  );

  -- Reset logging flag
  PERFORM set_config('app.logging_disabled', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on organizations
DROP TRIGGER IF EXISTS trigger_log_organization_changes ON organizations;
CREATE TRIGGER trigger_log_organization_changes
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_organization_changes();

-- ============================================================================
-- Trigger Function: Log User Changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_actor_role event_actor_role;
BEGIN
  -- Prevent circular logging
  PERFORM set_config('app.logging_disabled', 'true', true);

  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'USER_CREATED';
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'USER_UPDATED';
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'USER_DELETED';
  END IF;

  -- Get actor role
  v_actor_role := get_user_actor_role(auth.uid());

  -- Log the event
  PERFORM log_event(
    'USER'::event_category,
    v_event_type,
    auth.uid(),
    v_actor_role,
    NULL, -- org_id not directly on users table
    'user',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old_email', OLD.email,
      'new_email', NEW.email,
      'old_display_name', OLD.display_name,
      'new_display_name', NEW.display_name
    ),
    NULL,
    NULL,
    NULL
  );

  -- Reset logging flag
  PERFORM set_config('app.logging_disabled', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on users
DROP TRIGGER IF EXISTS trigger_log_user_changes ON users;
CREATE TRIGGER trigger_log_user_changes
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_changes();

-- ============================================================================
-- Trigger Function: Log Payment Changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_payment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_actor_role event_actor_role;
  v_org_id UUID;
BEGIN
  -- Prevent circular logging
  PERFORM set_config('app.logging_disabled', 'true', true);

  -- Get organization ID from payment
  v_org_id := COALESCE(NEW.org_id, OLD.org_id);

  -- Determine event type based on status changes
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'PAYMENT_STARTED';
    IF NEW.status = 'succeeded' THEN
      v_event_type := 'PAYMENT_SUCCEEDED';
    ELSIF NEW.status = 'failed' THEN
      v_event_type := 'PAYMENT_FAILED';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'succeeded' THEN
        v_event_type := 'PAYMENT_SUCCEEDED';
      ELSIF NEW.status = 'failed' THEN
        v_event_type := 'PAYMENT_FAILED';
      ELSIF NEW.status = 'refunded' THEN
        v_event_type := 'PAYMENT_REFUNDED';
      ELSIF NEW.status = 'partially_refunded' THEN
        v_event_type := 'PAYMENT_PARTIALLY_REFUNDED';
      ELSE
        v_event_type := 'PAYMENT_STARTED';
      END IF;
    ELSE
      -- Status didn't change, just an update
      RETURN NEW;
    END IF;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get actor role
  v_actor_role := get_user_actor_role(auth.uid());

  -- Log the event
  PERFORM log_event(
    'PAYMENT'::event_category,
    v_event_type,
    auth.uid(),
    v_actor_role,
    v_org_id,
    'payment',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'amount_cents', COALESCE(NEW.amount_cents, OLD.amount_cents),
      'currency', COALESCE(NEW.currency, OLD.currency),
      'old_status', OLD.status,
      'new_status', NEW.status,
      'stripe_payment_intent_id', COALESCE(NEW.stripe_payment_intent_id, OLD.stripe_payment_intent_id)
    ),
    NULL,
    NULL,
    NULL
  );

  -- Reset logging flag
  PERFORM set_config('app.logging_disabled', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on payments
DROP TRIGGER IF EXISTS trigger_log_payment_changes ON payments;
CREATE TRIGGER trigger_log_payment_changes
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_changes();

-- ============================================================================
-- Trigger Function: Log Fee Changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_fee_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_actor_role event_actor_role;
BEGIN
  -- Prevent circular logging
  PERFORM set_config('app.logging_disabled', 'true', true);

  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'FEE_CREATED';
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'FEE_UPDATED';
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'FEE_DELETED';
  END IF;

  -- Get actor role
  v_actor_role := get_user_actor_role(auth.uid());

  -- Log the event
  PERFORM log_event(
    'PAYMENT'::event_category,
    v_event_type,
    auth.uid(),
    v_actor_role,
    COALESCE(NEW.org_id, OLD.org_id),
    'fee',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'title', COALESCE(NEW.title, OLD.title),
      'amount_cents', COALESCE(NEW.amount_cents, OLD.amount_cents),
      'old_status', OLD.status,
      'new_status', NEW.status
    ),
    NULL,
    NULL,
    NULL
  );

  -- Reset logging flag
  PERFORM set_config('app.logging_disabled', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on fees
DROP TRIGGER IF EXISTS trigger_log_fee_changes ON fees;
CREATE TRIGGER trigger_log_fee_changes
  AFTER INSERT OR UPDATE OR DELETE ON fees
  FOR EACH ROW
  EXECUTE FUNCTION log_fee_changes();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION log_organization_changes IS 'Auto-logs organization changes to event_logs. Prevents circular logging.';
COMMENT ON FUNCTION log_user_changes IS 'Auto-logs user changes to event_logs. Prevents circular logging.';
COMMENT ON FUNCTION log_payment_changes IS 'Auto-logs payment status changes to event_logs. Prevents circular logging.';
COMMENT ON FUNCTION log_fee_changes IS 'Auto-logs fee changes to event_logs. Prevents circular logging.';
COMMENT ON FUNCTION get_user_actor_role IS 'Helper function to determine actor role from user ID.';
