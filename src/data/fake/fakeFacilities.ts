/**
 * Fake Facilities Data Module
 *
 * Provides fake data for facilities, resources, blackouts, and reservations.
 * Used in demo mode when USE_FAKE_DATA is true.
 */

import { DEMO_ORG_A_ID } from '../config'
import type {
    Facility,
    FacilityResource,
    FacilityBlackout,
    FacilityReservation,
    FacilityType,
    ResourceType,
    ReservationType,
    ReservationStatus,
} from '../../types/facilities'

// ============================================================================
// Facility IDs
// ============================================================================

export const FACILITY_RIVERSIDE_COMPLEX_ID = 'facility-riverside-complex-001'
export const FACILITY_EASTSIDE_PARK_ID = 'facility-eastside-park-001'
export const FACILITY_COMMUNITY_CENTER_ID = 'facility-community-center-001'

// ============================================================================
// Resource IDs
// ============================================================================

export const RESOURCE_RIVERSIDE_FIELD_1_ID = 'resource-riverside-field-1-001'
export const RESOURCE_RIVERSIDE_FIELD_2_ID = 'resource-riverside-field-2-001'
export const RESOURCE_RIVERSIDE_COURT_A_ID = 'resource-riverside-court-a-001'
export const RESOURCE_EASTSIDE_FIELD_1_ID = 'resource-eastside-field-1-001'
export const RESOURCE_COMMUNITY_GYM_ID = 'resource-community-gym-001'

// ============================================================================
// Helper Functions
// ============================================================================

const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

function addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
}

function setTime(date: Date, hours: number, minutes: number): string {
    const result = new Date(date)
    result.setHours(hours, minutes, 0, 0)
    return result.toISOString()
}

// ============================================================================
// Fake Facilities Data
// ============================================================================

export const fakeFacilities: Facility[] = [
    {
        id: FACILITY_RIVERSIDE_COMPLEX_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Riverside Sports Complex',
        facility_type: 'complex' as FacilityType,
        status: 'active',
        is_public: true,
        description: 'Multi-field sports complex with soccer fields, basketball courts, and parking.',
        address_mode: 'internal_google_place',
        place_id: 'ChIJRiversideComplex123',
        formatted_address: '123 Riverside Drive, Springfield, MA 01103',
        city: 'Springfield',
        state: 'MA',
        postal_code: '01103',
        country: 'US',
        latitude: 42.1015,
        longitude: -72.5898,
        timezone: 'America/New_York',
        parking_notes: 'Park in north lot. Overflow parking available in south lot.',
        entry_instructions: 'Enter through main gate. Check in at front desk.',
        contact_name: 'John Smith',
        contact_phone: '(413) 555-0100',
        contact_email: 'riverside@example.com',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: FACILITY_EASTSIDE_PARK_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Eastside Park',
        facility_type: 'park' as FacilityType,
        status: 'active',
        is_public: true,
        description: 'Community park with soccer fields and playground.',
        address_mode: 'internal_google_place',
        place_id: 'ChIJEastsidePark123',
        formatted_address: '456 Eastside Avenue, Springfield, MA 01105',
        city: 'Springfield',
        state: 'MA',
        postal_code: '01105',
        country: 'US',
        latitude: 42.0950,
        longitude: -72.5800,
        timezone: 'America/New_York',
        parking_notes: 'Street parking available. No parking lot.',
        entry_instructions: null,
        contact_name: null,
        contact_phone: null,
        contact_email: null,
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-01-20T00:00:00Z',
    },
    {
        id: FACILITY_COMMUNITY_CENTER_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Springfield Community Center',
        facility_type: 'gym' as FacilityType,
        status: 'active',
        is_public: false,
        description: 'Indoor gymnasium for basketball and other indoor sports.',
        address_mode: 'manual',
        place_id: null,
        formatted_address: '789 Main Street, Springfield, MA 01101',
        city: 'Springfield',
        state: 'MA',
        postal_code: '01101',
        country: 'US',
        latitude: 42.1000,
        longitude: -72.5900,
        timezone: 'America/New_York',
        parking_notes: 'Parking available in rear lot.',
        entry_instructions: 'Use side entrance. Key code required.',
        contact_name: 'Jane Doe',
        contact_phone: '(413) 555-0200',
        contact_email: 'community@example.com',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
    },
]

