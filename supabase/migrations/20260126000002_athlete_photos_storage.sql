-- Athlete Photos Storage Bucket + Policies
-- ===========================================
-- Private bucket for athlete profile photos; clients use signed URLs for access.
-- Path pattern: athlete/{athlete_id}/profile.{ext}

-- ============================================================================
-- Add photo_url column to athletes table (if it doesn't exist)
-- ============================================================================
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN athletes.photo_url IS 'Storage path for athlete profile photo. Format: athlete/{athlete_id}/profile.{ext}';

-- ============================================================================
-- Create Storage Bucket
-- ============================================================================

-- Create bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'athlete-photos',
  'athlete-photos',
  false, -- Private bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if re-running locally
DROP POLICY IF EXISTS "Org admins and coaches can manage athlete photos" ON storage.objects;
DROP POLICY IF EXISTS "Guardians can manage their athletes photos" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can read athlete photos" ON storage.objects;

-- ============================================================================
-- Policy: Org Admins and Coaches can upload/update/delete athlete photos
-- ============================================================================
-- Org admins and coaches can manage photos for any athlete in their organization.
-- Path format: athlete/{athlete_id}/profile.{ext}
-- We extract athlete_id from path and check if athlete belongs to user's org.

CREATE POLICY "Org admins and coaches can manage athlete photos" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'athlete-photos'
    AND (
      -- Check if user is org_admin or coach in the athlete's org
      EXISTS (
        SELECT 1
        FROM athletes a
        JOIN team_memberships tm ON tm.athlete_id = a.id
        JOIN teams t ON t.id = tm.team_id
        JOIN organization_members om ON om.org_id = t.org_id AND om.user_id = (SELECT auth.uid())
        WHERE a.id = (regexp_split_to_array(storage.objects.name, '/'))[2]::UUID
          AND om.role IN ('org_admin', 'coach')
          AND storage.objects.name ~ '^athlete/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/profile\.(jpg|jpeg|png|webp)$'
      )
      -- Or check via athlete_guardians if athlete has org_id
      OR EXISTS (
        SELECT 1
        FROM athletes a
        JOIN athlete_guardians ag ON ag.athlete_id = a.id
        JOIN organization_members om ON om.org_id = ag.org_id AND om.user_id = (SELECT auth.uid())
        WHERE a.id = (regexp_split_to_array(storage.objects.name, '/'))[2]::UUID
          AND om.role IN ('org_admin', 'coach')
          AND storage.objects.name ~ '^athlete/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/profile\.(jpg|jpeg|png|webp)$'
      )
      -- Legacy admin check (users.role = 'admin')
      OR EXISTS (
        SELECT 1
        FROM athletes a
        JOIN team_memberships tm ON tm.athlete_id = a.id
        JOIN teams t ON t.id = tm.team_id
        JOIN users u ON u.org_id = t.org_id AND u.id = (SELECT auth.uid())
        WHERE a.id = (regexp_split_to_array(storage.objects.name, '/'))[2]::UUID
          AND u.role IN ('admin', 'coach')
          AND storage.objects.name ~ '^athlete/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/profile\.(jpg|jpeg|png|webp)$'
      )
      -- Platform admins can manage all photos
      OR EXISTS (
        SELECT 1 FROM platform_admins pa WHERE pa.user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    bucket_id = 'athlete-photos'
    AND (
      -- Same checks as USING clause
      EXISTS (
        SELECT 1
        FROM athletes a
        JOIN team_memberships tm ON tm.athlete_id = a.id
        JOIN teams t ON t.id = tm.team_id
        JOIN organization_members om ON om.org_id = t.org_id AND om.user_id = (SELECT auth.uid())
        WHERE a.id = (regexp_split_to_array(storage.objects.name, '/'))[2]::UUID
          AND om.role IN ('org_admin', 'coach')
          AND storage.objects.name ~ '^athlete/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/profile\.(jpg|jpeg|png|webp)$'
      )
      OR EXISTS (
        SELECT 1
        FROM athletes a
        JOIN athlete_guardians ag ON ag.athlete_id = a.id
        JOIN organization_members om ON om.org_id = ag.org_id AND om.user_id = (SELECT auth.uid())
        WHERE a.id = (regexp_split_to_array(storage.objects.name, '/'))[2]::UUID
          AND om.role IN ('org_admin', 'coach')
          AND storage.objects.name ~ '^athlete/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/profile\.(jpg|jpeg|png|webp)$'
      )
      OR EXISTS (
        SELECT 1
        FROM athletes a
        JOIN team_memberships tm ON tm.athlete_id = a.id
        JOIN teams t ON t.id = tm.team_id
        JOIN users u ON u.org_id = t.org_id AND u.id = (SELECT auth.uid())
        WHERE a.id = (regexp_split_to_array(storage.objects.name, '/'))[2]::UUID
          AND u.role IN ('admin', 'coach')
          AND storage.objects.name ~ '^athlete/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/profile\.(jpg|jpeg|png|webp)$'
      )
      OR EXISTS (
        SELECT 1 FROM platform_admins pa WHERE pa.user_id = (SELECT auth.uid())
      )
    )
  );

-- ============================================================================
-- Policy: Guardians can upload/update/delete photos for their own athletes
-- ============================================================================
-- Guardians can manage photos for athletes they are guardians of.
-- Path format: athlete/{athlete_id}/profile.{ext}

CREATE POLICY "Guardians can manage their athletes photos" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'athlete-photos'
    AND user_is_guardian_of_child((SELECT auth.uid()), (regexp_split_to_array(storage.objects.name, '/'))[2]::UUID)
    AND storage.objects.name ~ '^athlete/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/profile\.(jpg|jpeg|png|webp)$'
  )
  WITH CHECK (
    bucket_id = 'athlete-photos'
    AND user_is_guardian_of_child((SELECT auth.uid()), (regexp_split_to_array(storage.objects.name, '/'))[2]::UUID)
    AND storage.objects.name ~ '^athlete/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/profile\.(jpg|jpeg|png|webp)$'
  );

-- ============================================================================
-- Policy: Authorized users can read athlete photos (for signed URL generation)
-- ============================================================================
-- Users who can view an athlete can also read their photo (via signed URLs).
-- This includes guardians, org admins, coaches, and platform admins.

CREATE POLICY "Authorized users can read athlete photos" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'athlete-photos'
    AND (
      -- Guardians can read their athletes photos
      user_is_guardian_of_child((SELECT auth.uid()), (regexp_split_to_array(storage.objects.name, '/'))[2]::UUID)
      -- Org admins and coaches can read photos for athletes in their org
      OR EXISTS (
        SELECT 1
        FROM athletes a
        JOIN team_memberships tm ON tm.athlete_id = a.id
        JOIN teams t ON t.id = tm.team_id
        JOIN organization_members om ON om.org_id = t.org_id AND om.user_id = (SELECT auth.uid())
        WHERE a.id = (regexp_split_to_array(storage.objects.name, '/'))[2]::UUID
          AND om.role IN ('org_admin', 'coach')
      )
      OR EXISTS (
        SELECT 1
        FROM athletes a
        JOIN athlete_guardians ag ON ag.athlete_id = a.id
        JOIN organization_members om ON om.org_id = ag.org_id AND om.user_id = (SELECT auth.uid())
        WHERE a.id = (regexp_split_to_array(storage.objects.name, '/'))[2]::UUID
          AND om.role IN ('org_admin', 'coach')
      )
      -- Legacy admin/coach check
      OR EXISTS (
        SELECT 1
        FROM athletes a
        JOIN team_memberships tm ON tm.athlete_id = a.id
        JOIN teams t ON t.id = tm.team_id
        JOIN users u ON u.org_id = t.org_id AND u.id = (SELECT auth.uid())
        WHERE a.id = (regexp_split_to_array(storage.objects.name, '/'))[2]::UUID
          AND u.role IN ('admin', 'coach')
      )
      -- Platform admins can read all photos
      OR EXISTS (
        SELECT 1 FROM platform_admins pa WHERE pa.user_id = (SELECT auth.uid())
      )
    )
    AND storage.objects.name ~ '^athlete/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/profile\.(jpg|jpeg|png|webp)$'
  );

COMMENT ON POLICY "Org admins and coaches can manage athlete photos" ON storage.objects IS 'Allows org admins and coaches to upload/update/delete athlete photos for athletes in their organization.';
COMMENT ON POLICY "Guardians can manage their athletes photos" ON storage.objects IS 'Allows guardians to upload/update/delete photos for athletes they are guardians of.';
COMMENT ON POLICY "Authorized users can read athlete photos" ON storage.objects IS 'Allows authorized users (guardians, org admins, coaches, platform admins) to read athlete photos via signed URLs.';
