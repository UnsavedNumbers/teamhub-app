-- Create admin view for feature flag overrides (both org and user)
CREATE OR REPLACE VIEW public.admin_feature_flag_overrides WITH (security_invoker='true') AS
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
    COALESCE(NULLIF(TRIM(users.first_name || ' ' || users.last_name), ''), users.email) AS scope_name,
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