// ============================================================================
// Fake Resources Data
// ============================================================================

export const fakeResources: FacilityResource[] = [
    {
        id: RESOURCE_RIVERSIDE_FIELD_1_ID,
        org_id: DEMO_ORG_A_ID,
        facility_id: FACILITY_RIVERSIDE_COMPLEX_ID,
        name: 'Field 1',
        resource_type: 'field' as ResourceType,
        sport_tags: ['soccer', 'lacrosse'],
        status: 'active',
        surface_type: 'grass',
        dimensions: { length: 110, width: 70, unit: 'yards' },
        lighting: true,
        indoor: false,
        capacity: 200,
        reservable: true,
        notes: 'Main field. Best condition.',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: RESOURCE_RIVERSIDE_FIELD_2_ID,
        org_id: DEMO_ORG_A_ID,
        facility_id: FACILITY_RIVERSIDE_COMPLEX_ID,
        name: 'Field 2',
        resource_type: 'field' as ResourceType,
        sport_tags: ['soccer'],
        status: 'active',
        surface_type: 'turf',
        dimensions: { length: 110, width: 70, unit: 'yards' },
        lighting: true,
        indoor: false,
        capacity: 200,
        reservable: true,
        notes: 'Turf field. All-weather.',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: RESOURCE_RIVERSIDE_COURT_A_ID,
        org_id: DEMO_ORG_A_ID,
        facility_id: FACILITY_RIVERSIDE_COMPLEX_ID,
        name: 'Court A',
        resource_type: 'court' as ResourceType,
        sport_tags: ['basketball'],
        status: 'active',
        surface_type: 'hardwood',
        dimensions: { length: 94, width: 50, unit: 'feet' },
        lighting: true,
        indoor: true,
        capacity: 150,
        reservable: true,
        notes: 'Full-size basketball court.',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: RESOURCE_EASTSIDE_FIELD_1_ID,
        org_id: DEMO_ORG_A_ID,
        facility_id: FACILITY_EASTSIDE_PARK_ID,
        name: 'Field 1',
        resource_type: 'field' as ResourceType,
        sport_tags: ['soccer'],
        status: 'active',
        surface_type: 'grass',
        dimensions: { length: 100, width: 60, unit: 'yards' },
        lighting: false,
        indoor: false,
        capacity: 150,
        reservable: true,
        notes: 'Smaller field, good for practices.',
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-01-20T00:00:00Z',
    },
    {
        id: RESOURCE_COMMUNITY_GYM_ID,
        org_id: DEMO_ORG_A_ID,
        facility_id: FACILITY_COMMUNITY_CENTER_ID,
        name: 'Main Gym',
        resource_type: 'court' as ResourceType,
        sport_tags: ['basketball'],
        status: 'active',
        surface_type: 'hardwood',
        dimensions: { length: 94, width: 50, unit: 'feet' },
        lighting: true,
        indoor: true,
        capacity: 200,
        reservable: true,
        notes: 'Full-size gymnasium with bleachers.',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
    },
]

// ============================================================================
// Fake Blackouts Data
// ============================================================================

export const fakeBlackouts: FacilityBlackout[] = [
    {
        id: 'blackout-maintenance-001',
        org_id: DEMO_ORG_A_ID,
        facility_id: FACILITY_RIVERSIDE_COMPLEX_ID,
        resource_id: RESOURCE_RIVERSIDE_FIELD_1_ID,
        title: 'Field Maintenance',
        reason: 'Scheduled turf maintenance',
        start_at: setTime(addDays(today, 7), 8, 0),
        end_at: setTime(addDays(today, 7), 17, 0),
        repeats_rule: null,
        created_by: null,
        created_at: '2024-01-15T00:00:00Z',
    },
    {
        id: 'blackout-facility-closure-001',
        org_id: DEMO_ORG_A_ID,
        facility_id: FACILITY_RIVERSIDE_COMPLEX_ID,
        resource_id: null,
        title: 'Facility Closure',
        reason: 'Holiday closure',
        start_at: setTime(addDays(today, 14), 0, 0),
        end_at: setTime(addDays(today, 14), 23, 59),
        repeats_rule: null,
        created_by: null,
        created_at: '2024-01-15T00:00:00Z',
    },
]

