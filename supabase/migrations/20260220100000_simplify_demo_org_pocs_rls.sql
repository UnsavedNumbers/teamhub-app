-- Migration: simplify_demo_org_pocs_rls
-- Description: Disable RLS on demo_org_pocs entirely — it only stores contact info
-- for demo orgs and all writes come from anonymous users.
-- Author: system
-- Date: 2026-02-20

ALTER TABLE public.demo_org_pocs DISABLE ROW LEVEL SECURITY;
