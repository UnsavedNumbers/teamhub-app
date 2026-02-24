-- Link email_templates to notification_types by matching type to key
-- Backfills templates that weren't linked because map_job_type_to_notification_type returned NULL
-- (e.g. password_reset, email_verification, new_org_signup_internal, admin alerts, etc.)

-- Step 1: Insert missing notification_types for every distinct email_templates.type that has no matching key
INSERT INTO public.notification_types (
  key,
  display_name,
  description,
  eligible_roles,
  supports_email,
  category,
  default_in_app_enabled,
  default_email_enabled
)
SELECT
  et.type_key,
  initcap(replace(et.type_key, '_', ' ')),
  'Email template: ' || initcap(replace(et.type_key, '_', ' ')),
  CASE
    WHEN et.type_key IN ('new_org_signup_internal', 'large_purchase_alert', 'multiple_failed_payments_alert', 'event_overcapacity_warning', 'medical_form_submitted', 'chargeback_alert', 'video_uploaded_internal')
      THEN ARRAY['platform_admin', 'org_admin']::text[]
    ELSE ARRAY['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff', 'platform_admin']::text[]
  END,
  true,
  COALESCE(
    (SELECT DISTINCT e.category FROM public.email_templates e WHERE e.type::text = et.type_key LIMIT 1),
    'System'
  ),
  true,
  true
FROM (
  SELECT DISTINCT type::text AS type_key
  FROM public.email_templates
  WHERE notification_type_id IS NULL
) et
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_types nt WHERE nt.key = et.type_key
)
ON CONFLICT (key) DO NOTHING;

-- Step 2: Link all email_templates to notification_types where type matches key
UPDATE public.email_templates et
SET notification_type_id = nt.id
FROM public.notification_types nt
WHERE nt.key = et.type::text
  AND et.notification_type_id IS NULL;

-- Step 3: Ensure only one active template per notification_type (deactivate duplicates)
UPDATE public.email_templates et
SET is_active = false
WHERE et.is_active = true
  AND et.notification_type_id IS NOT NULL
  AND et.id NOT IN (
    SELECT DISTINCT ON (notification_type_id) id
    FROM public.email_templates
    WHERE is_active = true
      AND notification_type_id IS NOT NULL
    ORDER BY notification_type_id, updated_at DESC, created_at DESC
  );
