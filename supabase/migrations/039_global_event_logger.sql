-- ============================================================================
-- Global Event Logger / Audit System Migration
-- ============================================================================
-- This migration replaces the basic audit_logs table with a comprehensive
-- event logging system that captures all meaningful platform actions.
--
-- Migration Strategy:
-- 1. Pre-migration validation and backup
-- 2. Create ENUMs and validation infrastructure
-- 3. Create new event_logs table
-- 4. Migrate existing audit_logs data
-- 5. Create functions, RLS policies, and views
-- 6. Rename old table for rollback safety
-- ============================================================================

-- ============================================================================
-- STEP 1: Pre-migration Validation
-- ============================================================================

-- Create migration_errors table to track failed migrations
CREATE TABLE IF NOT EXISTS migration_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_id UUID,
  error_message TEXT NOT NULL,
  error_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log pre-migration counts
DO $$
DECLARE
  audit_logs_count INTEGER;
  table_exists BOOLEAN;
BEGIN
  -- Check if audit_logs table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs'
  ) INTO table_exists;
  
  IF table_exists THEN
    SELECT COUNT(*) INTO audit_logs_count FROM audit_logs;
    RAISE NOTICE 'Pre-migration: Found % records in audit_logs', audit_logs_count;
  ELSE
    RAISE NOTICE 'Pre-migration: audit_logs table does not exist (fresh install)';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create ENUMs
-- ============================================================================

