-- ============================================
-- BULK IMPORT STORAGE BUCKET
-- ============================================
-- Storage bucket configuration for bulk import files with RLS policies

-- Create private bucket for bulk import files (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bulk-imports',
  'bulk-imports',
  false,
  10485760, -- 10MB limit
  ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for bulk-imports bucket
-- Drop policies if they exist (idempotent)
DROP POLICY IF EXISTS "Org admins can upload bulk import files" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can view bulk import files" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete bulk import files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage bulk import files" ON storage.objects;

-- Org admins can upload import files
CREATE POLICY "Org admins can upload bulk import files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bulk-imports' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    user_is_org_admin(auth.uid(), (storage.foldername(name))[2]::uuid)
  );

-- Org admins can view their import files
CREATE POLICY "Org admins can view bulk import files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bulk-imports' AND
    user_is_org_admin(auth.uid(), (storage.foldername(name))[2]::uuid)
  );

-- Org admins can delete their import files
CREATE POLICY "Org admins can delete bulk import files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bulk-imports' AND
    user_is_org_admin(auth.uid(), (storage.foldername(name))[2]::uuid)
  );

-- Service role can manage all files (for Edge Functions)
CREATE POLICY "Service role can manage bulk import files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'bulk-imports')
  WITH CHECK (bucket_id = 'bulk-imports');
