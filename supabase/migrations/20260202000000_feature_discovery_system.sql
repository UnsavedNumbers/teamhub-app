-- Feature Discovery System Tables

-- 1. Discovery Cache
CREATE TABLE IF NOT EXISTS feature_discovery_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovered_features JSONB NOT NULL,
  last_discovered_at TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ,
  discovery_version TEXT,
  schema_hash TEXT,
  sync_status TEXT CHECK (sync_status IN ('pending', 'synced', 'failed')),
  sync_errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Discovery Hints (for manual overrides/hints)
CREATE TABLE IF NOT EXISTS feature_discovery_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL,
  hint_type TEXT CHECK (hint_type IN ('route_pattern', 'table_pattern', 'service_pattern')),
  hint_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Discovery Corrections (Learning mechanism)
CREATE TABLE IF NOT EXISTS feature_discovery_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL,
  correction_type TEXT CHECK (correction_type IN ('approve', 'reject', 'visibility_change', 'integration_add')),
  before_state JSONB,
  after_state JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Discovery Errors Log
CREATE TABLE IF NOT EXISTS discovery_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT,
  error_type TEXT,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Feature Integrations Registry
CREATE TABLE IF NOT EXISTS feature_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key_pattern TEXT NOT NULL,  -- Regex pattern
  integration_name TEXT NOT NULL,
  integration_type TEXT CHECK (integration_type IN ('payment', 'email', 'calendar', 'storage', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Dependent Cycles (Analysis result)
CREATE TABLE IF NOT EXISTS feature_dependency_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_features TEXT[] NOT NULL,  -- Array of feature keys in cycle
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_discovery_hints_key ON feature_discovery_hints(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_integrations_pattern ON feature_integrations(feature_key_pattern);
CREATE INDEX IF NOT EXISTS idx_discovery_errors_created_at ON discovery_errors(created_at);

-- Disable RLS (per user request for unrestricted access during dev/beta)
ALTER TABLE feature_discovery_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE feature_discovery_hints DISABLE ROW LEVEL SECURITY;
ALTER TABLE feature_discovery_corrections DISABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_errors DISABLE ROW LEVEL SECURITY;
ALTER TABLE feature_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE feature_dependency_cycles DISABLE ROW LEVEL SECURITY;

-- Policies removed as RLS is disabled.
-- Previous strict policies were causing access issues in current environment.


-- RPC: Sync Discovered Features (with Advisory Lock)
CREATE OR REPLACE FUNCTION sync_discovered_features(
  p_discovered_features JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key BIGINT := 5001; -- Arbitrary lock ID for feature discovery
  v_lock_acquired BOOLEAN;
  v_result JSONB;
  v_feature JSONB;
  v_key TEXT;
  v_entitlement_id UUID;
  v_synced_count INT := 0;
  v_failed_count INT := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  -- Attempt to acquire advisory lock (transaction level)
  -- pg_try_advisory_xact_lock returns true if lock acquired immediately
  SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Discovery sync is already in progress by another process.',
      'code', 'LOCK_HELD'
    );
  END IF;

  -- Process the features
  -- We assume p_discovered_features is an array of feature objects
  FOR v_feature IN SELECT * FROM jsonb_array_elements(p_discovered_features)
  LOOP
    BEGIN
      v_key := v_feature ->> 'featureKey';
      
      -- Upsert logic would go here, mapping JSON fields to table columns
      -- For now, we update the Last Synced logic or perform the merge.
      -- This is a placeholder for the actual row manipulation if logic resides in DB.
      -- Alternatively, if the Client does the work and just sends a status, we log it.
      --
      -- HOWEVER, the prompt asked for the RPC to do the sync. 
      -- Let's assume we match on feature_key.
      
      -- Upsert feature (using TEXT columns, not enums)
      INSERT INTO feature_entitlements (
        feature_key,
        display_name,
        category,
        feature_type,
        description,
        rollout_status,
        updated_at
      ) VALUES (
        v_key,
        COALESCE(v_feature ->> 'displayName', v_key),
        COALESCE(v_feature ->> 'category', 'Support Tools'),
        COALESCE(v_feature ->> 'featureType', 'module'),
        v_feature ->> 'description',
        COALESCE(v_feature ->> 'rolloutStatus', 'live'),
        NOW()
      )
      ON CONFLICT (feature_key) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, feature_entitlements.display_name),
        description = COALESCE(EXCLUDED.description, feature_entitlements.description),
        updated_at = NOW();

      v_synced_count := v_synced_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      v_errors := v_errors || jsonb_build_object('key', v_key, 'error', SQLERRM);
    END;
  END LOOP;
  
  v_result := jsonb_build_object(
    'success', true,
    'synced', v_synced_count,
    'failed', v_failed_count,
    'errors', v_errors
  );

  RETURN v_result;
END;
$$;

-- RPC: Get Schema Tables (Secure access to information_schema)
CREATE OR REPLACE FUNCTION get_schema_tables()
RETURNS TABLE (table_name TEXT, table_type TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = information_schema, public
AS $$
  SELECT table_name::TEXT, table_type::TEXT
  FROM information_schema.tables
  WHERE table_schema = 'public';
$$;

-- RPC: Get Schema Columns
CREATE OR REPLACE FUNCTION get_schema_columns()
RETURNS TABLE (table_name TEXT, column_name TEXT, data_type TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = information_schema, public
AS $$
  SELECT table_name::TEXT, column_name::TEXT, data_type::TEXT
  FROM information_schema.columns
  WHERE table_schema = 'public';
$$;

-- RPC: Get Schema Hash (for change detection)
CREATE OR REPLACE FUNCTION get_schema_hash()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT md5(string_agg(table_name || column_name || data_type, '' ORDER BY table_name, column_name))
  INTO v_hash
  FROM information_schema.columns
  WHERE table_schema = 'public';
  
  RETURN v_hash;
END;
$$;

-- Seed known integrations
INSERT INTO feature_integrations (feature_key_pattern, integration_name, integration_type) VALUES 
('.*payment.*|.*fee.*|.*checkout.*', 'Stripe', 'payment'),
('.*notify.*|.*email.*', 'Email Service', 'email'),
('.*calendar.*', 'Calendar', 'calendar'),
('.*storage.*|.*upload.*', 'Supabase Storage', 'storage');

