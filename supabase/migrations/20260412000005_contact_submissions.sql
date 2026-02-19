-- Contact Submissions Table
-- Stores contact form submissions for platform admin viewing
-- Submissions are also sent to external webhook

CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    
    -- Core submission data
    surface text NOT NULL CHECK (surface IN ('help', 'portal', 'admin')),
    subject_enum text NOT NULL,
    subject_label text NOT NULL,
    message text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- User identity
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    email text,
    name text,
    role_context text CHECK (role_context IN ('guardian', 'coach', 'org_admin', 'public')),
    org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    org_name text,
    team_ids uuid[] DEFAULT '{}',
    athlete_ids uuid[] DEFAULT '{}',
    
    -- Client metadata
    app_version text,
    environment text CHECK (environment IN ('dev', 'staging', 'prod')),
    page_url text,
    route_path text,
    user_agent text,
    timezone text,
    locale text,
    theme text CHECK (theme IN ('light', 'dark')),
    active_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    active_role text,
    
    -- Diagnostics (stored as JSONB)
    feature_flags_snapshot jsonb,
    
    -- Webhook submission tracking
    webhook_url text,
    webhook_success boolean DEFAULT false,
    webhook_response_status integer,
    webhook_error_message text,
    webhook_sent_at timestamp with time zone,
    
    -- Admin tracking
    viewed_by_platform_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    viewed_at timestamp with time zone,
    status text DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
    admin_notes text,
    
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_contact_submissions_surface ON public.contact_submissions(surface);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_submitted_at ON public.contact_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON public.contact_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_org_id ON public.contact_submissions(org_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_webhook_success ON public.contact_submissions(webhook_success);

-- Full-text search index on message and subject_label
CREATE INDEX IF NOT EXISTS idx_contact_submissions_search ON public.contact_submissions USING gin(
    to_tsvector('english', coalesce(message, '') || ' ' || coalesce(subject_label, ''))
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_contact_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_submissions_updated_at
    BEFORE UPDATE ON public.contact_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_submissions_updated_at();

-- RLS Policies
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all submissions
CREATE POLICY "Platform admins can view all contact submissions"
    ON public.contact_submissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.platform_admins
            WHERE platform_admins.user_id = auth.uid()
        )
    );

-- Users can view their own submissions
CREATE POLICY "Users can view their own contact submissions"
    ON public.contact_submissions
    FOR SELECT
    USING (user_id = auth.uid());

-- Anyone can insert (for form submissions)
CREATE POLICY "Anyone can create contact submissions"
    ON public.contact_submissions
    FOR INSERT
    WITH CHECK (true);

-- Platform admins can update (for status, notes, etc.)
CREATE POLICY "Platform admins can update contact submissions"
    ON public.contact_submissions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.platform_admins
            WHERE platform_admins.user_id = auth.uid()
        )
    );

-- No deletes allowed (audit trail)
-- Platform admins can mark as 'closed' but not delete

-- Comments
COMMENT ON TABLE public.contact_submissions IS 'Contact form submissions from help, portal, and admin surfaces. Stored for platform admin viewing and audit trail.';
COMMENT ON COLUMN public.contact_submissions.surface IS 'Which surface the submission came from: help, portal, or admin';
COMMENT ON COLUMN public.contact_submissions.webhook_success IS 'Whether the webhook submission succeeded';
COMMENT ON COLUMN public.contact_submissions.status IS 'Admin workflow status: new, in_progress, resolved, closed';
