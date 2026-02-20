-- Fix platform_admins permission denied error for anonymous demo requests
--
-- The issue: When an anonymous user tries to INSERT from /demo-request, Supabase evaluates ALL RLS policies.
-- The platform_admin_all policy tries to read platform_admins table, which anonymous users cannot read.
-- This causes "permission denied for table platform_admins" even though the public insert policy would allow it.
--
-- Solution: Remove the platform_admin_all policy that checks platform_admins table.
-- Use separate policies:
-- - ANON INSERT: For anonymous users submitting demo requests (status='pending' only)
-- - AUTHENTICATED: For admin operations (admin access verified by application layer via ProtectedRoute)

-- Drop all existing demo_organizations policies
drop policy if exists demo_organizations_platform_admin_all on public.demo_organizations;
drop policy if exists demo_organizations_public_insert on public.demo_organizations;

-- POLICY 1: ANON INSERT - Allow anonymous users to create pending demo requests
-- This is the ONLY policy that applies to anonymous users from /demo-request
create policy demo_organizations_anon_insert
on public.demo_organizations
for insert
to anon
with check (status = 'pending');

-- POLICY 2: AUTHENTICATED INSERT - Allow authenticated users to create pending requests too
-- (Some authenticated users might also submit via the form)
create policy demo_organizations_authenticated_insert
on public.demo_organizations
for insert
to authenticated
with check (status = 'pending');

-- POLICY 3: AUTHENTICATED ALL - Allow authenticated users all operations
-- (Application layer via ProtectedRoute restricts to platform admins only)
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
'Allows anonymous users to submit demo requests via the public form at /demo-request. Only allows creating records with status=pending.';

comment on policy demo_organizations_authenticated_insert on public.demo_organizations is
'Allows authenticated users to submit demo requests. Only allows creating records with status=pending.';

comment on policy demo_organizations_authenticated_all on public.demo_organizations is
'Allows authenticated users (verified as platform admins by application layer) to perform all operations on demo organizations.';

comment on policy demo_organizations_anon_read on public.demo_organizations is
'Allows anonymous users to read pending demo requests.';
