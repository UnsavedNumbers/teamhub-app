-- Customers Table
-- Creates customers table for facility rental management
-- External customers who rent facilities (separate from internal teams/programs)

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    org_id uuid NOT NULL,
    name text NOT NULL,
    contact_email text,
    contact_phone text,
    billing_address jsonb, -- { street, city, state, postal_code, country }
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    CONSTRAINT customers_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON public.customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(org_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(org_id, contact_email) WHERE contact_email IS NOT NULL;

-- Updated_at trigger (use generic function from baseline)
CREATE TRIGGER customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.customers IS 'External customers who rent facilities';
COMMENT ON COLUMN public.customers.billing_address IS 'JSONB object with street, city, state, postal_code, country';

-- ============================================================================
-- ROW LEVEL SECURITY ENABLEMENT
-- ============================================================================

ALTER TABLE ONLY public.customers FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- SELECT: Org members can view customers in their org
CREATE POLICY "Org members can view customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_has_org_access(auth.uid(), org_id)
);

-- INSERT: Org admins only
CREATE POLICY "Org admins can create customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

-- UPDATE: Org admins only
CREATE POLICY "Org admins can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
)
WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

-- DELETE: Org admins only
CREATE POLICY "Org admins can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (
    public.is_platform_admin(auth.uid())
    OR public.user_is_org_admin(auth.uid(), org_id)
);

COMMENT ON POLICY "Org members can view customers" ON public.customers IS 'All org members can view customers';
COMMENT ON POLICY "Org admins can create customers" ON public.customers IS 'Only org admins can create customers';
COMMENT ON POLICY "Org admins can update customers" ON public.customers IS 'Only org admins can update customers';
COMMENT ON POLICY "Org admins can delete customers" ON public.customers IS 'Only org admins can delete customers';
