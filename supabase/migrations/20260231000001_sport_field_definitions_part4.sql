-- Migration: Sport field definitions - Part 4 (Final Sports)
-- ============================================================
-- Final sports: track_field, volleyball, wrestling

-- ============================================================================
-- SEED DATA: TRACK & FIELD
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('track_field', 'event_category', 'Event Category', 'profile', 'enum', '["sprints", "distance", "jumps", "throws", "multi"]'::jsonb, 'Primary event category', 10),
('track_field', 'primary_events', 'Primary Event(s)', 'profile', 'multi_enum', '["100m", "200m", "400m", "800m", "1600m", "3200m", "100H", "110H", "300H", "400H", "4x100", "4x400", "HJ", "PV", "LJ", "TJ", "SP", "DT", "JT"]'::jsonb, 'Main competitive events', 20),
('track_field', 'secondary_events', 'Secondary Event(s)', 'profile', 'multi_enum', '["100m", "200m", "400m", "800m", "1600m", "3200m", "100H", "110H", "300H", "400H", "4x100", "4x400", "HJ", "PV", "LJ", "TJ", "SP", "DT", "JT"]'::jsonb, 'Additional events', 30),
('track_field', 'personal_records', 'Personal Records', 'profile', 'object', NULL, 'Best marks by event (optional)', 40),
('track_field', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years in track & field', 50),
-- Equipment Fields
('track_field', 'singlet_size', 'Singlet Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Racing singlet size', 100),
('track_field', 'competition_shorts_size', 'Competition Shorts Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Racing shorts size', 110),
('track_field', 'training_shorts_size', 'Training Shorts Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Training shorts size', 120),
('track_field', 'sports_bra_size', 'Sports Bra Size', 'equipment', 'text', NULL, 'Sports bra size (if applicable)', 130),
('track_field', 'sprint_spike_size', 'Sprint Spike Size', 'equipment', 'text', NULL, 'Sprint spike size (US sizing)', 140),
('track_field', 'distance_spike_size', 'Distance Spike Size', 'equipment', 'text', NULL, 'Distance spike size (US sizing)', 150),
('track_field', 'throwing_shoe_size', 'Throwing Shoe Size', 'equipment', 'text', NULL, 'Throwing shoe size (US sizing)', 160),
('track_field', 'jump_spike_size', 'Jump Spike Size', 'equipment', 'text', NULL, 'Jump spike size (US sizing)', 170),
('track_field', 'training_shoe_size', 'Training Shoe Size', 'equipment', 'text', NULL, 'Training shoe size (US sizing)', 180),
('track_field', 'spike_length_pref', 'Spike Length Preference', 'equipment', 'enum', '["1/8\"", "1/4\"", "3/8\"", "pyramid"]'::jsonb, 'Spike length depends on surface rules. If unsure, choose 1/4 inch.', 190),
('track_field', 'warmup_jacket_size', 'Warmup Jacket Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup jacket size', 200),
('track_field', 'warmup_pants_size', 'Warmup Pants Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup pants size', 210),
('track_field', 'event_specific_notes', 'Event-Specific Notes', 'equipment', 'text', NULL, 'Additional equipment notes for specific events', 220);

-- ============================================================================
-- SEED DATA: VOLLEYBALL
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('volleyball', 'primary_position', 'Primary Position', 'profile', 'enum', '["S", "OH", "OPP_RS", "MB_MH", "L_DS"]'::jsonb, 'Setter, Outside Hitter, Opposite/Right Side, Middle Blocker/Middle Hitter, or Libero/Defensive Specialist', 10),
('volleyball', 'secondary_position', 'Secondary Position', 'profile', 'enum', '["S", "OH", "OPP_RS", "MB_MH", "L_DS"]'::jsonb, 'Additional position', 20),
('volleyball', 'dominant_hand', 'Dominant Hand', 'profile', 'enum', '["left", "right", "ambidextrous"]'::jsonb, 'Dominant hitting hand', 30),
('volleyball', 'vertical_jump', 'Vertical Jump', 'profile', 'object', NULL, 'Standing and approach jump heights (optional)', 40),
('volleyball', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years playing volleyball', 50),
('volleyball', 'format_preference', 'Indoor/Beach/Both', 'profile', 'enum', '["indoor", "beach", "both"]'::jsonb, 'Preferred volleyball format', 60),
-- Equipment Fields
('volleyball', 'jersey_size', 'Jersey Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL", "AXXL"]'::jsonb, 'Volleyball jersey size', 100),
('volleyball', 'spandex_size', 'Spandex Size', 'equipment', 'enum', '["YXS", "YS", "YM", "YL", "AXS", "AS", "AM", "AL"]'::jsonb, 'Spandex shorts size', 110),
('volleyball', 'spandex_length_pref', 'Spandex Length Preference', 'equipment', 'enum', '["2.5\"", "3.5\"", "4\"", "5\""]'::jsonb, 'Preferred spandex inseam length', 120),
('volleyball', 'knee_pad_size', 'Knee Pad Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL"]'::jsonb, 'Knee pad size', 130),
('volleyball', 'shoe_size', 'Volleyball Shoe Size', 'equipment', 'text', NULL, 'Volleyball shoe size (US sizing)', 140),
('volleyball', 'shoe_width', 'Shoe Width', 'equipment', 'enum', '["narrow", "standard", "wide"]'::jsonb, 'If shoes feel tight on the sides, consider wide. If heel slips, consider narrow.', 150),
('volleyball', 'ankle_brace_size', 'Ankle Brace Size', 'equipment', 'enum', '["S", "M", "L", "XL"]'::jsonb, 'Ankle brace size (if used)', 160),
('volleyball', 'warmup_jacket_size', 'Warmup Jacket Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup jacket size', 170),
('volleyball', 'warmup_pants_size', 'Warmup Pants Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup pants size', 180),
('volleyball', 'libero_jersey_size', 'Libero Jersey Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Libero-specific jersey size (if libero)', 190);

-- ============================================================================
-- SEED DATA: WRESTLING
-- ============================================================================
INSERT INTO sport_field_definitions (sport_code, field_key, field_label, field_group, field_type, enum_values, help_text, sort_order) VALUES
-- Profile Fields
('wrestling', 'weight_class', 'Weight Class', 'profile', 'text', NULL, 'Current and goal weight class', 10),
('wrestling', 'competition_style', 'Competition Style', 'profile', 'enum', '["folkstyle", "freestyle", "greco_roman"]'::jsonb, 'Primary wrestling style', 20),
('wrestling', 'preferred_stance', 'Preferred Stance', 'profile', 'enum', '["right", "left", "square"]'::jsonb, 'Preferred wrestling stance', 30),
('wrestling', 'years_experience', 'Years of Experience', 'profile', 'int', NULL, 'Years wrestling', 40),
('wrestling', 'varsity_jv_status', 'Varsity/JV Status', 'profile', 'enum', '["varsity", "jv", "club"]'::jsonb, 'Current competition level', 50),
-- Equipment Fields
('wrestling', 'singlet_size', 'Singlet Size', 'equipment', 'enum', '["YXS", "YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Wrestling singlet size', 100),
('wrestling', 'compression_shirt_size', 'Compression Shirt Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Compression shirt size (if worn under singlet)', 110),
('wrestling', 'practice_shorts_size', 'Practice Shorts Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Practice shorts size', 120),
('wrestling', 'headgear_size', 'Headgear Size', 'equipment', 'enum', '["youth", "adult"]'::jsonb, 'Wrestling headgear size', 130),
('wrestling', 'wrestling_shoe_size', 'Wrestling Shoe Size', 'equipment', 'text', NULL, 'Wrestling shoe size (US sizing)', 140),
('wrestling', 'knee_pad_size', 'Knee Pad Size', 'equipment', 'enum', '["S", "M", "L", "XL"]'::jsonb, 'Knee pad size (if used)', 150),
('wrestling', 'mouthguard_size', 'Mouthguard Size', 'equipment', 'enum', '["youth", "adult"]'::jsonb, 'Mouthguard size', 160),
('wrestling', 'warmup_jacket_size', 'Warmup Jacket Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup jacket size', 170),
('wrestling', 'warmup_pants_size', 'Warmup Pants Size', 'equipment', 'enum', '["YS", "YM", "YL", "AS", "AM", "AL", "AXL"]'::jsonb, 'Warmup pants size', 180),
('wrestling', 'weigh_in_singlet_size', 'Weigh-In Singlet Size', 'equipment', 'enum', '["YXS", "YS", "YM", "YL", "AS", "AM", "AL"]'::jsonb, 'Lightweight singlet for weigh-ins', 190);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify all sports have been seeded
-- Expected result: 20 sports with varying field counts

DO $$
DECLARE
  sport_count INT;
  field_count INT;
  rec RECORD;
BEGIN
  SELECT COUNT(DISTINCT sport_code) INTO sport_count FROM sport_field_definitions;
  SELECT COUNT(*) INTO field_count FROM sport_field_definitions;
  
  RAISE NOTICE 'Sport Field Definitions Seeded:';
  RAISE NOTICE '  Total Sports: %', sport_count;
  RAISE NOTICE '  Total Fields: %', field_count;
  
  IF sport_count <> 20 THEN
    RAISE WARNING 'Expected 20 sports, found %', sport_count;
  END IF;
  
  -- Show field counts per sport
  RAISE NOTICE 'Fields per sport:';
  FOR rec IN 
    SELECT sport_code, COUNT(*) as cnt 
    FROM sport_field_definitions 
    GROUP BY sport_code 
    ORDER BY sport_code
  LOOP
    RAISE NOTICE '  %: % fields', rec.sport_code, rec.cnt;
  END LOOP;
END $$;
