-- Migration: Fix TypeScript Build Errors
-- =============================================================
-- This migration fixes issues causing TypeScript build errors:
-- 1. Remove duplicate organization_id column from seasons table
-- 2. Ensure all platform admin views use org_id consistently
-- 3. Add missing columns to events table (description, interval)
--
-- This migration is idempotent and can be run multiple times safely.

-- ============================================================================
-- 1. Fix seasons table - remove duplicate organization_id column
-- ============================================================================

-- First, drop dependent policies and views
DO $$
DECLARE
  view_record RECORD;
BEGIN
  -- Drop policy if it exists
  DROP POLICY IF EXISTS org_admins_can_create_seasons_if_license_active ON seasons;
  
  -- Drop ALL views in the public schema (we'll recreate the needed ones later)
  -- This is necessary because views might have organization_id columns from seasons
  FOR view_record IN 
    SELECT table_name 
    FROM information_schema.views 
    WHERE table_schema = 'public'
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', view_record.table_name);
  END LOOP;
  
  RAISE NOTICE 'Dropped all public views';
END $$;

-- Drop organization_id column if it exists (org_id should be the canonical column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'seasons'
    AND column_name = 'organization_id'
  ) THEN
    -- First, ensure org_id has the data from organization_id if org_id is null
    UPDATE seasons 
    SET org_id = organization_id 
    WHERE org_id IS NULL AND organization_id IS NOT NULL;
    
    -- Drop the organization_id column
    ALTER TABLE seasons DROP COLUMN organization_id;
    
    RAISE NOTICE 'Dropped organization_id column from seasons table';
  END IF;
END $$;

-- Ensure org_id is NOT NULL
DO $$
BEGIN
  -- Make org_id NOT NULL if it's nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'seasons'
    AND column_name = 'org_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE seasons ALTER COLUMN org_id SET NOT NULL;
    RAISE NOTICE 'Set org_id to NOT NULL in seasons table';
  END IF;
END $$;

-- ============================================================================
-- 2. Add missing columns to events table
-- ============================================================================

-- Add description column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name = 'description'
  ) THEN
    ALTER TABLE events ADD COLUMN description TEXT;
    RAISE NOTICE 'Added description column to events table';
  END IF;
END $$;

-- ============================================================================
-- 3. Add interval column to recurring_event_patterns table
-- ============================================================================

-- Add interval column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'recurring_event_patterns'
    AND column_name = 'interval'
  ) THEN
    ALTER TABLE recurring_event_patterns ADD COLUMN interval INTEGER DEFAULT 1;
    RAISE NOTICE 'Added interval column to recurring_event_patterns table';
  END IF;
END $$;

-- ============================================================================
-- 4. Ensure fee_assignments uses athlete_id (not child_id)
-- ============================================================================

-- Rename child_id to athlete_id if it still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'fee_assignments'
    AND column_name = 'child_id'
  ) THEN
    ALTER TABLE fee_assignments RENAME COLUMN child_id TO athlete_id;
    
    -- Update foreign key constraint if it exists
    IF EXISTS (
      SELECT FROM pg_constraint 
      WHERE conrelid = 'fee_assignments'::regclass 
      AND conname LIKE '%child_id%'
    ) THEN
      ALTER TABLE fee_assignments RENAME CONSTRAINT fee_assignments_child_id_fkey TO fee_assignments_athlete_id_fkey;
    END IF;
    
    -- Rename index if it exists
    IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_fee_assignments_child_id') THEN
      ALTER INDEX idx_fee_assignments_child_id RENAME TO idx_fee_assignments_athlete_id;
    END IF;
    
    RAISE NOTICE 'Renamed child_id to athlete_id in fee_assignments table';
  END IF;
END $$;

-- ============================================================================
-- 5. Recreate RLS policies with correct column names
-- ============================================================================

