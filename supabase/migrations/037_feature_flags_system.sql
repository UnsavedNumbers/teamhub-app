-- ============================================================================
-- Feature Flags System Migration
-- ============================================================================
-- Comprehensive feature flag system with platform defaults, org overrides,
-- and user overrides. Supports boolean, integer, and double value types.
-- Environment-scoped with full audit logging.
-- ============================================================================

-- ============================================================================
-- 1. Create Enums
-- ============================================================================

-- Environment enum
DO $$ BEGIN
  CREATE TYPE feature_flag_environment AS ENUM ('dev', 'staging', 'prod');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Value type enum
DO $$ BEGIN
  CREATE TYPE feature_flag_value_type AS ENUM ('boolean', 'integer', 'double');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. Create Tables
-- ============================================================================

-- Feature flags definition table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value_type feature_flag_value_type NOT NULL,
  description TEXT,
  environment feature_flag_environment NOT NULL,
  deleted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Key format validation: lowercase, alphanumeric, underscores only
  CONSTRAINT chk_feature_flag_key_format CHECK (key ~ '^[a-z0-9_]+$'),
  CONSTRAINT chk_feature_flag_key_not_empty CHECK (length(trim(key)) > 0)
);

-- If the table already existed (CREATE TABLE IF NOT EXISTS), ensure required columns exist.
-- This prevents failures when later statements reference these columns and also makes the
-- migration resilient to previously-created (older) feature_flags tables.
ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS value_type feature_flag_value_type;
ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS environment feature_flag_environment;
ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS version INTEGER;
ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Best-effort backfills for legacy tables.
-- If an older schema stored the flag key under a different column name, try to migrate it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feature_flags' AND column_name = 'flag_key'
  ) THEN
    EXECUTE 'UPDATE feature_flags SET key = flag_key WHERE key IS NULL';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feature_flags' AND column_name = 'name'
  ) THEN
    EXECUTE 'UPDATE feature_flags SET key = name WHERE key IS NULL';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feature_flags' AND column_name = 'feature_key'
  ) THEN
    EXECUTE 'UPDATE feature_flags SET key = feature_key WHERE key IS NULL';
  END IF;
END $$;

UPDATE feature_flags SET environment = 'prod' WHERE environment IS NULL;
UPDATE feature_flags SET value_type = 'boolean' WHERE value_type IS NULL;
UPDATE feature_flags SET version = 1 WHERE version IS NULL;
UPDATE feature_flags SET created_at = NOW() WHERE created_at IS NULL;
UPDATE feature_flags SET updated_at = NOW() WHERE updated_at IS NULL;

-- Unique constraint: one flag per key per environment (excluding soft-deleted)
-- Use partial unique index to allow reusing keys after soft delete
DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flag_key_env_active ON feature_flags(key, environment) WHERE deleted_at IS NULL';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'Skipping uq_feature_flag_key_env_active: existing rows violate uniqueness.';
    WHEN others THEN
      RAISE NOTICE 'Skipping uq_feature_flag_key_env_active: %', SQLERRM;
  END;
END $$;

-- Platform defaults table
CREATE TABLE IF NOT EXISTS feature_flag_platform_defaults (
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  environment feature_flag_environment NOT NULL,
  value_boolean BOOLEAN,
  value_integer INTEGER,
  value_double DOUBLE PRECISION,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Exactly one value column must be non-null
  CONSTRAINT chk_platform_default_one_value CHECK (
    (value_boolean IS NOT NULL)::int + 
    (value_integer IS NOT NULL)::int + 
    (value_double IS NOT NULL)::int = 1
  ),
  
  -- Value range constraints
  CONSTRAINT chk_platform_default_integer_range CHECK (
    value_integer IS NULL OR value_integer BETWEEN -2147483648 AND 2147483647
  ),
  CONSTRAINT chk_platform_default_double_range CHECK (
    value_double IS NULL OR value_double BETWEEN -1.7976931348623157e+308 AND 1.7976931348623157e+308
  ),
  
  PRIMARY KEY (feature_flag_id, environment)
);

-- Organization overrides table
CREATE TABLE IF NOT EXISTS feature_flag_org_overrides (
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  environment feature_flag_environment NOT NULL,
  value_boolean BOOLEAN,
  value_integer INTEGER,
  value_double DOUBLE PRECISION,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Exactly one value column must be non-null
  CONSTRAINT chk_org_override_one_value CHECK (
    (value_boolean IS NOT NULL)::int + 
    (value_integer IS NOT NULL)::int + 
    (value_double IS NOT NULL)::int = 1
  ),
  
  -- Value range constraints
  CONSTRAINT chk_org_override_integer_range CHECK (
    value_integer IS NULL OR value_integer BETWEEN -2147483648 AND 2147483647
  ),
  CONSTRAINT chk_org_override_double_range CHECK (
    value_double IS NULL OR value_double BETWEEN -1.7976931348623157e+308 AND 1.7976931348623157e+308
  ),
  
  PRIMARY KEY (feature_flag_id, org_id, environment)
);

