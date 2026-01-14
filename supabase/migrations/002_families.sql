-- Phase 01: Families Table
-- =========================
-- Household accounts that parents and children belong to

-- Create the families table
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for org_id lookups
CREATE INDEX idx_families_org_id ON families(org_id);

-- Add trigger for updated_at
CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS Policies for families are added in 017_deferred_rls_policies.sql
-- This is because they depend on the users table which is created in 003_users.sql

-- Allow authenticated users to insert (for signup flow) - this one is safe
CREATE POLICY "Users can create families during signup" ON families
  FOR INSERT
  WITH CHECK (true);
