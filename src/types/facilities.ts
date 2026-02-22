/**
 * Facilities Management Domain Types
 * 
 * Types for facilities, resources, blackouts, and reservations.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type FacilityType = 'park' | 'school' | 'gym' | 'arena' | 'complex' | 'other'

export type FacilityStatus = 'active' | 'inactive'

export type ResourceType = 'field' | 'court' | 'diamond' | 'rink' | 'pool' | 'room' | 'track' | 'other'

export type ResourceStatus = 'active' | 'inactive'

export type ReservationType = 'practice' | 'game' | 'tournament' | 'meeting' | 'rental' | 'maintenance'

export type ReservationStatus = 'tentative' | 'confirmed' | 'cancelled'

export type LocationMode = 'internal' | 'external'

export type AddressMode = 'internal_google_place' | 'manual'

// ============================================================================
// DOMAIN MODELS
// ============================================================================

export interface Facility {
    id: string
    org_id: string
    name: string
    facility_type: FacilityType | null
    status: FacilityStatus
    is_public: boolean
    description: string | null
    address_mode: AddressMode | null
    place_id: string | null
    formatted_address: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string | null
    latitude: number | null
    longitude: number | null
    timezone: string
    parking_notes: string | null
    entry_instructions: string | null
    contact_name: string | null
    contact_phone: string | null
    contact_email: string | null
    created_at: string
    updated_at: string
}

export interface FacilityResource {
    id: string
    org_id: string
    facility_id: string
    name: string
    resource_type: ResourceType | null
    sport_tags: string[]
    status: ResourceStatus
    surface_type: string | null
    dimensions: {
        length?: number
        width?: number
        unit?: string
    } | null
    lighting: boolean | null
    indoor: boolean | null
    capacity: number | null
    reservable: boolean
    notes: string | null
    created_at: string
    updated_at: string
}

export interface FacilityBlackout {
    id: string
    org_id: string
    facility_id: string | null
    resource_id: string | null
    title: string
    reason: string | null
    start_at: string // ISO 8601
    end_at: string // ISO 8601
    repeats_rule: string | null // RRULE string (v1: stored but not expanded)
    created_by: string | null
    created_at: string
}

export interface FacilityReservation {
    id: string
    org_id: string
    facility_id: string
    resource_id: string
    reservation_type: ReservationType
    status: ReservationStatus
    start_at: string // ISO 8601
    end_at: string // ISO 8601
    title: string
    event_id: string | null
    team_id: string | null
    program_id: string | null
    sport_id: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    
    // Relations (loaded via joins)
    facility?: Facility
    resource?: FacilityResource
    event?: {
        id: string
        title: string
        start_time: string
        end_time: string
    }
    team?: {
        id: string
        name: string
    }
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface FacilityFormData {
    name: string
    facility_type: FacilityType | null
    status: FacilityStatus
    is_public: boolean
    description: string
    address_mode: AddressMode | null
    place_id: string | null
    formatted_address: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string | null
    latitude: number | null
    longitude: number | null
    timezone: string
    parking_notes: string
    entry_instructions: string
    contact_name: string
    contact_phone: string
    contact_email: string
}

export interface FacilityResourceFormData {
    name: string
    resource_type: ResourceType | null
    sport_tags: string[]
    status: ResourceStatus
    surface_type: string | null
    dimensions: {
        length?: number
        width?: number
        unit?: string
    } | null
    lighting: boolean | null
    indoor: boolean | null
    capacity: number | null
    reservable: boolean
    notes: string | null
}

export interface FacilityBlackoutFormData {
    facility_id: string | null
    resource_id: string | null
    title: string
    reason: string | null
    start_at: string // ISO 8601
    end_at: string // ISO 8601
    repeats_rule: string | null
}

export interface FacilityReservationFormData {
    facility_id: string
    resource_id: string
    reservation_type: ReservationType
    status: ReservationStatus
    start_at: string // ISO 8601
    end_at: string // ISO 8601
    title: string
    event_id: string | null
    team_id: string | null
    program_id: string | null
    sport_id: string | null
    notes: string | null
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface FacilityFilters {
    status?: FacilityStatus
    facility_type?: FacilityType
    search?: string
}

export interface ResourceFilters {
    facility_id?: string
    resource_type?: ResourceType
    sport_tags?: string[]
    indoor?: boolean
    reservable?: boolean
    status?: ResourceStatus
}

export interface ReservationFilters {
    org_id: string
    facility_ids?: string[]
    resource_ids?: string[]
    resource_type?: ResourceType
    team_id?: string
    program_id?: string
    status?: ReservationStatus
    start?: string // ISO 8601
    end?: string // ISO 8601
}

// ============================================================================
// CONFLICT CHECK TYPES
// ============================================================================

export interface ReservationConflict {
    id: string
    title: string
    start_at: string
    end_at: string
    status: ReservationStatus
    reservation_type: ReservationType
}

export interface BlackoutConflict {
    id: string
    title: string
    start_at: string
    end_at: string
    reason: string | null
}

export interface ConflictCheckResult {
    has_conflict: boolean
    conflicting_reservations: ReservationConflict[]
    conflicting_blackouts: BlackoutConflict[]
}

export interface ReservationAlternative {
    resource_id: string
    resource_name: string
    facility_name: string
    suggested_start_at: string
    suggested_end_at: string
    score: number // Higher is better (same resource > same facility > other)
}

// ============================================================================
// CALENDAR VIEW TYPES
// ============================================================================

export type ScheduleViewMode = 'day' | 'week' | 'month' | 'agenda'

export interface ScheduleViewConfig {
    view: ScheduleViewMode
    date: Date
    facility_ids?: string[]
    resource_ids?: string[]
    show_blackouts: boolean
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface FacilityWithResources extends Facility {
    resources: FacilityResource[]
    resource_count: number
}

export interface ResourceWithFacility extends FacilityResource {
    facility: Facility
}

export interface ReservationWithDetails extends FacilityReservation {
    facility: Facility
    resource: FacilityResource
}
