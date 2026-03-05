-- Migration: Tier Comparison Helper Function
-- Description: Creates compare_tier_levels SQL function for validating tier upgrades
-- Date: 2026-04-12

BEGIN;

-- ============================================================================
-- STEP 1: Create compare_tier_levels function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compare_tier_levels(
  tier_key_1 TEXT,
  tier_key_2 TEXT
) RETURNS INTEGER AS $$
DECLARE
  level_1 INTEGER;
  level_2 INTEGER;
BEGIN
  -- Map tier_key to numeric level
  level_1 := CASE tier_key_1
    WHEN 'tier1' THEN 1
    WHEN 'tier2' THEN 2
    WHEN 'tier3' THEN 3
    ELSE 0
  END;
  
  level_2 := CASE tier_key_2
    WHEN 'tier1' THEN 1
    WHEN 'tier2' THEN 2
    WHEN 'tier3' THEN 3
    ELSE 0
  END;
  
  -- Returns: -1 if tier1 < tier2, 0 if equal, 1 if tier1 > tier2
  RETURN CASE
    WHEN level_1 < level_2 THEN -1
    WHEN level_1 > level_2 THEN 1
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMIT;
