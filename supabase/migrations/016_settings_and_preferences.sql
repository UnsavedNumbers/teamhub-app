-- Phase 11: Settings & Preferences
-- ==================================
-- Enhancements for user settings, permissions, and team metadata

-- Add sport and program columns to teams for better hierarchy
ALTER TABLE teams ADD COLUMN IF NOT EXISTS sport TEXT DEFAULT 'General';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS program TEXT DEFAULT 'Competitive';

-- Add preferences and permissions to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Create default preferences index
CREATE INDEX idx_users_preferences ON users USING gin (preferences);
