-- Phase 07+: Uniform Kits RPC Functions
-- ====================================
-- RPC functions to safely manage kit creation, submissions, locking, fulfillment,
-- and read-optimized roster/export queries.

-- ============================================
-- 1) create_uniform_kit
-- ============================================
CREATE OR REPLACE FUNCTION create_uniform_kit(
  p_team_id UUID,
  p_season_id UUID,
  p_name TEXT,
  p_deadline_at TIMESTAMPTZ,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kit_id UUID;
  v_item JSONB;
  v_item_name TEXT;
  v_required BOOLEAN;
  v_size_options JSONB;
  v_sort_order INT;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Kit name is required';
  END IF;

  IF NOT staff_can_access_team(auth.uid(), p_team_id) THEN
    RAISE EXCEPTION 'Not authorized to create kits for this team';
  END IF;

  -- Upsert kit (idempotent)
  INSERT INTO uniform_kits (team_id, season_id, name, deadline_at, locked_at, created_by)
  VALUES (p_team_id, p_season_id, trim(p_name), p_deadline_at, NULL, auth.uid())
  ON CONFLICT (team_id, season_id, name)
  DO UPDATE SET
    deadline_at = EXCLUDED.deadline_at,
    updated_at = NOW()
  RETURNING id INTO v_kit_id;

  -- Items are required for a useful kit
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'items must be a JSON array';
  END IF;

  -- Upsert kit items by (kit_id, name)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_name := NULLIF(trim(COALESCE(v_item->>'name', '')), '');
    IF v_item_name IS NULL THEN
      RAISE EXCEPTION 'Each item requires a non-empty name';
    END IF;

    v_required := COALESCE((v_item->>'required')::boolean, true);
    v_size_options := COALESCE(v_item->'size_options', '[]'::jsonb);
    v_sort_order := COALESCE((v_item->>'sort_order')::int, 0);

    INSERT INTO uniform_kit_items (kit_id, name, required, size_options, sort_order)
    VALUES (v_kit_id, v_item_name, v_required, v_size_options, v_sort_order)
    ON CONFLICT (kit_id, name)
    DO UPDATE SET
      required = EXCLUDED.required,
      size_options = EXCLUDED.size_options,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW();
  END LOOP;

  RETURN v_kit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_uniform_kit(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB) TO authenticated;

-- ============================================
-- 2) submit_uniform_sizes
-- ============================================
CREATE OR REPLACE FUNCTION submit_uniform_sizes(
  p_kit_id UUID,
  p_child_id UUID,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_season_id UUID;
  v_deadline_at TIMESTAMPTZ;
  v_locked_at TIMESTAMPTZ;
  v_submission_id UUID;
  v_item JSONB;
  v_item_id UUID;
  v_size TEXT;
  v_missing_required_count INT;
BEGIN
  -- Validate kit
  SELECT team_id, season_id, deadline_at, locked_at
  INTO v_team_id, v_season_id, v_deadline_at, v_locked_at
  FROM uniform_kits
  WHERE id = p_kit_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Kit not found';
  END IF;

  -- AuthZ: must be parent/guardian of child and on the kit's team/season
  IF NOT is_parent_of_child(auth.uid(), p_child_id) THEN
    RAISE EXCEPTION 'Not authorized for this child';
  END IF;

  IF NOT parent_can_access_team_via_membership(auth.uid(), v_team_id, v_season_id) THEN
    RAISE EXCEPTION 'Not authorized for this team/season';
  END IF;

  -- Lock/deadline enforcement
  IF v_locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Submissions are locked';
  END IF;

  IF v_deadline_at IS NOT NULL AND NOW() > v_deadline_at THEN
    RAISE EXCEPTION 'Deadline has passed';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'items must be a JSON array';
  END IF;

  -- Validate required items are present in payload
  SELECT COUNT(*) INTO v_missing_required_count
  FROM uniform_kit_items ki
  WHERE ki.kit_id = p_kit_id
    AND ki.required = true
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_items) e
      WHERE (e->>'item_id')::uuid = ki.id
    );

  IF v_missing_required_count > 0 THEN
    RAISE EXCEPTION 'Missing required item sizes';
  END IF;

  -- Upsert submission (idempotent per kit+child)
  INSERT INTO uniform_submissions (kit_id, child_id, status, submitted_at)
  VALUES (p_kit_id, p_child_id, 'submitted', NOW())
  ON CONFLICT (kit_id, child_id)
  DO UPDATE SET
    status = 'submitted',
    submitted_at = COALESCE(uniform_submissions.submitted_at, NOW()),
    updated_at = NOW()
  RETURNING id INTO v_submission_id;

  -- Upsert each item size (with validation against kit + size options)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item->>'item_id')::uuid;
    v_size := NULLIF(trim(COALESCE(v_item->>'size', '')), '');

    IF v_item_id IS NULL OR v_size IS NULL THEN
      RAISE EXCEPTION 'Each item requires item_id and size';
    END IF;

    -- Validate item belongs to kit
    IF NOT EXISTS (
      SELECT 1
      FROM uniform_kit_items ki
      WHERE ki.id = v_item_id
        AND ki.kit_id = p_kit_id
    ) THEN
      RAISE EXCEPTION 'Invalid item for kit';
    END IF;

    -- Validate size is in size_options if size_options is non-empty
    IF EXISTS (
      SELECT 1
      FROM uniform_kit_items ki
      WHERE ki.id = v_item_id
        AND ki.kit_id = p_kit_id
        AND jsonb_typeof(ki.size_options) = 'array'
        AND jsonb_array_length(ki.size_options) > 0
        AND NOT (ki.size_options ? v_size)
    ) THEN
      RAISE EXCEPTION 'Invalid size for item';
    END IF;

    INSERT INTO uniform_submission_items (submission_id, item_id, size)
    VALUES (v_submission_id, v_item_id, v_size)
    ON CONFLICT (submission_id, item_id)
    DO UPDATE SET
      size = EXCLUDED.size,
      updated_at = NOW();
  END LOOP;

  RETURN v_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_uniform_sizes(UUID, UUID, JSONB) TO authenticated;

