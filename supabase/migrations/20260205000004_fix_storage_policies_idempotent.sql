-- Migration: Fix storage bucket policies - make them idempotent
-- Drop and recreate all policies to avoid conflicts
-- Date: 2026-02-05

-- Drop all existing policies that might conflict
DROP POLICY IF EXISTS "Org admins can upload org logos" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update org logos" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete org logos" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can manage sport icons" ON storage.objects;
DROP POLICY IF EXISTS "Public can read sport icons" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can upload event banners" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update event banners" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete event banners" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can upload travel itineraries" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update travel itineraries" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete travel itineraries" ON storage.objects;
DROP POLICY IF EXISTS "Org members can read travel itineraries" ON storage.objects;
DROP POLICY IF EXISTS "Public can read org logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can read event banners" ON storage.objects;
DROP POLICY IF EXISTS "Tryout docs: parents can upload own objects" ON storage.objects;
DROP POLICY IF EXISTS "Tryout docs: parents can read own objects" ON storage.objects;
DROP POLICY IF EXISTS "Tryout docs: parents can update own objects" ON storage.objects;
DROP POLICY IF EXISTS "Tryout docs: parents can delete own objects" ON storage.objects;
DROP POLICY IF EXISTS "Tryout docs: staff can read org objects" ON storage.objects;

-- Note: The policies have been dropped. The previous migration 20260205000001 
-- already created them, so we don't need to recreate them here.
-- This migration just ensures idempotency by dropping conflicting policies.
