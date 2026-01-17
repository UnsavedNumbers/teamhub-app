-- Phase 07+: Uniform Kits RLS Policies
-- ===================================
-- RLS policies for the kit-based uniforms tables introduced in 031_uniform_kits.sql.
--
-- Strategy:
-- - Parents: read-only access to kits/items/submissions/items scoped to their children's active memberships.
-- - Staff (org_admin/coach/platform admin): manage kits/items/submissions/items for teams in org.
-- - Parent writes are intentionally not allowed at table level (RPC-only writes in next phase).

-- ============================================
-- uniform_kits
-- ============================================

-- Staff can manage kits for teams they can access
CREATE POLICY "Staff can manage uniform kits" ON uniform_kits
  FOR ALL
  USING (staff_can_access_team(auth.uid(), team_id))
  WITH CHECK (staff_can_access_team(auth.uid(), team_id));

-- Parents can view kits for teams/seasons where their children have active memberships
CREATE POLICY "Parents can view uniform kits" ON uniform_kits
  FOR SELECT
  USING (parent_can_access_team_via_membership(auth.uid(), team_id, season_id));

-- ============================================
-- uniform_kit_items
-- ============================================

-- Staff can manage kit items for kits they can access (via kit team)
CREATE POLICY "Staff can manage uniform kit items" ON uniform_kit_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM uniform_kits k
      WHERE k.id = uniform_kit_items.kit_id
        AND staff_can_access_team(auth.uid(), k.team_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM uniform_kits k
      WHERE k.id = uniform_kit_items.kit_id
        AND staff_can_access_team(auth.uid(), k.team_id)
    )
  );

-- Parents can view kit items for kits they can view
CREATE POLICY "Parents can view uniform kit items" ON uniform_kit_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM uniform_kits k
      WHERE k.id = uniform_kit_items.kit_id
        AND parent_can_access_team_via_membership(auth.uid(), k.team_id, k.season_id)
    )
  );

-- ============================================
-- uniform_submissions
-- ============================================

-- Staff can manage submissions for kits they can access
CREATE POLICY "Staff can manage uniform submissions" ON uniform_submissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM uniform_kits k
      WHERE k.id = uniform_submissions.kit_id
        AND staff_can_access_team(auth.uid(), k.team_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM uniform_kits k
      WHERE k.id = uniform_submissions.kit_id
        AND staff_can_access_team(auth.uid(), k.team_id)
    )
  );

-- Parents can view submissions for their children where they have team membership in the kit's team/season
CREATE POLICY "Parents can view uniform submissions" ON uniform_submissions
  FOR SELECT
  USING (
    is_parent_of_child(auth.uid(), child_id)
    AND EXISTS (
      SELECT 1
      FROM uniform_kits k
      WHERE k.id = uniform_submissions.kit_id
        AND parent_can_access_team_via_membership(auth.uid(), k.team_id, k.season_id)
    )
  );

-- ============================================
-- uniform_submission_items
-- ============================================

-- Staff can manage submission items for kits they can access
CREATE POLICY "Staff can manage uniform submission items" ON uniform_submission_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM uniform_submissions s
      JOIN uniform_kits k ON k.id = s.kit_id
      WHERE s.id = uniform_submission_items.submission_id
        AND staff_can_access_team(auth.uid(), k.team_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM uniform_submissions s
      JOIN uniform_kits k ON k.id = s.kit_id
      WHERE s.id = uniform_submission_items.submission_id
        AND staff_can_access_team(auth.uid(), k.team_id)
    )
  );

-- Parents can view submission items for their own children's submissions within accessible kits
CREATE POLICY "Parents can view uniform submission items" ON uniform_submission_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM uniform_submissions s
      JOIN uniform_kits k ON k.id = s.kit_id
      WHERE s.id = uniform_submission_items.submission_id
        AND is_parent_of_child(auth.uid(), s.child_id)
        AND parent_can_access_team_via_membership(auth.uid(), k.team_id, k.season_id)
    )
  );

