-- Fix log_feature_flag_change() trigger to use correct ID column based on table
-- The issue: feature_flag_platform_defaults, _org_overrides, and _user_overrides
-- use 'feature_flag_id' not 'id'

CREATE OR REPLACE FUNCTION public.log_feature_flag_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  old_val JSONB;
  new_val JSONB;
  scope_type_val TEXT;
  scope_id_val TEXT;
  action_val TEXT;
  flag_id_val UUID;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_val := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_val := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_val := 'delete';
  END IF;
  
  -- Determine scope and get the correct feature_flag_id
  IF TG_TABLE_NAME = 'feature_flag_platform_defaults' THEN
    scope_type_val := 'platform';
    scope_id_val := NULL;
    flag_id_val := COALESCE(NEW.feature_flag_id, OLD.feature_flag_id);
  ELSIF TG_TABLE_NAME = 'feature_flag_org_overrides' THEN
    scope_type_val := 'organization';
    scope_id_val := COALESCE(NEW.org_id::TEXT, OLD.org_id::TEXT);
    flag_id_val := COALESCE(NEW.feature_flag_id, OLD.feature_flag_id);
  ELSIF TG_TABLE_NAME = 'feature_flag_user_overrides' THEN
    scope_type_val := 'user';
    scope_id_val := COALESCE(NEW.user_id::TEXT, OLD.user_id::TEXT);
    flag_id_val := COALESCE(NEW.feature_flag_id, OLD.feature_flag_id);
  ELSIF TG_TABLE_NAME = 'feature_flags' THEN
    scope_type_val := 'flag';
    scope_id_val := NULL;
    flag_id_val := COALESCE(NEW.id, OLD.id);
  END IF;
  
  -- Build old and new value JSONB based on table (feature_flags has no value_boolean/value_integer/value_double)
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
  ELSE
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
    flag_id_val,
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
