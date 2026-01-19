-- Migration: 20260121000001_storage_bucket_athlete_imports
-- Description: Creates storage bucket for athlete import files

-- Create storage bucket for athlete imports (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'athlete-imports',
  'athlete-imports',
  false, -- Private bucket
  5242880, -- 5MB limit
  ARRAY['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Org admins can upload files to their org's folder
-- Note: The folder structure is imports/{org_id}/filename
-- We check that the user is an org admin for the org_id in the path
CREATE POLICY "Org admins can upload import files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'athlete-imports' AND
    user_is_org_admin(auth.uid(), (storage.foldername(name))[1]::UUID)
  );

-- RLS Policy: Org admins can read their org's import files
CREATE POLICY "Org admins can read their import files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'athlete-imports' AND
    user_is_org_admin(auth.uid(), (storage.foldername(name))[1]::UUID)
  );

-- RLS Policy: Org admins can delete their org's import files
CREATE POLICY "Org admins can delete their import files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'athlete-imports' AND
    user_is_org_admin(auth.uid(), (storage.foldername(name))[1]::UUID)
  );
