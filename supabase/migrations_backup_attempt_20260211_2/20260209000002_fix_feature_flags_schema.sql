-- Fix feature_flags table schema to support both platform-wide and org-specific flags
-- Platform-wide flags: use key, value_type, description, environment, deleted_at, version
-- Org-specific flags: use org_id, feature_key, enabled (legacy)

-- Make org_id nullable to support platform-wide feature flags
ALTER TABLE public.feature_flags 
  ALTER COLUMN org_id DROP NOT NULL;

-- Make feature_key nullable (only used for org-specific flags)
ALTER TABLE public.feature_flags 
  ALTER COLUMN feature_key DROP NOT NULL;

-- Make enabled nullable (only used for org-specific flags)  
ALTER TABLE public.feature_flags 
  ALTER COLUMN enabled DROP NOT NULL;

-- Add check constraint to ensure either:
-- 1. Platform flag: key, value_type, environment are NOT NULL, org_id IS NULL
-- 2. Org flag: org_id, feature_key, enabled are NOT NULL, key IS NULL
ALTER TABLE public.feature_flags
  DROP CONSTRAINT IF EXISTS feature_flags_type_check;

ALTER TABLE public.feature_flags
  ADD CONSTRAINT feature_flags_type_check CHECK (
    -- Platform-wide flag
    (org_id IS NULL AND key IS NOT NULL AND value_type IS NOT NULL AND environment IS NOT NULL)
    OR
    -- Org-specific flag (legacy)
    (org_id IS NOT NULL AND feature_key IS NOT NULL AND enabled IS NOT NULL AND key IS NULL)
  );

-- Update admin_feature_flags view to only show org-specific flags
DROP VIEW IF EXISTS public.admin_feature_flags;

CREATE VIEW public.admin_feature_flags WITH (security_invoker='true') AS
 SELECT ff.id,
    ff.org_id,
    o.name AS organization_name,
    ff.feature_key,
    ff.enabled,
    ff.created_at,
    ff.updated_at
   FROM (public.feature_flags ff
     JOIN public.organizations o ON ((o.id = ff.org_id)))
  WHERE ff.org_id IS NOT NULL
    AND EXISTS ( SELECT 1
           FROM public.platform_admins pa
          WHERE (pa.user_id = auth.uid()))
  ORDER BY o.name, ff.feature_key;

-- Create new view for platform-wide feature flags
CREATE VIEW public.admin_feature_flags_list WITH (security_invoker='true') AS
 SELECT ff.id,
    ff.key,
    ff.value_type,
    ff.description,
    ff.environment,
    ff.deleted_at,
    ff.version,
    ff.created_at,
    ff.updated_at,
    -- Get default values from platform_defaults table
    pd.value_boolean as default_value_boolean,
    pd.value_integer as default_value_integer,
    pd.value_double as default_value_double,
    -- Count overrides
    (SELECT COUNT(*) FROM public.feature_flag_org_overrides 
     WHERE feature_flag_id = ff.id AND environment = ff.environment) as org_override_count,
    (SELECT COUNT(*) FROM public.feature_flag_user_overrides 
     WHERE feature_flag_id = ff.id AND environment = ff.environment) as user_override_count
   FROM public.feature_flags ff
   LEFT JOIN public.feature_flag_platform_defaults pd 
     ON (pd.feature_flag_id = ff.id AND pd.environment = ff.environment)
  WHERE ff.org_id IS NULL
    AND EXISTS ( SELECT 1
           FROM public.platform_admins pa
          WHERE (pa.user_id = auth.uid()))
  ORDER BY ff.key;

COMMENT ON VIEW public.admin_feature_flags_list IS 'Platform admin view of platform-wide feature flags (not org-specific flags)';

-- Create admin view for feature flag overrides (both org and user)
CREATE VIEW public.admin_feature_flag_overrides WITH (security_invoker='true') AS
 -- Organization overrides
 SELECT 
    ff.id || ':' || o.org_id || ':' || o.environment AS id,
    'org' AS override_type,
    o.feature_flag_id,
    ff.key AS feature_key,
    o.org_id AS scope_id,
    org.name AS scope_name,
    o.environment,
    o.value_boolean,
    o.value_integer,
    o.value_double,
    o.version,
    o.created_at,
    o.updated_at
   FROM public.feature_flag_org_overrides o
   JOIN public.feature_flags ff ON (ff.id = o.feature_flag_id)
   JOIN public.organizations org ON (org.id = o.org_id)
  WHERE EXISTS ( SELECT 1
           FROM public.platform_admins pa
          WHERE (pa.user_id = auth.uid()))
 UNION ALL
 -- User overrides
 SELECT 
    ff.id || ':' || u.user_id || ':' || u.environment AS id,
    'user' AS override_type,
    u.feature_flag_id,
    ff.key AS feature_key,
    u.user_id AS scope_id,
    COALESCE(users.full_name, users.email) AS scope_name,
    u.environment,
    u.value_boolean,
    u.value_integer,
    u.value_double,
    u.version,
    u.created_at,
    u.updated_at
   FROM public.feature_flag_user_overrides u
   JOIN public.feature_flags ff ON (ff.id = u.feature_flag_id)
   JOIN public.users ON (users.id = u.user_id)
  WHERE EXISTS ( SELECT 1
           FROM public.platform_admins pa
          WHERE (pa.user_id = auth.uid()))
  ORDER BY created_at DESC;

COMMENT ON VIEW public.admin_feature_flag_overrides IS 'Platform admin view of all feature flag overrides (org and user combined)';
