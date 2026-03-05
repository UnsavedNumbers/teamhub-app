-- Facilities Management Schema
-- Creates tables for facilities, resources, blackouts, and reservations
-- Extends events table to support internal vs external venue selection

-- ============================================================================
-- ENUMS (if needed - using text for flexibility per spec)
-- ============================================================================

-- Note: Using text columns instead of enums for facility_type, resource_type, 
-- reservation_type, and status fields to allow flexibility without migrations
-- for new values. Application layer should validate values.

-- ============================================================================
-- FACILITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.facilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    org_id uuid NOT NULL,
    name text NOT NULL,
    facility_type text, -- e.g. 'park', 'school', 'gym', 'arena'
    status text DEFAULT 'active', -- 'active', 'inactive'
    is_public boolean DEFAULT false,
    description text,
    address_mode text, -- 'internal_google_place' | 'manual'
    place_id text, -- Google Places API place_id
    formatted_address text,
    city text,
    state text,
    postal_code text,
    country text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    timezone text NOT NULL DEFAULT 'America/New_York',
    parking_notes text,
    entry_instructions text,
    contact_name text,
    contact_phone text,
    contact_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    CONSTRAINT facilities_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT facilities_valid_latitude CHECK ((latitude IS NULL) OR ((latitude >= -90) AND (latitude <= 90))),
    CONSTRAINT facilities_valid_longitude CHECK ((longitude IS NULL) OR ((longitude >= -180) AND (longitude <= 180))),
    CONSTRAINT facilities_valid_timezone CHECK ((timezone ~ '^[A-Za-z]+/[A-Za-z_]+$') OR (timezone = 'UTC'))
);

CREATE INDEX IF NOT EXISTS idx_facilities_org_id ON public.facilities(org_id);
CREATE INDEX IF NOT EXISTS idx_facilities_status ON public.facilities(org_id, status) WHERE status = 'active';

COMMENT ON TABLE public.facilities IS 'Facilities (complexes, gyms, schools, parks) owned by organizations';
COMMENT ON COLUMN public.facilities.address_mode IS 'How address was set: internal_google_place (linked to Google) or manual';
COMMENT ON COLUMN public.facilities.timezone IS 'Timezone for this facility (important for scheduling correctness)';

-- ============================================================================
-- FACILITY RESOURCES TABLE (sub-locations within a facility)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.facility_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    org_id uuid NOT NULL,
    facility_id uuid NOT NULL,
    name text NOT NULL,
    resource_type text, -- e.g. 'field', 'court', 'diamond', 'rink', 'pool', 'room'
    sport_tags text[], -- Array of sport tags e.g. ['soccer', 'lacrosse']
    status text DEFAULT 'active', -- 'active', 'inactive'
    surface_type text, -- e.g. 'turf', 'grass', 'hardwood'
    dimensions jsonb, -- { length, width, unit }
    lighting boolean,
    indoor boolean,
    capacity integer,
    reservable boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    CONSTRAINT facility_resources_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT facility_resources_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_facility_resources_org_id ON public.facility_resources(org_id);
