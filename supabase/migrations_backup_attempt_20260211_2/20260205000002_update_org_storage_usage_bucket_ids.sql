-- Update org_storage_usage table to use new consolidated bucket names
-- This migrates old bucket references to the new public-media bucket

-- Update all gallery-related storage usage to public-media bucket
UPDATE org_storage_usage
SET bucket_id = 'public-media'
WHERE bucket_id IN ('team-media', 'organization-assets', 'profiles')
  AND (
    -- Gallery photos (orgs/{org_id}/galleries/...)
    bucket_id = 'team-media'
    OR bucket_id = 'organization-assets'
  );

-- Note: athlete-imports bucket remains unchanged as it's still separate
