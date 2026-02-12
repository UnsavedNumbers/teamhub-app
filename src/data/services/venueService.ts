/**
 * Venue Service
 *
 * CRUD and lookup helpers for the normalized venues table.
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '@/data/config'
import { classifySupabaseError, ValidationError } from '@/utils/supabaseErrorHandler'
import type { Venue } from '@/types/ticketing'

// ============================================================================
// CRUD
// ============================================================================

export async function getVenuesForOrg(orgId: string): Promise<Venue[]> {
  if (!orgId) throw new ValidationError('Organization is required')

  if (USE_FAKE_DATA) return []

  try {
    const { data, error } = await (supabase as any)
      .from('venues')
      .select('*')
      .eq('org_id', orgId)
      .order('name', { ascending: true })

    if (error) throw error
    return (data ?? []) as Venue[]
  } catch (error) {
    throw classifySupabaseError(error, 'Venues')
  }
}

export async function getVenueById(venueId: string): Promise<Venue> {
  if (!venueId) throw new ValidationError('Venue ID is required')

  try {
    const { data, error } = await (supabase as any)
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single()

    if (error) throw error
    return data as Venue
  } catch (error) {
    throw classifySupabaseError(error, 'Venue')
  }
}

export interface CreateVenueInput {
  org_id: string
  name: string
  google_place_id?: string | null
  address?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
  maps_url?: string | null
  is_virtual?: boolean
  virtual_link?: string | null
  capacity?: number | null
}

/**
 * Create or return existing venue by (org_id, google_place_id).
 * If google_place_id is provided and a matching venue exists, returns that.
 */
