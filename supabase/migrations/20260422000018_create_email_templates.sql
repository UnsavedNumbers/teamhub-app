-- Create email_templates table for platform-admin editable templates.
-- Used by /platform-admin/emails/ and notification-worker (active row per type).
-- Schema aligns with email_template_editor plan; type column uses notification_job_type enum.

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type public.notification_job_type NOT NULL,
  html_content TEXT NOT NULL,
  body_content TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  preview_text TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  required_variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by_user_id UUID REFERENCES auth.users(id),
  CONSTRAINT email_templates_html_size_check CHECK (length(html_content) < 512000)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_type ON public.email_templates(type);
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON public.email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_templates_active_type ON public.email_templates(is_active, type);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_templates_platform_admin_all ON public.email_templates;
CREATE POLICY email_templates_platform_admin_all ON public.email_templates
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

COMMENT ON TABLE public.email_templates IS 'Platform-admin editable email templates; notification-worker uses active row per type.';
