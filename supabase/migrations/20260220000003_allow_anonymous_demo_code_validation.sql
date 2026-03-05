-- Allow anonymous users to read demo codes and demo organizations for validation
-- This is required for the /demo entry page where users enter demo codes
-- before they are authenticated.
--
-- Security: Only allows reading active demo codes and active demo orgs, which is safe since:
-- 1. Demo codes are meant to be publicly accessible
-- 2. We only expose the code itself and basic validation info
-- 3. Sensitive operations (creating sessions) require authentication via Edge Function

-- Add anonymous SELECT policy for demo_codes
DROP POLICY IF EXISTS demo_codes_anon_select_active ON public.demo_codes;

CREATE POLICY demo_codes_anon_select_active
ON public.demo_codes
FOR SELECT
TO anon
USING (status = 'active' AND expires_at > now());

COMMENT ON POLICY demo_codes_anon_select_active ON public.demo_codes IS
'Allows anonymous users to read active, non-expired demo codes for validation on the /demo entry page. This is safe because demo codes are meant to be publicly accessible.';

-- Add anonymous SELECT policy for demo_organizations (to check status and allowed_roles)
-- Only allow reading active demo organizations
DROP POLICY IF EXISTS demo_organizations_anon_select_active ON public.demo_organizations;

CREATE POLICY demo_organizations_anon_select_active
ON public.demo_organizations
FOR SELECT
TO anon
USING (status = 'active');

COMMENT ON POLICY demo_organizations_anon_select_active ON public.demo_organizations IS
'Allows anonymous users to read active demo organizations for validation on the /demo entry page. Used to check org status and allowed_roles when validating demo codes.';
