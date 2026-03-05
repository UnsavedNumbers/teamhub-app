-- ============================================
-- SUB-ORGANIZATIONS SCHEMA
-- ============================================
-- This migration adds support for Sub-Organizations that operate under
-- a licensed Parent Organization.
--
-- Changes:
-- 1. Add parent_org_id and parent config columns to organizations
-- 2. Create sub_org_settings table
-- 3. Create sub_org_requests table (for approval flow)
-- 4. Create trigger to prevent sub-orgs from having org_licenses
-- 5. Create get_effective_license_org_id helper function
-- 6. Add indexes for performance
-- ============================================

-- ============================================
-- PART 1: ADD COLUMNS TO organizations TABLE
-- ============================================

-- Add parent_org_id to establish hierarchy
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS parent_org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- Add inherits_license flag (default true for sub-orgs)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS inherits_license boolean NOT NULL DEFAULT true;

-- Add parent-level sub-org configuration columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS sub_org_public_registration_enabled boolean DEFAULT false;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS sub_org_require_approval boolean DEFAULT true;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS sub_org_max_count integer;

-- Add constraint to prevent self-reference
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_no_self_parent CHECK (parent_org_id IS NULL OR parent_org_id <> id);

-- Add index for listing sub-orgs by parent
CREATE INDEX IF NOT EXISTS idx_organizations_parent_org_id 
  ON public.organizations(parent_org_id) 
  WHERE parent_org_id IS NOT NULL;

-- Add comment explaining parent_org_id
COMMENT ON COLUMN public.organizations.parent_org_id IS 
  'Parent organization ID for sub-orgs. NULL for parent orgs. Sub-orgs inherit license from parent.';

COMMENT ON COLUMN public.organizations.inherits_license IS 
  'Whether this org inherits license from parent. Always true for sub-orgs.';

COMMENT ON COLUMN public.organizations.sub_org_public_registration_enabled IS 
  'Parent org setting: allow public sub-org registration. Only applies to parent orgs.';

COMMENT ON COLUMN public.organizations.sub_org_require_approval IS 
  'Parent org setting: require approval for sub-org registration. Only applies to parent orgs.';

COMMENT ON COLUMN public.organizations.sub_org_max_count IS 
  'Parent org setting: maximum number of sub-orgs allowed. NULL = unlimited.';

-- ============================================
-- PART 2: CREATE sub_org_settings TABLE
-- ============================================

-- Create enum for sub-org status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sub_org_status') THEN
    CREATE TYPE public.sub_org_status AS ENUM ('active', 'suspended');
  END IF;
END $$;

-- Create sub_org_settings table
CREATE TABLE IF NOT EXISTS public.sub_org_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled_sports text[] DEFAULT ARRAY[]::text[],
  enabled_features jsonb DEFAULT '{}'::jsonb,
  branding_overrides jsonb,
  status public.sub_org_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_org_settings_sub_org_id ON public.sub_org_settings(sub_org_id);
CREATE INDEX IF NOT EXISTS idx_sub_org_settings_status ON public.sub_org_settings(status);

ALTER TABLE public.sub_org_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.sub_org_settings IS 
  'Settings for sub-organizations. Controls which sports and features are enabled for each sub-org.';

COMMENT ON COLUMN public.sub_org_settings.enabled_sports IS 
  'Array of sport codes allowed for this sub-org. Must be subset of parent''s enabled sports.';

COMMENT ON COLUMN public.sub_org_settings.enabled_features IS 
  'JSONB object mapping feature keys to enabled status. Controls which features/modules are available.';

COMMENT ON COLUMN public.sub_org_settings.branding_overrides IS 
  'Optional JSONB for sub-org branding customizations (logo, colors, etc.).';

COMMENT ON COLUMN public.sub_org_settings.status IS 
  'Sub-org status: active (operational) or suspended (disabled by parent).';

