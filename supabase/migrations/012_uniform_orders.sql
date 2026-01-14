-- Phase 07: Uniform Orders Table
-- ================================
-- Uniform size collection per child per team

-- Create uniform order status enum
DO $$ BEGIN
  CREATE TYPE uniform_order_status AS ENUM ('pending', 'ordered', 'delivered');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the uniform_orders table
CREATE TABLE IF NOT EXISTS uniform_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  jersey_size TEXT NOT NULL,
  shorts_size TEXT NOT NULL,
  socks_size TEXT NOT NULL,
  status uniform_order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, team_id, season_id)
);

-- Add indexes
CREATE INDEX idx_uniform_orders_child_id ON uniform_orders(child_id);
CREATE INDEX idx_uniform_orders_team_id ON uniform_orders(team_id);
CREATE INDEX idx_uniform_orders_season_id ON uniform_orders(season_id);
CREATE INDEX idx_uniform_orders_status ON uniform_orders(status);

-- Add trigger for updated_at
CREATE TRIGGER update_uniform_orders_updated_at
  BEFORE UPDATE ON uniform_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE uniform_orders ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS Policies for uniform_orders are added in 017_deferred_rls_policies.sql
-- This is because they depend on users, children, and teams tables
