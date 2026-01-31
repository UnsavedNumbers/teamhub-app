-- Migration: Sport field definitions - Part 2 (Remaining Sports)
-- ================================================================
-- Continuation of sport_field_definitions seed data

-- ============================================================================
-- SEED DATA: DIVING
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('diving', 'diving_level', 'Diving Level', 'profile', 'enum', '["beginner", "intermediate", "advanced", "competitive"]'::jsonb, 'Current skill level', 10),
('diving', 'board_preference', 'Board Preference', 'profile', 'enum', '["1m", "3m", "platform"]'::jsonb, 'Preferred diving board/platform', 20),
('diving', 'dive_list', 'Dive List', 'profile', 'text', NULL, 'List of dives in repertoire (optional)', 30),
('diving', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years diving', 40),
('diving', 'gymnastics_background', 'Gymnastics Background', 'profile', 'object', NULL, 'Previous gymnastics experience (yes/no + years)', 50),
-- Equipment Fields
('diving', 'competition_suit_size', 'Competition Suit Size', 'equipment', 'text', NULL, 'Competition swimsuit size', 100),
('diving', 'practice_suit_size', 'Practice Suit Size', 'equipment', 'text', NULL, 'Practice swimsuit size', 110),
('diving', 'warmup_parka_size', 'Warmup Parka Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup parka size', 120),
('diving', 'chamois_size', 'Chamois Size', 'equipment', 'enum', '["S", "M", "L"]'::jsonb, 'Chamois/shammy size', 130),
('diving', 'team_tshirt_size', 'Team T-Shirt Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL", "AXXL"]'::jsonb, 'Team t-shirt size', 140);

-- ============================================================================
-- SEED DATA: FIELD HOCKEY
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('field_hockey', 'primary_position', 'Primary Position', 'profile', 'enum', '["GK", "FB", "HB", "MF", "FW"]'::jsonb, 'Goalkeeper, Fullback, Halfback, Midfielder, or Forward', 10),
('field_hockey', 'secondary_position', 'Secondary Position', 'profile', 'enum', '["GK", "FB", "HB", "MF", "FW"]'::jsonb, 'Additional position', 20),
('field_hockey', 'dominant_hand', 'Dominant Hand', 'profile', 'enum', '["left", "right", "ambidextrous"]'::jsonb, 'Dominant hand (impacts stick selection)', 30),
('field_hockey', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years playing field hockey', 40),
('field_hockey', 'indoor_outdoor_preference', 'Indoor/Outdoor Preference', 'profile', 'enum', '["indoor", "outdoor", "both"]'::jsonb, 'Preferred playing surface', 50),
-- Equipment Fields
('field_hockey', 'stick_length_in', 'Stick Length (inches)', 'equipment', 'text', NULL, 'Field hockey stick length', 100),
('field_hockey', 'jersey_size', 'Jersey Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Jersey size', 110),
('field_hockey', 'skirt_shorts_size', 'Skirt/Shorts Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Skirt or shorts size', 120),
('field_hockey', 'shin_guard_size', 'Shin Guard Size', 'equipment', 'text', NULL, 'Shin guards should cover from just above the ankle to just below the knee.', 130),
('field_hockey', 'cleat_size', 'Cleat Size', 'equipment', 'text', NULL, 'Cleat size (US sizing)', 140),
('field_hockey', 'turf_shoe_size', 'Turf Shoe Size', 'equipment', 'text', NULL, 'Turf shoe size (US sizing)', 150),
('field_hockey', 'mouthguard_size', 'Mouthguard Size', 'equipment', 'enum', '["youth", "adult"]'::jsonb, 'Mouthguard size', 160),
('field_hockey', 'goalie_gear_sizes', 'Goalie Gear Sizes', 'equipment', 'text', NULL, 'Goalie equipment sizes (if goalkeeper)', 170);

-- ============================================================================
-- SEED DATA: FLAG FOOTBALL
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('flag_football', 'primary_position', 'Primary Position', 'profile', 'enum', '["QB", "RB", "WR", "C", "LB", "CB", "S"]'::jsonb, 'Quarterback, Running Back, Wide Receiver, Center, Linebacker, Cornerback, or Safety', 10),
('flag_football', 'secondary_position', 'Secondary Position', 'profile', 'enum', '["QB", "RB", "WR", "C", "LB", "CB", "S"]'::jsonb, 'Additional position', 20),
('flag_football', 'throwing_hand', 'Throwing Hand', 'profile', 'enum', '["left", "right"]'::jsonb, 'Throwing hand', 30),
('flag_football', 'catching_hand_preference', 'Catching Hand Preference', 'profile', 'enum', '["left", "right", "either"]'::jsonb, 'Preferred catching hand', 40),
('flag_football', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years playing flag football', 50),
-- Equipment Fields
('flag_football', 'jersey_size', 'Jersey Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL", "AXXL"]'::jsonb, 'Jersey size', 100),
('flag_football', 'shorts_size', 'Shorts Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Shorts size', 110),
('flag_football', 'flag_belt_size', 'Flag Belt Size', 'equipment', 'enum', '["youth", "adult"]'::jsonb, 'Flag belt size', 120),
('flag_football', 'mouthguard_size', 'Mouthguard Size', 'equipment', 'enum', '["youth", "adult"]'::jsonb, 'Mouthguard size (optional)', 130),
('flag_football', 'cleat_size', 'Cleat Size', 'equipment', 'text', NULL, 'Cleat size (US sizing)', 140);

-- ============================================================================
-- SEED DATA: FOOTBALL
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('football', 'primary_position', 'Primary Position', 'profile', 'enum', '["QB", "RB", "FB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P"]'::jsonb, 'Primary position on field', 10),
('football', 'secondary_position', 'Secondary Position', 'profile', 'enum', '["QB", "RB", "FB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P"]'::jsonb, 'Additional position', 20),
('football', 'throwing_hand', 'Throwing Hand', 'profile', 'enum', '["left", "right"]'::jsonb, 'Throwing hand', 30),
('football', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years playing football', 40),
('football', 'position_group', 'Position Group', 'profile', 'enum', '["offense", "defense", "special_teams", "both"]'::jsonb, 'Primary position group', 50),
-- Equipment Fields
('football', 'helmet_size', 'Helmet Size', 'equipment', 'text', NULL, 'Measure around the head just above the ears and eyebrows.', 100),
('football', 'shoulder_pad_size', 'Shoulder Pad Size', 'equipment', 'text', NULL, 'Use chest measurement and weight. If between sizes, choose the larger size.', 110),
('football', 'jersey_size', 'Jersey Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL", "AXXL", "AXXXL"]'::jsonb, 'Jersey size', 120),
('football', 'pants_size', 'Pants Size', 'equipment', 'text', NULL, 'Football pants size (waist measurement)', 130),
('football', 'cleat_size', 'Cleat Size', 'equipment', 'text', NULL, 'Cleat size (US sizing)', 140),
('football', 'glove_size', 'Glove Size', 'equipment', 'enum', '["S", "M", "L", "XL", "XXL"]'::jsonb, 'Receiver/lineman glove size', 150),
('football', 'girdle_size', 'Girdle Size', 'equipment', 'text', NULL, 'Padded girdle size', 160),
('football', 'mouthguard_size', 'Mouthguard Size', 'equipment', 'enum', '["youth", "adult"]'::jsonb, 'Mouthguard size', 170);

-- ============================================================================
-- SEED DATA: GOLF
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('golf', 'dominant_hand', 'Dominant Hand', 'profile', 'enum', '["left", "right"]'::jsonb, 'Determines club orientation', 10),
('golf', 'handicap', 'Handicap', 'profile', 'numeric', NULL, 'Current golf handicap (optional)', 20),
('golf', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years playing golf', 30),
('golf', 'competitive_level', 'Competitive Level', 'profile', 'enum', '["recreational", "high_school", "club", "tournament"]'::jsonb, 'Current competition level', 40),
-- Equipment Fields
('golf', 'club_set_type', 'Club Set Type', 'equipment', 'enum', '["junior", "teen", "adult"]'::jsonb, 'Club set sizing category', 100),
('golf', 'driver_length_in', 'Driver Length (inches)', 'equipment', 'text', NULL, 'Preferred driver length', 110),
('golf', 'polo_size', 'Polo Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Golf polo size', 120),
('golf', 'pants_shorts_size', 'Pants/Shorts Size', 'equipment', 'text', NULL, 'Golf pants or shorts size', 130),
('golf', 'shoe_size', 'Golf Shoe Size', 'equipment', 'text', NULL, 'Golf shoe size (US sizing)', 140),
('golf', 'glove_size', 'Golf Glove Size', 'equipment', 'enum', '["S", "M", "ML", "L", "XL"]'::jsonb, 'Golf glove size', 150),
('golf', 'hat_size', 'Hat Size', 'equipment', 'enum', '["S/M", "L/XL", "OSFA"]'::jsonb, 'Golf hat/visor size', 160);

-- ============================================================================
-- SEED DATA: GYMNASTICS
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('gymnastics', 'level', 'Gymnastics Level', 'profile', 'enum', '["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "elite"]'::jsonb, 'Current USAG level or equivalent', 10),
('gymnastics', 'specialty_events', 'Specialty Event(s)', 'profile', 'multi_enum', '["vault", "bars", "beam", "floor"]'::jsonb, 'Strongest events', 20),
('gymnastics', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years in gymnastics', 30),
('gymnastics', 'competitive_team', 'Competitive Team', 'profile', 'bool', NULL, 'Currently on competitive team', 40),
-- Equipment Fields
('gymnastics', 'leotard_size', 'Leotard Size', 'equipment', 'text', NULL, 'Competition leotard size', 100),
('gymnastics', 'practice_leo_size', 'Practice Leo Size', 'equipment', 'text', NULL, 'Practice leotard size', 110),
('gymnastics', 'shorts_size', 'Shorts Size', 'equipment', 'enum', '["YXS", "YS", "YM", "YL", "AXS", "AS", "AM", "AL"]'::jsonb, 'Practice shorts size', 120),
('gymnastics', 'warmup_jacket_size', 'Warmup Jacket Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup jacket size', 130),
('gymnastics', 'warmup_pants_size', 'Warmup Pants Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup pants size', 140),
('gymnastics', 'grip_size', 'Grip Size', 'equipment', 'enum', '["00", "0", "1", "2", "3", "4", "5"]'::jsonb, 'Bar grip size (if applicable)', 150),
('gymnastics', 'team_tshirt_size', 'Team T-Shirt Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Team t-shirt size', 160);

-- Continue in next file...
