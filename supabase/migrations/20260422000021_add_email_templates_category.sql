-- Add category column to email_templates for filtering and organization.
-- Categories align with Master Email Event Matrix sections.

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates(category);

COMMENT ON COLUMN public.email_templates.category IS 'Category for organizing templates (e.g. Authentication & Account, Events, Ticketing & Payments)';