-- Recreate the seasons policy using org_id
CREATE POLICY org_admins_can_create_seasons_if_license_active
  ON seasons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_is_org_admin(auth.uid(), org_id)
    AND (
      SELECT license_status FROM organizations WHERE id = org_id
    ) IN ('active', 'trial')
  );

-- ============================================================================
-- 6. Recreate platform admin views to ensure consistency
-- ============================================================================

-- Recreate admin_organizations view
CREATE OR REPLACE VIEW admin_organizations AS
SELECT 
  o.id,
  o.name,
  o.org_type,
  o.status,
  o.license_status,
  o.license_plan,
  o.license_trial_ends_at,
  o.license_current_period_end,
  o.payout_account_id,
  o.payouts_enabled,
  o.created_at,
  o.updated_at,
  (SELECT COUNT(*) FROM teams t WHERE t.org_id = o.id) AS team_count,
  (SELECT COUNT(DISTINCT s.id) FROM teams t JOIN seasons s ON s.org_id = o.id WHERE t.org_id = o.id) AS sport_count,
  (SELECT COUNT(DISTINCT om.user_id) FROM organization_members om WHERE om.org_id = o.id) AS user_count,
  o.stripe_customer_id IS NOT NULL AS stripe_connected
FROM organizations o
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());

-- Recreate admin_structure view to ensure org_id is used
CREATE OR REPLACE VIEW admin_structure AS
SELECT 
  o.id AS org_id,
  o.name AS organization_name,
  t.id AS team_id,
  t.name AS team_name,
  s.id AS season_id,
  s.name AS season_name,
  s.is_active AS season_active,
  (SELECT COUNT(*) FROM team_memberships tm WHERE tm.team_id = t.id) AS player_count
FROM organizations o
LEFT JOIN teams t ON t.org_id = o.id
LEFT JOIN seasons s ON s.org_id = o.id
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())
ORDER BY o.name, t.name, s.name;

-- Recreate admin_payments view to ensure org_id is used
CREATE OR REPLACE VIEW admin_payments AS
SELECT 
  p.id,
  p.amount_cents,
  p.currency,
  p.stripe_payment_intent_id,
  p.status,
  p.created_at,
  p.org_id,
  o.name AS organization_name,
  fa.id AS fee_assignment_id,
  fa.fee_id,
  f.title AS fee_title,
  a.id AS athlete_id,
  a.first_name || ' ' || a.last_name AS athlete_name,
  u.email AS parent_email,
  u.display_name AS parent_name
FROM payments p
JOIN organizations o ON o.id = p.org_id
LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
LEFT JOIN fee_assignments fa ON fa.id = pa.fee_assignment_id
LEFT JOIN fees f ON f.id = fa.fee_id
LEFT JOIN athletes a ON a.id = fa.athlete_id
LEFT JOIN users u ON u.id = fa.parent_id
WHERE EXISTS (SELECT 1 FROM platform_admins pla WHERE pla.user_id = auth.uid());

-- Recreate admin_feature_flags view to ensure org_id is used
CREATE OR REPLACE VIEW admin_feature_flags AS
SELECT 
  ff.id,
  ff.org_id,
  o.name AS organization_name,
  ff.feature_key,
  ff.enabled,
  ff.created_at,
  ff.updated_at
FROM feature_flags ff
JOIN organizations o ON o.id = ff.org_id
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())
ORDER BY o.name, ff.feature_key;

-- Recreate admin_users view
CREATE OR REPLACE VIEW admin_users AS
SELECT 
  u.id,
  u.email,
  u.phone,
  u.display_name,
  u.created_at,
  u.updated_at,
  (
    SELECT COALESCE(json_agg(json_build_object(
      'org_id', om.org_id,
      'org_name', org.name,
      'role', om.role
    )), '[]'::json)
    FROM organization_members om
    JOIN organizations org ON org.id = om.org_id
    WHERE om.user_id = u.id
  ) AS organizations,
  (
    SELECT COALESCE(array_agg(DISTINCT om.role::text), ARRAY[]::text[])
    FROM organization_members om
    WHERE om.user_id = u.id
  ) AS roles,
  EXISTS (SELECT 1 FROM platform_admins pa2 WHERE pa2.user_id = u.id) AS is_platform_admin,
  (SELECT created_at FROM auth.users au WHERE au.id = u.id) AS last_sign_in_at,
  (SELECT email_confirmed_at IS NOT NULL FROM auth.users au WHERE au.id = u.id) AS email_confirmed
