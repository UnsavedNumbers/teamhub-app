-- Add latitude and longitude columns to organizations table
-- These fields are used to store the geolocation coordinates of the organization address
-- Matching the schema used in event_locations table

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS latitude numeric(10,8),
ADD COLUMN IF NOT EXISTS longitude numeric(11,8);

COMMENT ON COLUMN public.organizations.latitude IS 'Latitude of the organization address';
COMMENT ON COLUMN public.organizations.longitude IS 'Longitude of the organization address';
