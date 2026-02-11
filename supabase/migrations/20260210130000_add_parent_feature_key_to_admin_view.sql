-- Add parent_feature_key to admin_feature_entitlements_list view
-- This allows the admin UI to display and filter by feature hierarchy

CREATE OR REPLACE VIEW public.admin_feature_entitlements_list WITH (security_invoker='true') AS
 SELECT fe.id,
    fe.feature_key,
    fe.display_name,
    fe.category,
    fe.feature_type,
    fe.description,
    fe.rollout_status,
    fe.created_at,
    fe.updated_at,
    fe.archived_at,
    fe.is_toggleable,
    fe.is_removable,
    fe.lock_reason,
    fe.is_system_feature,
    fe.platform_admin_only,
    fe.unavailable_gate_action,
    ( SELECT count(*) AS count
           FROM public.tier_feature_assignments tfa
          WHERE ((tfa.feature_entitlement_id = fe.id) AND (tfa.included = true))) AS tier_assignments_count,
    COALESCE(( SELECT array_agg(DISTINCT lt.tier_key) AS array_agg
           FROM (public.tier_feature_assignments tfa
             JOIN public.license_tiers lt ON ((lt.id = tfa.license_tier_id)))
          WHERE ((tfa.feature_entitlement_id = fe.id) AND (tfa.included = true) AND (lt.status = 'active'::text))), ARRAY[]::text[]) AS assigned_tier_keys,
    COALESCE(( SELECT bool_or(tfa.role_admin) AS bool_or
           FROM public.tier_feature_assignments tfa
          WHERE ((tfa.feature_entitlement_id = fe.id) AND (tfa.included = true))), false) AS visible_to_admin,
    COALESCE(( SELECT bool_or(tfa.role_coach) AS bool_or
           FROM public.tier_feature_assignments tfa
          WHERE ((tfa.feature_entitlement_id = fe.id) AND (tfa.included = true))), false) AS visible_to_coach,
    COALESCE(( SELECT bool_or(tfa.role_parent) AS bool_or
           FROM public.tier_feature_assignments tfa
          WHERE ((tfa.feature_entitlement_id = fe.id) AND (tfa.included = true))), false) AS visible_to_parent,
    COALESCE(( SELECT array_agg(DISTINCT fia.integration_name) AS array_agg
           FROM public.feature_integration_assignments fia
          WHERE (fia.feature_entitlement_id = fe.id)), ARRAY[]::text[]) AS integrations,
    COALESCE(( SELECT bool_or((tfa.limit_value IS NOT NULL)) AS bool_or
           FROM public.tier_feature_assignments tfa
          WHERE ((tfa.feature_entitlement_id = fe.id) AND (tfa.included = true))), false) AS is_quantifiable,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM public.feature_discovery_cache fdc
              WHERE (fdc.discovered_features @> jsonb_build_array(jsonb_build_object('featureKey', fe.feature_key))))) THEN 'auto-discovered'::text
            WHEN (fe.created_at = fe.updated_at) THEN 'manually-created'::text
            ELSE 'override-custom'::text
        END AS discovery_source,
    ( SELECT count(*) AS count
           FROM public.entitlement_overrides eo
          WHERE ((eo.feature_entitlement_id = fe.id) AND (eo.revoked_at IS NULL) AND ((eo.expires_at IS NULL) OR (eo.expires_at > now())))) AS active_overrides_count,
    fe.parent_feature_key
   FROM public.feature_entitlements fe;
