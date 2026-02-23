-- Migration: org_contact_requests table
-- Description: Structured support/request table for guardians and athletes to
--              contact org admins. Separate from platform-level contact_submissions.
-- Date: 2026-04-12

BEGIN;

-- ============================================================================
-- STEP 1: Create table
-- ============================================================================

CREATE TABLE public.org_contact_requests (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Org + requester identity
  org_id                      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requester_user_id           uuid NOT NULL REFERENCES auth.users(id),
  requester_role              text NOT NULL
    CHECK (requester_role IN ('guardian', 'athlete', 'coach', 'other')),

  -- Optional context links (prefilled from entry-point)
  athlete_id                  uuid REFERENCES public.athletes(id) ON DELETE SET NULL,
  team_id                     uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  season_id                   uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  event_id                    uuid REFERENCES public.events(id) ON DELETE SET NULL,

  -- Request body
  category                    text NOT NULL
    CHECK (category IN (
      'schedule_event',
      'payments_fees',
      'registration_eligibility',
      'attendance_availability',
      'team_roster',
      'technical_bug',
      'general_question',
      'feature_request'
    )),
  subject                     text,
  message                     text NOT NULL CHECK (length(trim(message)) > 0),
  attachments                 jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Feature-request–specific fields (null for all other categories)
  requested_feature_key       text,
  requested_feature_name      text,
  requested_feature_reason    text,
  requested_feature_use_case  text,

  -- Admin workflow
  status                      text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'open', 'in_progress', 'resolved', 'closed')),
  assigned_to_user_id         uuid REFERENCES auth.users(id),
  admin_notes                 text,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.org_contact_requests IS
  'Guardian/athlete requests and messages sent to org admins. '
  'Separate from platform-level contact_submissions (which reach platform support).';

COMMENT ON COLUMN public.org_contact_requests.admin_notes IS
  'Internal notes visible to org admins only. Never exposed to the requester.';

-- ============================================================================
-- STEP 2: updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_org_contact_request_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_org_contact_requests_updated_at
  BEFORE UPDATE ON public.org_contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_org_contact_request_updated_at();

-- ============================================================================
-- STEP 3: Enable RLS
-- ============================================================================

ALTER TABLE public.org_contact_requests ENABLE ROW LEVEL SECURITY;

-- Requesters can INSERT rows for themselves.
-- requester_user_id is always set server-side from JWT in the edge function,
-- but this RLS policy provides a defence-in-depth guard.
CREATE POLICY org_contact_requests__requester_insert
  ON public.org_contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = auth.uid());

COMMENT ON POLICY org_contact_requests__requester_insert ON public.org_contact_requests IS
  'Guardians/athletes can only insert requests under their own user_id.';

-- Requesters can SELECT only their own requests (status updates visible, admin_notes are NOT)
CREATE POLICY org_contact_requests__requester_select
  ON public.org_contact_requests
  FOR SELECT TO authenticated
  USING (requester_user_id = auth.uid());

COMMENT ON POLICY org_contact_requests__requester_select ON public.org_contact_requests IS
  'Requesters can view only their own submissions.';

-- Org admins can SELECT all requests for their org
CREATE POLICY org_contact_requests__org_admin_select
  ON public.org_contact_requests
  FOR SELECT TO authenticated
  USING (public.user_is_org_admin(auth.uid(), org_id));

COMMENT ON POLICY org_contact_requests__org_admin_select ON public.org_contact_requests IS
  'Org admins can view all requests submitted to their organization.';

-- Org admins can UPDATE workflow fields (status, assigned_to_user_id, admin_notes)
CREATE POLICY org_contact_requests__org_admin_update
  ON public.org_contact_requests
  FOR UPDATE TO authenticated
  USING (public.user_is_org_admin(auth.uid(), org_id));

COMMENT ON POLICY org_contact_requests__org_admin_update ON public.org_contact_requests IS
  'Org admins can update status, assignment, and notes on requests in their organization.';

-- Platform admins can read all (for support/debug)
CREATE POLICY org_contact_requests__platform_admin_select
  ON public.org_contact_requests
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

COMMENT ON POLICY org_contact_requests__platform_admin_select ON public.org_contact_requests IS
  'Platform admins can read all org contact requests for support and debugging.';

-- ============================================================================
-- STEP 4: Indexes
-- ============================================================================

CREATE INDEX idx_org_contact_requests_org_id
  ON public.org_contact_requests(org_id);

CREATE INDEX idx_org_contact_requests_requester
  ON public.org_contact_requests(requester_user_id);

-- Supports org admin list view with status filter
CREATE INDEX idx_org_contact_requests_org_status
  ON public.org_contact_requests(org_id, status);

-- Supports demand signal COUNT query (feature requests per org per feature)
CREATE INDEX idx_org_contact_requests_feature_demand
  ON public.org_contact_requests(org_id, requested_feature_key, created_at DESC)
  WHERE requested_feature_key IS NOT NULL;

COMMIT;