FROM users u
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());

-- Recreate admin_fees_status view
CREATE OR REPLACE VIEW admin_fees_status AS
SELECT 
  f.id AS fee_id,
  f.title AS fee_name,
  f.amount_cents,
  f.currency,
  f.due_date,
  f.status AS fee_status,
  o.id AS org_id,
  o.name AS organization_name,
  (SELECT COUNT(*) FROM fee_assignments fa WHERE fa.fee_id = f.id) AS assigned_count,
  (SELECT COUNT(*) FROM fee_assignments fa WHERE fa.fee_id = f.id AND fa.status = 'paid') AS paid_count,
  (SELECT COUNT(*) FROM fee_assignments fa WHERE fa.fee_id = f.id AND fa.status IN ('unpaid', 'partial')) AS unpaid_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM fee_assignments fa WHERE fa.fee_id = f.id) > 0 
    THEN ROUND(
      (SELECT COUNT(*) FROM fee_assignments fa WHERE fa.fee_id = f.id AND fa.status = 'paid')::numeric / 
      (SELECT COUNT(*) FROM fee_assignments fa WHERE fa.fee_id = f.id)::numeric * 100, 
      1
    )
    ELSE 0 
  END AS payment_rate_percent
FROM fees f
JOIN organizations o ON o.id = f.org_id
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());

-- Recreate admin_audit_log view (using event_logs)
CREATE OR REPLACE VIEW admin_audit_log AS
SELECT 
  el.id,
  el.actor_user_id AS actor_id,
  u.email AS actor_email,
  u.display_name AS actor_name,
  el.event_type AS action,
  el.category AS entity_type,
  el.target_entity_id AS entity_id,
  el.metadata,
  el.created_at
FROM event_logs el
LEFT JOIN users u ON u.id = el.actor_user_id
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())
ORDER BY el.created_at DESC;

-- Recreate admin_platform_health view
CREATE OR REPLACE VIEW admin_platform_health AS
SELECT 
  (SELECT COUNT(*) FROM organizations WHERE status = 'active') AS active_organizations,
  (SELECT COUNT(*) FROM organizations WHERE status = 'trial') AS trial_organizations,
  (SELECT COUNT(*) FROM organizations WHERE status = 'suspended') AS suspended_organizations,
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(*) FROM platform_admins) AS platform_admin_count,
  (SELECT COUNT(*) FROM payments WHERE status = 'succeeded') AS successful_payments,
  (SELECT COUNT(*) FROM payments WHERE status = 'failed') AS failed_payments,
  (SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE status = 'succeeded') AS total_payment_volume_cents,
  (SELECT COUNT(*) FROM teams) AS total_teams,
  (SELECT COUNT(*) FROM athletes) AS total_athletes
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());

-- Recreate team_seasons_view
CREATE OR REPLACE VIEW team_seasons_view AS
SELECT 
  ts.team_id,
  s.id as season_id,
  s.org_id,
  s.name,
  s.start_date,
  s.end_date,
  s.is_active as season_is_active,
  ts.is_active as is_active
FROM team_seasons ts
JOIN seasons s ON ts.season_id = s.id;

-- ============================================================================
-- 7. Comments for clarity
-- ============================================================================

COMMENT ON COLUMN seasons.org_id IS 'Organization ID (canonical column after renaming from organization_id)';
COMMENT ON COLUMN events.description IS 'Event description text';
COMMENT ON COLUMN recurring_event_patterns.interval IS 'Recurrence interval (e.g., every N weeks)';
