-- Phase 02: Children Table
-- =========================
-- Children belong to families and can be on multiple teams

-- Create the children table
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birthdate DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for family_id lookups
CREATE INDEX idx_children_family_id ON children(family_id);

-- Add trigger for updated_at
CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS Policies for children are added in 017_deferred_rls_policies.sql
-- This is because they depend on users and team_memberships tables
