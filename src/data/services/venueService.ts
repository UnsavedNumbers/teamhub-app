/**
 * Venue Service
 *
 * CRUD and lookup helpers for the normalized venues table.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA } from '@/data/config'
import { classifySupabaseError, ValidationError } from '@/utils/supabaseErrorHandler'
import type { Venue } from '@/types/ticketing'
import { getFakeVenuesForOrg } from '@/data/fake/ticketingFakeService'

// ============================================================================
// CRUD
// ============================================================================

export async function getVenuesForOrg(orgId: string): Promise<Venue[]> {
  console.groupCollapsed(`%cgetVenuesForOrg: ${orgId}`, 'color: #666; font-weight: bold;');
  debug.data('VenueService.getVenuesForOrg', 'Request', { orgId })
  debug.perf.start('venueService.getVenuesForOrg')

  try {
    if (!orgId) {
      debug.perf.end('venueService.getVenuesForOrg')
      debug.error('VenueService.getVenuesForOrg', 'Missing orgId', { orgId })
      console.groupEnd()
      throw new ValidationError('Organization is required')
    }

    if (USE_FAKE_DATA) {
      const venues = getFakeVenuesForOrg(orgId)
      debug.perf.end('venueService.getVenuesForOrg')
      debug.data('VenueService.getVenuesForOrg', 'Response (fake)', { orgId, venueCount: venues.length })
      console.groupEnd()
      return venues
    }
    const { data, error } = await (supabase as any)
      .from('venues')
      .select('*')
      .eq('org_id', orgId)
      .order('name', { ascending: true })

    if (error) throw error
    debug.perf.end('venueService.getVenuesForOrg')
    debug.data('VenueService.getVenuesForOrg', 'Response', { orgId, venueCount: data?.length || 0 })
    console.groupEnd()
    return (data ?? []) as Venue[]
  } catch (error) {
    debug.perf.end('venueService.getVenuesForOrg')
    debug.error('VenueService.getVenuesForOrg', 'Failed to get venues', { error, orgId })
    console.groupEnd()
    throw classifySupabaseError(error, 'Venues')
  }
}

export async function getVenueById(venueId: string): Promise<Venue> {
  console.groupCollapsed(`%cgetVenueById: ${venueId}`, 'color: #666; font-weight: bold;');
  debug.data('VenueService.getVenueById', 'Request', { venueId })
  debug.perf.start('venueService.getVenueById')

  try {
    if (!venueId) {
      debug.perf.end('venueService.getVenueById')
      debug.error('VenueService.getVenueById', 'Missing venueId', { venueId })
      console.groupEnd()
      throw new ValidationError('Venue ID is required')
    }
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
  console.groupCollapsed(`%cupsertVenue: ${input.name}`, 'color: #666; font-weight: bold;');
  debug.flow('VenueService.upsertVenue', 'Upserting venue', { venueName: input.name, orgId: input.org_id })
  debug.perf.start('venueService.upsertVenue')

  try {
    if (!input.org_id) {
      debug.perf.end('venueService.upsertVenue')
      debug.error('VenueService.upsertVenue', 'Missing org_id', { input })
      console.groupEnd()
      throw new ValidationError('Organization is required')
    }
    if (!input.name?.trim()) {
      debug.perf.end('venueService.upsertVenue')
      debug.error('VenueService.upsertVenue', 'Missing venue name', { input })
      console.groupEnd()
      throw new ValidationError('Venue name is required')
    }

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
      debug.perf.end('venueService.upsertVenue')
      debug.flow('VenueService.upsertVenue', 'Venue upserted (fake)', { venueName: input.name })
      console.groupEnd()
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
    debug.perf.end('venueService.upsertVenue')
    debug.flow('VenueService.upsertVenue', 'Venue upserted successfully', { venueId: data.id, venueName: data.name })
    console.groupEnd()
    return data as Venue
  } catch (error) {
    debug.perf.end('venueService.upsertVenue')
    debug.error('VenueService.upsertVenue', 'Failed to upsert venue', { error, venueName: input.name })
    console.groupEnd()
    throw classifySupabaseError(error, 'Venue')
  }
}

export async function updateVenue(
  venueId: string,
  updates: Partial<Omit<Venue, 'id' | 'org_id' | 'created_at'>>,
): Promise<Venue> {
  console.groupCollapsed(`%cupdateVenue: ${venueId}`, 'color: #666; font-weight: bold;');
  debug.flow('VenueService.updateVenue', 'Updating venue', { venueId })
  debug.perf.start('venueService.updateVenue')

  try {
    if (!venueId) {
      debug.perf.end('venueService.updateVenue')
      debug.error('VenueService.updateVenue', 'Missing venueId', { venueId })
      console.groupEnd()
      throw new ValidationError('Venue ID is required')
    }
    const { data, error } = await (supabase as any)
      .from('venues')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', venueId)
      .select('*')
      .single()

    if (error) throw error
    debug.perf.end('venueService.updateVenue')
    debug.flow('VenueService.updateVenue', 'Venue updated successfully', { venueId, venueName: data.name })
    console.groupEnd()
    return data as Venue
  } catch (error) {
    debug.perf.end('venueService.updateVenue')
    debug.error('VenueService.updateVenue', 'Failed to update venue', { error, venueId })
    console.groupEnd()
    throw classifySupabaseError(error, 'Venue')
  }
}

export async function deleteVenue(venueId: string): Promise<void> {
  console.groupCollapsed(`%cdeleteVenue: ${venueId}`, 'color: #666; font-weight: bold;');
  debug.flow('VenueService.deleteVenue', 'Deleting venue', { venueId })
  debug.perf.start('venueService.deleteVenue')

  try {
    if (!venueId) {
      debug.perf.end('venueService.deleteVenue')
      debug.error('VenueService.deleteVenue', 'Missing venueId', { venueId })
      console.groupEnd()
      throw new ValidationError('Venue ID is required')
    }
    const { error } = await (supabase as any)
      .from('venues')
      .delete()
      .eq('id', venueId)

    if (error) throw error
    debug.perf.end('venueService.deleteVenue')
    debug.flow('VenueService.deleteVenue', 'Venue deleted successfully', { venueId })
    console.groupEnd()
  } catch (error) {
    debug.perf.end('venueService.deleteVenue')
    debug.error('VenueService.deleteVenue', 'Failed to delete venue', { error, venueId })
    console.groupEnd()
    throw classifySupabaseError(error, 'Venue')
  }
}

// ============================================================================
// DEFAULT SEAT MAP ASSIGNMENT
// ============================================================================

export async function setVenueDefaultSeatMap(venueId: string, seatMapId: string | null): Promise<void> {
  debug.flow('VenueService.setVenueDefaultSeatMap', 'Setting venue default seat map', { venueId, seatMapId })
  debug.perf.start('venueService.setVenueDefaultSeatMap')

  try {
    if (!venueId) {
      debug.perf.end('venueService.setVenueDefaultSeatMap')
      debug.error('VenueService.setVenueDefaultSeatMap', 'Missing venueId', { venueId })
      throw new ValidationError('Venue ID is required')
    }
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
    debug.perf.end('venueService.setTeamDefaultSeatMap')
    debug.flow('VenueService.setTeamDefaultSeatMap', 'Team default seat map set successfully', { teamId, seatMapId })
  } catch (error) {
    debug.perf.end('venueService.setTeamDefaultSeatMap')
    debug.error('VenueService.setTeamDefaultSeatMap', 'Failed to set seat map', { error, teamId, seatMapId })
    throw classifySupabaseError(error, 'Team default seat map')
  }
}

export async function setTeamHomeVenue(teamId: string, venueId: string | null): Promise<void> {
  debug.flow('VenueService.setTeamHomeVenue', 'Setting team home venue', { teamId, venueId })
  debug.perf.start('venueService.setTeamHomeVenue')

  try {
    if (!teamId) {
      debug.perf.end('venueService.setTeamHomeVenue')
      debug.error('VenueService.setTeamHomeVenue', 'Missing teamId', { teamId })
      throw new ValidationError('Team ID is required')
    }
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
    debug.perf.end('venueService.setOrgDefaultSeatMap')
    debug.flow('VenueService.setOrgDefaultSeatMap', 'Org default seat map set successfully', { orgId, seatMapId })
  } catch (error) {
    debug.perf.end('venueService.setOrgDefaultSeatMap')
    debug.error('VenueService.setOrgDefaultSeatMap', 'Failed to set seat map', { error, orgId, seatMapId })
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
  debug.data('VenueService.resolveSeatMapForEvent', 'Request', { params })
  debug.perf.start('venueService.resolveSeatMapForEvent')

  try {
    if (USE_FAKE_DATA) {
      debug.perf.end('venueService.resolveSeatMapForEvent')
      debug.data('VenueService.resolveSeatMapForEvent', 'Response (fake)', { params, seatMapId: null })
      return null
    }
    const { data, error } = await (supabase as any).rpc('resolve_seat_map_for_event', {
      p_event_id: params.eventId ?? null,
      p_team_id: params.teamId ?? null,
      p_venue_id: params.venueId ?? null,
      p_org_id: params.orgId ?? null,
    })

    if (error) throw error
    debug.perf.end('venueService.resolveSeatMapForEvent')
    debug.data('VenueService.resolveSeatMapForEvent', 'Response', { params, seatMapId: data })
    return data as string | null
  } catch (error) {
    debug.perf.end('venueService.resolveSeatMapForEvent')
    debug.error('VenueService.resolveSeatMapForEvent', 'Failed to resolve seat map', { error, params })
    throw classifySupabaseError(error, 'Seat map resolution')
  }
}

// ============================================================================
// SEAT MAP PUBLISH / CLONE
// ============================================================================

export async function publishSeatMap(seatMapId: string): Promise<string> {
  console.groupCollapsed(`%cpublishSeatMap: ${seatMapId}`, 'color: #666; font-weight: bold;');
  debug.flow('VenueService.publishSeatMap', 'Publishing seat map', { seatMapId })
  debug.perf.start('venueService.publishSeatMap')

  try {
    if (!seatMapId) {
      debug.perf.end('venueService.publishSeatMap')
      debug.error('VenueService.publishSeatMap', 'Missing seatMapId', { seatMapId })
      console.groupEnd()
      throw new ValidationError('Seat map ID is required')
    }
    const { data, error } = await (supabase as any).rpc('publish_seat_map', {
      p_seat_map_id: seatMapId,
    })

    if (error) throw error
    debug.perf.end('venueService.publishSeatMap')
    debug.flow('VenueService.publishSeatMap', 'Seat map published successfully', { seatMapId, snapshotId: data })
    console.groupEnd()
    return data as string // returns snapshot ID
  } catch (error) {
    debug.perf.end('venueService.publishSeatMap')
    debug.error('VenueService.publishSeatMap', 'Failed to publish seat map', { error, seatMapId })
    console.groupEnd()
    throw classifySupabaseError(error, 'Publish seat map')
  }
}

export async function cloneSeatMap(params: {
  sourceSeatMapId: string
  newName?: string | null
  targetVenueId?: string | null
  targetTeamId?: string | null
}): Promise<string> {
  console.groupCollapsed(`%ccloneSeatMap: ${params.sourceSeatMapId}`, 'color: #666; font-weight: bold;');
  debug.flow('VenueService.cloneSeatMap', 'Cloning seat map', { sourceSeatMapId: params.sourceSeatMapId, newName: params.newName })
  debug.perf.start('venueService.cloneSeatMap')

  try {
    if (!params.sourceSeatMapId) {
      debug.perf.end('venueService.cloneSeatMap')
      debug.error('VenueService.cloneSeatMap', 'Missing sourceSeatMapId', { params })
      console.groupEnd()
      throw new ValidationError('Source seat map ID is required')
    }
    const { data, error } = await (supabase as any).rpc('clone_seat_map', {
      p_source_seat_map_id: params.sourceSeatMapId,
      p_new_name: params.newName ?? null,
      p_target_venue_id: params.targetVenueId ?? null,
      p_target_team_id: params.targetTeamId ?? null,
    })

    if (error) throw error
    debug.perf.end('venueService.cloneSeatMap')
    debug.flow('VenueService.cloneSeatMap', 'Seat map cloned successfully', { sourceSeatMapId: params.sourceSeatMapId, newSeatMapId: data })
    console.groupEnd()
    return data as string // returns new seat map ID
  } catch (error) {
    debug.perf.end('venueService.cloneSeatMap')
    debug.error('VenueService.cloneSeatMap', 'Failed to clone seat map', { error, params })
    console.groupEnd()
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
  console.groupCollapsed(`%capplySeatMapToUpcomingEvents: ${params.seatMapId}`, 'color: #666; font-weight: bold;');
  debug.flow('VenueService.applySeatMapToUpcomingEvents', 'Applying seat map to events', { seatMapId: params.seatMapId, orgId: params.orgId, venueId: params.venueId, teamId: params.teamId })
  debug.perf.start('venueService.applySeatMapToUpcomingEvents')

  try {
    if (!params.seatMapId || !params.orgId) {
      debug.perf.end('venueService.applySeatMapToUpcomingEvents')
      debug.error('VenueService.applySeatMapToUpcomingEvents', 'Missing required params', { params })
      console.groupEnd()
      throw new ValidationError('Seat map and org are required')
    }
    let query = (supabase as any)
      .from('events')
      .update({ seat_map_id: params.seatMapId })
      .eq('org_id', params.orgId)
      .gte('start_time', new Date().toISOString())

    if (params.venueId) query = query.eq('venue_id', params.venueId)
    if (params.teamId) query = query.eq('team_id', params.teamId)

    const { data, error } = await query.select('id')

    if (error) throw error
    const count = (data ?? []).length
    debug.perf.end('venueService.applySeatMapToUpcomingEvents')
    debug.flow('VenueService.applySeatMapToUpcomingEvents', 'Seat map applied successfully', { seatMapId: params.seatMapId, eventCount: count })
    console.groupEnd()
    return count
  } catch (error) {
    debug.perf.end('venueService.applySeatMapToUpcomingEvents')
    debug.error('VenueService.applySeatMapToUpcomingEvents', 'Failed to apply seat map', { error, params })
    console.groupEnd()
    throw classifySupabaseError(error, 'Apply seat map to events')
  }
}