-- User overrides table
CREATE TABLE IF NOT EXISTS feature_flag_user_overrides (
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  environment feature_flag_environment NOT NULL,
  value_boolean BOOLEAN,
  value_integer INTEGER,
  value_double DOUBLE PRECISION,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Exactly one value column must be non-null
  CONSTRAINT chk_user_override_one_value CHECK (
    (value_boolean IS NOT NULL)::int + 
    (value_integer IS NOT NULL)::int + 
    (value_double IS NOT NULL)::int = 1
  ),
  
  -- Value range constraints
  CONSTRAINT chk_user_override_integer_range CHECK (
    value_integer IS NULL OR value_integer BETWEEN -2147483648 AND 2147483647
  ),
  CONSTRAINT chk_user_override_double_range CHECK (
    value_double IS NULL OR value_double BETWEEN -1.7976931348623157e+308 AND 1.7976931348623157e+308
  ),
  
  PRIMARY KEY (feature_flag_id, user_id, environment)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS feature_flag_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  feature_flag_id UUID REFERENCES feature_flags(id) ON DELETE SET NULL,
  scope_type TEXT, -- 'platform', 'organization', 'user'
  scope_id TEXT, -- org_id or user_id as text
  old_value JSONB,
  new_value JSONB,
  environment feature_flag_environment NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 3. Create Indexes
-- ============================================================================

-- Feature flags indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_key_env ON feature_flags(key, environment) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feature_flags_environment ON feature_flags(environment);
CREATE INDEX IF NOT EXISTS idx_feature_flags_deleted_at ON feature_flags(deleted_at) WHERE deleted_at IS NOT NULL;

-- Platform defaults indexes
CREATE INDEX IF NOT EXISTS idx_platform_defaults_flag ON feature_flag_platform_defaults(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_platform_defaults_env ON feature_flag_platform_defaults(environment);

-- Org overrides indexes
CREATE INDEX IF NOT EXISTS idx_org_overrides_flag ON feature_flag_org_overrides(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_org_overrides_org ON feature_flag_org_overrides(org_id);
CREATE INDEX IF NOT EXISTS idx_org_overrides_env ON feature_flag_org_overrides(environment);
CREATE INDEX IF NOT EXISTS idx_org_overrides_flag_org_env ON feature_flag_org_overrides(feature_flag_id, org_id, environment);

-- User overrides indexes
CREATE INDEX IF NOT EXISTS idx_user_overrides_flag ON feature_flag_user_overrides(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_user_overrides_user ON feature_flag_user_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_overrides_env ON feature_flag_user_overrides(environment);
CREATE INDEX IF NOT EXISTS idx_user_overrides_flag_user_env ON feature_flag_user_overrides(feature_flag_id, user_id, environment);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON feature_flag_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON feature_flag_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_flag ON feature_flag_audit_log(feature_flag_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_environment ON feature_flag_audit_log(environment, created_at DESC);

-- ============================================================================
-- 4. Add Updated At Triggers
-- ============================================================================

-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_defaults_updated_at ON feature_flag_platform_defaults;
CREATE TRIGGER update_platform_defaults_updated_at
  BEFORE UPDATE ON feature_flag_platform_defaults
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_overrides_updated_at ON feature_flag_org_overrides;
CREATE TRIGGER update_org_overrides_updated_at
  BEFORE UPDATE ON feature_flag_org_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_overrides_updated_at ON feature_flag_user_overrides;
CREATE TRIGGER update_user_overrides_updated_at
  BEFORE UPDATE ON feature_flag_user_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Environment Detection Helper Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_environment_from_url()
RETURNS feature_flag_environment
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  api_url TEXT;
BEGIN
  -- Try to get from current_setting if available
  BEGIN
    api_url := current_setting('app.settings.api_url', true);
  EXCEPTION
    WHEN OTHERS THEN
      -- If not available, default to 'dev' (safe default)
      RETURN 'dev';
  END;
  
  -- Parse URL pattern
  IF api_url LIKE '%-dev%' OR api_url LIKE '%localhost%' OR api_url LIKE '%127.0.0.1%' THEN
    RETURN 'dev';
  ELSIF api_url LIKE '%-staging%' THEN
    RETURN 'staging';
  ELSE
    RETURN 'prod';
  END IF;
END;
$$;

-- ============================================================================
-- 6. Enable RLS
-- ============================================================================

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_platform_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_org_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_user_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS Policies
-- ============================================================================

-- Feature flags policies
-- Platform admins: Full CRUD
DROP POLICY IF EXISTS "Platform admins can manage feature flags" ON feature_flags;
CREATE POLICY "Platform admins can manage feature flags" ON feature_flags
  FOR ALL
  USING (EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()));

-- Org admins: Read-only on their org's flags (via overrides)
DROP POLICY IF EXISTS "Org admins can view org feature flags" ON feature_flags;
CREATE POLICY "Org admins can view org feature flags" ON feature_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN feature_flag_org_overrides ffo ON ffo.org_id = om.org_id
      WHERE om.user_id = auth.uid()
      AND om.role = 'org_admin'
      AND ffo.feature_flag_id = feature_flags.id
    )
  );

-- Platform defaults policies
-- Platform admins: Full CRUD
DROP POLICY IF EXISTS "Platform admins can manage platform defaults" ON feature_flag_platform_defaults;
CREATE POLICY "Platform admins can manage platform defaults" ON feature_flag_platform_defaults
  FOR ALL
  USING (EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()));

-- Org overrides policies
-- Platform admins: Full CRUD
DROP POLICY IF EXISTS "Platform admins can manage org overrides" ON feature_flag_org_overrides;
CREATE POLICY "Platform admins can manage org overrides" ON feature_flag_org_overrides
  FOR ALL
  USING (EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()));