export async function upsertVenue(input: CreateVenueInput): Promise<Venue> {
  if (!input.org_id) throw new ValidationError('Organization is required')
  if (!input.name?.trim()) throw new ValidationError('Venue name is required')

  if (USE_FAKE_DATA) {
    return {
      id: crypto.randomUUID(),
      org_id: input.org_id,
      name: input.name,
      google_place_id: input.google_place_id ?? null,
      address: input.address ?? null,
      address_line1: input.address_line1 ?? null,
      address_line2: input.address_line2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postal_code: input.postal_code ?? null,
      country: input.country ?? 'US',
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      maps_url: input.maps_url ?? null,
      is_virtual: input.is_virtual ?? false,
      virtual_link: input.virtual_link ?? null,
      capacity: input.capacity ?? null,
      default_seat_map_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  try {
    // If place_id provided, try to find existing
    if (input.google_place_id) {
      const { data: existing } = await (supabase as any)
        .from('venues')
        .select('*')
        .eq('org_id', input.org_id)
        .eq('google_place_id', input.google_place_id)
        .maybeSingle()

      if (existing) {
        // Update fields that may have changed
        const { data: updated, error: updateError } = await (supabase as any)
          .from('venues')
          .update({
            name: input.name,
            address: input.address,
            address_line1: input.address_line1,
            city: input.city,
            state: input.state,
            postal_code: input.postal_code,
            latitude: input.latitude,
            longitude: input.longitude,
            maps_url: input.maps_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('*')
          .single()

        if (updateError) throw updateError
        return updated as Venue
      }
    }

    // Create new
    const { data, error } = await (supabase as any)
      .from('venues')
      .insert({
        org_id: input.org_id,
        name: input.name.trim(),
        google_place_id: input.google_place_id ?? null,
        address: input.address ?? null,
        address_line1: input.address_line1 ?? null,
        address_line2: input.address_line2 ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        postal_code: input.postal_code ?? null,
        country: input.country ?? 'US',
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        maps_url: input.maps_url ?? null,
        is_virtual: input.is_virtual ?? false,
        virtual_link: input.virtual_link ?? null,
        capacity: input.capacity ?? null,
      })
      .select('*')
      .single()

    if (error) throw error
    return data as Venue
  } catch (error) {
    throw classifySupabaseError(error, 'Venue')
  }
}

export async function updateVenue(
  venueId: string,
  updates: Partial<Omit<Venue, 'id' | 'org_id' | 'created_at'>>,
): Promise<Venue> {
  if (!venueId) throw new ValidationError('Venue ID is required')

  try {
    const { data, error } = await (supabase as any)
      .from('venues')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', venueId)
      .select('*')
      .single()

    if (error) throw error
    return data as Venue
  } catch (error) {
    throw classifySupabaseError(error, 'Venue')
  }
}

export async function deleteVenue(venueId: string): Promise<void> {
  if (!venueId) throw new ValidationError('Venue ID is required')

  try {
    const { error } = await (supabase as any)
      .from('venues')
      .delete()
      .eq('id', venueId)

    if (error) throw error
  } catch (error) {
    throw classifySupabaseError(error, 'Venue')
  }
}

// ============================================================================
// DEFAULT SEAT MAP ASSIGNMENT
// ============================================================================

export async function setVenueDefaultSeatMap(venueId: string, seatMapId: string | null): Promise<void> {
  if (!venueId) throw new ValidationError('Venue ID is required')

  try {
    const { error } = await (supabase as any)
      .from('venues')
      .update({ default_seat_map_id: seatMapId, updated_at: new Date().toISOString() })
      .eq('id', venueId)

    if (error) throw error
  } catch (error) {
    throw classifySupabaseError(error, 'Venue default seat map')
  }
}

export async function setTeamDefaultSeatMap(teamId: string, seatMapId: string | null): Promise<void> {
  if (!teamId) throw new ValidationError('Team ID is required')

  try {
    const { error } = await (supabase as any)
      .from('teams')
      .update({ default_seat_map_id: seatMapId })
      .eq('id', teamId)

    if (error) throw error
  } catch (error) {
    throw classifySupabaseError(error, 'Team default seat map')
  }
}

export async function setTeamHomeVenue(teamId: string, venueId: string | null): Promise<void> {
  if (!teamId) throw new ValidationError('Team ID is required')

  try {
    const { error } = await (supabase as any)
      .from('teams')
      .update({ home_venue_id: venueId })
      .eq('id', teamId)

    if (error) throw error
  } catch (error) {
    throw classifySupabaseError(error, 'Team home venue')
  }
}

export async function setOrgDefaultSeatMap(orgId: string, seatMapId: string | null): Promise<void> {
  if (!orgId) throw new ValidationError('Organization ID is required')

  try {
    const { error } = await (supabase as any)
      .from('organizations')
      .update({ default_seat_map_id: seatMapId })
      .eq('id', orgId)

    if (error) throw error
  } catch (error) {
    throw classifySupabaseError(error, 'Organization default seat map')
  }
}

// ============================================================================
// SEAT MAP RESOLUTION (fallback chain)
// ============================================================================

/**
 * Resolve the effective seat map for an event using the fallback chain:
 * 1. event.seat_map_id (explicit override)
 * 2. team.default_seat_map_id
 * 3. venue.default_seat_map_id
 * 4. org.default_seat_map_id
 */
export async function resolveSeatMapForEvent(params: {
  eventId?: string | null
  teamId?: string | null
  venueId?: string | null
  orgId?: string | null
}): Promise<string | null> {
  if (USE_FAKE_DATA) return null

  try {
    const { data, error } = await (supabase as any).rpc('resolve_seat_map_for_event', {
      p_event_id: params.eventId ?? null,
      p_team_id: params.teamId ?? null,
      p_venue_id: params.venueId ?? null,
      p_org_id: params.orgId ?? null,
    })

    if (error) throw error
    return data as string | null
  } catch (error) {
    throw classifySupabaseError(error, 'Seat map resolution')
  }
}

// ============================================================================
// SEAT MAP PUBLISH / CLONE
// ============================================================================

export async function publishSeatMap(seatMapId: string): Promise<string> {
  if (!seatMapId) throw new ValidationError('Seat map ID is required')

  try {
    const { data, error } = await (supabase as any).rpc('publish_seat_map', {
      p_seat_map_id: seatMapId,
    })

    if (error) throw error
    return data as string // returns snapshot ID
  } catch (error) {
    throw classifySupabaseError(error, 'Publish seat map')
  }
}

export async function cloneSeatMap(params: {
  sourceSeatMapId: string
  newName?: string | null
  targetVenueId?: string | null
  targetTeamId?: string | null
}): Promise<string> {
  if (!params.sourceSeatMapId) throw new ValidationError('Source seat map ID is required')

  try {
    const { data, error } = await (supabase as any).rpc('clone_seat_map', {
      p_source_seat_map_id: params.sourceSeatMapId,
      p_new_name: params.newName ?? null,
      p_target_venue_id: params.targetVenueId ?? null,
      p_target_team_id: params.targetTeamId ?? null,
    })

    if (error) throw error
    return data as string // returns new seat map ID
  } catch (error) {
    throw classifySupabaseError(error, 'Clone seat map')
  }
}

// ============================================================================
// BULK OPS
// ============================================================================

/**
 * Apply a seat map to all upcoming events at a specific venue (or for a team).
 */
export async function applySeatMapToUpcomingEvents(params: {
  seatMapId: string
  orgId: string
  venueId?: string | null
  teamId?: string | null
}): Promise<number> {
  if (!params.seatMapId || !params.orgId) throw new ValidationError('Seat map and org are required')

  try {
    let query = (supabase as any)
      .from('events')
      .update({ seat_map_id: params.seatMapId })
      .eq('org_id', params.orgId)
      .gte('start_time', new Date().toISOString())

    if (params.venueId) query = query.eq('venue_id', params.venueId)
    if (params.teamId) query = query.eq('team_id', params.teamId)

    const { data, error } = await query.select('id')

    if (error) throw error
    return (data ?? []).length
  } catch (error) {
    throw classifySupabaseError(error, 'Apply seat map to events')
  }
}
