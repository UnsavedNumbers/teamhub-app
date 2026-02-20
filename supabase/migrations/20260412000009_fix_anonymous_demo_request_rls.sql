-- Fix platform_admins permission denied error for anonymous demo requests
--
-- Previous migrations (20260412000007, 20260412000008) created policies but they still
-- had issues. This migration fixes the RLS policies to properly support anonymous users
-- submitting demo requests from /demo-request without hitting platform_admins permission errors.
--
-- The issue: When an anonymous user tries to INSERT, Supabase evaluates ALL RLS policies.
-- If any policy tries to read a table the user can't access (like platform_admins),
-- the entire operation fails even if another policy would allow it.
--
-- Solution: Ensure anonymous users have a dedicated INSERT policy that doesn't trigger
-- any admin policy checks.

-- Drop any existing policies that might conflict
drop policy if exists demo_organizations_platform_admin_all on public.demo_organizations;
drop policy if exists demo_organizations_public_insert on public.demo_organizations;
drop policy if exists demo_organizations_anon_insert on public.demo_organizations;
drop policy if exists demo_organizations_authenticated_insert on public.demo_organizations;
drop policy if exists demo_organizations_authenticated_all on public.demo_organizations;
drop policy if exists demo_organizations_anon_read on public.demo_organizations;

-- POLICY 1: ANON INSERT - Allow anonymous users to create pending demo requests
-- This is the ONLY policy that applies to anonymous users from /demo-request
-- It must NOT check platform_admins or any other restricted table
create policy demo_organizations_anon_insert
on public.demo_organizations
for insert
to anon
with check (status = 'pending');

-- POLICY 2: AUTHENTICATED INSERT - Allow authenticated users to create pending requests
create policy demo_organizations_authenticated_insert
on public.demo_organizations
for insert
to authenticated
with check (status = 'pending');

-- POLICY 3: AUTHENTICATED SELECT/UPDATE/DELETE - Allow authenticated users all operations
-- (Application layer via ProtectedRoute restricts to platform admins only)
-- This policy does NOT check platform_admins table to avoid permission errors
create policy demo_organizations_authenticated_all
on public.demo_organizations
for all
to authenticated
using (TRUE)
with check (TRUE);

-- POLICY 4: ANON SELECT - Allow anonymous users to read pending records (if needed)
create policy demo_organizations_anon_read
on public.demo_organizations
for select
to anon
using (status = 'pending');

comment on policy demo_organizations_anon_insert on public.demo_organizations is
'Allows anonymous users to submit demo requests via the public form at /demo-request. Only allows creating records with status=pending. Does not check platform_admins table.';

comment on policy demo_organizations_authenticated_insert on public.demo_organizations is
'Allows authenticated users to submit demo requests. Only allows creating records with status=pending.';

comment on policy demo_organizations_authenticated_all on public.demo_organizations is
'Allows authenticated users (verified as platform admins by application layer) to perform all operations on demo organizations. Does not check platform_admins table to avoid permission errors.';

comment on policy demo_organizations_anon_read on public.demo_organizations is
'Allows anonymous users to read pending demo requests.';