-- Org admins: Read-only on their org's overrides
DROP POLICY IF EXISTS "Org admins can view org overrides" ON feature_flag_org_overrides;
CREATE POLICY "Org admins can view org overrides" ON feature_flag_org_overrides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.org_id = feature_flag_org_overrides.org_id
      AND om.role = 'org_admin'
    )
  );

-- User overrides policies
-- Platform admins: Full CRUD
DROP POLICY IF EXISTS "Platform admins can manage user overrides" ON feature_flag_user_overrides;
CREATE POLICY "Platform admins can manage user overrides" ON feature_flag_user_overrides
  FOR ALL
  USING (EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()));

-- Users: Read-only on their own overrides
DROP POLICY IF EXISTS "Users can view own overrides" ON feature_flag_user_overrides;
CREATE POLICY "Users can view own overrides" ON feature_flag_user_overrides
  FOR SELECT
  USING (auth.uid() = user_id);

-- Audit log policies
-- Platform admins: Read-only
DROP POLICY IF EXISTS "Platform admins can view audit log" ON feature_flag_audit_log;
CREATE POLICY "Platform admins can view audit log" ON feature_flag_audit_log
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()));

-- Platform admins: Can insert (for triggers)
DROP POLICY IF EXISTS "Platform admins can insert audit log" ON feature_flag_audit_log;
CREATE POLICY "Platform admins can insert audit log" ON feature_flag_audit_log
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()));

-- Immutable: Deny UPDATE and DELETE
DROP POLICY IF EXISTS "Deny update on audit log" ON feature_flag_audit_log;
CREATE POLICY "Deny update on audit log" ON feature_flag_audit_log
  FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "Deny delete on audit log" ON feature_flag_audit_log;
CREATE POLICY "Deny delete on audit log" ON feature_flag_audit_log
  FOR DELETE
  USING (FALSE);

