-- Comprehensive fix for organizations RLS policies
-- Drop ALL existing policies on organizations to start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'organizations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', pol.policyname);
    END LOOP;
END $$;

-- Now create clean policies

-- 1. INSERT: Any authenticated user can create an organization
CREATE POLICY "Anyone can create organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. SELECT: Members can view their orgs
CREATE POLICY "Members can view their orgs"
ON organizations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.user_id = auth.uid()
        AND organization_members.organization_id = organizations.id
    )
);

-- 3. SELECT: Platform admins can view all
CREATE POLICY "Platform admins can view all orgs"
ON organizations FOR SELECT
TO authenticated
USING (is_platform_admin(auth.uid()));

-- 4. UPDATE: Org admins can update their org
CREATE POLICY "Org admins can update their org"
ON organizations FOR UPDATE
TO authenticated
USING (user_is_org_admin(auth.uid(), id))
WITH CHECK (user_is_org_admin(auth.uid(), id));

-- 5. ALL: Platform admins can do everything
CREATE POLICY "Platform admins full access"
ON organizations FOR ALL
TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- 6. DELETE: Only platform admins can delete orgs (handled by #5)
