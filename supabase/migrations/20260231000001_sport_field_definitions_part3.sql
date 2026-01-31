-- Migration: Sport field definitions - Part 3 (Remaining Sports)
-- ================================================================
-- Continuation of sport_field_definitions seed data

-- ============================================================================
-- SEED DATA: ICE HOCKEY
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('ice_hockey', 'primary_position', 'Primary Position', 'profile', 'enum', '["C", "LW", "RW", "LD", "RD", "G"]'::jsonb, 'Center, Left Wing, Right Wing, Left Defense, Right Defense, or Goalie', 10),
('ice_hockey', 'secondary_position', 'Secondary Position', 'profile', 'enum', '["C", "LW", "RW", "LD", "RD", "G"]'::jsonb, 'Additional position', 20),
('ice_hockey', 'shooting_hand', 'Shooting Hand', 'profile', 'enum', '["left", "right"]'::jsonb, 'Stick shooting side', 30),
('ice_hockey', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years playing ice hockey', 40),
('ice_hockey', 'skating_level', 'Skating Level', 'profile', 'enum', '["beginner", "intermediate", "advanced", "elite"]'::jsonb, 'Overall skating ability', 50),
-- Equipment Fields
('ice_hockey', 'skate_size', 'Skate Size', 'equipment', 'text', NULL, 'Skate sizing differs from shoe sizing. Use current skate size if known.', 100),
('ice_hockey', 'stick_length_in', 'Stick Length (inches)', 'equipment', 'text', NULL, 'Hockey stick length', 110),
('ice_hockey', 'stick_flex', 'Stick Flex', 'equipment', 'text', NULL, 'Stick flex rating', 120),
('ice_hockey', 'helmet_size', 'Helmet Size', 'equipment', 'text', NULL, 'Hockey helmet size with cage/visor', 130),
('ice_hockey', 'shoulder_pad_size', 'Shoulder Pad Size', 'equipment', 'text', NULL, 'Shoulder pad size', 140),
('ice_hockey', 'elbow_pad_size', 'Elbow Pad Size', 'equipment', 'text', NULL, 'Elbow pad size', 150),
('ice_hockey', 'glove_size', 'Glove Size', 'equipment', 'text', NULL, 'Hockey glove size', 160),
('ice_hockey', 'pants_size', 'Pants Size', 'equipment', 'text', NULL, 'Hockey pants size', 170),
('ice_hockey', 'shin_guard_size', 'Shin Guard Size', 'equipment', 'text', NULL, 'Shin guard size', 180),
('ice_hockey', 'jersey_size', 'Jersey Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL", "AXXL"]'::jsonb, 'Hockey jersey size', 190),
('ice_hockey', 'goalie_gear_sizes', 'Goalie Gear Sizes', 'equipment', 'text', NULL, 'Goalie-specific equipment sizes (if goalie)', 200);

-- ============================================================================
-- SEED DATA: LACROSSE
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('lacrosse', 'primary_position', 'Primary Position', 'profile', 'enum', '["A", "M", "D", "G", "FOGO"]'::jsonb, 'Attack, Midfield, Defense, Goalie, or Face-Off Get-Off', 10),
('lacrosse', 'secondary_position', 'Secondary Position', 'profile', 'enum', '["A", "M", "D", "G"]'::jsonb, 'Additional position', 20),
('lacrosse', 'dominant_hand', 'Dominant Hand', 'profile', 'enum', '["left", "right", "ambidextrous"]'::jsonb, 'Dominant hand for stick handling', 30),
('lacrosse', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years playing lacrosse', 40),
('lacrosse', 'field_box_preference', 'Field/Box Preference', 'profile', 'enum', '["field", "box", "both"]'::jsonb, 'Field lacrosse, box lacrosse, or both', 50),
-- Equipment Fields
('lacrosse', 'stick_length', 'Stick Length', 'equipment', 'enum', '["short", "long", "goalie"]'::jsonb, 'Stick type based on position', 100),
('lacrosse', 'helmet_size', 'Helmet Size', 'equipment', 'text', NULL, 'Lacrosse helmet size', 110),
('lacrosse', 'shoulder_pad_size', 'Shoulder Pad Size', 'equipment', 'text', NULL, 'Shoulder pad size', 120),
('lacrosse', 'arm_pad_size', 'Arm Pad Size', 'equipment', 'text', NULL, 'Arm pad size', 130),
('lacrosse', 'glove_size', 'Glove Size', 'equipment', 'text', NULL, 'Lacrosse glove size', 140),
('lacrosse', 'jersey_size', 'Jersey Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL", "AXXL"]'::jsonb, 'Jersey size', 150),
('lacrosse', 'shorts_size', 'Shorts Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Shorts size', 160),
('lacrosse', 'cleat_size', 'Cleat Size', 'equipment', 'text', NULL, 'Cleat size (US sizing)', 170),
('lacrosse', 'mouthguard_size', 'Mouthguard Size', 'equipment', 'enum', '["youth", "adult"]'::jsonb, 'Mouthguard size', 180),
('lacrosse', 'goalie_gear_sizes', 'Goalie Gear Sizes', 'equipment', 'text', NULL, 'Goalie-specific equipment sizes (if goalie)', 190);

-- ============================================================================
-- SEED DATA: SOCCER
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('soccer', 'primary_position', 'Primary Position', 'profile', 'enum', '["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST"]'::jsonb, 'Primary position on field', 10),
('soccer', 'secondary_position', 'Secondary Position', 'profile', 'enum', '["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST"]'::jsonb, 'Additional position', 20),
('soccer', 'dominant_foot', 'Dominant Foot', 'profile', 'enum', '["left", "right", "both"]'::jsonb, 'Preferred kicking foot', 30),
('soccer', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years playing soccer', 40),
('soccer', 'club_team', 'Club Team', 'profile', 'text', NULL, 'Current club team (if applicable)', 50),
-- Equipment Fields
('soccer', 'jersey_size', 'Jersey Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL", "AXXL"]'::jsonb, 'Jersey size', 100),
('soccer', 'shorts_size', 'Shorts Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Shorts size', 110),
('soccer', 'sock_size', 'Sock Size', 'equipment', 'enum', '["Y", "S", "M", "L", "XL"]'::jsonb, 'Soccer sock size', 120),
('soccer', 'cleat_size', 'Cleat Size', 'equipment', 'text', NULL, 'Soccer cleat size (US sizing)', 130),
('soccer', 'shin_guard_size', 'Shin Guard Size', 'equipment', 'text', NULL, 'Shin guards should cover from just above the ankle to just below the knee.', 140),
('soccer', 'goalie_glove_size', 'Goalie Glove Size', 'equipment', 'text', NULL, 'Goalkeeper glove size (if goalkeeper)', 150),
('soccer', 'warmup_jacket_size', 'Warmup Jacket Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup jacket size', 160),
('soccer', 'warmup_pants_size', 'Warmup Pants Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup pants size', 170);

-- ============================================================================
-- SEED DATA: SOFTBALL
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('softball', 'primary_position', 'Primary Position', 'profile', 'enum', '["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]'::jsonb, 'Primary position on field', 10),
('softball', 'secondary_positions', 'Secondary Position(s)', 'profile', 'multi_enum', '["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]'::jsonb, 'Other positions this athlete can play', 20),
('softball', 'batting_hand', 'Batting Hand', 'profile', 'enum', '["left", "right", "switch"]'::jsonb, 'Which side of the plate the athlete bats from', 30),
('softball', 'throwing_hand', 'Throwing Hand', 'profile', 'enum', '["left", "right"]'::jsonb, 'Which hand the athlete throws with', 40),
('softball', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years playing softball', 50),
('softball', 'fastpitch_slowpitch', 'Fastpitch/Slowpitch', 'profile', 'enum', '["fastpitch", "slowpitch", "both"]'::jsonb, 'Type of softball played', 60),
-- Equipment Fields
('softball', 'glove_size_in', 'Glove Size (inches)', 'equipment', 'text', NULL, 'Glove size is measured in inches. Infield gloves are typically smaller than outfield gloves.', 100),
('softball', 'glove_type', 'Glove Type', 'equipment', 'enum', '["infield", "outfield", "pitcher", "catcher", "first_base"]'::jsonb, 'Type of glove based on position', 110),
('softball', 'bat_length_in', 'Bat Length (inches)', 'equipment', 'text', NULL, 'Bat length is usually marked on the bat. If unsure, leave blank.', 120),
('softball', 'bat_weight_oz', 'Bat Weight (ounces)', 'equipment', 'text', NULL, 'Bat weight is usually marked on the bat. If unsure, leave blank.', 130),
('softball', 'helmet_size', 'Helmet Size', 'equipment', 'text', NULL, 'Measure around the head just above the ears and eyebrows.', 140),
('softball', 'cleat_size', 'Cleat Size', 'equipment', 'text', NULL, 'Standard shoe sizing', 150),
('softball', 'belt_size_in', 'Belt Size (inches)', 'equipment', 'text', NULL, 'Waist measurement in inches', 160),
('softball', 'pants_inseam_in', 'Pants Inseam (inches)', 'equipment', 'text', NULL, 'Inseam measurement for softball pants', 170),
('softball', 'pants_waist_in', 'Pants Waist (inches)', 'equipment', 'text', NULL, 'Waist measurement for softball pants', 180),
('softball', 'pants_fit', 'Pants Fit Preference', 'equipment', 'enum', '["relaxed", "regular", "tapered"]'::jsonb, 'Preferred fit style for softball pants', 190),
('softball', 'catchers_gear_size', 'Catcher''s Gear Size', 'equipment', 'text', NULL, 'Size for chest protector, shin guards, and helmet (if catcher)', 200);

-- ============================================================================
-- SEED DATA: SWIMMING
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('swimming', 'primary_strokes', 'Primary Stroke(s)', 'profile', 'multi_enum', '["freestyle", "backstroke", "breaststroke", "butterfly", "IM"]'::jsonb, 'Best competitive strokes', 10),
('swimming', 'secondary_strokes', 'Secondary Stroke(s)', 'profile', 'multi_enum', '["freestyle", "backstroke", "breaststroke", "butterfly", "IM"]'::jsonb, 'Additional competitive strokes', 20),
('swimming', 'primary_distances', 'Primary Event Distance(s)', 'profile', 'multi_enum', '["50", "100", "200", "500", "1000", "1650"]'::jsonb, 'Preferred race distances (yards/meters)', 30),
('swimming', 'personal_records', 'Personal Records', 'profile', 'object', NULL, 'Best times by event (optional)', 40),
('swimming', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years swimming competitively', 50),
('swimming', 'club_team', 'Club Team', 'profile', 'text', NULL, 'Current club team (if applicable)', 60),
-- Equipment Fields
('swimming', 'competition_suit_size', 'Competition Suit Size', 'equipment', 'text', NULL, 'Tech suit or competition suit size', 100),
('swimming', 'practice_suit_size', 'Practice Suit Size', 'equipment', 'text', NULL, 'Practice swimsuit size', 110),
('swimming', 'drag_suit_size', 'Drag Suit Size', 'equipment', 'text', NULL, 'Drag suit size (if used)', 120),
('swimming', 'jammer_size', 'Jammer Size', 'equipment', 'text', NULL, 'Jammer/brief size (if applicable)', 130),
('swimming', 'cap_size', 'Cap Size', 'equipment', 'enum', '["junior", "standard"]'::jsonb, 'Swim cap size', 140),
('swimming', 'cap_material_pref', 'Cap Material Preference', 'equipment', 'enum', '["silicone", "latex", "lycra"]'::jsonb, 'Preferred cap material', 150),
('swimming', 'goggle_type_pref', 'Goggle Type Preference', 'equipment', 'enum', '["racing", "training", "mirrored", "clear"]'::jsonb, 'Preferred goggle type', 160),
('swimming', 'warmup_parka_size', 'Warmup Parka Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup parka size', 170),
('swimming', 'team_tshirt_size', 'Team T-Shirt Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL", "AXXL"]'::jsonb, 'Team t-shirt size', 180),
('swimming', 'team_shorts_size', 'Team Shorts Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Team shorts size', 190),
('swimming', 'fins_size', 'Fins Size', 'equipment', 'text', NULL, 'Training fins size', 200),
('swimming', 'paddle_size', 'Paddle Size', 'equipment', 'enum', '["XS", "S", "M", "L", "XL"]'::jsonb, 'Hand paddle size', 210);

-- ============================================================================
-- SEED DATA: TENNIS
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('tennis', 'playing_hand', 'Playing Hand', 'profile', 'enum', '["left", "right"]'::jsonb, 'Dominant playing hand', 10),
('tennis', 'backhand_style', 'Backhand Style', 'profile', 'enum', '["one_handed", "two_handed"]'::jsonb, 'Backhand technique', 20),
('tennis', 'usta_utr_rating', 'USTA/UTR Rating', 'profile', 'text', NULL, 'Current rating (optional)', 30),
('tennis', 'singles_doubles_preference', 'Singles/Doubles Preference', 'profile', 'enum', '["singles", "doubles", "both"]'::jsonb, 'Preferred format', 40),
('tennis', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years playing tennis', 50),
('tennis', 'surface_preference', 'Surface Preference', 'profile', 'enum', '["hard", "clay", "grass", "mixed"]'::jsonb, 'Preferred court surface', 60),
-- Equipment Fields
('tennis', 'racquet_grip_size', 'Racquet Grip Size', 'equipment', 'enum', '["0", "1", "2", "3", "4", "5"]'::jsonb, 'Grip size can be measured by the space between fingertips and palm when holding the racquet.', 100),
('tennis', 'racquet_head_size_pref', 'Racquet Head Size Preference', 'equipment', 'enum', '["midsize", "midplus", "oversize"]'::jsonb, 'Preferred racquet head size', 110),
('tennis', 'string_tension_lbs', 'String Tension (lbs)', 'equipment', 'text', NULL, 'Preferred string tension', 120),
('tennis', 'shirt_size', 'Shirt Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Tennis shirt size', 130),
('tennis', 'shorts_size', 'Shorts Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Tennis shorts size', 140),
('tennis', 'skirt_dress_size', 'Skirt/Dress Size', 'equipment', 'text', NULL, 'Tennis skirt or dress size (if applicable)', 150),
('tennis', 'shoe_size', 'Tennis Shoe Size', 'equipment', 'text', NULL, 'Tennis shoe size (US sizing)', 160),
('tennis', 'shoe_width', 'Shoe Width', 'equipment', 'enum', '["narrow", "standard", "wide"]'::jsonb, 'If shoes feel tight on the sides, consider wide. If heel slips, consider narrow.', 170),
('tennis', 'wristband_size', 'Wristband Size', 'equipment', 'enum', '["OSFA"]'::jsonb, 'Wristband size', 180),
('tennis', 'headband_size', 'Headband Size', 'equipment', 'enum', '["OSFA"]'::jsonb, 'Headband size', 190),
('tennis', 'hat_visor_size', 'Hat/Visor Size', 'equipment', 'enum', '["S/M", "L/XL", "OSFA"]'::jsonb, 'Hat or visor size', 200),
('tennis', 'warmup_jacket_size', 'Warmup Jacket Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup jacket size', 210),
('tennis', 'warmup_pants_size', 'Warmup Pants Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup pants size', 220);

-- Continue in next file...