-- ============================================================================
-- 8. Audit Log Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION log_feature_flag_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_val JSONB;
  new_val JSONB;
  scope_type_val TEXT;
  scope_id_val TEXT;
  action_val TEXT;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_val := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_val := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_val := 'delete';
  END IF;
  
  -- Determine scope
  IF TG_TABLE_NAME = 'feature_flag_platform_defaults' THEN
    scope_type_val := 'platform';
    scope_id_val := NULL;
  ELSIF TG_TABLE_NAME = 'feature_flag_org_overrides' THEN
    scope_type_val := 'organization';
    scope_id_val := COALESCE(NEW.org_id::TEXT, OLD.org_id::TEXT);
  ELSIF TG_TABLE_NAME = 'feature_flag_user_overrides' THEN
    scope_type_val := 'user';
    scope_id_val := COALESCE(NEW.user_id::TEXT, OLD.user_id::TEXT);
  ELSIF TG_TABLE_NAME = 'feature_flags' THEN
    scope_type_val := 'flag';
    scope_id_val := NULL;
  END IF;
  
  -- Build old and new value JSONB
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    old_val := jsonb_build_object(
      'value_boolean', OLD.value_boolean,
      'value_integer', OLD.value_integer,
      'value_double', OLD.value_double,
      'version', OLD.version
    );
  END IF;
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    new_val := jsonb_build_object(
      'value_boolean', NEW.value_boolean,
      'value_integer', NEW.value_integer,
      'value_double', NEW.value_double,
      'version', NEW.version
    );
  END IF;
  
  -- For feature_flags table, capture different fields
  IF TG_TABLE_NAME = 'feature_flags' THEN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
      old_val := jsonb_build_object(
        'key', OLD.key,
        'value_type', OLD.value_type,
        'description', OLD.description,
        'environment', OLD.environment,
        'deleted_at', OLD.deleted_at,
        'version', OLD.version
      );
    END IF;
    
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      new_val := jsonb_build_object(
        'key', NEW.key,
        'value_type', NEW.value_type,
        'description', NEW.description,
        'environment', NEW.environment,
        'deleted_at', NEW.deleted_at,
        'version', NEW.version
      );
    END IF;
  END IF;
  
  -- Insert audit log entry
  INSERT INTO feature_flag_audit_log (
    actor_id,
    action,
    feature_flag_id,
    scope_type,
    scope_id,
    old_value,
    new_value,
    environment
  ) VALUES (
    auth.uid(),
    action_val,
    COALESCE(NEW.id, OLD.id),
    scope_type_val,
    scope_id_val,
    old_val,
    new_val,
    COALESCE(NEW.environment, OLD.environment)
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ============================================================================
-- 9. Create Audit Log Triggers
-- ============================================================================

-- Triggers for feature_flags
DROP TRIGGER IF EXISTS trigger_log_feature_flag_changes ON feature_flags;
CREATE TRIGGER trigger_log_feature_flag_changes
  BEFORE INSERT OR UPDATE OR DELETE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION log_feature_flag_change();

-- Triggers for platform defaults
DROP TRIGGER IF EXISTS trigger_log_platform_default_changes ON feature_flag_platform_defaults;
CREATE TRIGGER trigger_log_platform_default_changes
  BEFORE INSERT OR UPDATE OR DELETE ON feature_flag_platform_defaults
  FOR EACH ROW
  EXECUTE FUNCTION log_feature_flag_change();

-- Triggers for org overrides
DROP TRIGGER IF EXISTS trigger_log_org_override_changes ON feature_flag_org_overrides;
CREATE TRIGGER trigger_log_org_override_changes
  BEFORE INSERT OR UPDATE OR DELETE ON feature_flag_org_overrides
  FOR EACH ROW
  EXECUTE FUNCTION log_feature_flag_change();

-- Triggers for user overrides
DROP TRIGGER IF EXISTS trigger_log_user_override_changes ON feature_flag_user_overrides;
CREATE TRIGGER trigger_log_user_override_changes
  BEFORE INSERT OR UPDATE OR DELETE ON feature_flag_user_overrides
  FOR EACH ROW
  EXECUTE FUNCTION log_feature_flag_change();

-- ============================================================================
-- 10. Flag Resolution Function
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_feature_flag(
  p_feature_key TEXT,
  p_user_id UUID DEFAULT NULL,
  p_org_id UUID DEFAULT NULL,
  p_environment feature_flag_environment DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_environment feature_flag_environment;
  v_flag_id UUID;
  v_value_type feature_flag_value_type;
  v_resolved_value JSONB;
  v_resolved_from TEXT;
  v_source_id TEXT;
  v_user_value BOOLEAN;
  v_user_value_int INTEGER;
  v_user_value_double DOUBLE PRECISION;
  v_org_value BOOLEAN;
  v_org_value_int INTEGER;
  v_org_value_double DOUBLE PRECISION;
  v_platform_value BOOLEAN;
  v_platform_value_int INTEGER;
  v_platform_value_double DOUBLE PRECISION;
BEGIN
  -- Determine environment
  v_environment := COALESCE(p_environment, get_environment_from_url());
  
  -- Find flag (excluding soft-deleted)
  SELECT id, value_type INTO v_flag_id, v_value_type
  FROM feature_flags
  WHERE key = p_feature_key
    AND environment = v_environment
    AND deleted_at IS NULL;
  
  -- If flag doesn't exist, return null
  IF v_flag_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check user override (highest priority)
  IF p_user_id IS NOT NULL THEN
    IF v_value_type = 'boolean' THEN
      SELECT value_boolean INTO v_user_value
      FROM feature_flag_user_overrides
      WHERE feature_flag_id = v_flag_id
        AND user_id = p_user_id
        AND environment = v_environment;
      
      IF v_user_value IS NOT NULL THEN
        RETURN jsonb_build_object(
          'value', v_user_value,
          'value_type', v_value_type,
          'resolved_from', 'user',
          'source_id', p_user_id::TEXT
        );
      END IF;
    ELSIF v_value_type = 'integer' THEN
      SELECT value_integer INTO v_user_value_int
      FROM feature_flag_user_overrides
      WHERE feature_flag_id = v_flag_id
        AND user_id = p_user_id
        AND environment = v_environment;
      
      IF v_user_value_int IS NOT NULL THEN
        RETURN jsonb_build_object(
          'value', v_user_value_int,
          'value_type', v_value_type,
          'resolved_from', 'user',
          'source_id', p_user_id::TEXT
        );
      END IF;
    ELSIF v_value_type = 'double' THEN
      SELECT value_double INTO v_user_value_double
      FROM feature_flag_user_overrides
      WHERE feature_flag_id = v_flag_id
        AND user_id = p_user_id
        AND environment = v_environment;
      
      IF v_user_value_double IS NOT NULL THEN
        RETURN jsonb_build_object(
          'value', v_user_value_double,
          'value_type', v_value_type,
          'resolved_from', 'user',
          'source_id', p_user_id::TEXT
        );
      END IF;
    END IF;
  END IF;
  
  -- Check org override (second priority)
  IF p_org_id IS NOT NULL THEN
    IF v_value_type = 'boolean' THEN
      SELECT value_boolean INTO v_org_value
      FROM feature_flag_org_overrides
      WHERE feature_flag_id = v_flag_id
        AND org_id = p_org_id
        AND environment = v_environment;
      
      IF v_org_value IS NOT NULL THEN
        RETURN jsonb_build_object(
          'value', v_org_value,
          'value_type', v_value_type,
          'resolved_from', 'organization',
          'source_id', p_org_id::TEXT
        );
      END IF;
    ELSIF v_value_type = 'integer' THEN
      SELECT value_integer INTO v_org_value_int
      FROM feature_flag_org_overrides
      WHERE feature_flag_id = v_flag_id
        AND org_id = p_org_id
        AND environment = v_environment;
      
      IF v_org_value_int IS NOT NULL THEN
        RETURN jsonb_build_object(
          'value', v_org_value_int,
          'value_type', v_value_type,
          'resolved_from', 'organization',
          'source_id', p_org_id::TEXT
        );
      END IF;
    ELSIF v_value_type = 'double' THEN
      SELECT value_double INTO v_org_value_double
      FROM feature_flag_org_overrides
      WHERE feature_flag_id = v_flag_id
        AND org_id = p_org_id
        AND environment = v_environment;
      
      IF v_org_value_double IS NOT NULL THEN
        RETURN jsonb_build_object(
          'value', v_org_value_double,
          'value_type', v_value_type,
          'resolved_from', 'organization',
          'source_id', p_org_id::TEXT
        );
      END IF;
    END IF;
  END IF;
  
  -- Check platform default (lowest priority)
  IF v_value_type = 'boolean' THEN
    SELECT value_boolean INTO v_platform_value
    FROM feature_flag_platform_defaults
    WHERE feature_flag_id = v_flag_id
      AND environment = v_environment;
    
    IF v_platform_value IS NOT NULL THEN
      RETURN jsonb_build_object(
        'value', v_platform_value,
        'value_type', v_value_type,
        'resolved_from', 'platform',
        'source_id', NULL
      );
    END IF;
  ELSIF v_value_type = 'integer' THEN
    SELECT value_integer INTO v_platform_value_int
    FROM feature_flag_platform_defaults
    WHERE feature_flag_id = v_flag_id
      AND environment = v_environment;
    
    IF v_platform_value_int IS NOT NULL THEN
      RETURN jsonb_build_object(
        'value', v_platform_value_int,
        'value_type', v_value_type,
        'resolved_from', 'platform',
        'source_id', NULL
      );
    END IF;
  ELSIF v_value_type = 'double' THEN
    SELECT value_double INTO v_platform_value_double
    FROM feature_flag_platform_defaults
    WHERE feature_flag_id = v_flag_id
      AND environment = v_environment;
    
    IF v_platform_value_double IS NOT NULL THEN
      RETURN jsonb_build_object(
        'value', v_platform_value_double,
        'value_type', v_value_type,
        'resolved_from', 'platform',
        'source_id', NULL
      );
    END IF;
  END IF;
  
  -- No value found at any level, return null
  RETURN NULL;
  
EXCEPTION
  WHEN OTHERS THEN
    -- On any error, return null (graceful degradation)
    RETURN NULL;
END;
$$;

-- ============================================================================
-- 11. Batch Resolution Function
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_feature_flags(
  p_feature_keys TEXT[],
  p_user_id UUID DEFAULT NULL,
  p_org_id UUID DEFAULT NULL,
  p_environment feature_flag_environment DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB := '{}'::JSONB;
  v_key TEXT;
  v_resolved JSONB;
BEGIN
  -- Resolve each flag key
  FOREACH v_key IN ARRAY p_feature_keys
  LOOP
    v_resolved := resolve_feature_flag(v_key, p_user_id, p_org_id, p_environment);
    IF v_resolved IS NOT NULL THEN
      v_result := v_result || jsonb_build_object(v_key, v_resolved);
    END IF;
  END LOOP;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- On any error, return partial results
    RETURN v_result;
END;
$$;

-- ============================================================================
-- 12. Admin RPC Functions
-- ============================================================================

-- Helper function to check platform admin permissions
CREATE OR REPLACE FUNCTION check_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());
$$;

-- Create feature flag
CREATE OR REPLACE FUNCTION admin_create_feature_flag(
  p_key TEXT,
  p_value_type feature_flag_value_type,
  p_environment feature_flag_environment,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flag_id UUID;
  v_admin_role platform_admin_role;
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate inputs
  IF p_key IS NULL OR trim(p_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag key is required');
  END IF;
  
  IF p_key !~ '^[a-z0-9_]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag key must contain only lowercase letters, numbers, and underscores');
  END IF;
  
  -- Check for duplicate key (excluding soft-deleted)
  IF EXISTS (
    SELECT 1 FROM feature_flags 
    WHERE key = p_key 
      AND environment = p_environment 
      AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag key already exists in this environment');
  END IF;
  
  -- Create flag
  INSERT INTO feature_flags (key, value_type, description, environment)
  VALUES (p_key, p_value_type, p_description, p_environment)
  RETURNING id INTO v_flag_id;
  
  RETURN jsonb_build_object('success', true, 'flag_id', v_flag_id);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Set platform default
CREATE OR REPLACE FUNCTION admin_set_platform_default(
  p_feature_flag_id UUID,
  p_environment feature_flag_environment,
  p_reason TEXT,
  p_value_boolean BOOLEAN DEFAULT NULL,
  p_value_integer INTEGER DEFAULT NULL,
  p_value_double DOUBLE PRECISION DEFAULT NULL,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flag_value_type feature_flag_value_type;
  v_current_version INTEGER;
  v_value_count INTEGER;
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Get flag value type
  SELECT value_type INTO v_flag_value_type
  FROM feature_flags
  WHERE id = p_feature_flag_id
    AND environment = p_environment
    AND deleted_at IS NULL;
  
  IF v_flag_value_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature flag not found');
  END IF;
  
  -- Count non-null values
  v_value_count := (p_value_boolean IS NOT NULL)::int + 
                   (p_value_integer IS NOT NULL)::int + 
                   (p_value_double IS NOT NULL)::int;
  
  IF v_value_count != 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Exactly one value must be provided');
  END IF;
  
  -- Validate value type matches
  IF v_flag_value_type = 'boolean' AND p_value_boolean IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is boolean, but boolean value not provided');
  END IF;
  
  IF v_flag_value_type = 'integer' AND p_value_integer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is integer, but integer value not provided');
  END IF;
  
  IF v_flag_value_type = 'double' AND p_value_double IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is double, but double value not provided');
  END IF;
  
  -- Check version if provided (optimistic locking)
  IF p_expected_version IS NOT NULL THEN
    SELECT version INTO v_current_version
    FROM feature_flag_platform_defaults
    WHERE feature_flag_id = p_feature_flag_id
      AND environment = p_environment;
    
    IF v_current_version IS NOT NULL AND v_current_version != p_expected_version THEN
      RETURN jsonb_build_object('success', false, 'error', 'Version conflict: flag was modified by another admin. Please refresh and try again.');
    END IF;
  END IF;
  
  -- Upsert platform default
  INSERT INTO feature_flag_platform_defaults (
    feature_flag_id, environment, value_boolean, value_integer, value_double, version
  )
  VALUES (
    p_feature_flag_id, p_environment, p_value_boolean, p_value_integer, p_value_double, 1
  )
  ON CONFLICT (feature_flag_id, environment)
  DO UPDATE SET
    value_boolean = EXCLUDED.value_boolean,
    value_integer = EXCLUDED.value_integer,
    value_double = EXCLUDED.value_double,
    version = feature_flag_platform_defaults.version + 1,
    updated_at = NOW();
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Set org override
CREATE OR REPLACE FUNCTION admin_set_org_override(
  p_feature_flag_id UUID,
  p_org_id UUID,
  p_environment feature_flag_environment,
  p_reason TEXT,
  p_value_boolean BOOLEAN DEFAULT NULL,
  p_value_integer INTEGER DEFAULT NULL,
  p_value_double DOUBLE PRECISION DEFAULT NULL,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flag_value_type feature_flag_value_type;
  v_current_version INTEGER;
  v_value_count INTEGER;
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Validate org exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Get flag value type
  SELECT value_type INTO v_flag_value_type
  FROM feature_flags
  WHERE id = p_feature_flag_id
    AND environment = p_environment
    AND deleted_at IS NULL;
  
  IF v_flag_value_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature flag not found');
  END IF;
  
  -- Count non-null values
  v_value_count := (p_value_boolean IS NOT NULL)::int + 
                   (p_value_integer IS NOT NULL)::int + 
                   (p_value_double IS NOT NULL)::int;
  
  IF v_value_count != 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Exactly one value must be provided');
  END IF;
  
  -- Validate value type matches
  IF v_flag_value_type = 'boolean' AND p_value_boolean IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is boolean, but boolean value not provided');
  END IF;
  
  IF v_flag_value_type = 'integer' AND p_value_integer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is integer, but integer value not provided');
  END IF;
  
  IF v_flag_value_type = 'double' AND p_value_double IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is double, but double value not provided');
  END IF;
  
  -- Check version if provided (optimistic locking)
  IF p_expected_version IS NOT NULL THEN
    SELECT version INTO v_current_version
    FROM feature_flag_org_overrides
    WHERE feature_flag_id = p_feature_flag_id
      AND org_id = p_org_id
      AND environment = p_environment;
    
    IF v_current_version IS NOT NULL AND v_current_version != p_expected_version THEN
      RETURN jsonb_build_object('success', false, 'error', 'Version conflict: override was modified by another admin. Please refresh and try again.');
    END IF;
  END IF;
  
  -- Upsert org override
  INSERT INTO feature_flag_org_overrides (
    feature_flag_id, org_id, environment, value_boolean, value_integer, value_double, version
  )
  VALUES (
    p_feature_flag_id, p_org_id, p_environment, p_value_boolean, p_value_integer, p_value_double, 1
  )
  ON CONFLICT (feature_flag_id, org_id, environment)
  DO UPDATE SET
    value_boolean = EXCLUDED.value_boolean,
    value_integer = EXCLUDED.value_integer,
    value_double = EXCLUDED.value_double,
    version = feature_flag_org_overrides.version + 1,
    updated_at = NOW();
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Set user override
CREATE OR REPLACE FUNCTION admin_set_user_override(
  p_feature_flag_id UUID,
  p_user_id UUID,
  p_environment feature_flag_environment,
  p_reason TEXT,
  p_value_boolean BOOLEAN DEFAULT NULL,
  p_value_integer INTEGER DEFAULT NULL,
  p_value_double DOUBLE PRECISION DEFAULT NULL,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flag_value_type feature_flag_value_type;
  v_current_version INTEGER;
  v_value_count INTEGER;
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get flag value type
  SELECT value_type INTO v_flag_value_type
  FROM feature_flags
  WHERE id = p_feature_flag_id
    AND environment = p_environment
    AND deleted_at IS NULL;
  
  IF v_flag_value_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature flag not found');
  END IF;
  
  -- Count non-null values
  v_value_count := (p_value_boolean IS NOT NULL)::int + 
                   (p_value_integer IS NOT NULL)::int + 
                   (p_value_double IS NOT NULL)::int;
  
  IF v_value_count != 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Exactly one value must be provided');
  END IF;
  
  -- Validate value type matches
  IF v_flag_value_type = 'boolean' AND p_value_boolean IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is boolean, but boolean value not provided');
  END IF;
  
  IF v_flag_value_type = 'integer' AND p_value_integer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is integer, but integer value not provided');
  END IF;
  
  IF v_flag_value_type = 'double' AND p_value_double IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is double, but double value not provided');
  END IF;
  
  -- Check version if provided (optimistic locking)
  IF p_expected_version IS NOT NULL THEN
    SELECT version INTO v_current_version
    FROM feature_flag_user_overrides
    WHERE feature_flag_id = p_feature_flag_id
      AND user_id = p_user_id
      AND environment = p_environment;
    
    IF v_current_version IS NOT NULL AND v_current_version != p_expected_version THEN
      RETURN jsonb_build_object('success', false, 'error', 'Version conflict: override was modified by another admin. Please refresh and try again.');
    END IF;
  END IF;
  
  -- Upsert user override
  INSERT INTO feature_flag_user_overrides (
    feature_flag_id, user_id, environment, value_boolean, value_integer, value_double, version
  )
  VALUES (
    p_feature_flag_id, p_user_id, p_environment, p_value_boolean, p_value_integer, p_value_double, 1
  )
  ON CONFLICT (feature_flag_id, user_id, environment)
  DO UPDATE SET
    value_boolean = EXCLUDED.value_boolean,
    value_integer = EXCLUDED.value_integer,
    value_double = EXCLUDED.value_double,
    version = feature_flag_user_overrides.version + 1,
    updated_at = NOW();
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Remove org override
CREATE OR REPLACE FUNCTION admin_remove_org_override(
  p_feature_flag_id UUID,
  p_org_id UUID,
  p_environment feature_flag_environment,
  p_reason TEXT,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_version INTEGER;
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check version if provided (optimistic locking)
  IF p_expected_version IS NOT NULL THEN
    SELECT version INTO v_current_version
    FROM feature_flag_org_overrides
    WHERE feature_flag_id = p_feature_flag_id
      AND org_id = p_org_id
      AND environment = p_environment;
    
    IF v_current_version IS NOT NULL AND v_current_version != p_expected_version THEN
      RETURN jsonb_build_object('success', false, 'error', 'Version conflict: override was modified by another admin. Please refresh and try again.');
    END IF;
  END IF;
  
  -- Delete override
  DELETE FROM feature_flag_org_overrides
  WHERE feature_flag_id = p_feature_flag_id
    AND org_id = p_org_id
    AND environment = p_environment;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Override not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Remove user override
CREATE OR REPLACE FUNCTION admin_remove_user_override(
  p_feature_flag_id UUID,
  p_user_id UUID,
  p_environment feature_flag_environment,
  p_reason TEXT,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_version INTEGER;
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check version if provided (optimistic locking)
  IF p_expected_version IS NOT NULL THEN
    SELECT version INTO v_current_version
    FROM feature_flag_user_overrides
    WHERE feature_flag_id = p_feature_flag_id
      AND user_id = p_user_id
      AND environment = p_environment;
    
    IF v_current_version IS NOT NULL AND v_current_version != p_expected_version THEN
      RETURN jsonb_build_object('success', false, 'error', 'Version conflict: override was modified by another admin. Please refresh and try again.');
    END IF;
  END IF;
  
  -- Delete override
  DELETE FROM feature_flag_user_overrides
  WHERE feature_flag_id = p_feature_flag_id
    AND user_id = p_user_id
    AND environment = p_environment;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Override not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Delete feature flag (soft delete)
CREATE OR REPLACE FUNCTION admin_delete_feature_flag(
  p_feature_flag_id UUID,
  p_environment feature_flag_environment,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Soft delete flag
  UPDATE feature_flags
  SET deleted_at = NOW(),
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_feature_flag_id
    AND environment = p_environment
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature flag not found or already deleted');
  END IF;
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Restore feature flag (undo soft delete)
CREATE OR REPLACE FUNCTION admin_restore_feature_flag(
  p_feature_flag_id UUID,
  p_environment feature_flag_environment,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Restore flag
  UPDATE feature_flags
  SET deleted_at = NULL,
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_feature_flag_id
    AND environment = p_environment
    AND deleted_at IS NOT NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature flag not found or not deleted');
  END IF;
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 13. Grant Permissions
-- ============================================================================

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_environment_from_url() TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_feature_flag(TEXT, UUID, UUID, feature_flag_environment) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_feature_flags(TEXT[], UUID, UUID, feature_flag_environment) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_feature_flag(TEXT, feature_flag_value_type, feature_flag_environment, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_platform_default(UUID, feature_flag_environment, TEXT, BOOLEAN, INTEGER, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_org_override(UUID, UUID, feature_flag_environment, TEXT, BOOLEAN, INTEGER, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_user_override(UUID, UUID, feature_flag_environment, TEXT, BOOLEAN, INTEGER, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_remove_org_override(UUID, UUID, feature_flag_environment, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_remove_user_override(UUID, UUID, feature_flag_environment, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_feature_flag(UUID, feature_flag_environment, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_restore_feature_flag(UUID, feature_flag_environment, TEXT) TO authenticated;

-- ============================================================================
-- 14. Admin Views
-- ============================================================================

-- Feature flags list view (excluding soft-deleted)
CREATE OR REPLACE VIEW admin_feature_flags_list AS
SELECT 
  ff.id,
  ff.key,
  ff.value_type,
  ff.description,
  ff.environment,
  ff.deleted_at,
  ff.version,
  ff.created_at,
  ff.updated_at,
  fpd.value_boolean AS default_value_boolean,
  fpd.value_integer AS default_value_integer,
  fpd.value_double AS default_value_double,
  (SELECT COUNT(*) FROM feature_flag_org_overrides ffo WHERE ffo.feature_flag_id = ff.id AND ffo.environment = ff.environment) AS org_override_count,
  (SELECT COUNT(*) FROM feature_flag_user_overrides ffu WHERE ffu.feature_flag_id = ff.id AND ffu.environment = ff.environment) AS user_override_count
FROM feature_flags ff
LEFT JOIN feature_flag_platform_defaults fpd ON fpd.feature_flag_id = ff.id AND fpd.environment = ff.environment
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())
  AND ff.deleted_at IS NULL;

-- Feature flag overrides view
CREATE OR REPLACE VIEW admin_feature_flag_overrides AS
SELECT 
  'org' AS override_type,
  ffo.feature_flag_id,
  ff.key AS feature_key,
  ffo.org_id::TEXT AS scope_id,
  o.name AS scope_name,
  ffo.environment,
  ffo.value_boolean,
  ffo.value_integer,
  ffo.value_double,
  ffo.version,
  ffo.created_at,
  ffo.updated_at
FROM feature_flag_org_overrides ffo
JOIN feature_flags ff ON ff.id = ffo.feature_flag_id
JOIN organizations o ON o.id = ffo.org_id
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())

UNION ALL

SELECT 
  'user' AS override_type,
  ffu.feature_flag_id,
  ff.key AS feature_key,
  ffu.user_id::TEXT AS scope_id,
  u.email AS scope_name,
  ffu.environment,
  ffu.value_boolean,
  ffu.value_integer,
  ffu.value_double,
  ffu.version,
  ffu.created_at,
  ffu.updated_at
FROM feature_flag_user_overrides ffu
JOIN feature_flags ff ON ff.id = ffu.feature_flag_id
JOIN users u ON u.id = ffu.user_id
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());

-- Feature flag audit log view
CREATE OR REPLACE VIEW admin_feature_flag_audit AS
SELECT 
  al.id,
  al.actor_id,
  u.email AS actor_email,
  u.display_name AS actor_name,
  al.action,
  al.feature_flag_id,
  ff.key AS feature_key,
  al.scope_type,
  al.scope_id,
  al.old_value,
  al.new_value,
  al.environment,
  al.created_at
FROM feature_flag_audit_log al
LEFT JOIN users u ON u.id = al.actor_id
LEFT JOIN feature_flags ff ON ff.id = al.feature_flag_id
WHERE EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())
ORDER BY al.created_at DESC;

-- Grant access to views
GRANT SELECT ON admin_feature_flags_list TO authenticated;
GRANT SELECT ON admin_feature_flag_overrides TO authenticated;
GRANT SELECT ON admin_feature_flag_audit TO authenticated;

-- ============================================================================
-- 15. Comments
-- ============================================================================

COMMENT ON TYPE feature_flag_environment IS 'Environment for feature flags: dev, staging, prod';
COMMENT ON TYPE feature_flag_value_type IS 'Value type for feature flags: boolean, integer, double';
COMMENT ON TABLE feature_flags IS 'Feature flag definitions. Supports soft deletion via deleted_at.';
COMMENT ON TABLE feature_flag_platform_defaults IS 'Platform-wide default values for feature flags.';
COMMENT ON TABLE feature_flag_org_overrides IS 'Organization-specific overrides for feature flags.';
COMMENT ON TABLE feature_flag_user_overrides IS 'User-specific overrides for feature flags.';
COMMENT ON TABLE feature_flag_audit_log IS 'Immutable audit log for all feature flag changes. Never automatically deleted.';
COMMENT ON FUNCTION resolve_feature_flag IS 'Resolves feature flag value with precedence: user override > org override > platform default. Returns null if not found.';
COMMENT ON FUNCTION resolve_feature_flags IS 'Batch resolution of multiple feature flags. Returns JSONB object with flag keys as keys.';
