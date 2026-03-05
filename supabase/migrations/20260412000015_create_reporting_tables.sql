-- ============================================
-- REPORTING CONSOLE TABLES
-- ============================================
-- Tables for saved reports, scheduled reports, and export history
-- ============================================

-- Saved reports table
CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL, -- Report configuration (scope, filters, charts, columns)
  is_shared BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE, -- For shareable links
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT saved_reports_name_not_empty CHECK (char_length(trim(name)) > 0)
);

-- Scheduled reports table
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_config JSONB NOT NULL,
  schedule JSONB NOT NULL, -- {frequency: 'daily'|'weekly'|'monthly', day_of_week?, day_of_month?}
  recipients TEXT[] NOT NULL, -- Email addresses
  format TEXT NOT NULL CHECK (format IN ('csv', 'xlsx', 'pdf')),
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT scheduled_reports_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT scheduled_reports_recipients_not_empty CHECK (array_length(recipients, 1) > 0),
  CONSTRAINT scheduled_reports_schedule_valid CHECK (
    (schedule->>'frequency' IN ('daily', 'weekly', 'monthly')) AND
    (schedule->>'frequency' != 'weekly' OR (schedule->>'day_of_week') IS NOT NULL) AND
    (schedule->>'frequency' != 'monthly' OR (schedule->>'day_of_month') IS NOT NULL)
  )
);

-- Export history table
CREATE TABLE IF NOT EXISTS export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_config JSONB NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('csv', 'xlsx', 'pdf')),
  file_url TEXT, -- S3/storage URL if stored
  file_size_bytes INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_reports_org_user ON saved_reports(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_share_token ON saved_reports(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_org_user ON scheduled_reports(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_export_history_org_user ON export_history(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_export_history_status ON export_history(status);
CREATE INDEX IF NOT EXISTS idx_export_history_created_at ON export_history(created_at DESC);

-- RLS Policies
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved reports or shared reports
CREATE POLICY saved_reports_select ON saved_reports
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    (is_shared = true AND org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY saved_reports_insert ON saved_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY saved_reports_update ON saved_reports
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY saved_reports_delete ON saved_reports
  FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only see scheduled reports for their org
CREATE POLICY scheduled_reports_select ON scheduled_reports
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY scheduled_reports_insert ON scheduled_reports
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY scheduled_reports_update ON scheduled_reports
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY scheduled_reports_delete ON scheduled_reports
  FOR DELETE
  USING (
    auth.uid() = user_id AND
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Users can only see export history for their org
CREATE POLICY export_history_select ON export_history
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY export_history_insert ON export_history
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_saved_reports_updated_at
  BEFORE UPDATE ON saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
