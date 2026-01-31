-- Migration: Add universal athlete profile fields to athletes table
-- =================================================================
-- Purpose: Add normalized universal fields (height, weight, sizes, etc.) to athletes table
-- These fields are common across all sports and frequently queried

-- Add height field (stored in centimeters for consistency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'athletes' 
    AND column_name = 'height_cm'
  ) THEN
    ALTER TABLE athletes ADD COLUMN height_cm INT NULL;
    RAISE NOTICE 'Added column: height_cm';
  END IF;
END $$;

-- Add weight field (stored in kilograms for consistency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'athletes' 
    AND column_name = 'weight_kg'
  ) THEN
    ALTER TABLE athletes ADD COLUMN weight_kg NUMERIC(6,2) NULL;
    RAISE NOTICE 'Added column: weight_kg';
  END IF;
END $$;

-- Add shoe size fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'athletes' 
    AND column_name = 'shoe_size_value'
  ) THEN
    ALTER TABLE athletes ADD COLUMN shoe_size_value NUMERIC(4,1) NULL;
    RAISE NOTICE 'Added column: shoe_size_value';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'athletes' 
    AND column_name = 'shoe_size_system'
  ) THEN
    ALTER TABLE athletes ADD COLUMN shoe_size_system TEXT NULL;
    RAISE NOTICE 'Added column: shoe_size_system';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'athletes' 
    AND column_name = 'shoe_width'
  ) THEN
    ALTER TABLE athletes ADD COLUMN shoe_width TEXT NULL;
    RAISE NOTICE 'Added column: shoe_width';
  END IF;
END $$;

-- Add clothing size fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'athletes' 
    AND column_name = 'tshirt_size'
  ) THEN
    ALTER TABLE athletes ADD COLUMN tshirt_size TEXT NULL;
    RAISE NOTICE 'Added column: tshirt_size';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'athletes' 
    AND column_name = 'shorts_size'
  ) THEN
    ALTER TABLE athletes ADD COLUMN shorts_size TEXT NULL;
    RAISE NOTICE 'Added column: shorts_size';
  END IF;
END $$;

-- Add dominant hand field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'athletes' 
    AND column_name = 'dominant_hand'
  ) THEN
    ALTER TABLE athletes ADD COLUMN dominant_hand TEXT NULL;
    RAISE NOTICE 'Added column: dominant_hand';
  END IF;
END $$;

-- Add emergency contact JSONB field (new structure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'athletes' 
    AND column_name = 'emergency_contact'
  ) THEN
    ALTER TABLE athletes ADD COLUMN emergency_contact JSONB NULL;
    RAISE NOTICE 'Added column: emergency_contact';
  END IF;
END $$;

-- Add constraints for data validation
DO $$
BEGIN
  -- Height constraint (reasonable range: 50cm to 250cm)
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'athletes_height_cm_range'
  ) THEN
    ALTER TABLE athletes 
    ADD CONSTRAINT athletes_height_cm_range 
    CHECK (height_cm IS NULL OR (height_cm >= 50 AND height_cm <= 250));
    RAISE NOTICE 'Added constraint: athletes_height_cm_range';
  END IF;
  
  -- Weight constraint (reasonable range: 5kg to 300kg)
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'athletes_weight_kg_range'
  ) THEN
    ALTER TABLE athletes 
    ADD CONSTRAINT athletes_weight_kg_range 
    CHECK (weight_kg IS NULL OR (weight_kg >= 5 AND weight_kg <= 300));
    RAISE NOTICE 'Added constraint: athletes_weight_kg_range';
  END IF;
  
  -- Shoe size system constraint
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'athletes_shoe_size_system_valid'
  ) THEN
    ALTER TABLE athletes 
    ADD CONSTRAINT athletes_shoe_size_system_valid 
    CHECK (shoe_size_system IS NULL OR shoe_size_system IN ('us', 'eu', 'uk'));
    RAISE NOTICE 'Added constraint: athletes_shoe_size_system_valid';
  END IF;
  
  -- Shoe width constraint
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'athletes_shoe_width_valid'
  ) THEN
    ALTER TABLE athletes 
    ADD CONSTRAINT athletes_shoe_width_valid 
    CHECK (shoe_width IS NULL OR shoe_width IN ('narrow', 'standard', 'wide'));
    RAISE NOTICE 'Added constraint: athletes_shoe_width_valid';
  END IF;
  
  -- T-shirt size constraint
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'athletes_tshirt_size_valid'
  ) THEN
    ALTER TABLE athletes 
    ADD CONSTRAINT athletes_tshirt_size_valid 
    CHECK (tshirt_size IS NULL OR tshirt_size IN ('YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL', 'AXXXL'));
    RAISE NOTICE 'Added constraint: athletes_tshirt_size_valid';
  END IF;
  
  -- Shorts size constraint
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'athletes_shorts_size_valid'
  ) THEN
    ALTER TABLE athletes 
    ADD CONSTRAINT athletes_shorts_size_valid 
    CHECK (shorts_size IS NULL OR shorts_size IN ('YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL', 'AXXXL'));
    RAISE NOTICE 'Added constraint: athletes_shorts_size_valid';
  END IF;
  
  -- Dominant hand constraint
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'athletes_dominant_hand_valid'
  ) THEN
    ALTER TABLE athletes 
    ADD CONSTRAINT athletes_dominant_hand_valid 
    CHECK (dominant_hand IS NULL OR dominant_hand IN ('left', 'right', 'ambidextrous'));
    RAISE NOTICE 'Added constraint: athletes_dominant_hand_valid';
  END IF;
END $$;

-- Add column comments for documentation
COMMENT ON COLUMN athletes.height_cm IS 
  'Athlete height in centimeters. UI supports ft/in and cm input, stored normalized as cm.';

COMMENT ON COLUMN athletes.weight_kg IS 
  'Athlete weight in kilograms. UI supports lbs and kg input, stored normalized as kg.';

COMMENT ON COLUMN athletes.shoe_size_value IS 
  'Numeric shoe size value. System (US/EU/UK) stored separately in shoe_size_system.';

COMMENT ON COLUMN athletes.shoe_size_system IS 
  'Shoe sizing system: us, eu, or uk. Used with shoe_size_value.';

COMMENT ON COLUMN athletes.shoe_width IS 
  'Shoe width: narrow, standard, or wide. Helps with proper footwear fit.';

COMMENT ON COLUMN athletes.tshirt_size IS 
  'Universal t-shirt size. Enum: YS, YM, YL, AS, AM, AL, AXL, AXXL, AXXXL.';

COMMENT ON COLUMN athletes.shorts_size IS 
  'Universal shorts size. Enum: YS, YM, YL, AS, AM, AL, AXL, AXXL, AXXXL.';

COMMENT ON COLUMN athletes.dominant_hand IS 
  'Dominant hand: left, right, or ambidextrous. Relevant for many sports.';

COMMENT ON COLUMN athletes.emergency_contact IS 
  'JSONB emergency contact: {name, relationship, phone, email}. Replaces deprecated emergency_contact_name/phone columns.';

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_athletes_height_cm 
  ON athletes(height_cm) 
  WHERE height_cm IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_athletes_weight_kg 
  ON athletes(weight_kg) 
  WHERE weight_kg IS NOT NULL;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Universal athlete profile fields migration complete.';
  RAISE NOTICE 'All new columns are nullable to avoid breaking existing data.';
  RAISE NOTICE 'Constraints added for data validation.';
END $$;
