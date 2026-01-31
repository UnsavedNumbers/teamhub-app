-- Phase 12: Organization Profile Details
-- ===========================================
-- Add profile fields to organizations table

ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT, -- Contact email for the organization
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS logo_path TEXT;

COMMENT ON COLUMN organizations.email IS 'Public contact email for the organization (distinct from user emails)';
