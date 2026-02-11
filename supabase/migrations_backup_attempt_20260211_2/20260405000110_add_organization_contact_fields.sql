-- Add missing contact and location fields to organizations table
-- These fields are used by the organization settings page to store contact information

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT;

-- Add comments to document the new columns
COMMENT ON COLUMN public.organizations.website IS 'Organization website URL';
COMMENT ON COLUMN public.organizations.phone IS 'Organization primary phone number';
COMMENT ON COLUMN public.organizations.email IS 'Organization primary email (distinct from contact_email which is used for system notifications)';
COMMENT ON COLUMN public.organizations.address IS 'Organization street address';
COMMENT ON COLUMN public.organizations.city IS 'Organization city (distinct from primary_city which is used for travel detection)';
COMMENT ON COLUMN public.organizations.state IS 'Organization state (distinct from primary_state which is used for travel detection)';
COMMENT ON COLUMN public.organizations.zip IS 'Organization postal/zip code';
