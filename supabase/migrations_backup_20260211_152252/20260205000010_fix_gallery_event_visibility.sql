-- Fix gallery visibility for org members on event galleries
-- and align galleries_select_policy with can_view_gallery.

-- Ensure we don't have an overloaded one-parameter version
DROP FUNCTION IF EXISTS public.can_view_gallery(UUID);

-- Use can_view_gallery for gallery SELECT policy
DROP POLICY IF EXISTS galleries_select_policy ON public.galleries;

CREATE POLICY galleries_select_policy ON public.galleries
FOR SELECT
TO authenticated
USING (public.can_view_gallery(id, auth.uid()));

-- Update can_view_gallery to allow org members to view event galleries
CREATE OR REPLACE FUNCTION public.can_view_gallery(
  gallery_id_param uuid,
  user_id_param uuid DEFAULT auth.uid()
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gallery RECORD;
  v_team_id UUID;
BEGIN
  IF user_id_param IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get gallery details
  SELECT g.org_id, g.gallery_type, g.entity_id
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

  -- Check based on gallery type
  CASE v_gallery.gallery_type
    WHEN 'org' THEN
      -- Org galleries: org members can view
      RETURN is_org_member(v_gallery.org_id, user_id_param);

    WHEN 'team' THEN
      -- Team galleries: coaches OR parents of athletes on the team can view
      IF v_gallery.entity_id IS NOT NULL THEN
        IF is_coach_for_team(v_gallery.entity_id, user_id_param) THEN
          RETURN TRUE;
        END IF;

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
      -- Event galleries: org members can view, plus coaches/parents of the team
      IF is_org_member(v_gallery.org_id, user_id_param) THEN
        RETURN TRUE;
      END IF;

      IF v_gallery.entity_id IS NOT NULL THEN
        SELECT team_id INTO v_team_id
        FROM events
        WHERE id = v_gallery.entity_id;

        -- Fallback: ticketed_events may be used as the entity id
        IF v_team_id IS NULL THEN
          SELECT team_id INTO v_team_id
          FROM ticketed_events
          WHERE id = v_gallery.entity_id;
        END IF;

        IF v_team_id IS NOT NULL THEN
          IF is_coach_for_team(v_team_id, user_id_param) THEN
            RETURN TRUE;
          END IF;

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
          IF is_coach_for_team(v_team_id, user_id_param) THEN
            RETURN TRUE;
          END IF;

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
        IF EXISTS (
          SELECT 1 FROM teams t
          WHERE t.program_id = v_gallery.entity_id
            AND is_coach_for_team(t.id, user_id_param)
        ) THEN
          RETURN TRUE;
        END IF;

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
          IF is_coach_for_team(v_team_id, user_id_param) THEN
            RETURN TRUE;
          END IF;

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

GRANT EXECUTE ON FUNCTION public.can_view_gallery(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.can_view_gallery(uuid, uuid) IS
'Returns true if the user can view the gallery (platform/org admin, coach, or parent based on gallery type). Event galleries are visible to org members.';