-- ============================================
-- 3) lock_uniform_kit
-- ============================================
CREATE OR REPLACE FUNCTION lock_uniform_kit(p_kit_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT team_id INTO v_team_id
  FROM uniform_kits
  WHERE id = p_kit_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Kit not found';
  END IF;

  IF NOT staff_can_access_team(auth.uid(), v_team_id) THEN
    RAISE EXCEPTION 'Not authorized to lock this kit';
  END IF;

  -- Set kit lock if not already set
  UPDATE uniform_kits
  SET locked_at = COALESCE(locked_at, v_now),
      updated_at = NOW()
  WHERE id = p_kit_id;

  -- Transition submissions (do not override fulfilled)
  UPDATE uniform_submissions
  SET status = 'locked',
      locked_at = COALESCE(locked_at, v_now),
      updated_at = NOW()
  WHERE kit_id = p_kit_id
    AND status <> 'fulfilled';
END;
$$;

GRANT EXECUTE ON FUNCTION lock_uniform_kit(UUID) TO authenticated;

-- ============================================
-- 4) mark_uniform_submission_fulfilled
-- ============================================
CREATE OR REPLACE FUNCTION mark_uniform_submission_fulfilled(p_submission_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT k.team_id INTO v_team_id
  FROM uniform_submissions s
  JOIN uniform_kits k ON k.id = s.kit_id
  WHERE s.id = p_submission_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  IF NOT staff_can_access_team(auth.uid(), v_team_id) THEN
    RAISE EXCEPTION 'Not authorized to fulfill this submission';
  END IF;

  UPDATE uniform_submissions
  SET status = 'fulfilled',
      fulfilled_at = COALESCE(fulfilled_at, NOW()),
      updated_at = NOW()
  WHERE id = p_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_uniform_submission_fulfilled(UUID) TO authenticated;

-- ============================================
-- 5) get_uniform_kit_roster (admin/coach export/read)
-- ============================================
CREATE OR REPLACE FUNCTION get_uniform_kit_roster(p_kit_id UUID)
RETURNS TABLE(
  child_id UUID,
  first_name TEXT,
  last_name TEXT,
  team_id UUID,
  season_id UUID,
  kit_id UUID,
  kit_name TEXT,
  deadline_at TIMESTAMPTZ,
  kit_locked_at TIMESTAMPTZ,
  submission_id UUID,
  submission_status uniform_submission_status,
  submitted_at TIMESTAMPTZ,
  submission_locked_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  items JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH kit AS (
    SELECT k.*
    FROM uniform_kits k
    WHERE k.id = p_kit_id
  ),
  roster AS (
    SELECT tm.child_id, tm.team_id, tm.season_id
    FROM kit
    JOIN team_memberships tm
      ON tm.team_id = kit.team_id
     AND tm.season_id = kit.season_id
     AND tm.status = 'active'
  ),
  subs AS (
    SELECT s.*
    FROM uniform_submissions s
    WHERE s.kit_id = p_kit_id
  )
  SELECT
    c.id AS child_id,
    c.first_name,
    c.last_name,
    kit.team_id,
    kit.season_id,
    kit.id AS kit_id,
    kit.name AS kit_name,
    kit.deadline_at,
    kit.locked_at AS kit_locked_at,
    s.id AS submission_id,
    COALESCE(s.status, 'not_submitted'::uniform_submission_status) AS submission_status,
    s.submitted_at,
    s.locked_at AS submission_locked_at,
    s.fulfilled_at,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'item_id', ki.id,
          'name', ki.name,
          'required', ki.required,
          'sort_order', ki.sort_order,
          'size_options', ki.size_options,
          'size', si.size
        )
        ORDER BY ki.sort_order, ki.name
      ), '[]'::jsonb)
      FROM uniform_kit_items ki
      LEFT JOIN uniform_submission_items si
        ON si.item_id = ki.id
       AND si.submission_id = s.id
      WHERE ki.kit_id = kit.id
    ) AS items
  FROM kit
  JOIN roster r ON true
  JOIN children c ON c.id = r.child_id
  LEFT JOIN subs s
    ON s.kit_id = kit.id
   AND s.child_id = c.id
  WHERE staff_can_access_team(auth.uid(), kit.team_id)
  ORDER BY c.last_name, c.first_name;
$$;

GRANT EXECUTE ON FUNCTION get_uniform_kit_roster(UUID) TO authenticated;

