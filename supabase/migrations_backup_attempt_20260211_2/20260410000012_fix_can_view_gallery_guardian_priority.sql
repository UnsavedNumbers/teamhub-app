-- Fix can_view_gallery to properly allow guardians to see galleries even when fans_can_see = false
-- The previous logic was blocking guardians when fans_can_see was turned off because
-- the fans_can_see check happened first and short-circuited the guardian permission checks

CREATE OR REPLACE FUNCTION public.can_view_gallery(gallery_id_param uuid, user_id_param uuid DEFAULT auth.uid()) 
RETURNS boolean
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gallery RECORD;
  v_team_id UUID;
  v_is_guardian BOOLEAN := FALSE;
BEGIN
  -- Get gallery details
  SELECT g.org_id, g.gallery_type, g.entity_id, g.fans_can_see
  INTO v_gallery
  FROM galleries g
  WHERE g.id = gallery_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Platform admins can view all galleries
  IF is_platform_admin(user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Org admins can view all galleries in their org
  IF is_org_admin(v_gallery.org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check based on gallery type - these checks apply regardless of fans_can_see setting
  -- Guardians/parents should always be able to see galleries for their children's teams/events
  CASE v_gallery.gallery_type
    WHEN 'org' THEN
      -- Org galleries: org members can view
      IF is_org_member(v_gallery.org_id, user_id_param) THEN
        RETURN TRUE;
      END IF;
      
    WHEN 'team' THEN
      -- Team galleries: coaches OR parents of athletes on the team can view
      IF v_gallery.entity_id IS NOT NULL THEN
        -- Check if user is coach for the team
        IF is_coach_for_team(v_gallery.entity_id, user_id_param) THEN
          RETURN TRUE;
        END IF;
        
        -- Check if user is parent of athlete on the team
        IF EXISTS (
          SELECT 1
          FROM team_memberships tm
          JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
          WHERE tm.team_id = v_gallery.entity_id
            AND tm.deleted_at IS NULL
            AND ag.user_id = user_id_param
            AND ag.status = 'active'
        ) THEN
          RETURN TRUE;
        END IF;
      END IF;
      
    WHEN 'athlete' THEN
      -- Athlete galleries: parents of that athlete can view
      IF v_gallery.entity_id IS NOT NULL THEN
        IF is_parent_of_athlete(v_gallery.entity_id, user_id_param) THEN
          RETURN TRUE;
        END IF;
      END IF;
      
    WHEN 'event' THEN
      -- Event galleries: coaches or parents of athletes on the team linked to the event
      IF v_gallery.entity_id IS NOT NULL THEN
        SELECT team_id INTO v_team_id
        FROM events
        WHERE id = v_gallery.entity_id;
        
        IF v_team_id IS NOT NULL THEN
          -- Check if user is coach for the team
          IF is_coach_for_team(v_team_id, user_id_param) THEN
            RETURN TRUE;
          END IF;
          
          -- Check if user is parent of athlete on the team
          IF EXISTS (
            SELECT 1
            FROM team_memberships tm
            JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
            WHERE tm.team_id = v_team_id
              AND tm.deleted_at IS NULL
              AND ag.user_id = user_id_param
              AND ag.status = 'active'
          ) THEN
            RETURN TRUE;
          END IF;
        END IF;
      END IF;
      
    WHEN 'travel' THEN
      -- Travel galleries: coaches or parents of athletes on the team linked to the travel plan
      IF v_gallery.entity_id IS NOT NULL THEN
        SELECT team_id INTO v_team_id
        FROM travel_plans
        WHERE id = v_gallery.entity_id;
        
        IF v_team_id IS NOT NULL THEN
          -- Check if user is coach for the team
          IF is_coach_for_team(v_team_id, user_id_param) THEN
            RETURN TRUE;
          END IF;
          
          -- Check if user is parent of athlete on the team
          IF EXISTS (
            SELECT 1
            FROM team_memberships tm
            JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
            WHERE tm.team_id = v_team_id
              AND tm.deleted_at IS NULL
              AND ag.user_id = user_id_param
              AND ag.status = 'active'
          ) THEN
            RETURN TRUE;
          END IF;
        END IF;
      END IF;
      
    WHEN 'program' THEN
      -- Program galleries: coaches or parents of athletes in the program
      IF v_gallery.entity_id IS NOT NULL THEN
        -- Check if user is coach for any team in the program
        IF EXISTS (
          SELECT 1 FROM teams t
          WHERE t.program_id = v_gallery.entity_id
            AND is_coach_for_team(t.id, user_id_param)
        ) THEN
          RETURN TRUE;
        END IF;
        
        -- Check if user is parent of athlete on any team in the program
        IF EXISTS (
          SELECT 1
          FROM teams t
          JOIN team_memberships tm ON tm.team_id = t.id
          JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
          WHERE t.program_id = v_gallery.entity_id
            AND tm.deleted_at IS NULL
            AND ag.user_id = user_id_param
            AND ag.status = 'active'
        ) THEN
          RETURN TRUE;
        END IF;
      END IF;
      
    WHEN 'season' THEN
      -- Season galleries: coaches or parents of athletes in the season's team
      IF v_gallery.entity_id IS NOT NULL THEN
        SELECT team_id INTO v_team_id
        FROM seasons
        WHERE id = v_gallery.entity_id;
        
        IF v_team_id IS NOT NULL THEN
          -- Check if user is coach for the team
          IF is_coach_for_team(v_team_id, user_id_param) THEN
            RETURN TRUE;
          END IF;
          
          -- Check if user is parent of athlete on the team
          IF EXISTS (
            SELECT 1
            FROM team_memberships tm
            JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
            WHERE tm.team_id = v_team_id
              AND tm.deleted_at IS NULL
              AND ag.user_id = user_id_param
              AND ag.status = 'active'
          ) THEN
            RETURN TRUE;
          END IF;
        END IF;
      END IF;
      
    ELSE
      -- Unknown gallery type
      NULL;
  END CASE;
  
  -- Finally, if gallery is marked as visible to fans, anyone authenticated can view it
  -- This check is LAST so that guardian permissions are checked first
  IF v_gallery.fans_can_see = TRUE THEN
    RETURN TRUE;
  END IF;
  
  -- No access granted
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.can_view_gallery(uuid, uuid) IS 'Returns true if the user can view the gallery. Checks guardian/parent permissions FIRST, then falls back to fans_can_see. This ensures guardians can always see their children''s galleries regardless of fan visibility settings.';