CREATE INDEX IF NOT EXISTS idx_facility_resources_facility_id ON public.facility_resources(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_resources_status ON public.facility_resources(org_id, facility_id, status) WHERE status = 'active';

COMMENT ON TABLE public.facility_resources IS 'Sub-locations within facilities (fields, courts, diamonds, rinks, rooms)';
COMMENT ON COLUMN public.facility_resources.sport_tags IS 'Array of sport tags that can use this resource';
COMMENT ON COLUMN public.facility_resources.dimensions IS 'JSON object with length, width, unit fields';

-- ============================================================================
-- FACILITY BLACKOUTS TABLE (maintenance, closures, blocked time)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.facility_blackouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    org_id uuid NOT NULL,
    facility_id uuid, -- Can apply to whole facility
    resource_id uuid, -- Or to a specific resource
    title text NOT NULL,
    reason text,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    repeats_rule text, -- Optional RRULE for recurring closures (v1: stored but not expanded in conflict checks)
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    CONSTRAINT facility_blackouts_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT facility_blackouts_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE,
    CONSTRAINT facility_blackouts_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.facility_resources(id) ON DELETE CASCADE,
    CONSTRAINT facility_blackouts_has_scope CHECK ((facility_id IS NOT NULL) OR (resource_id IS NOT NULL)),
    CONSTRAINT facility_blackouts_valid_time CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_facility_blackouts_org_id ON public.facility_blackouts(org_id);
CREATE INDEX IF NOT EXISTS idx_facility_blackouts_resource_id ON public.facility_blackouts(org_id, resource_id, start_at, end_at) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facility_blackouts_facility_id ON public.facility_blackouts(org_id, facility_id, start_at, end_at) WHERE facility_id IS NOT NULL AND resource_id IS NULL;

COMMENT ON TABLE public.facility_blackouts IS 'Maintenance windows, closures, and blocked time periods';
COMMENT ON COLUMN public.facility_blackouts.repeats_rule IS 'RRULE string for recurring closures (v1: stored but conflict check supports one-time only)';

-- ============================================================================
-- FACILITY RESERVATIONS TABLE (the actual bookings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.facility_reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    org_id uuid NOT NULL,
    facility_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    reservation_type text NOT NULL, -- 'practice', 'game', 'tournament', 'meeting', 'rental', 'maintenance'
    status text NOT NULL DEFAULT 'confirmed', -- 'tentative', 'confirmed', 'cancelled'
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    title text NOT NULL,
    event_id uuid, -- Link to events table when reservation backs an event
    team_id uuid,
    program_id uuid,
    sport_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    CONSTRAINT facility_reservations_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT facility_reservations_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE,
    CONSTRAINT facility_reservations_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.facility_resources(id) ON DELETE CASCADE,
    CONSTRAINT facility_reservations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL,
    CONSTRAINT facility_reservations_valid_time CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_facility_reservations_org_id ON public.facility_reservations(org_id);
CREATE INDEX IF NOT EXISTS idx_facility_reservations_resource_id ON public.facility_reservations(org_id, resource_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_facility_reservations_event_id ON public.facility_reservations(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facility_reservations_status ON public.facility_reservations(org_id, resource_id, status, start_at, end_at) WHERE status != 'cancelled';

COMMENT ON TABLE public.facility_reservations IS 'Actual bookings/reservations of facility resources';
COMMENT ON COLUMN public.facility_reservations.status IS 'tentative (holds), confirmed (blocks conflicts), cancelled (never blocks)';
COMMENT ON COLUMN public.facility_reservations.event_id IS 'When reservation is linked to an event, this references events.id';

-- ============================================================================
-- EVENTS TABLE EXTENSIONS
-- ============================================================================

-- Add location_mode and facility references to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS location_mode text DEFAULT 'external', -- 'internal' | 'external'
ADD COLUMN IF NOT EXISTS facility_id uuid,
ADD COLUMN IF NOT EXISTS facility_resource_id uuid;

-- Add foreign keys
ALTER TABLE public.events
ADD CONSTRAINT events_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL,
ADD CONSTRAINT events_facility_resource_id_fkey FOREIGN KEY (facility_resource_id) REFERENCES public.facility_resources(id) ON DELETE SET NULL;

-- Add constraint: if location_mode = 'internal', facility_id and facility_resource_id must be set
-- Note: Application layer should enforce this; CHECK constraint would require function
-- For now, we rely on application validation

CREATE INDEX IF NOT EXISTS idx_events_facility_id ON public.events(facility_id) WHERE facility_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_facility_resource_id ON public.events(facility_resource_id) WHERE facility_resource_id IS NOT NULL;

COMMENT ON COLUMN public.events.location_mode IS 'internal: uses facility/resource reservation; external: uses Google place (existing behavior)';
COMMENT ON COLUMN public.events.facility_id IS 'Facility for internal venue events';
COMMENT ON COLUMN public.events.facility_resource_id IS 'Resource within facility for internal venue events';

-- ============================================================================
-- ROW LEVEL SECURITY ENABLEMENT
-- ============================================================================

ALTER TABLE ONLY public.facilities FORCE ROW LEVEL SECURITY;
ALTER TABLE ONLY public.facility_resources FORCE ROW LEVEL SECURITY;
ALTER TABLE ONLY public.facility_blackouts FORCE ROW LEVEL SECURITY;
ALTER TABLE ONLY public.facility_reservations FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_facilities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER facilities_updated_at
    BEFORE UPDATE ON public.facilities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_facilities_updated_at();

CREATE TRIGGER facility_resources_updated_at
    BEFORE UPDATE ON public.facility_resources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_facilities_updated_at();

CREATE TRIGGER facility_reservations_updated_at
    BEFORE UPDATE ON public.facility_reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_facilities_updated_at();

-- ============================================================================
-- NOTES
-- ============================================================================

-- event_locations sync strategy:
-- When an event with location_mode = 'internal' is created/updated, the application
-- should upsert event_locations with:
--   - venue_name = facility.name + ' - ' + resource.name
--   - address fields from facility
--   - place_id, latitude, longitude from facility (if available)
-- This allows existing EventDetail and list views to work without changes.
-- The event_locations row is still tied to event_id, so existing RLS policies apply.
