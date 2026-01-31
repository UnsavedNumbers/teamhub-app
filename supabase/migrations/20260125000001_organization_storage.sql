-- Phase 13: Organization Assets Storage
-- ===========================================
-- Create storage bucket for organization assets (logos, etc.)

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public Read Access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'organization-assets' );

-- Policy: Admin Upload Access
-- Allow users to upload if they are an admin of the organization folder they are uploading to
-- We assume structure: organization-assets/{org_id}/logo.png
CREATE POLICY "Org Admin Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-assets' AND
  (
    -- Check if user is admin of the org in the path (path should start with org_id)
    EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role = 'org_admin'
        AND (storage.foldername(name))[1] = om.org_id::text
    )
    OR
    -- Or platform admin
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  )
);

-- Policy: Admin Update/Delete Access
CREATE POLICY "Org Admin Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-assets' AND
  (
    EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role = 'org_admin'
        AND (storage.foldername(name))[1] = om.org_id::text
    )
    OR
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  )
);

CREATE POLICY "Org Admin Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-assets' AND
  (
    EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role = 'org_admin'
        AND (storage.foldername(name))[1] = om.org_id::text
    )
    OR
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  )
);
