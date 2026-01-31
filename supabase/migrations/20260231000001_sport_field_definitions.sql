-- Migration: Create sport_field_definitions table and seed data
-- ===============================================================
-- Purpose: Drive UI rendering, validation, and configurability for sport-specific fields
-- This prevents hardcoding all field logic in the frontend

-- Create the sport_field_definitions table
CREATE TABLE IF NOT EXISTS sport_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_code TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_group TEXT NOT NULL CHECK (field_group IN ('profile', 'equipment')),
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'int', 'numeric', 'bool', 'enum', 'multi_enum', 'time', 'object')),
  enum_values JSONB NULL,
  unit TEXT NULL,
  help_text TEXT NULL,
  is_optional BOOLEAN NOT NULL DEFAULT true,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT sport_field_definitions_unique_sport_field 
    UNIQUE(sport_code, field_key),
  CONSTRAINT sport_field_definitions_sport_code_format 
    CHECK (sport_code ~ '^[a-z0-9_]+$'),
  CONSTRAINT sport_field_definitions_field_key_format 
    CHECK (field_key ~ '^[a-z0-9_]+$')
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sport_field_definitions_sport 
  ON sport_field_definitions(sport_code);

CREATE INDEX IF NOT EXISTS idx_sport_field_definitions_sport_group 
  ON sport_field_definitions(sport_code, field_group);

CREATE INDEX IF NOT EXISTS idx_sport_field_definitions_enabled 
  ON sport_field_definitions(sport_code, is_enabled) 
  WHERE is_enabled = true;

-- Enable RLS (policies will be added in a later migration)
ALTER TABLE sport_field_definitions ENABLE ROW LEVEL SECURITY;

-- Add table comment for documentation
COMMENT ON TABLE sport_field_definitions IS 
  'Defines all available fields for each sport. Drives UI rendering and validation. Platform-managed, read-only for orgs.';

-- ============================================================================
-- SEED DATA: BASEBALL
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('baseball', 'primary_position', 'Primary Position', 'profile', 'enum', '["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]'::jsonb, 'The position this athlete plays most often', 10),
('baseball', 'secondary_positions', 'Secondary Position(s)', 'profile', 'multi_enum', '["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]'::jsonb, 'Other positions this athlete can play', 20),
('baseball', 'batting_hand', 'Batting Hand', 'profile', 'enum', '["left", "right", "switch"]'::jsonb, 'Which side of the plate the athlete bats from', 30),
('baseball', 'throwing_hand', 'Throwing Hand', 'profile', 'enum', '["left", "right"]'::jsonb, 'Which hand the athlete throws with', 40),
('baseball', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'How many years the athlete has played baseball', 50),
-- Equipment Fields
('baseball', 'glove_size_in', 'Glove Size (inches)', 'equipment', 'text', NULL, 'Glove size is measured in inches. Infield gloves are typically smaller than outfield gloves.', 100),
('baseball', 'glove_type', 'Glove Type', 'equipment', 'enum', '["infield", "outfield", "pitcher", "catcher", "first_base"]'::jsonb, 'Type of glove based on position', 110),
('baseball', 'bat_length_in', 'Bat Length (inches)', 'equipment', 'text', NULL, 'Bat length is usually marked on the bat. If unsure, leave blank.', 120),
('baseball', 'bat_weight_oz', 'Bat Weight (ounces)', 'equipment', 'text', NULL, 'Bat weight is usually marked on the bat. If unsure, leave blank.', 130),
('baseball', 'helmet_size', 'Helmet Size', 'equipment', 'text', NULL, 'Measure around the head just above the ears and eyebrows.', 140),
('baseball', 'cleat_size', 'Cleat Size', 'equipment', 'text', NULL, 'Standard shoe sizing', 150),
('baseball', 'belt_size_in', 'Belt Size (inches)', 'equipment', 'text', NULL, 'Waist measurement in inches', 160),
('baseball', 'pants_inseam_in', 'Pants Inseam (inches)', 'equipment', 'text', NULL, 'Inseam measurement for baseball pants', 170),
('baseball', 'pants_waist_in', 'Pants Waist (inches)', 'equipment', 'text', NULL, 'Waist measurement for baseball pants', 180),
('baseball', 'pants_fit', 'Pants Fit Preference', 'equipment', 'enum', '["relaxed", "regular", "tapered"]'::jsonb, 'Preferred fit style for baseball pants', 190),
('baseball', 'catchers_gear_size', 'Catcher''s Gear Size', 'equipment', 'text', NULL, 'Size for chest protector, shin guards, and helmet (if catcher)', 200);

