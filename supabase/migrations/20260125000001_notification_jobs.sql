-- Create notification_jobs table for transactional email system
CREATE TYPE notification_job_status AS ENUM ('queued', 'sent', 'failed');

CREATE TYPE notification_job_type AS ENUM (
  'new_event',
  'new_message',
  'payment_receipt',
  'event_reminder',
  'registration_confirmation',
  'team_invite',
  'password_reset',
  'welcome_email'
);

CREATE TABLE notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  type notification_job_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status notification_job_status NOT NULL DEFAULT 'queued',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notification_jobs_status_created ON notification_jobs(status, created_at);
CREATE INDEX idx_notification_jobs_org_id ON notification_jobs(org_id);
CREATE INDEX idx_notification_jobs_user_id ON notification_jobs(user_id);
CREATE INDEX idx_notification_jobs_email ON notification_jobs(email);

-- RLS Policies
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;

-- Organization admins can see jobs for their org
CREATE POLICY "org_admins_can_view_notification_jobs" ON notification_jobs
  FOR SELECT USING (
    org_id IS NOT NULL AND (
      user_is_org_admin(auth.uid(), org_id) OR
      is_platform_admin(auth.uid())
    )
  );

-- Platform admins can see all jobs
CREATE POLICY "platform_admins_can_view_all_notification_jobs" ON notification_jobs
  FOR SELECT USING (is_platform_admin(auth.uid()));

-- Only service role can insert/update jobs (via edge functions)
CREATE POLICY "service_role_can_manage_notification_jobs" ON notification_jobs
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_notification_jobs_updated_at
  BEFORE UPDATE ON notification_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();