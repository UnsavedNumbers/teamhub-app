-- Phase 09: Tryouts Tables
-- ==========================
-- Tryouts, registrations, and scoring for player evaluations

-- Create registration status enum
DO $$ BEGIN
  CREATE TYPE tryout_registration_status AS ENUM ('registered', 'checked_in', 'evaluated', 'offered', 'accepted', 'declined', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the tryouts table
CREATE TABLE IF NOT EXISTS tryouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sport TEXT NOT NULL,
  age_group TEXT NOT NULL,
  tryout_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT NOT NULL,
  entry_fee INTEGER DEFAULT 0, -- in cents
  requirements TEXT[],
  what_to_bring TEXT[],
  max_spots INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_tryouts_org_id ON tryouts(org_id);
CREATE INDEX idx_tryouts_tryout_date ON tryouts(tryout_date);

-- Add trigger for updated_at
CREATE TRIGGER update_tryouts_updated_at
  BEFORE UPDATE ON tryouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE tryouts ENABLE ROW LEVEL SECURITY;

-- Create the tryout_registrations table  
CREATE TABLE IF NOT EXISTS tryout_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tryout_id UUID NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  status tryout_registration_status NOT NULL DEFAULT 'registered',
  jersey_number INTEGER,
  notes TEXT,
  offer_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tryout_id, child_id)
);

-- Add indexes
CREATE INDEX idx_tryout_registrations_tryout_id ON tryout_registrations(tryout_id);
CREATE INDEX idx_tryout_registrations_child_id ON tryout_registrations(child_id);
CREATE INDEX idx_tryout_registrations_status ON tryout_registrations(status);

-- Add trigger for updated_at
CREATE TRIGGER update_tryout_registrations_updated_at
  BEFORE UPDATE ON tryout_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE tryout_registrations ENABLE ROW LEVEL SECURITY;

-- Create the tryout_scores table
CREATE TABLE IF NOT EXISTS tryout_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES tryout_registrations(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_tryout_scores_registration_id ON tryout_scores(registration_id);
CREATE INDEX idx_tryout_scores_coach_id ON tryout_scores(coach_id);

-- Enable RLS
ALTER TABLE tryout_scores ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS Policies for tryouts, tryout_registrations, and tryout_scores
-- are added in 017_deferred_rls_policies.sql because they depend on the users table