-- ============================================================================
-- SEED DATA: BASKETBALL
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('basketball', 'primary_position', 'Primary Position', 'profile', 'enum', '["PG", "SG", "SF", "PF", "C"]'::jsonb, 'Point Guard, Shooting Guard, Small Forward, Power Forward, or Center', 10),
('basketball', 'secondary_position', 'Secondary Position', 'profile', 'enum', '["PG", "SG", "SF", "PF", "C"]'::jsonb, 'Additional position this athlete can play', 20),
('basketball', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'How many years the athlete has played basketball', 30),
('basketball', 'wingspan_in', 'Wingspan (inches)', 'profile', 'int', NULL, 'Fingertip to fingertip with arms extended (optional)', 40),
('basketball', 'vertical_jump_in', 'Vertical Jump (inches)', 'profile', 'int', NULL, 'Maximum vertical jump height (optional)', 50),
-- Equipment Fields
('basketball', 'jersey_size', 'Jersey Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL", "AXXL"]'::jsonb, 'Basketball jersey size', 100),
('basketball', 'shorts_size', 'Shorts Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL", "AXXL"]'::jsonb, 'Basketball shorts size', 110),
('basketball', 'shorts_length_pref', 'Shorts Length Preference', 'equipment', 'enum', '["short", "medium", "long"]'::jsonb, 'Preferred shorts length', 120),
('basketball', 'shoe_size', 'Shoe Size', 'equipment', 'text', NULL, 'Basketball shoe size (US sizing)', 130),
('basketball', 'shoe_width', 'Shoe Width', 'equipment', 'enum', '["narrow", "standard", "wide"]'::jsonb, 'If shoes feel tight on the sides, consider wide. If heel slips, consider narrow.', 140),
('basketball', 'compression_sleeve_size', 'Compression Sleeve Size', 'equipment', 'enum', '["S", "M", "L", "XL"]'::jsonb, 'Arm compression sleeve size (optional)', 150),
('basketball', 'headband_size', 'Headband Size', 'equipment', 'enum', '["OSFA", "S/M", "L/XL"]'::jsonb, 'Headband size (optional)', 160);

-- ============================================================================
-- SEED DATA: CHEERLEADING
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('cheerleading', 'role', 'Role', 'profile', 'enum', '["flyer", "base", "back_spot", "tumbler", "all_around"]'::jsonb, 'Primary role in stunts and routines', 10),
('cheerleading', 'tumbling_level', 'Tumbling Level', 'profile', 'enum', '["none", "back_walkover", "back_handspring", "tuck", "layout", "full"]'::jsonb, 'Highest tumbling skill mastered', 20),
('cheerleading', 'stunting_years', 'Stunting Experience (years)', 'profile', 'int', NULL, 'Years of stunting experience', 30),
('cheerleading', 'dance_years', 'Dance Experience (years)', 'profile', 'int', NULL, 'Years of dance experience', 40),
('cheerleading', 'competition_level', 'Competition Level', 'profile', 'enum', '["recreational", "school", "all_star"]'::jsonb, 'Current competition level', 50),
-- Equipment Fields
('cheerleading', 'uniform_top_size', 'Uniform Top Size', 'equipment', 'enum', '["YXS", "YS", "YM", "YL", "AXS", "AS", "AM", "AL", "AXL"]'::jsonb, 'Cheer uniform top size', 100),
('cheerleading', 'uniform_bottom_size', 'Uniform Bottom Size', 'equipment', 'enum', '["YXS", "YS", "YM", "YL", "AXS", "AS", "AM", "AL", "AXL"]'::jsonb, 'Cheer uniform bottom size', 110),
('cheerleading', 'bodysuit_size', 'Bodysuit Size', 'equipment', 'enum', '["YXS", "YS", "YM", "YL", "AXS", "AS", "AM", "AL", "AXL"]'::jsonb, 'Performance bodysuit size (if applicable)', 120),
('cheerleading', 'shoe_size', 'Cheer Shoe Size', 'equipment', 'text', NULL, 'Cheer shoe size (US sizing)', 130),
('cheerleading', 'bow_size', 'Bow Size', 'equipment', 'enum', '["small", "medium", "large"]'::jsonb, 'Hair bow size', 140),
('cheerleading', 'bloomers_size', 'Bloomers Size', 'equipment', 'enum', '["YXS", "YS", "YM", "YL", "AXS", "AS", "AM", "AL"]'::jsonb, 'Bloomers/briefs size', 150),
('cheerleading', 'warmup_jacket_size', 'Warmup Jacket Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup jacket size', 160),
('cheerleading', 'warmup_pants_size', 'Warmup Pants Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup pants size', 170);

