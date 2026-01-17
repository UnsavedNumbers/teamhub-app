-- Phase 14: Tryouts - Required Documents + Upload Metadata
-- =======================================================
-- Adds tables to define required docs per tryout and track uploads per registration.
-- Storage bucket creation and storage policies are handled separately (next migration),
-- since they require the storage schema.

DO $$ BEGIN
  CREATE TYPE tryout_document_status AS ENUM ('missing', 'uploaded', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------
-- TABLE: tryout_required_documents
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tryout_required_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tryout_id UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tryout_id, key)
);

CREATE INDEX IF NOT EXISTS idx_tryout_required_documents_tryout_id
  ON tryout_required_documents(tryout_id);

ALTER TABLE tryout_required_documents ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- TABLE: tryout_registration_documents
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tryout_registration_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES tryout_registrations(id) ON DELETE CASCADE,
  required_document_id UUID NOT NULL REFERENCES tryout_required_documents(id) ON DELETE CASCADE,
  status tryout_document_status NOT NULL DEFAULT 'missing',
  storage_bucket TEXT NOT NULL DEFAULT 'tryout-documents',
  storage_path TEXT,
  file_name TEXT,
  content_type TEXT,
  file_size_bytes BIGINT,
  uploaded_by_user_id UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (registration_id, required_document_id)
);

CREATE INDEX IF NOT EXISTS idx_tryout_reg_docs_registration_id
  ON tryout_registration_documents(registration_id);
CREATE INDEX IF NOT EXISTS idx_tryout_reg_docs_required_document_id
  ON tryout_registration_documents(required_document_id);
CREATE INDEX IF NOT EXISTS idx_tryout_reg_docs_status
  ON tryout_registration_documents(status);

DROP TRIGGER IF EXISTS update_tryout_registration_documents_updated_at ON tryout_registration_documents;
CREATE TRIGGER update_tryout_registration_documents_updated_at
  BEFORE UPDATE ON tryout_registration_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tryout_registration_documents ENABLE ROW LEVEL SECURITY;

