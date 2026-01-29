-- Phase 07+: Backfill Kits/Submissions from uniform_orders
-- =======================================================
-- Creates a default kit per (team_id, season_id) and migrates existing uniform_orders
-- into uniform_submissions + uniform_submission_items.
--
-- Idempotent: safe to re-run.

-- 1) Create default kits for existing orders
WITH existing_pairs AS (
  SELECT DISTINCT team_id, season_id
  FROM uniform_orders
)
INSERT INTO uniform_kits (team_id, season_id, name, deadline_at, locked_at, created_by)
SELECT team_id, season_id, 'Uniform Kit', NULL, NULL, NULL
FROM existing_pairs
ON CONFLICT (team_id, season_id, name) DO NOTHING;

-- 2) Ensure default items exist on each default kit
WITH kits AS (
  SELECT id
  FROM uniform_kits
  WHERE name = 'Uniform Kit'
)
INSERT INTO uniform_kit_items (kit_id, name, required, size_options, sort_order)
SELECT
  k.id,
  v.name,
  true,
  v.size_options,
  v.sort_order
FROM kits k
CROSS JOIN (
  VALUES
    (
      'Jersey',
      10,
      to_jsonb(ARRAY['YXS','YS','YM','YL','YXL','AS','AM','AL','AXL','AXXL']::text[])
    ),
    (
      'Shorts',
      20,
      to_jsonb(ARRAY['YXS','YS','YM','YL','YXL','AS','AM','AL','AXL','AXXL']::text[])
    ),
    (
      'Socks',
      30,
      to_jsonb(ARRAY['YS (1-3)','YM (4-6)','YL (7-9)','AS (6-8)','AM (8-10)','AL (10-12)']::text[])
    )
) AS v(name, sort_order, size_options)
ON CONFLICT (kit_id, name)
DO UPDATE SET
  required = EXCLUDED.required,
  size_options = EXCLUDED.size_options,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- 3) Upsert submissions from uniform_orders
WITH src AS (
  SELECT
    uo.*,
    k.id AS kit_id,
    CASE uo.status
      WHEN 'pending' THEN 'submitted'::uniform_submission_status
      WHEN 'ordered' THEN 'locked'::uniform_submission_status
      WHEN 'delivered' THEN 'fulfilled'::uniform_submission_status
      ELSE 'submitted'::uniform_submission_status
    END AS new_status
  FROM uniform_orders uo
  JOIN uniform_kits k
    ON k.team_id = uo.team_id
   AND k.season_id = uo.season_id
   AND k.name = 'Uniform Kit'
)
INSERT INTO uniform_submissions (
  kit_id,
  child_id,
  status,
  submitted_at,
  locked_at,
  fulfilled_at
)
SELECT
  kit_id,
  child_id,
  new_status,
  created_at,
  CASE WHEN new_status IN ('locked','fulfilled') THEN created_at ELSE NULL END,
  CASE WHEN new_status = 'fulfilled' THEN created_at ELSE NULL END
FROM src
ON CONFLICT (kit_id, child_id)
DO UPDATE SET
  -- Never downgrade status
  status = CASE
    WHEN uniform_submissions.status = 'fulfilled' THEN 'fulfilled'::uniform_submission_status
    WHEN EXCLUDED.status = 'fulfilled' THEN 'fulfilled'::uniform_submission_status
    WHEN uniform_submissions.status = 'locked' THEN 'locked'::uniform_submission_status
    WHEN EXCLUDED.status = 'locked' THEN 'locked'::uniform_submission_status
    WHEN uniform_submissions.status = 'submitted' THEN 'submitted'::uniform_submission_status
    ELSE 'submitted'::uniform_submission_status
  END,
  submitted_at = COALESCE(uniform_submissions.submitted_at, EXCLUDED.submitted_at),
  locked_at = COALESCE(uniform_submissions.locked_at, EXCLUDED.locked_at),
  fulfilled_at = COALESCE(uniform_submissions.fulfilled_at, EXCLUDED.fulfilled_at),
  updated_at = NOW();

-- 4) Upsert submission items (Jersey/Shorts/Socks)
WITH kit AS (
  SELECT id AS kit_id
  FROM uniform_kits
  WHERE name = 'Uniform Kit'
),
kit_items AS (
  SELECT ki.id AS item_id, ki.kit_id, ki.name
  FROM uniform_kit_items ki
  JOIN kit ON kit.kit_id = ki.kit_id
),
src AS (
  SELECT
    uo.athlete_id,
    uo.team_id,
    uo.season_id,
    uo.jersey_size,
    uo.shorts_size,
    uo.socks_size,
    k.id AS kit_id
  FROM uniform_orders uo
  JOIN uniform_kits k
    ON k.team_id = uo.team_id
   AND k.season_id = uo.season_id
   AND k.name = 'Uniform Kit'
),
subs AS (
  SELECT s.id AS submission_id, s.kit_id, s.athlete_id
  FROM uniform_submissions s
  JOIN src ON src.kit_id = s.kit_id AND src.athlete_id = s.athlete_id
),
rows_to_upsert AS (
  SELECT
    subs.submission_id,
    kit_items.item_id,
    CASE kit_items.name
      WHEN 'Jersey' THEN src.jersey_size
      WHEN 'Shorts' THEN src.shorts_size
      WHEN 'Socks' THEN src.socks_size
      ELSE NULL
    END AS size
  FROM subs
  JOIN src ON src.kit_id = subs.kit_id AND src.athlete_id = subs.athlete_id
  JOIN kit_items ON kit_items.kit_id = subs.kit_id
)
INSERT INTO uniform_submission_items (submission_id, item_id, size)
SELECT submission_id, item_id, size
FROM rows_to_upsert
WHERE size IS NOT NULL AND length(trim(size)) > 0
ON CONFLICT (submission_id, item_id)
DO UPDATE SET
  size = EXCLUDED.size,
  updated_at = NOW();