-- ============================================================================
-- SEED DATA: CROSS-COUNTRY
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('cross_country', 'event_focus', 'Event Focus', 'profile', 'enum', '["5k", "longer"]'::jsonb, 'Primary race distance', 10),
('cross_country', 'pr_5k', 'Personal Record: 5K', 'profile', 'time', NULL, 'Best 5K time (mm:ss format)', 20),
('cross_country', 'pr_mile', 'Personal Record: Mile', 'profile', 'time', NULL, 'Best mile time (mm:ss format)', 30),
('cross_country', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years running cross country', 40),
('cross_country', 'preferred_terrain', 'Preferred Terrain', 'profile', 'enum', '["road", "trail", "mixed"]'::jsonb, 'Preferred running surface', 50),
-- Equipment Fields
('cross_country', 'singlet_size', 'Singlet Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Racing singlet size', 100),
('cross_country', 'shorts_size', 'Shorts Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Racing shorts size', 110),
('cross_country', 'shorts_inseam_pref_in', 'Shorts Inseam Preference', 'equipment', 'enum', '["2", "3", "5", "7"]'::jsonb, 'Preferred shorts inseam length in inches', 120),
('cross_country', 'racing_shoe_size', 'Racing Shoe Size', 'equipment', 'text', NULL, 'Racing spike/flat size (US sizing)', 130),
('cross_country', 'training_shoe_size', 'Training Shoe Size', 'equipment', 'text', NULL, 'Training shoe size (US sizing)', 140),
('cross_country', 'spike_length_pref', 'Spike Length Preference', 'equipment', 'enum', '["1/8\"", "1/4\"", "3/8\"", "none"]'::jsonb, 'Spike length depends on surface rules. If unsure, choose 1/4 inch.', 150),
('cross_country', 'sports_bra_size', 'Sports Bra Size', 'equipment', 'text', NULL, 'Sports bra size (if applicable)', 160),
('cross_country', 'warmup_jacket_size', 'Warmup Jacket Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup jacket size', 170),
('cross_country', 'warmup_pants_size', 'Warmup Pants Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup pants size', 180);

-- ============================================================================
-- SEED DATA: DANCE
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('dance', 'dance_styles', 'Dance Styles', 'profile', 'multi_enum', '["ballet", "jazz", "tap", "hip_hop", "contemporary", "lyrical", "modern", "ballroom"]'::jsonb, 'Styles this dancer has trained in', 10),
('dance', 'years_training_by_style', 'Years of Training (per style)', 'profile', 'object', NULL, 'Years of training in each style', 20),
('dance', 'pointe_certified', 'Pointe Certified', 'profile', 'bool', NULL, 'Has dancer been cleared for pointe work (ballet)', 30),
('dance', 'flexibility_level', 'Flexibility Level', 'profile', 'enum', '["basic", "intermediate", "advanced"]'::jsonb, 'Overall flexibility assessment', 40),
('dance', 'turns_ability', 'Turns/Pirouettes Ability', 'profile', 'enum', '["singles", "doubles", "triples_plus"]'::jsonb, 'Maximum consecutive turns', 50),
('dance', 'leap_jump_skills', 'Leap/Jump Skills', 'profile', 'text', NULL, 'Notable leap and jump skills', 60),
('dance', 'competition_experience_years', 'Competition Experience (years)', 'profile', 'int', NULL, 'Years competing in dance', 70),
-- Equipment Fields
('dance', 'leotard_size', 'Leotard Size', 'equipment', 'text', NULL, 'Leotard size (varies by brand)', 100),
('dance', 'costume_size', 'Costume Size', 'equipment', 'text', NULL, 'Performance costume size', 110),
('dance', 'tights_size', 'Tights Size', 'equipment', 'text', NULL, 'Dance tights size', 120),
('dance', 'ballet_shoe_size', 'Ballet Shoe Size', 'equipment', 'text', NULL, 'Ballet slipper size', 130),
('dance', 'pointe_shoe_size_brand', 'Pointe Shoe Size & Brand', 'equipment', 'text', NULL, 'Pointe shoe size and preferred brand (if applicable)', 140),
('dance', 'jazz_shoe_size', 'Jazz Shoe Size', 'equipment', 'text', NULL, 'Jazz shoe size', 150),
('dance', 'tap_shoe_size', 'Tap Shoe Size', 'equipment', 'text', NULL, 'Tap shoe size', 160),
('dance', 'sneaker_size', 'Dance Sneaker Size', 'equipment', 'text', NULL, 'Hip hop/sneaker size', 170),
('dance', 'warmup_jacket_size', 'Warmup Jacket Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup jacket size', 180),
('dance', 'leggings_size', 'Leggings Size', 'equipment', 'text', NULL, 'Dance leggings size', 190),
('dance', 'tutu_size', 'Tutu Size', 'equipment', 'text', NULL, 'Tutu size (if applicable)', 200);

-- Continue in next file due to length...
