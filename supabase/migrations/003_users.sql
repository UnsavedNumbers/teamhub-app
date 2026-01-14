-- Phase 01: Users Table
-- ======================
-- User profiles linked to Supabase Auth

-- Create role enum type
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('parent', 'coach', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'parent',
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_family_id ON users(family_id);
CREATE INDEX idx_users_email ON users(email);

-- Add trigger for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users

-- Users can view themselves
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update themselves
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all users in their org
CREATE POLICY "Admins can view org users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = users.org_id
    )
  );

-- Admins can manage users in their org
CREATE POLICY "Admins can manage org users" ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.org_id = users.org_id
    )
  );

-- Coaches can view users in their org
CREATE POLICY "Coaches can view org users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'coach'
      AND u.org_id = users.org_id
    )
  );

-- Parents can view other parents in same teams (via team_memberships - Phase 03)
-- This policy will be added in Phase 03 when team_memberships exists

-- Allow insert for new user signup (triggered by auth)
CREATE POLICY "Allow user signup insert" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