-- Event Category ENUM
DO $$ BEGIN
  CREATE TYPE event_category AS ENUM (
    'AUTH',
    'ORGANIZATION',
    'USER',
    'PARENT',
    'CHILD',
    'TEAM',
    'SEASON',
    'EVENT',
    'PAYMENT',
    'TRYOUT',
    'TRAVEL',
    'UNIFORM',
    'FEATURE_FLAG',
    'ADMIN',
    'SYSTEM'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Actor Role ENUM
DO $$ BEGIN
  CREATE TYPE event_actor_role AS ENUM (
    'platform_admin',
    'org_admin',
    'coach',
    'parent',
    'system'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AUTH Event Types
DO $$ BEGIN
  CREATE TYPE auth_event_type AS ENUM (
    'USER_SIGNED_UP',
    'USER_LOGGED_IN',
    'USER_LOGGED_OUT',
    'PASSWORD_RESET_REQUESTED',
    'PASSWORD_RESET_COMPLETED',
    'EMAIL_VERIFIED',
    'EMAIL_VERIFICATION_SENT',
    'ACCOUNT_DISABLED',
    'ACCOUNT_ENABLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ORGANIZATION Event Types
DO $$ BEGIN
  CREATE TYPE organization_event_type AS ENUM (
    'ORG_CREATED',
    'ORG_UPDATED',
    'ORG_ACTIVATED',
    'ORG_SUSPENDED',
    'ORG_DELETED',
    'ORG_STRIPE_CONNECTED',
    'ORG_STRIPE_DISCONNECTED',
    'ORG_LICENSE_UPDATED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- USER Event Types
DO $$ BEGIN
  CREATE TYPE user_event_type AS ENUM (
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'USER_ROLE_CHANGED',
    'USER_ORG_JOINED',
    'USER_ORG_LEFT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- PARENT Event Types
DO $$ BEGIN
  CREATE TYPE parent_event_type AS ENUM (
    'PARENT_PROFILE_UPDATED',
    'PARENT_EMAIL_CHANGED',
    'PARENT_PHONE_CHANGED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CHILD Event Types
DO $$ BEGIN
  CREATE TYPE child_event_type AS ENUM (
    'CHILD_CREATED',
    'CHILD_UPDATED',
    'CHILD_DELETED',
    'CHILD_PROFILE_UPDATED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- TEAM Event Types
DO $$ BEGIN
  CREATE TYPE team_event_type AS ENUM (
    'TEAM_CREATED',
    'TEAM_UPDATED',
    'TEAM_DELETED',
    'TEAM_MEMBER_ADDED',
    'TEAM_MEMBER_REMOVED',
    'TEAM_INVITE_SENT',
    'TEAM_INVITE_ACCEPTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- SEASON Event Types
DO $$ BEGIN
  CREATE TYPE season_event_type AS ENUM (
    'SEASON_CREATED',
    'SEASON_UPDATED',
    'SEASON_DELETED',
    'SEASON_ACTIVATED',
    'SEASON_ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- EVENT (Calendar) Event Types
DO $$ BEGIN
  CREATE TYPE calendar_event_type AS ENUM (
    'EVENT_CREATED',
    'EVENT_UPDATED',
    'EVENT_DELETED',
    'EVENT_CANCELLED',
    'EVENT_RSVP_SUBMITTED',
    'EVENT_RSVP_UPDATED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- PAYMENT Event Types
DO $$ BEGIN
  CREATE TYPE payment_event_type AS ENUM (
    'FEE_CREATED',
    'FEE_UPDATED',
    'FEE_DELETED',
    'FEE_ASSIGNED',
    'FEE_UNASSIGNED',
    'PAYMENT_STARTED',
    'PAYMENT_SUCCEEDED',
    'PAYMENT_FAILED',
    'PAYMENT_REFUNDED',
    'PAYMENT_PARTIALLY_REFUNDED',
    'OFFLINE_PAYMENT_RECORDED',
    'OFFLINE_PAYMENT_VOIDED',
    'DISCOUNT_APPLIED',
    'WAIVER_APPLIED',
    'SCHOLARSHIP_APPLIED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- TRYOUT Event Types
DO $$ BEGIN
  CREATE TYPE tryout_event_type AS ENUM (
    'TRYOUT_CREATED',
    'TRYOUT_UPDATED',
    'TRYOUT_DELETED',
    'TRYOUT_REGISTRATION_STARTED',
    'TRYOUT_REGISTRATION_COMPLETED',
    'TRYOUT_CHECKED_IN',
    'TRYOUT_EVALUATED',
    'TRYOUT_OFFERED',
    'TRYOUT_ACCEPTED',
    'TRYOUT_DECLINED',
    'TRYOUT_REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- TRAVEL Event Types
DO $$ BEGIN
  CREATE TYPE travel_event_type AS ENUM (
    'TRAVEL_PLAN_CREATED',
    'TRAVEL_PLAN_UPDATED',
    'TRAVEL_PLAN_DELETED',
    'TRAVEL_ITINERARY_UPDATED',
    'TRAVEL_BOOKING_CONFIRMED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- UNIFORM Event Types
DO $$ BEGIN
  CREATE TYPE uniform_event_type AS ENUM (
    'UNIFORM_KIT_CREATED',
    'UNIFORM_KIT_UPDATED',
    'UNIFORM_ORDER_SUBMITTED',
    'UNIFORM_ORDER_UPDATED',
    'UNIFORM_ORDER_FULFILLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- FEATURE_FLAG Event Types
DO $$ BEGIN
  CREATE TYPE feature_flag_event_type AS ENUM (
    'FEATURE_FLAG_ENABLED',
    'FEATURE_FLAG_DISABLED',
    'FEATURE_FLAG_OVERRIDE_CREATED',
    'FEATURE_FLAG_OVERRIDE_DELETED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ADMIN Event Types
DO $$ BEGIN
  CREATE TYPE admin_event_type AS ENUM (
    'ACTIVATE_ORGANIZATION',
    'SUSPEND_ORGANIZATION',
    'DISABLE_USER',
    'ENABLE_USER',
    'SET_FEATURE_FLAG',
    'ADD_PLATFORM_ADMIN',
    'REMOVE_PLATFORM_ADMIN',
    'UPDATE_PLATFORM_ADMIN',
    'PII_VIEWED',
    'ISSUE_REFUND',
    'MARK_DISPUTE',
    'RESEND_VERIFICATION',
    'FORCE_LOGOUT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- SYSTEM Event Types
DO $$ BEGIN
  CREATE TYPE system_event_type AS ENUM (
    'SCHEDULED_JOB_STARTED',
    'SCHEDULED_JOB_COMPLETED',
    'SCHEDULED_JOB_FAILED',
    'WEBHOOK_RECEIVED',
    'WEBHOOK_PROCESSED',
    'WEBHOOK_FAILED',
    'DATABASE_BACKUP',
    'SYSTEM_ALERT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 3: Create Validation Infrastructure
-- ============================================================================

-- Valid Event Types Lookup Table
CREATE TABLE IF NOT EXISTS valid_event_types (
  category event_category NOT NULL,
  event_type TEXT NOT NULL,
  enum_name TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (category, event_type)
);

-- Populate valid_event_types table
INSERT INTO valid_event_types (category, event_type, enum_name, description) VALUES
-- AUTH
('AUTH', 'USER_SIGNED_UP', 'auth_event_type', 'User signed up for an account'),
('AUTH', 'USER_LOGGED_IN', 'auth_event_type', 'User logged in'),
('AUTH', 'USER_LOGGED_OUT', 'auth_event_type', 'User logged out'),
('AUTH', 'PASSWORD_RESET_REQUESTED', 'auth_event_type', 'Password reset requested'),
('AUTH', 'PASSWORD_RESET_COMPLETED', 'auth_event_type', 'Password reset completed'),
('AUTH', 'EMAIL_VERIFIED', 'auth_event_type', 'Email address verified'),
('AUTH', 'EMAIL_VERIFICATION_SENT', 'auth_event_type', 'Email verification sent'),
('AUTH', 'ACCOUNT_DISABLED', 'auth_event_type', 'User account disabled'),
('AUTH', 'ACCOUNT_ENABLED', 'auth_event_type', 'User account enabled'),
-- ORGANIZATION
('ORGANIZATION', 'ORG_CREATED', 'organization_event_type', 'Organization created'),
('ORGANIZATION', 'ORG_UPDATED', 'organization_event_type', 'Organization updated'),
('ORGANIZATION', 'ORG_ACTIVATED', 'organization_event_type', 'Organization activated'),
('ORGANIZATION', 'ORG_SUSPENDED', 'organization_event_type', 'Organization suspended'),
('ORGANIZATION', 'ORG_DELETED', 'organization_event_type', 'Organization deleted'),
('ORGANIZATION', 'ORG_STRIPE_CONNECTED', 'organization_event_type', 'Stripe account connected'),
('ORGANIZATION', 'ORG_STRIPE_DISCONNECTED', 'organization_event_type', 'Stripe account disconnected'),
('ORGANIZATION', 'ORG_LICENSE_UPDATED', 'organization_event_type', 'Organization license updated'),
-- USER
('USER', 'USER_CREATED', 'user_event_type', 'User profile created'),
('USER', 'USER_UPDATED', 'user_event_type', 'User profile updated'),
('USER', 'USER_DELETED', 'user_event_type', 'User profile deleted'),
('USER', 'USER_ROLE_CHANGED', 'user_event_type', 'User role changed'),
('USER', 'USER_ORG_JOINED', 'user_event_type', 'User joined organization'),
('USER', 'USER_ORG_LEFT', 'user_event_type', 'User left organization'),
-- PARENT
('PARENT', 'PARENT_PROFILE_UPDATED', 'parent_event_type', 'Parent profile updated'),
('PARENT', 'PARENT_EMAIL_CHANGED', 'parent_event_type', 'Parent email changed'),
('PARENT', 'PARENT_PHONE_CHANGED', 'parent_event_type', 'Parent phone changed'),
-- CHILD
('CHILD', 'CHILD_CREATED', 'child_event_type', 'Child profile created'),
('CHILD', 'CHILD_UPDATED', 'child_event_type', 'Child profile updated'),
('CHILD', 'CHILD_DELETED', 'child_event_type', 'Child profile deleted'),
('CHILD', 'CHILD_PROFILE_UPDATED', 'child_event_type', 'Child profile updated'),
-- TEAM
('TEAM', 'TEAM_CREATED', 'team_event_type', 'Team created'),
('TEAM', 'TEAM_UPDATED', 'team_event_type', 'Team updated'),
('TEAM', 'TEAM_DELETED', 'team_event_type', 'Team deleted'),
('TEAM', 'TEAM_MEMBER_ADDED', 'team_event_type', 'Team member added'),
('TEAM', 'TEAM_MEMBER_REMOVED', 'team_event_type', 'Team member removed'),
('TEAM', 'TEAM_INVITE_SENT', 'team_event_type', 'Team invite sent'),
('TEAM', 'TEAM_INVITE_ACCEPTED', 'team_event_type', 'Team invite accepted'),
-- SEASON
('SEASON', 'SEASON_CREATED', 'season_event_type', 'Season created'),
('SEASON', 'SEASON_UPDATED', 'season_event_type', 'Season updated'),
('SEASON', 'SEASON_DELETED', 'season_event_type', 'Season deleted'),
('SEASON', 'SEASON_ACTIVATED', 'season_event_type', 'Season activated'),
('SEASON', 'SEASON_ARCHIVED', 'season_event_type', 'Season archived'),
-- EVENT (Calendar)
('EVENT', 'EVENT_CREATED', 'calendar_event_type', 'Calendar event created'),
('EVENT', 'EVENT_UPDATED', 'calendar_event_type', 'Calendar event updated'),
('EVENT', 'EVENT_DELETED', 'calendar_event_type', 'Calendar event deleted'),
('EVENT', 'EVENT_CANCELLED', 'calendar_event_type', 'Calendar event cancelled'),
('EVENT', 'EVENT_RSVP_SUBMITTED', 'calendar_event_type', 'RSVP submitted'),
('EVENT', 'EVENT_RSVP_UPDATED', 'calendar_event_type', 'RSVP updated'),
-- PAYMENT
('PAYMENT', 'FEE_CREATED', 'payment_event_type', 'Fee created'),
('PAYMENT', 'FEE_UPDATED', 'payment_event_type', 'Fee updated'),
('PAYMENT', 'FEE_DELETED', 'payment_event_type', 'Fee deleted'),
('PAYMENT', 'FEE_ASSIGNED', 'payment_event_type', 'Fee assigned to child'),
('PAYMENT', 'FEE_UNASSIGNED', 'payment_event_type', 'Fee unassigned from child'),
('PAYMENT', 'PAYMENT_STARTED', 'payment_event_type', 'Payment process started'),
('PAYMENT', 'PAYMENT_SUCCEEDED', 'payment_event_type', 'Payment succeeded'),
('PAYMENT', 'PAYMENT_FAILED', 'payment_event_type', 'Payment failed'),
('PAYMENT', 'PAYMENT_REFUNDED', 'payment_event_type', 'Payment refunded'),
('PAYMENT', 'PAYMENT_PARTIALLY_REFUNDED', 'payment_event_type', 'Payment partially refunded'),
('PAYMENT', 'OFFLINE_PAYMENT_RECORDED', 'payment_event_type', 'Offline payment recorded'),
('PAYMENT', 'OFFLINE_PAYMENT_VOIDED', 'payment_event_type', 'Offline payment voided'),
('PAYMENT', 'DISCOUNT_APPLIED', 'payment_event_type', 'Discount code applied'),
('PAYMENT', 'WAIVER_APPLIED', 'payment_event_type', 'Waiver applied'),
('PAYMENT', 'SCHOLARSHIP_APPLIED', 'payment_event_type', 'Scholarship applied'),
-- TRYOUT
('TRYOUT', 'TRYOUT_CREATED', 'tryout_event_type', 'Tryout created'),
('TRYOUT', 'TRYOUT_UPDATED', 'tryout_event_type', 'Tryout updated'),
('TRYOUT', 'TRYOUT_DELETED', 'tryout_event_type', 'Tryout deleted'),
('TRYOUT', 'TRYOUT_REGISTRATION_STARTED', 'tryout_event_type', 'Tryout registration started'),
('TRYOUT', 'TRYOUT_REGISTRATION_COMPLETED', 'tryout_event_type', 'Tryout registration completed'),
('TRYOUT', 'TRYOUT_CHECKED_IN', 'tryout_event_type', 'Tryout checked in'),
('TRYOUT', 'TRYOUT_EVALUATED', 'tryout_event_type', 'Tryout evaluated'),
('TRYOUT', 'TRYOUT_OFFERED', 'tryout_event_type', 'Tryout offer made'),
('TRYOUT', 'TRYOUT_ACCEPTED', 'tryout_event_type', 'Tryout offer accepted'),
('TRYOUT', 'TRYOUT_DECLINED', 'tryout_event_type', 'Tryout offer declined'),
('TRYOUT', 'TRYOUT_REJECTED', 'tryout_event_type', 'Tryout registration rejected'),
-- TRAVEL
('TRAVEL', 'TRAVEL_PLAN_CREATED', 'travel_event_type', 'Travel plan created'),
('TRAVEL', 'TRAVEL_PLAN_UPDATED', 'travel_event_type', 'Travel plan updated'),
('TRAVEL', 'TRAVEL_PLAN_DELETED', 'travel_event_type', 'Travel plan deleted'),
('TRAVEL', 'TRAVEL_ITINERARY_UPDATED', 'travel_event_type', 'Travel itinerary updated'),
('TRAVEL', 'TRAVEL_BOOKING_CONFIRMED', 'travel_event_type', 'Travel booking confirmed'),
-- UNIFORM
('UNIFORM', 'UNIFORM_KIT_CREATED', 'uniform_event_type', 'Uniform kit created'),
('UNIFORM', 'UNIFORM_KIT_UPDATED', 'uniform_event_type', 'Uniform kit updated'),
('UNIFORM', 'UNIFORM_ORDER_SUBMITTED', 'uniform_event_type', 'Uniform order submitted'),
('UNIFORM', 'UNIFORM_ORDER_UPDATED', 'uniform_event_type', 'Uniform order updated'),
('UNIFORM', 'UNIFORM_ORDER_FULFILLED', 'uniform_event_type', 'Uniform order fulfilled'),
-- FEATURE_FLAG
('FEATURE_FLAG', 'FEATURE_FLAG_ENABLED', 'feature_flag_event_type', 'Feature flag enabled'),
('FEATURE_FLAG', 'FEATURE_FLAG_DISABLED', 'feature_flag_event_type', 'Feature flag disabled'),
('FEATURE_FLAG', 'FEATURE_FLAG_OVERRIDE_CREATED', 'feature_flag_event_type', 'Feature flag override created'),
('FEATURE_FLAG', 'FEATURE_FLAG_OVERRIDE_DELETED', 'feature_flag_event_type', 'Feature flag override deleted'),
-- ADMIN
('ADMIN', 'ACTIVATE_ORGANIZATION', 'admin_event_type', 'Organization activated by admin'),
('ADMIN', 'SUSPEND_ORGANIZATION', 'admin_event_type', 'Organization suspended by admin'),
('ADMIN', 'DISABLE_USER', 'admin_event_type', 'User disabled by admin'),
('ADMIN', 'ENABLE_USER', 'admin_event_type', 'User enabled by admin'),
('ADMIN', 'SET_FEATURE_FLAG', 'admin_event_type', 'Feature flag set by admin'),
('ADMIN', 'ADD_PLATFORM_ADMIN', 'admin_event_type', 'Platform admin added'),
('ADMIN', 'REMOVE_PLATFORM_ADMIN', 'admin_event_type', 'Platform admin removed'),
('ADMIN', 'UPDATE_PLATFORM_ADMIN', 'admin_event_type', 'Platform admin updated'),
('ADMIN', 'PII_VIEWED', 'admin_event_type', 'PII data viewed by admin'),
('ADMIN', 'ISSUE_REFUND', 'admin_event_type', 'Refund issued by admin'),
('ADMIN', 'MARK_DISPUTE', 'admin_event_type', 'Dispute marked by admin'),
('ADMIN', 'RESEND_VERIFICATION', 'admin_event_type', 'Verification email resent by admin'),
('ADMIN', 'FORCE_LOGOUT', 'admin_event_type', 'User force logged out by admin'),
-- SYSTEM
('SYSTEM', 'SCHEDULED_JOB_STARTED', 'system_event_type', 'Scheduled job started'),
('SYSTEM', 'SCHEDULED_JOB_COMPLETED', 'system_event_type', 'Scheduled job completed'),
('SYSTEM', 'SCHEDULED_JOB_FAILED', 'system_event_type', 'Scheduled job failed'),
('SYSTEM', 'WEBHOOK_RECEIVED', 'system_event_type', 'Webhook received'),
('SYSTEM', 'WEBHOOK_PROCESSED', 'system_event_type', 'Webhook processed'),
('SYSTEM', 'WEBHOOK_FAILED', 'system_event_type', 'Webhook processing failed'),
('SYSTEM', 'DATABASE_BACKUP', 'system_event_type', 'Database backup performed'),
('SYSTEM', 'SYSTEM_ALERT', 'system_event_type', 'System alert generated')
ON CONFLICT (category, event_type) DO NOTHING;

-- Create index on valid_event_types for fast lookups
CREATE INDEX IF NOT EXISTS idx_valid_event_types_category ON valid_event_types(category);
CREATE INDEX IF NOT EXISTS idx_valid_event_types_event_type ON valid_event_types(event_type);

-- ============================================================================
-- STEP 4: Create Helper Functions
-- ============================================================================

-- Sanitize metadata function (removes sensitive keys)
CREATE OR REPLACE FUNCTION sanitize_metadata(p_metadata JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  sanitized JSONB := '{}'::JSONB;
  key TEXT;
  value JSONB;
  lower_key TEXT;
  sensitive_keys TEXT[] := ARRAY['password', 'token', 'secret', 'api_key', 'stripe_id', 'stripe_secret', 'access_token', 'refresh_token'];
BEGIN
  -- If metadata is null or empty, return empty object
  IF p_metadata IS NULL OR p_metadata = '{}'::JSONB THEN
    RETURN '{}'::JSONB;
  END IF;

  -- Iterate through all keys
  FOR key, value IN SELECT * FROM jsonb_each(p_metadata)
  LOOP
    lower_key := lower(key);
    
    -- Check if key contains any sensitive terms
    IF EXISTS (
      SELECT 1 FROM unnest(sensitive_keys) AS sk 
      WHERE lower_key LIKE '%' || sk || '%'
    ) THEN
      -- Redact sensitive values
      sanitized := sanitized || jsonb_build_object(key, '[REDACTED]');
    ELSE
      -- Keep non-sensitive values
      sanitized := sanitized || jsonb_build_object(key, value);
    END IF;
  END LOOP;

  RETURN sanitized;
END;
$$;

-- Validate event type against category
CREATE OR REPLACE FUNCTION validate_event_type(
  p_category event_category,
  p_event_type TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM valid_event_types
    WHERE category = p_category
    AND event_type = p_event_type
  );
$$;

-- ============================================================================
-- STEP 5: Create event_logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  category event_category NOT NULL,
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role event_actor_role NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  target_entity_type TEXT,
  target_entity_id UUID,
  metadata JSONB DEFAULT '{}'::JSONB,
  ip_address TEXT,
  user_agent TEXT,
  idempotency_key UUID UNIQUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_category_event_type ON event_logs(category, event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_org_id_created_at ON event_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_actor_user_id_created_at ON event_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_target_entity ON event_logs(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_idempotency_key ON event_logs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Enable RLS
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: Create log_event Function
-- ============================================================================

CREATE OR REPLACE FUNCTION log_event(
  p_category event_category,
  p_event_type TEXT,
  p_actor_role event_actor_role,
  p_actor_user_id UUID DEFAULT auth.uid(),
  p_org_id UUID DEFAULT NULL,
  p_target_entity_type TEXT DEFAULT NULL,
  p_target_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_metadata_size INTEGER;
  v_logging_disabled BOOLEAN;
BEGIN
  -- Check if logging is disabled (prevents circular logging)
  v_logging_disabled := current_setting('app.logging_disabled', true) = 'true';
  IF v_logging_disabled THEN
    RETURN NULL;
  END IF;

  -- Validate event type against category
  IF NOT validate_event_type(p_category, p_event_type) THEN
    RAISE EXCEPTION 'Event type % is not valid for category %', p_event_type, p_category;
  END IF;

  -- Check idempotency key (if provided)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_event_id FROM event_logs WHERE idempotency_key = p_idempotency_key;
    IF v_event_id IS NOT NULL THEN
      RETURN v_event_id; -- Return existing event ID
    END IF;
  END IF;

  -- Sanitize metadata
  p_metadata := sanitize_metadata(p_metadata);

  -- Check metadata size (max 100KB)
  v_metadata_size := pg_column_size(p_metadata);
  IF v_metadata_size > 102400 THEN
    RAISE EXCEPTION 'Metadata size % bytes exceeds maximum of 102400 bytes', v_metadata_size;
  END IF;

  -- Insert event with SAVEPOINT for non-blocking failure
  BEGIN
    INSERT INTO event_logs (
      category,
      event_type,
      actor_user_id,
      actor_role,
      org_id,
      target_entity_type,
      target_entity_id,
      metadata,
      ip_address,
      user_agent,
      idempotency_key
    )
    VALUES (
      p_category,
      p_event_type,
      p_actor_user_id,
      p_actor_role,
      p_org_id,
      p_target_entity_type,
      p_target_entity_id,
      p_metadata,
      p_ip_address,
      p_user_agent,
      p_idempotency_key
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the main transaction
      RAISE WARNING 'Failed to log event: %', SQLERRM;
      RETURN NULL;
  END;
END;
$$;

-- ============================================================================
-- STEP 7: Migrate Existing audit_logs Data
-- ============================================================================

DO $$
DECLARE
  audit_record RECORD;
  migrated_count INTEGER := 0;
  error_count INTEGER := 0;
  mapped_event_type TEXT;
  table_exists BOOLEAN;
BEGIN
  -- Check if audit_logs table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE NOTICE 'Skipping data migration: audit_logs table does not exist';
    RETURN;
  END IF;
  
  -- Map old action values to new event types
  FOR audit_record IN SELECT * FROM audit_logs ORDER BY created_at
  LOOP
    BEGIN
      -- Map old action to new event_type (all go to ADMIN category)
      mapped_event_type := CASE audit_record.action
        WHEN 'activate_organization' THEN 'ACTIVATE_ORGANIZATION'
        WHEN 'suspend_organization' THEN 'SUSPEND_ORGANIZATION'
        WHEN 'disable_user' THEN 'DISABLE_USER'
        WHEN 'enable_user' THEN 'ENABLE_USER'
        WHEN 'set_feature_flag' THEN 'SET_FEATURE_FLAG'
        WHEN 'add_platform_admin' THEN 'ADD_PLATFORM_ADMIN'
        WHEN 'remove_platform_admin' THEN 'REMOVE_PLATFORM_ADMIN'
        WHEN 'update_platform_admin' THEN 'UPDATE_PLATFORM_ADMIN'
        WHEN 'pii_viewed' THEN 'PII_VIEWED'
        WHEN 'issue_refund' THEN 'ISSUE_REFUND'
        WHEN 'mark_dispute' THEN 'MARK_DISPUTE'
        WHEN 'resend_verification' THEN 'RESEND_VERIFICATION'
        WHEN 'force_logout' THEN 'FORCE_LOGOUT'
        ELSE UPPER(REPLACE(audit_record.action, '_', '_'))
      END;

      -- Insert into event_logs
      INSERT INTO event_logs (
        created_at,
        category,
        event_type,
        actor_user_id,
        actor_role,
        org_id,
        target_entity_type,
        target_entity_id,
        metadata,
        ip_address,
        user_agent
      )
      VALUES (
        audit_record.created_at,
        'ADMIN'::event_category,
        mapped_event_type,
        audit_record.actor_id,
        'platform_admin'::event_actor_role,
        NULL, -- org_id not available in old table
        audit_record.entity_type,
        CASE 
          WHEN audit_record.entity_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
          THEN audit_record.entity_id::UUID
          ELSE NULL
        END,
        COALESCE(audit_record.metadata, '{}'::JSONB),
        NULL, -- ip_address not available
        NULL  -- user_agent not available
      );

      migrated_count := migrated_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue migration
        INSERT INTO migration_errors (source_table, source_id, error_message, error_data)
        VALUES (
          'audit_logs',
          audit_record.id,
          SQLERRM,
          jsonb_build_object(
            'action', audit_record.action,
            'entity_type', audit_record.entity_type,
            'entity_id', audit_record.entity_id
          )
        );
        error_count := error_count + 1;
    END;
  END LOOP;

  RAISE NOTICE 'Migration complete: % records migrated, % errors', migrated_count, error_count;
END $$;

-- ============================================================================
-- STEP 8: Create RLS Policies
-- ============================================================================

-- Platform admins can view all events
CREATE POLICY "Platform admins can view all event logs" ON event_logs
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Authenticated users can insert events (via RPC only)
CREATE POLICY "Authenticated users can insert event logs" ON event_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- CRITICAL: Deny UPDATE on event_logs (immutability)
CREATE POLICY "Deny update on event logs" ON event_logs
  FOR UPDATE
  USING (FALSE);

-- CRITICAL: Deny DELETE on event_logs (immutability)
CREATE POLICY "Deny delete on event logs" ON event_logs
  FOR DELETE
  USING (FALSE);

-- ============================================================================
-- STEP 9: Create Admin View
-- ============================================================================

DROP VIEW IF EXISTS admin_event_logs;
CREATE OR REPLACE VIEW admin_event_logs AS
SELECT 
  el.id,
  el.created_at,
  el.category,
  el.event_type,
  el.actor_user_id,
  u.email AS actor_email,
  u.display_name AS actor_name,
  el.actor_role,
  el.org_id,
  o.name AS organization_name,
  el.target_entity_type,
  el.target_entity_id,
  el.metadata,
  el.ip_address,
  el.user_agent
FROM event_logs el
LEFT JOIN users u ON u.id = el.actor_user_id
LEFT JOIN organizations o ON o.id = el.org_id
WHERE is_platform_admin(auth.uid())
ORDER BY el.created_at DESC;

-- Grant access to view
GRANT SELECT ON admin_event_logs TO authenticated;

-- ============================================================================
-- STEP 10: Create Materialized View for Recent Events
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS event_logs_recent;
CREATE MATERIALIZED VIEW event_logs_recent AS
SELECT 
  el.id,
  el.created_at,
  el.category,
  el.event_type,
  el.actor_user_id,
  u.email AS actor_email,
  u.display_name AS actor_name,
  el.actor_role,
  el.org_id,
  o.name AS organization_name,
  el.target_entity_type,
  el.target_entity_id,
  el.metadata,
  el.ip_address,
  el.user_agent
FROM event_logs el
LEFT JOIN users u ON u.id = el.actor_user_id
LEFT JOIN organizations o ON o.id = el.org_id
WHERE el.created_at >= NOW() - INTERVAL '90 days'
ORDER BY el.created_at DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_event_logs_recent_created_at ON event_logs_recent(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_recent_category ON event_logs_recent(category);
CREATE INDEX IF NOT EXISTS idx_event_logs_recent_org_id ON event_logs_recent(org_id);

-- Grant access
GRANT SELECT ON event_logs_recent TO authenticated;

-- ============================================================================
-- STEP 11: Create Archive Table and Function
-- ============================================================================

-- Archive table (same schema as event_logs)
CREATE TABLE IF NOT EXISTS event_logs_archive (
  LIKE event_logs INCLUDING ALL
);

-- Archive function
CREATE OR REPLACE FUNCTION archive_old_event_logs(
  p_retention_days INTEGER DEFAULT 730 -- 2 years default
)
RETURNS TABLE(archived_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  v_cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;

  -- Move old events to archive
  INSERT INTO event_logs_archive
  SELECT * FROM event_logs
  WHERE created_at < v_cutoff_date;

  -- Delete archived events from main table
  DELETE FROM event_logs
  WHERE created_at < v_cutoff_date;

  -- Return count of archived records
  RETURN QUERY SELECT COUNT(*)::BIGINT FROM event_logs_archive WHERE created_at < v_cutoff_date;
END;
$$;

-- ============================================================================
-- STEP 12: Rename Old Table for Rollback Safety
-- ============================================================================

-- Rename old audit_logs table (keep for 30 days) if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs'
  ) THEN
    ALTER TABLE audit_logs RENAME TO audit_logs_old;
    RAISE NOTICE 'Renamed audit_logs to audit_logs_old';
  ELSE
    RAISE NOTICE 'audit_logs table does not exist, skipping rename';
  END IF;
END $$;

-- Drop old admin_audit_log view (replaced by admin_event_logs)
DROP VIEW IF EXISTS admin_audit_log;

-- ============================================================================
-- STEP 13: Create Refresh Function for Materialized View
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_event_logs_recent()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY event_logs_recent;
END;
$$;

-- ============================================================================
-- STEP 14: Post-Migration Verification
-- ============================================================================

DO $$
DECLARE
  old_count INTEGER := 0;
  new_count INTEGER;
  error_count INTEGER;
  old_table_exists BOOLEAN;
BEGIN
  -- Check if old table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs_old'
  ) INTO old_table_exists;
  
  IF old_table_exists THEN
    SELECT COUNT(*) INTO old_count FROM audit_logs_old;
  END IF;
  
  -- Count new records
  SELECT COUNT(*) INTO new_count FROM event_logs;
  
  -- Count errors
  SELECT COUNT(*) INTO error_count FROM migration_errors WHERE source_table = 'audit_logs';
  
  RAISE NOTICE 'Post-migration verification:';
  IF old_table_exists THEN
    RAISE NOTICE '  Old audit_logs records: %', old_count;
    RAISE NOTICE '  Expected: % (accounting for skipped rows)', old_count - error_count;
  ELSE
    RAISE NOTICE '  Old audit_logs table: does not exist (fresh install)';
  END IF;
  RAISE NOTICE '  New event_logs records: %', new_count;
  RAISE NOTICE '  Migration errors: %', error_count;
END $$;

-- ============================================================================
-- STEP 15: Comments and Documentation
-- ============================================================================

COMMENT ON TABLE event_logs IS 'Comprehensive event logging system for all platform actions. Immutable audit trail.';
COMMENT ON TABLE valid_event_types IS 'Lookup table for valid event type combinations per category.';
COMMENT ON TABLE event_logs_archive IS 'Archived event logs (moved from event_logs after retention period).';
COMMENT ON FUNCTION log_event IS 'Main function for logging events. Includes validation, sanitization, and idempotency support.';
COMMENT ON FUNCTION validate_event_type IS 'Validates that an event_type is valid for the given category.';
COMMENT ON FUNCTION sanitize_metadata IS 'Removes sensitive keys from metadata before storage.';
COMMENT ON FUNCTION archive_old_event_logs IS 'Archives events older than retention period to event_logs_archive table.';
COMMENT ON VIEW admin_event_logs IS 'Platform admin view of all event logs with enriched actor and organization data.';
COMMENT ON MATERIALIZED VIEW event_logs_recent IS 'Materialized view of events from last 90 days for performance.';