// ============================================================================
// Fake Reservations Data
// ============================================================================

export const fakeReservations: FacilityReservation[] = [
    {
        id: 'reservation-practice-001',
        org_id: DEMO_ORG_A_ID,
        facility_id: FACILITY_RIVERSIDE_COMPLEX_ID,
        resource_id: RESOURCE_RIVERSIDE_FIELD_1_ID,
        reservation_type: 'practice' as ReservationType,
        status: 'confirmed' as ReservationStatus,
        start_at: setTime(today, 17, 0),
        end_at: setTime(today, 18, 30),
        title: 'U10 Soccer Practice',
        event_id: 'event-u10-soccer-practice-001',
        team_id: null,
        program_id: null,
        sport_id: null,
        notes: 'Regular practice session',
        created_by: null,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: 'reservation-game-001',
        org_id: DEMO_ORG_A_ID,
        facility_id: FACILITY_EASTSIDE_PARK_ID,
        resource_id: RESOURCE_EASTSIDE_FIELD_1_ID,
        reservation_type: 'game' as ReservationType,
        status: 'confirmed' as ReservationStatus,
        start_at: setTime(addDays(today, 5), 10, 0),
        end_at: setTime(addDays(today, 5), 11, 30),
        title: 'Game vs. Eastside Eagles',
        event_id: 'event-u10-soccer-game-001',
        team_id: null,
        program_id: null,
        sport_id: null,
        notes: null,
        created_by: null,
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-01-20T00:00:00Z',
    },
    {
        id: 'reservation-practice-002',
        org_id: DEMO_ORG_A_ID,
        facility_id: FACILITY_RIVERSIDE_COMPLEX_ID,
        resource_id: RESOURCE_RIVERSIDE_COURT_A_ID,
        reservation_type: 'practice' as ReservationType,
        status: 'tentative' as ReservationStatus,
        start_at: setTime(addDays(today, 3), 18, 0),
        end_at: setTime(addDays(today, 3), 19, 30),
        title: 'Basketball Practice',
        event_id: null,
        team_id: null,
        program_id: null,
        sport_id: null,
        notes: 'Tentative hold',
        created_by: null,
        created_at: '2024-01-25T00:00:00Z',
        updated_at: '2024-01-25T00:00:00Z',
    },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getFacilitiesForOrg(orgId: string): Facility[] {
    return fakeFacilities.filter(f => f.org_id === orgId)
}

export function getFacilityById(facilityId: string): Facility | null {
    return fakeFacilities.find(f => f.id === facilityId) || null
}

export function getResourcesForFacility(facilityId: string): FacilityResource[] {
    return fakeResources.filter(r => r.facility_id === facilityId)
}

export function getResourcesForOrg(orgId: string): FacilityResource[] {
    return fakeResources.filter(r => r.org_id === orgId)
}

export function getResourceById(resourceId: string): FacilityResource | null {
    return fakeResources.find(r => r.id === resourceId) || null
}

export function getBlackoutsForOrg(orgId: string, facilityId?: string, resourceId?: string): FacilityBlackout[] {
    let result = fakeBlackouts.filter(b => b.org_id === orgId)
    if (facilityId) {
        result = result.filter(b => b.facility_id === facilityId)
    }
    if (resourceId) {
        result = result.filter(b => b.resource_id === resourceId)
    }
    return result
}

export function getReservationsForOrg(
    orgId: string,
    start?: string,
    end?: string,
    facilityIds?: string[],
    resourceIds?: string[]
): FacilityReservation[] {
    let result = fakeReservations.filter(r => r.org_id === orgId && r.status !== 'cancelled')
    
    if (facilityIds && facilityIds.length > 0) {
        result = result.filter(r => facilityIds.includes(r.facility_id))
    }
    
    if (resourceIds && resourceIds.length > 0) {
        result = result.filter(r => resourceIds.includes(r.resource_id))
    }
    
    if (start) {
        result = result.filter(r => r.end_at >= start)
    }
    
    if (end) {
        result = result.filter(r => r.start_at <= end)
    }
    
    return result.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
}

export function getReservationById(reservationId: string): FacilityReservation | null {
    return fakeReservations.find(r => r.id === reservationId) || null
}
