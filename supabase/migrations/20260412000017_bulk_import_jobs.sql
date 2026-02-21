-- ============================================
-- BULK IMPORT JOBS TABLES
-- ============================================
-- Tables for tracking bulk invite import jobs with status, progress, and audit trail

-- Main job tracking table
CREATE TABLE public.bulk_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'running', 'completed', 'completed_with_errors', 'failed')),
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  totals_json JSONB DEFAULT '{}'::jsonb, -- { org_admins: 5, coaches: 10, guardians: 20, athletes: 50, unique_emails: 45 }
  results_path TEXT, -- Results CSV in storage
  error_summary JSONB DEFAULT '{}'::jsonb, -- { blocking_errors: 0, warnings: 3, row_errors: [...] }
  progress_json JSONB DEFAULT '{}'::jsonb, -- { step: 'creating_users', completed: 10, total: 45 }
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bulk_import_jobs_org_id ON public.bulk_import_jobs(org_id);
CREATE INDEX idx_bulk_import_jobs_status ON public.bulk_import_jobs(status);
CREATE INDEX idx_bulk_import_jobs_created_by ON public.bulk_import_jobs(created_by);
CREATE INDEX idx_bulk_import_jobs_created_at ON public.bulk_import_jobs(created_at DESC);

COMMENT ON TABLE public.bulk_import_jobs IS 'Tracks bulk invite import jobs with status, progress, and results';
COMMENT ON COLUMN public.bulk_import_jobs.totals_json IS 'Counts by sheet and unique emails: { org_admins: 5, coaches: 10, guardians: 20, athletes: 50, unique_emails: 45 }';
COMMENT ON COLUMN public.bulk_import_jobs.error_summary IS 'Summary of validation errors: { blocking_errors: 0, warnings: 3, row_errors: [...] }';
COMMENT ON COLUMN public.bulk_import_jobs.progress_json IS 'Current import progress: { step: "creating_users", completed: 10, total: 45 }';

-- Row-level audit trail table
CREATE TABLE public.bulk_import_job_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.bulk_import_jobs(id) ON DELETE CASCADE,
  sheet_name TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  normalized_email TEXT NOT NULL,
  data_json JSONB NOT NULL, -- Original row data
  validation_status TEXT NOT NULL CHECK (validation_status IN ('ok', 'warning', 'error')),
  errors_json JSONB DEFAULT '[]'::jsonb, -- Array of { field, message }
  warnings_json JSONB DEFAULT '[]'::jsonb, -- Array of { field, message }
  resolved_user_id UUID REFERENCES public.users(id),
  actions_json JSONB DEFAULT '{}'::jsonb, -- { user_created: true, roles_assigned: ['coach'], athlete_linked: true }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bulk_import_job_rows_job_id ON public.bulk_import_job_rows(job_id);
CREATE INDEX idx_bulk_import_job_rows_email ON public.bulk_import_job_rows(normalized_email);
CREATE INDEX idx_bulk_import_job_rows_validation_status ON public.bulk_import_job_rows(validation_status);

COMMENT ON TABLE public.bulk_import_job_rows IS 'Row-level audit trail for bulk import jobs';
COMMENT ON COLUMN public.bulk_import_job_rows.errors_json IS 'Array of validation errors: [{ field: "email", message: "Invalid format" }]';
COMMENT ON COLUMN public.bulk_import_job_rows.actions_json IS 'Actions taken during import: { user_created: true, roles_assigned: ["coach"], athlete_linked: true }';

-- RLS Policies
ALTER TABLE public.bulk_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_import_job_rows ENABLE ROW LEVEL SECURITY;

-- Org admins can view their org's import jobs
CREATE POLICY "Org admins can view their org's import jobs"
  ON public.bulk_import_jobs FOR SELECT
  USING (user_is_org_admin(auth.uid(), org_id));

-- Org admins can create import jobs for their org
CREATE POLICY "Org admins can create import jobs for their org"
  ON public.bulk_import_jobs FOR INSERT
  WITH CHECK (user_is_org_admin(auth.uid(), org_id));

-- Org admins can update their org's import jobs
CREATE POLICY "Org admins can update their org's import jobs"
  ON public.bulk_import_jobs FOR UPDATE
  USING (user_is_org_admin(auth.uid(), org_id));

-- Service role can manage jobs (for Edge Functions)
CREATE POLICY "Service role can manage bulk import jobs"
  ON public.bulk_import_jobs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can view rows for jobs they can view
CREATE POLICY "Users can view rows for jobs they can view"
  ON public.bulk_import_job_rows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bulk_import_jobs
      WHERE id = job_id
      AND user_is_org_admin(auth.uid(), org_id)
    )
  );

-- Service role can insert/update rows (for Edge Functions)
CREATE POLICY "Service role can manage job rows"
  ON public.bulk_import_job_rows FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bulk_import_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bulk_import_jobs_updated_at
  BEFORE UPDATE ON public.bulk_import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_bulk_import_jobs_updated_at();
