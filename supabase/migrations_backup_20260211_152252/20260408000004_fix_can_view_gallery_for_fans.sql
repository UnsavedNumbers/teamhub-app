-- Fix can_view_gallery to allow anyone to view galleries where fans_can_see = true
-- Fans should be able to see galleries marked as visible to fans

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
BEGIN
  -- Get gallery details
  SELECT g.org_id, g.gallery_type, g.entity_id, g.fans_can_see
  INTO v_gallery
  FROM galleries g
  WHERE g.id = gallery_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- If gallery is marked as visible to fans, anyone can view it
  IF v_gallery.fans_can_see = TRUE THEN
    RETURN TRUE;
  END IF;
  
  -- Org admins can view all galleries in their org
  IF is_org_admin(v_gallery.org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check based on gallery type
  CASE v_gallery.gallery_type
    WHEN 'org' THEN
      -- Org galleries: org members can view
      RETURN is_org_member(v_gallery.org_id, user_id_param);
      
    WHEN 'team' THEN
      -- Team galleries: coaches OR parents of athletes on the team can view
      IF v_gallery.entity_id IS NOT NULL THEN
        -- Check if user is coach for the team
        IF is_coach_for_team(v_gallery.entity_id, user_id_param) THEN
          RETURN TRUE;
        END IF;
        
        -- Check if user is parent of athlete on the team
        RETURN EXISTS (
          SELECT 1
          FROM team_memberships tm
          JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
          WHERE tm.team_id = v_gallery.entity_id
            AND tm.deleted_at IS NULL
            AND ag.user_id = user_id_param
            AND ag.status = 'active'
        );
      END IF;
      RETURN FALSE;
      
    WHEN 'athlete' THEN
      -- Athlete galleries: parents of that athlete can view
      IF v_gallery.entity_id IS NOT NULL THEN
        RETURN is_parent_of_athlete(v_gallery.entity_id, user_id_param);
      END IF;
      RETURN FALSE;
      
    WHEN 'event' THEN
      -- Event galleries: members/coaches of the team linked to the event can view
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
          RETURN EXISTS (
            SELECT 1
            FROM team_memberships tm
            JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
            WHERE tm.team_id = v_team_id
              AND tm.deleted_at IS NULL
              AND ag.user_id = user_id_param
              AND ag.status = 'active'
          );
        END IF;
      END IF;
      RETURN FALSE;
      
    WHEN 'travel' THEN
      -- Travel galleries: members/coaches of the team linked to the travel plan can view
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
          RETURN EXISTS (
            SELECT 1
            FROM team_memberships tm
            JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
            WHERE tm.team_id = v_team_id
              AND tm.deleted_at IS NULL
              AND ag.user_id = user_id_param
              AND ag.status = 'active'
          );
        END IF;
      END IF;
      RETURN FALSE;
      
    WHEN 'program' THEN
      -- Program galleries: coaches or parents of athletes in the program can view
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
        RETURN EXISTS (
          SELECT 1
          FROM teams t
          JOIN team_memberships tm ON tm.team_id = t.id
          JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
          WHERE t.program_id = v_gallery.entity_id
            AND tm.deleted_at IS NULL
            AND ag.user_id = user_id_param
            AND ag.status = 'active'
        );
      END IF;
      RETURN FALSE;
      
    WHEN 'season' THEN
      -- Season galleries: coaches or parents of athletes in the season's team can view
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
          RETURN EXISTS (
            SELECT 1
            FROM team_memberships tm
            JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
            WHERE tm.team_id = v_team_id
              AND tm.deleted_at IS NULL
              AND ag.user_id = user_id_param
              AND ag.status = 'active'
          );
        END IF;
      END IF;
      RETURN FALSE;
      
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.can_view_gallery(uuid, uuid) IS 'Returns true if the user can view the gallery. Galleries with fans_can_see=true are visible to everyone. Otherwise checks org_admin, coach, or parent based on gallery type.';
