-- Phase 03: Add invite_code to teams
-- ==================================
-- Allow parents to join teams via invite codes

-- Add invite_code column to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Generate invite codes for existing teams
UPDATE teams SET invite_code = upper(substr(md5(random()::text), 1, 8)) WHERE invite_code IS NULL;

-- Make invite_code required for new teams
ALTER TABLE teams ALTER COLUMN invite_code SET NOT NULL;

-- Create function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := upper(substr(md5(random()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invite codes
CREATE TRIGGER set_team_invite_code
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION generate_invite_code();

-- Allow anyone to look up a team by invite code (for joining)
CREATE POLICY "Anyone can lookup team by invite code" ON teams
  FOR SELECT
  USING (true);
