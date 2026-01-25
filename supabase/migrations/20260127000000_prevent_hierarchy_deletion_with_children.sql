-- ============================================================================
-- Prevent Deletion of Hierarchy Nodes with Children
-- ============================================================================
-- Enforces the rule that organization hierarchy nodes (sport, program, level, team)
-- can only be deleted if they have no direct children.
-- Provides clear error messages when deletion is blocked.

-- ============================================================================
-- 1. Function to prevent sport deletion with programs
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_sport_delete_with_programs()
RETURNS TRIGGER AS $$
DECLARE
  program_count INTEGER;
  sport_name TEXT;
BEGIN
  -- Get sport name for error message
  SELECT name INTO sport_name FROM sports WHERE id = OLD.id;
  
  -- Count programs for this sport
  SELECT COUNT(*) INTO program_count
  FROM programs
  WHERE sport_id = OLD.id
    AND deleted_at IS NULL;
  
  IF program_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete sport "%": % program(s) exist. Please remove all programs before deleting this sport.', 
      COALESCE(sport_name, 'Unknown'), program_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Function to prevent program deletion with levels
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_program_delete_with_levels()
RETURNS TRIGGER AS $$
DECLARE
  level_count INTEGER;
  program_name TEXT;
BEGIN
  -- Get program name for error message
  SELECT name INTO program_name FROM programs WHERE id = OLD.id;
  
  -- Count levels for this program
  SELECT COUNT(*) INTO level_count
  FROM levels
  WHERE program_id = OLD.id
    AND deleted_at IS NULL;
  
  IF level_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete program "%": % level(s) exist. Please remove all levels before deleting this program.', 
      COALESCE(program_name, 'Unknown'), level_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Function to prevent level deletion with teams
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_level_delete_with_teams()
RETURNS TRIGGER AS $$
DECLARE
  team_count INTEGER;
  level_name TEXT;
BEGIN
  -- Get level name for error message
  SELECT name INTO level_name FROM levels WHERE id = OLD.id;
  
  -- Count teams for this level
  SELECT COUNT(*) INTO team_count
  FROM teams
  WHERE level_id = OLD.id;
  
  IF team_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete level "%": % team(s) exist. Please remove all teams before deleting this level.', 
      COALESCE(level_name, 'Unknown'), team_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Create triggers
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_prevent_sport_delete_with_programs ON sports;
DROP TRIGGER IF EXISTS trigger_prevent_program_delete_with_levels ON programs;
DROP TRIGGER IF EXISTS trigger_prevent_level_delete_with_teams ON levels;

-- Create triggers
CREATE TRIGGER trigger_prevent_sport_delete_with_programs
  BEFORE DELETE ON sports
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sport_delete_with_programs();

CREATE TRIGGER trigger_prevent_program_delete_with_levels
  BEFORE DELETE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_program_delete_with_levels();

CREATE TRIGGER trigger_prevent_level_delete_with_teams
  BEFORE DELETE ON levels
  FOR EACH ROW
  EXECUTE FUNCTION prevent_level_delete_with_teams();

-- ============================================================================
-- 5. Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION prevent_sport_delete_with_programs() IS 'Prevents deletion of sports that have programs. Sports can only be deleted when they have no programs.';
COMMENT ON FUNCTION prevent_program_delete_with_levels() IS 'Prevents deletion of programs that have levels. Programs can only be deleted when they have no levels.';
COMMENT ON FUNCTION prevent_level_delete_with_teams() IS 'Prevents deletion of levels that have teams. Levels can only be deleted when they have no teams.';

-- ============================================================================
-- 6. Note: Teams can always be deleted
-- ============================================================================
-- Teams are at the bottom of the hierarchy and have no child nodes.
-- They may have team_memberships, team_seasons, etc., but those are not
-- considered "hierarchy children" for the purpose of this rule.
-- Teams can be deleted regardless of these relationships.