-- ============================================
-- PART 3: CREATE sub_org_requests TABLE
-- ============================================

-- Create enum for request status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sub_org_request_status') THEN
    CREATE TYPE public.sub_org_request_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- Create sub_org_requests table
CREATE TABLE IF NOT EXISTS public.sub_org_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_name text NOT NULL,
  contact_email text NOT NULL,
  contact_name text NOT NULL,
  school_league_type text,
  requested_sport_codes text[] DEFAULT ARRAY[]::text[],
  status public.sub_org_request_status NOT NULL DEFAULT 'pending',
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_sub_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_org_requests_parent_org_id ON public.sub_org_requests(parent_org_id);
CREATE INDEX IF NOT EXISTS idx_sub_org_requests_status ON public.sub_org_requests(status);
CREATE INDEX IF NOT EXISTS idx_sub_org_requests_created_sub_org_id ON public.sub_org_requests(created_sub_org_id) WHERE created_sub_org_id IS NOT NULL;

ALTER TABLE public.sub_org_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.sub_org_requests IS 
  'Pending sub-org registration requests (Model B - approval required).';

COMMENT ON COLUMN public.sub_org_requests.requested_name IS 
  'Requested name for the sub-organization.';

COMMENT ON COLUMN public.sub_org_requests.requested_sport_codes IS 
  'Array of sport codes the requester wants enabled for the sub-org.';

COMMENT ON COLUMN public.sub_org_requests.created_sub_org_id IS 
  'Set when request is approved - links to the created organization.';

-- ============================================
-- PART 4: TRIGGER TO PREVENT SUB-ORGS FROM HAVING org_licenses
-- ============================================

-- Function to validate that sub-orgs cannot have org_licenses
CREATE OR REPLACE FUNCTION public.prevent_sub_org_license()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if this org is a sub-org (has parent_org_id)
  IF EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = NEW.org_id AND parent_org_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Sub-organizations cannot have direct license rows. They inherit license from parent organization.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on org_licenses
DROP TRIGGER IF EXISTS trigger_prevent_sub_org_license ON public.org_licenses;
CREATE TRIGGER trigger_prevent_sub_org_license
  BEFORE INSERT OR UPDATE OF org_id
  ON public.org_licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_sub_org_license();

COMMENT ON FUNCTION public.prevent_sub_org_license() IS 
  'Prevents sub-organizations from having direct org_licenses rows. Sub-orgs inherit license from parent.';

-- ============================================
-- PART 5: HELPER FUNCTION get_effective_license_org_id
-- ============================================

-- Function to get the effective license org_id (parent if sub-org, self if parent)
CREATE OR REPLACE FUNCTION public.get_effective_license_org_id(p_org_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT 
    CASE 
      WHEN o.parent_org_id IS NOT NULL THEN o.parent_org_id
      ELSE p_org_id
    END
  FROM public.organizations o
  WHERE o.id = p_org_id;
$$;

COMMENT ON FUNCTION public.get_effective_license_org_id(uuid) IS 
  'Returns the org_id that holds the license for a given org. For sub-orgs, returns parent_org_id. For parent orgs, returns the org_id itself.';

GRANT EXECUTE ON FUNCTION public.get_effective_license_org_id(uuid) TO authenticated, anon;

-- ============================================
-- PART 6: UPDATE TRIGGER FOR sub_org_settings.updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_sub_org_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_sub_org_settings_updated_at ON public.sub_org_settings;
CREATE TRIGGER trigger_update_sub_org_settings_updated_at
  BEFORE UPDATE ON public.sub_org_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sub_org_settings_updated_at();

-- ============================================
-- PART 7: UPDATE TRIGGER FOR sub_org_requests.updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_sub_org_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_sub_org_requests_updated_at ON public.sub_org_requests;
CREATE TRIGGER trigger_update_sub_org_requests_updated_at
  BEFORE UPDATE ON public.sub_org_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sub_org_requests_updated_at();
