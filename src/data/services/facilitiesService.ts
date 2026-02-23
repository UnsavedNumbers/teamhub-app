/**
 * Facilities Management Service
 *
 * Provides data access for facilities, resources, blackouts, and reservations.
 * Uses Supabase RPC functions for conflict checking and reservation management.
 */

import { USE_FAKE_DATA } from '../config'
import { supabase } from '../../lib/supabase'
import type {
    Facility,
    FacilityResource,
    FacilityBlackout,
    FacilityReservation,
    FacilityFilters,
    ResourceFilters,
    ReservationFilters,
    ConflictCheckResult,
    ReservationAlternative,
    FacilityFormData,
    FacilityResourceFormData,
    FacilityBlackoutFormData,
    FacilityReservationFormData,
} from '../../types/facilities'
import { normalizeSupabaseResponse, createServiceResponse, type ServiceResponse } from './responseHelpers'
import {
    getFacilitiesForOrg,
    getFacilityById as getFakeFacilityById,
    getResourcesForOrg,
    getResourceById as getFakeResourceById,
    getBlackoutsForOrg,
    getReservationsForOrg,
    getReservationById as getFakeReservationById,
} from '../fake/fakeFacilities'

// ============================================================================
// FACILITIES CRUD
// ============================================================================

export async function getFacilities(
    orgId: string,
    filters?: FacilityFilters
): Promise<{ data: Facility[] | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        let facilities = getFacilitiesForOrg(orgId)
        
        if (filters?.status) {
            facilities = facilities.filter(f => f.status === filters.status)
        }
        
        if (filters?.facility_type) {
            facilities = facilities.filter(f => f.facility_type === filters.facility_type)
        }
        
        if (filters?.search) {
            const searchLower = filters.search.toLowerCase()
            facilities = facilities.filter(f => 
                f.name.toLowerCase().includes(searchLower) ||
                (f.description && f.description.toLowerCase().includes(searchLower))
            )
        }
        
        return createServiceResponse(facilities, null)
    }

    try {
        let query = (supabase as any)
            .from('facilities')
            .select('*')
            .eq('org_id', orgId)

        if (filters?.status) {
            query = query.eq('status', filters.status)
        }

        if (filters?.facility_type) {
            query = query.eq('facility_type', filters.facility_type)
        }

        if (filters?.search) {
            query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        }

        query = query.order('name', { ascending: true })

        const { data, error } = await query

        if (error) {
            return createServiceResponse(null, new Error(`Failed to fetch facilities: ${error.message}`))
        }

        return createServiceResponse((normalizeSupabaseResponse(data, true) as Facility[]), null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error fetching facilities'))
    }
}

export async function getFacilityById(
    facilityId: string
): Promise<{ data: Facility | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        const facility = getFakeFacilityById(facilityId)
        return createServiceResponse(facility, null)
    }

    try {
        const { data, error } = await (supabase as any)
            .from('facilities')
            .select('*')
            .eq('id', facilityId)
            .single()

        if (error) {
            return createServiceResponse(null, new Error(`Failed to fetch facility: ${error.message}`))
        }

        return createServiceResponse(data as Facility, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error fetching facility'))
    }
}

export async function createFacility(
    orgId: string,
    formData: FacilityFormData
): Promise<{ data: Facility | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        return createServiceResponse(null, new Error('Cannot create facilities in demo mode'))
    }

    try {
        const insertData: Record<string, unknown> = {
            org_id: orgId,
            name: formData.name.trim(),
            facility_type: formData.facility_type || null,
            status: formData.status,
            is_public: formData.is_public,
            description: formData.description?.trim() || null,
            address_mode: formData.address_mode || null,
            place_id: formData.place_id || null,
            formatted_address: formData.formatted_address?.trim() || null,
            city: formData.city?.trim() || null,
            state: formData.state?.trim() || null,
            postal_code: formData.postal_code?.trim() || null,
            country: formData.country?.trim() || null,
            latitude: formData.latitude || null,
            longitude: formData.longitude || null,
            timezone: formData.timezone,
            parking_notes: formData.parking_notes?.trim() || null,
            entry_instructions: formData.entry_instructions?.trim() || null,
            contact_name: formData.contact_name?.trim() || null,
            contact_phone: formData.contact_phone?.trim() || null,
            contact_email: formData.contact_email?.trim() || null,
        }

        const { data, error } = await (supabase as any)
            .from('facilities')
            .insert(insertData)
            .select()
            .single()

        if (error) {
            return createServiceResponse(null, new Error(`Failed to create facility: ${error.message}`))
        }

        return createServiceResponse(data as Facility, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error creating facility'))
    }
}

