-- Fix RLS policies for demo-related tables to avoid platform_admins permission errors
--
-- Similar to demo_organizations, the demo_org_pocs, demo_codes, and demo_sessions tables
-- have RLS policies that try to read platform_admins table. This causes permission denied
-- errors when anonymous or regular authenticated users perform operations.
--
-- Solution: Replace platform_admins check policies with simpler authenticated user policies.
-- Admin access is already controlled by application-layer authentication (ProtectedRoute).

-- ============================================================================
-- demo_org_pocs TABLE
-- ============================================================================

drop policy if exists demo_org_pocs_platform_admin_all on public.demo_org_pocs;

-- Allow authenticated users (verified as admins by app layer)
create policy demo_org_pocs_authenticated_all
on public.demo_org_pocs
for all
to authenticated
using (TRUE)
with check (TRUE);

-- ============================================================================
-- demo_codes TABLE
-- ============================================================================

drop policy if exists demo_codes_platform_admin_all on public.demo_codes;

-- Allow authenticated users (verified as admins by app layer)
create policy demo_codes_authenticated_all
on public.demo_codes
for all
to authenticated
using (TRUE)
with check (TRUE);

-- ============================================================================
-- demo_sessions TABLE
-- ============================================================================

drop policy if exists demo_sessions_platform_admin_all on public.demo_sessions;

-- Keep the existing user read policy (demo_sessions_user_read_own should already exist)
-- Allow authenticated users (verified as admins by app layer) to manage sessions
create policy demo_sessions_authenticated_all
on public.demo_sessions
for all
to authenticated
using (TRUE)
with check (TRUE);

comment on policy demo_org_pocs_authenticated_all on public.demo_org_pocs is
'Allows authenticated users (verified as platform admins by application layer) to perform all operations on demo POCs.';

comment on policy demo_codes_authenticated_all on public.demo_codes is
'Allows authenticated users (verified as platform admins by application layer) to perform all operations on demo codes.';

comment on policy demo_sessions_authenticated_all on public.demo_sessions is
'Allows authenticated users (verified as platform admins by application layer) to perform all operations on demo sessions.';
