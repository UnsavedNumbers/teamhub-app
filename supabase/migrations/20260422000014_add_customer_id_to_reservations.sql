-- Add customer_id to facility_reservations
-- Links reservations to external customers (nullable, mutually exclusive with team/program/event)

-- ============================================================================
-- ADD CUSTOMER_ID COLUMN
-- ============================================================================

ALTER TABLE public.facility_reservations
ADD COLUMN IF NOT EXISTS customer_id uuid;

-- Add foreign key constraint (idempotent check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'facility_reservations_customer_id_fkey'
          AND conrelid = 'public.facility_reservations'::regclass
    ) THEN
        ALTER TABLE public.facility_reservations
        ADD CONSTRAINT facility_reservations_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for customer filtering
CREATE INDEX IF NOT EXISTS idx_facility_reservations_customer_id 
ON public.facility_reservations(org_id, customer_id) 
WHERE customer_id IS NOT NULL;

COMMENT ON COLUMN public.facility_reservations.customer_id IS 'External customer who booked this reservation (mutually exclusive with team_id/program_id/event_id)';

-- ============================================================================
-- ADD CANCELLATION_REASON COLUMN
-- ============================================================================

ALTER TABLE public.facility_reservations
ADD COLUMN IF NOT EXISTS cancellation_reason text;

COMMENT ON COLUMN public.facility_reservations.cancellation_reason IS 'Optional reason provided when reservation is cancelled';