export async function updateFacility(
    facilityId: string,
    formData: Partial<FacilityFormData>
): Promise<{ data: Facility | null; error: Error | null; isEmpty: boolean }> {
    try {
        const updateData: Record<string, unknown> = {}

        if (formData.name !== undefined) updateData.name = formData.name.trim()
        if (formData.facility_type !== undefined) updateData.facility_type = formData.facility_type || null
        if (formData.status !== undefined) updateData.status = formData.status
        if (formData.is_public !== undefined) updateData.is_public = formData.is_public
        if (formData.description !== undefined) updateData.description = formData.description?.trim() || null
        if (formData.address_mode !== undefined) updateData.address_mode = formData.address_mode || null
        if (formData.place_id !== undefined) updateData.place_id = formData.place_id || null
        if (formData.formatted_address !== undefined) updateData.formatted_address = formData.formatted_address?.trim() || null
        if (formData.city !== undefined) updateData.city = formData.city?.trim() || null
        if (formData.state !== undefined) updateData.state = formData.state?.trim() || null
        if (formData.postal_code !== undefined) updateData.postal_code = formData.postal_code?.trim() || null
        if (formData.country !== undefined) updateData.country = formData.country?.trim() || null
        if (formData.latitude !== undefined) updateData.latitude = formData.latitude || null
        if (formData.longitude !== undefined) updateData.longitude = formData.longitude || null
        if (formData.timezone !== undefined) updateData.timezone = formData.timezone
        if (formData.parking_notes !== undefined) updateData.parking_notes = formData.parking_notes?.trim() || null
        if (formData.entry_instructions !== undefined) updateData.entry_instructions = formData.entry_instructions?.trim() || null
        if (formData.contact_name !== undefined) updateData.contact_name = formData.contact_name?.trim() || null
        if (formData.contact_phone !== undefined) updateData.contact_phone = formData.contact_phone?.trim() || null
        if (formData.contact_email !== undefined) updateData.contact_email = formData.contact_email?.trim() || null

        const { data, error } = await (supabase as any)
            .from('facilities')
            .update(updateData)
            .eq('id', facilityId)
            .select()
            .single()

        if (error) {
            return createServiceResponse(null, new Error(`Failed to update facility: ${error.message}`))
        }

        return createServiceResponse(data as Facility, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error updating facility'))
    }
}

export async function deleteFacility(
    facilityId: string
): Promise<ServiceResponse<boolean>> {
    try {
        const { error } = await (supabase as any)
            .from('facilities')
            .delete()
            .eq('id', facilityId)

        if (error) {
            return createServiceResponse(false, new Error(`Failed to delete facility: ${error.message}`))
        }

        return createServiceResponse(true, null)
    } catch (err) {
        return createServiceResponse(false, err instanceof Error ? err : new Error('Unknown error deleting facility'))
    }
}

// ============================================================================
// RESOURCES CRUD
// ============================================================================

export async function getResources(
    orgId: string,
    filters?: ResourceFilters
): Promise<{ data: FacilityResource[] | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        let resources = getResourcesForOrg(orgId)
        
        if (filters?.facility_id) {
            resources = resources.filter(r => r.facility_id === filters.facility_id)
        }
        
        if (filters?.resource_type) {
            resources = resources.filter(r => r.resource_type === filters.resource_type)
        }
        
        if (filters?.sport_tags && filters.sport_tags.length > 0) {
            resources = resources.filter(r => 
                filters.sport_tags!.some(tag => r.sport_tags.includes(tag))
            )
        }
        
        if (filters?.indoor !== undefined) {
            resources = resources.filter(r => r.indoor === filters.indoor)
        }
        
        if (filters?.reservable !== undefined) {
            resources = resources.filter(r => r.reservable === filters.reservable)
        }
        
        if (filters?.status) {
            resources = resources.filter(r => r.status === filters.status)
        }
        
        return createServiceResponse(resources, null)
    }

    try {
        let query = (supabase as any)
            .from('facility_resources')
            .select('*')
            .eq('org_id', orgId)

        if (filters?.facility_id) {
            query = query.eq('facility_id', filters.facility_id)
        }

        if (filters?.resource_type) {
            query = query.eq('resource_type', filters.resource_type)
        }

        if (filters?.sport_tags && filters.sport_tags.length > 0) {
            query = query.contains('sport_tags', filters.sport_tags)
        }

        if (filters?.indoor !== undefined) {
            query = query.eq('indoor', filters.indoor)
        }

        if (filters?.reservable !== undefined) {
            query = query.eq('reservable', filters.reservable)
        }

        if (filters?.status) {
            query = query.eq('status', filters.status)
        }

        query = query.order('name', { ascending: true })

        const { data, error } = await query

        if (error) {
            return createServiceResponse(null, new Error(`Failed to fetch resources: ${error.message}`))
        }

        return createServiceResponse(normalizeSupabaseResponse(data, true), null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error fetching resources'))
    }
}

export async function getResourceById(
    resourceId: string
): Promise<{ data: FacilityResource | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        const resource = getFakeResourceById(resourceId)
        return createServiceResponse(resource, null)
    }

    try {
        const { data, error } = await (supabase as any)
            .from('facility_resources')
            .select('*')
            .eq('id', resourceId)
            .single()

        if (error) {
            return createServiceResponse(null, new Error(`Failed to fetch resource: ${error.message}`))
        }

        return createServiceResponse(data, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error fetching resource'))
    }
}

export async function createResource(
    orgId: string,
    facilityId: string,
    formData: FacilityResourceFormData
): Promise<{ data: FacilityResource | null; error: Error | null; isEmpty: boolean }> {
    try {
        const insertData: Record<string, unknown> = {
            org_id: orgId,
            facility_id: facilityId,
            name: formData.name.trim(),
            resource_type: formData.resource_type || null,
            sport_tags: formData.sport_tags || [],
            status: formData.status,
            surface_type: formData.surface_type?.trim() || null,
            dimensions: formData.dimensions || null,
            lighting: formData.lighting ?? null,
            indoor: formData.indoor ?? null,
            capacity: formData.capacity || null,
            reservable: formData.reservable,
            notes: formData.notes?.trim() || null,
        }

        const { data, error } = await (supabase as any)
            .from('facility_resources')
            .insert(insertData)
            .select()
            .single()

        if (error) {
            return createServiceResponse(null, new Error(`Failed to create resource: ${error.message}`))
        }

        return createServiceResponse(data, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error creating resource'))
    }
}

export async function updateResource(
    resourceId: string,
    formData: Partial<FacilityResourceFormData>
): Promise<{ data: FacilityResource | null; error: Error | null; isEmpty: boolean }> {
    try {
        const updateData: Record<string, unknown> = {}

        if (formData.name !== undefined) updateData.name = formData.name.trim()
        if (formData.resource_type !== undefined) updateData.resource_type = formData.resource_type || null
        if (formData.sport_tags !== undefined) updateData.sport_tags = formData.sport_tags
        if (formData.status !== undefined) updateData.status = formData.status
        if (formData.surface_type !== undefined) updateData.surface_type = formData.surface_type?.trim() || null
        if (formData.dimensions !== undefined) updateData.dimensions = formData.dimensions || null
        if (formData.lighting !== undefined) updateData.lighting = formData.lighting ?? null
        if (formData.indoor !== undefined) updateData.indoor = formData.indoor ?? null
        if (formData.capacity !== undefined) updateData.capacity = formData.capacity || null
        if (formData.reservable !== undefined) updateData.reservable = formData.reservable
        if (formData.notes !== undefined) updateData.notes = formData.notes?.trim() || null

        const { data, error } = await (supabase as any)
            .from('facility_resources')
            .update(updateData)
            .eq('id', resourceId)
            .select()
            .single()

        if (error) {
            return createServiceResponse(null, new Error(`Failed to update resource: ${error.message}`))
        }

        return createServiceResponse(data, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error updating resource'))
    }
}

export async function deleteResource(
    resourceId: string
): Promise<ServiceResponse<boolean>> {
    try {
        const { error } = await (supabase as any)
            .from('facility_resources')
            .delete()
            .eq('id', resourceId)

        if (error) {
            return createServiceResponse(false, new Error(`Failed to delete resource: ${error.message}`))
        }

        return createServiceResponse(true, null)
    } catch (err) {
        return createServiceResponse(false, err instanceof Error ? err : new Error('Unknown error deleting resource'))
    }
}

// ============================================================================
// BLACKOUTS CRUD
// ============================================================================

export async function getBlackouts(
    orgId: string,
    facilityId?: string,
    resourceId?: string
): Promise<{ data: FacilityBlackout[] | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        const blackouts = getBlackoutsForOrg(orgId, facilityId, resourceId)
        return createServiceResponse(blackouts, null)
    }

    try {
        let query = (supabase as any)
            .from('facility_blackouts')
            .select('*')
            .eq('org_id', orgId)

        if (facilityId) {
            query = query.eq('facility_id', facilityId)
        }

        if (resourceId) {
            query = query.eq('resource_id', resourceId)
        }

        query = query.order('start_at', { ascending: true })

        const { data, error } = await query

        if (error) {
            return createServiceResponse(null, new Error(`Failed to fetch blackouts: ${error.message}`))
        }

        return createServiceResponse((normalizeSupabaseResponse(data, true) as FacilityBlackout[]), null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error fetching blackouts'))
    }
}

export async function createBlackout(
    orgId: string,
    formData: FacilityBlackoutFormData
): Promise<{ data: FacilityBlackout | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        return createServiceResponse(null, new Error('Cannot create blackouts in demo mode'))
    }

    try {
        const insertData: Record<string, unknown> = {
            org_id: orgId,
            facility_id: formData.facility_id || null,
            resource_id: formData.resource_id || null,
            title: formData.title.trim(),
            reason: formData.reason?.trim() || null,
            start_at: formData.start_at,
            end_at: formData.end_at,
            repeats_rule: formData.repeats_rule?.trim() || null,
        }

        const { data, error } = await (supabase as any)
            .from('facility_blackouts')
            .insert(insertData)
            .select()
            .single()

        if (error) {
            return createServiceResponse(null, new Error(`Failed to create blackout: ${error.message}`))
        }

        return createServiceResponse(data, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error creating blackout'))
    }
}

export async function updateBlackout(
    blackoutId: string,
    formData: Partial<FacilityBlackoutFormData>
): Promise<{ data: FacilityBlackout | null; error: Error | null; isEmpty: boolean }> {
    try {
        const updateData: Record<string, unknown> = {}

        if (formData.facility_id !== undefined) updateData.facility_id = formData.facility_id || null
        if (formData.resource_id !== undefined) updateData.resource_id = formData.resource_id || null
        if (formData.title !== undefined) updateData.title = formData.title.trim()
        if (formData.reason !== undefined) updateData.reason = formData.reason?.trim() || null
        if (formData.start_at !== undefined) updateData.start_at = formData.start_at
        if (formData.end_at !== undefined) updateData.end_at = formData.end_at
        if (formData.repeats_rule !== undefined) updateData.repeats_rule = formData.repeats_rule?.trim() || null

        const { data, error } = await (supabase as any)
            .from('facility_blackouts')
            .update(updateData)
            .eq('id', blackoutId)
            .select()
            .single()

        if (error) {
            return createServiceResponse(null, new Error(`Failed to update blackout: ${error.message}`))
        }

        return createServiceResponse(data, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error updating blackout'))
    }
}

export async function deleteBlackout(
    blackoutId: string
): Promise<ServiceResponse<boolean>> {
    try {
        const { error } = await (supabase as any)
            .from('facility_blackouts')
            .delete()
            .eq('id', blackoutId)

        if (error) {
            return createServiceResponse(false, new Error(`Failed to delete blackout: ${error.message}`))
        }

        return createServiceResponse(true, null)
    } catch (err) {
        return createServiceResponse(false, err instanceof Error ? err : new Error('Unknown error deleting blackout'))
    }
}

// ============================================================================
// RESERVATIONS (windowed loading + RPC for writes)
// ============================================================================

export async function getReservations(
    filters: ReservationFilters
): Promise<{ data: FacilityReservation[] | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        const reservations = getReservationsForOrg(
            filters.org_id,
            filters.start,
            filters.end,
            filters.facility_ids,
            filters.resource_ids
        )
        
        // Filter by additional criteria
        let filtered = reservations
        
        if (filters.team_id) {
            filtered = filtered.filter(r => r.team_id === filters.team_id)
        }
        
        if (filters.program_id) {
            filtered = filtered.filter(r => r.program_id === filters.program_id)
        }
        
        if (filters.customer_id) {
            filtered = filtered.filter(r => r.customer_id === filters.customer_id)
        }
        
        if (filters.status) {
            filtered = filtered.filter(r => r.status === filters.status)
        }
        
        // Load relations (facility, resource) for each reservation
        const withRelations = filtered.map(r => ({
            ...r,
            facility: getFakeFacilityById(r.facility_id) || undefined,
            resource: getFakeResourceById(r.resource_id) || undefined,
        }))
        
        return createServiceResponse(withRelations, null)
    }

    try {
        let query = (supabase as any)
            .from('facility_reservations')
            .select(`
                *,
                facility:facilities(*),
                resource:facility_resources(*),
                customer:customers(*),
                event:events(id, title, start_time, end_time),
                team:teams(id, name)
            `)
            .eq('org_id', filters.org_id)

        if (filters.facility_ids && filters.facility_ids.length > 0) {
            query = query.in('facility_id', filters.facility_ids)
        }

        if (filters.resource_ids && filters.resource_ids.length > 0) {
            query = query.in('resource_id', filters.resource_ids)
        }

        if (filters.team_id) {
            query = query.eq('team_id', filters.team_id)
        }

        if (filters.program_id) {
            query = query.eq('program_id', filters.program_id)
        }

        if (filters.customer_id) {
            query = query.eq('customer_id', filters.customer_id)
        }

        if (filters.status) {
            query = query.eq('status', filters.status)
        }

        // Windowed loading: only load reservations in the visible range
        if (filters.start) {
            query = query.gte('end_at', filters.start) // Reservation ends after window start
        }

        if (filters.end) {
            query = query.lte('start_at', filters.end) // Reservation starts before window end
        }

        query = query.order('start_at', { ascending: true })

        const { data, error } = await query

        if (error) {
            return createServiceResponse(null, new Error(`Failed to fetch reservations: ${error.message}`))
        }

        return createServiceResponse(normalizeSupabaseResponse(data, true), null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error fetching reservations'))
    }
}

export async function getReservationById(
    reservationId: string
): Promise<{ data: FacilityReservation | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        const reservation = getFakeReservationById(reservationId)
        if (!reservation) {
            return createServiceResponse(null, null)
        }
        
        const withRelations = {
            ...reservation,
            facility: getFakeFacilityById(reservation.facility_id) || undefined,
            resource: getFakeResourceById(reservation.resource_id) || undefined,
        }
        
        return createServiceResponse(withRelations, null)
    }

    try {
        const { data, error } = await (supabase as any)
            .from('facility_reservations')
            .select(`
                *,
                facility:facilities(*),
                resource:facility_resources(*),
                customer:customers(*),
                event:events(id, title, start_time, end_time),
                team:teams(id, name)
            `)
            .eq('id', reservationId)
            .single()

        if (error) {
            return createServiceResponse(null, new Error(`Failed to fetch reservation: ${error.message}`))
        }

        return createServiceResponse(data as FacilityReservation, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error fetching reservation'))
    }
}

export async function createReservation(
    orgId: string,
    formData: FacilityReservationFormData,
    options?: {
        allowConflict?: boolean
        tentativeBlocks?: boolean
    }
): Promise<{ data: FacilityReservation | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        return createServiceResponse(null, new Error('Cannot create reservations in demo mode'))
    }

    try {
        const { data, error } = await (supabase as any).rpc('create_reservation', {
            p_org_id: orgId,
            p_facility_id: formData.facility_id,
            p_resource_id: formData.resource_id,
            p_reservation_type: formData.reservation_type,
            p_status: formData.status,
            p_start_at: formData.start_at,
            p_end_at: formData.end_at,
            p_title: formData.title.trim(),
            p_event_id: formData.event_id || null,
            p_team_id: formData.team_id || null,
            p_program_id: formData.program_id || null,
            p_sport_id: formData.sport_id || null,
            p_customer_id: formData.customer_id || null,
            p_notes: formData.notes?.trim() || null,
            p_allow_conflict: options?.allowConflict || false,
            p_tentative_blocks: options?.tentativeBlocks || false,
        })

        if (error) {
            return createServiceResponse(
                null,
                new Error(`Failed to create reservation: ${error.message}`)
            )
        }

        // Fetch the created reservation with relations (RPC returns created id)
        const id = typeof data === 'string' ? data : (data as { id?: string })?.id
        return id ? getReservationById(id) : createServiceResponse(null, new Error('Create reservation returned no id'))
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error creating reservation'))
    }
}

export async function updateReservation(
    reservationId: string,
    formData: Partial<FacilityReservationFormData>,
    options?: {
        allowConflict?: boolean
        tentativeBlocks?: boolean
    }
): Promise<{ data: FacilityReservation | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        return createServiceResponse(null, new Error('Cannot update reservations in demo mode'))
    }

    try {
        const { data: _data, error } = await (supabase as any).rpc('update_reservation', {
            p_reservation_id: reservationId,
            p_resource_id: formData.resource_id || null,
            p_reservation_type: formData.reservation_type || null,
            p_status: formData.status || null,
            p_start_at: formData.start_at || null,
            p_end_at: formData.end_at || null,
            p_title: formData.title?.trim() || null,
            p_customer_id: formData.customer_id !== undefined ? formData.customer_id : null,
            p_notes: formData.notes?.trim() || null,
            p_cancellation_reason: formData.cancellation_reason?.trim() || null,
            p_allow_conflict: options?.allowConflict || false,
            p_tentative_blocks: options?.tentativeBlocks || false,
        })

        if (error) {
            return createServiceResponse(
                null,
                new Error(`Failed to update reservation: ${error.message}`)
            )
        }

        // Fetch the updated reservation with relations
        return getReservationById(reservationId)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error updating reservation'))
    }
}

export async function deleteReservation(
    reservationId: string
): Promise<ServiceResponse<boolean>> {
    if (USE_FAKE_DATA) {
        return createServiceResponse(false, new Error('Cannot delete reservations in demo mode'))
    }

    try {
        const { error } = await (supabase as any)
            .from('facility_reservations')
            .delete()
            .eq('id', reservationId)

        if (error) {
            return createServiceResponse(false, new Error(`Failed to delete reservation: ${error.message}`))
        }

        return createServiceResponse(true, null)
    } catch (err) {
        return createServiceResponse(false, err instanceof Error ? err : new Error('Unknown error deleting reservation'))
    }
}

// ============================================================================
// CONFLICT CHECKING AND ALTERNATIVES
// ============================================================================

export async function checkReservationConflicts(
    orgId: string,
    resourceId: string,
    startAt: string,
    endAt: string,
    excludeReservationId?: string,
    tentativeBlocks?: boolean
): Promise<{ data: ConflictCheckResult | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        // Check fake reservations for conflicts
        const reservations = getReservationsForOrg(orgId, startAt, endAt, undefined, [resourceId])
        const conflictingReservations = reservations.filter(r => {
            if (excludeReservationId && r.id === excludeReservationId) return false
            if (r.status === 'cancelled') return false
            if (!tentativeBlocks && r.status === 'tentative') return false
            
            const rStart = new Date(r.start_at)
            const rEnd = new Date(r.end_at)
            const checkStart = new Date(startAt)
            const checkEnd = new Date(endAt)
            
            return rStart < checkEnd && rEnd > checkStart
        })
        
        const blackouts = getBlackoutsForOrg(orgId, undefined, resourceId)
        const conflictingBlackouts = blackouts.filter(b => {
            if (b.repeats_rule) return false // v1: ignore recurring
            
            const bStart = new Date(b.start_at)
            const bEnd = new Date(b.end_at)
            const checkStart = new Date(startAt)
            const checkEnd = new Date(endAt)
            
            return bStart < checkEnd && bEnd > checkStart
        })
        
        return createServiceResponse({
            has_conflict: conflictingReservations.length > 0 || conflictingBlackouts.length > 0,
            conflicting_reservations: conflictingReservations.map(r => ({
                id: r.id,
                title: r.title,
                start_at: r.start_at,
                end_at: r.end_at,
                status: r.status,
                reservation_type: r.reservation_type,
            })),
            conflicting_blackouts: conflictingBlackouts.map(b => ({
                id: b.id,
                title: b.title,
                start_at: b.start_at,
                end_at: b.end_at,
                reason: b.reason,
            })),
        }, null)
    }

    try {
        const { data, error } = await (supabase as any).rpc('check_reservation_conflicts', {
            p_org_id: orgId,
            p_resource_id: resourceId,
            p_start_at: startAt,
            p_end_at: endAt,
            p_exclude_reservation_id: excludeReservationId || null,
            p_tentative_blocks: tentativeBlocks || false,
        })

        if (error) {
            return createServiceResponse(null, new Error(`Failed to check conflicts: ${error.message}`))
        }

        return createServiceResponse((data as ConflictCheckResult) ?? null, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error checking conflicts'))
    }
}

export async function suggestReservationAlternatives(
    orgId: string,
    startAt: string,
    endAt: string,
    options?: {
        facilityId?: string
        resourceId?: string
        durationMinutes?: number
        preferSameResource?: boolean
    }
): Promise<{ data: ReservationAlternative[] | null; error: Error | null; isEmpty: boolean }> {
    if (USE_FAKE_DATA) {
        // Simple fake alternatives: suggest same resource 30min before/after
        const duration = options?.durationMinutes 
            ? options.durationMinutes * 60 * 1000 
            : new Date(endAt).getTime() - new Date(startAt).getTime()
        
        const alternatives: ReservationAlternative[] = []
        const startTime = new Date(startAt).getTime()
        
        // Same resource, 30min before
        const alt1Start = new Date(startTime - 30 * 60 * 1000)
        const alt1End = new Date(alt1Start.getTime() + duration)
        alternatives.push({
            resource_id: options?.resourceId || '',
            resource_name: 'Same Resource',
            facility_name: 'Same Facility',
            suggested_start_at: alt1Start.toISOString(),
            suggested_end_at: alt1End.toISOString(),
            score: 100,
        })
        
        // Same resource, 30min after
        const alt2Start = new Date(startTime + 30 * 60 * 1000)
        const alt2End = new Date(alt2Start.getTime() + duration)
        alternatives.push({
            resource_id: options?.resourceId || '',
            resource_name: 'Same Resource',
            facility_name: 'Same Facility',
            suggested_start_at: alt2Start.toISOString(),
            suggested_end_at: alt2End.toISOString(),
            score: 100,
        })
        
        return createServiceResponse(alternatives, null)
    }

    try {
        const { data, error } = await (supabase as any).rpc('suggest_reservation_alternatives', {
            p_org_id: orgId,
            p_facility_id: options?.facilityId || null,
            p_resource_id: options?.resourceId || null,
            p_start_at: startAt,
            p_end_at: endAt,
            p_duration_minutes: options?.durationMinutes || null,
            p_prefer_same_resource: options?.preferSameResource ?? true,
        })

        if (error) {
            return createServiceResponse(null, new Error(`Failed to suggest alternatives: ${error.message}`))
        }

        return createServiceResponse((normalizeSupabaseResponse(data, true) as ReservationAlternative[]), null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error suggesting alternatives'))
    }
}
