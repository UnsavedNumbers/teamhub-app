import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { USE_FAKE_DATA } from '../config'
import { debug } from '../../lib/debug'
import {
  getFakeTicketingEvents,
  createFakeTicketingEvent,
  updateFakeTicketingEvent,
  deleteFakeTicketingEvent,
  duplicateFakeTicketingEvent,
  bulkFakeTicketingEvents,
  getFakePrograms,
  getFakeSeasons,
  getFakeVenues,
  type TicketingEventsQuery,
} from '../fake/fakeTicketingEvents'
import type {
  TicketedEvent,
  TicketingProgram,
  TicketingSeason,
  TicketingVenue,
} from '@/types/ticketing'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const FUNCTION_URL = SUPABASE_URL
  ? `${SUPABASE_URL.replace('/rest/v1', '')}/functions/v1/ticketing-events-api`
  : ''

export interface TicketingEventsMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
  counts_by_status: Record<string, number>
  counts_by_program: Record<string, number>
  total_revenue_cents: number
  total_tickets_sold: number
}

export interface TicketingEventsResponse {
  data: TicketedEvent[]
  meta: TicketingEventsMeta
}

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: any
  params?: Record<string, string | string[] | number | undefined | null>
}

async function authedFetch(path: string, { method = 'GET', body, params }: FetchOptions) {
  if (!FUNCTION_URL) throw new Error('Supabase not configured')

  const url = new URL(FUNCTION_URL)
  url.searchParams.set('path', path)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, String(v)))
      } else {
        url.searchParams.append(key, String(value))
      }
    })
  }

  const runRequest = async (token?: string | null) => {
    return fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  const { data: sessionData } = await supabase.auth.getSession()
  let token = sessionData.session?.access_token ?? null

  // If session bootstrap is still settling, try to refresh once before first request.
  if (!token) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    token = refreshed.session?.access_token ?? null
  }

  let res = await runRequest(token)

  // Recover from expired/stale tokens once.
  if (res.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    token = refreshed.session?.access_token ?? null
    res = await runRequest(token)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `${res.status} ${res.statusText}`)
  }

  if (res.status === 204) return null
  try {
    const text = await res.text()
    if (!text || text.trim() === '') return null
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function mapParams(params: Partial<TicketingEventsQuery>) {
  return {
    search: params.search ?? undefined,
    sort_by: params.sortBy ?? undefined,
    status: params.status ?? undefined,
    sale_status: params.saleStatus ?? undefined,
    date_from: params.dateFrom ?? undefined,
    date_to: params.dateTo ?? undefined,
    date_preset: params.datePreset ?? undefined,
    page: params.page ?? undefined,
    per_page: params.perPage ?? undefined,
    program_id: params.programIds ?? [],
    season_id: params.seasonIds ?? [],
    venue_id: params.venueIds ?? [],
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function normalizeEvent(event: any): TicketedEvent {
  const e = event as Record<string, unknown>
  // Backend may return programs/seasons/venues as null when FKs are unset; use cached/denormalized fallbacks
  const program =
    (e.program ?? e.programs) ??
    (e.program_name_cached ? { name: e.program_name_cached } : null)
  const season =
    (e.season ?? e.seasons) ??
    (e.season_name_cached ? { name: e.season_name_cached } : null)
  const venue =
    (e.venue ?? e.venues) ??
    (e.venue_name ? { name: e.venue_name, city: e.venue_city, state: e.venue_state } : null)

  return {
    ...event,
    capacity_total: e.capacity_total ?? e.capacityTotal ?? null,
    capacity_remaining: e.capacity_remaining ?? e.capacityRemaining ?? null,
    program,
    season,
    venue,
  } as TicketedEvent
}

export async function fetchTicketingEvents(orgId: string, params: Partial<TicketingEventsQuery>): Promise<TicketingEventsResponse> {
  console.groupCollapsed(`%cfetchTicketingEvents: ${orgId}`, 'color: #666; font-weight: bold;');
  debug.data('TicketingEventsAdminService.fetchTicketingEvents', 'Request', { orgId, search: params.search, status: params.status, page: params.page })
  debug.perf.start('ticketingEventsAdminService.fetchTicketingEvents')

  try {
    if (USE_FAKE_DATA || !isSupabaseConfigured) {
      const result = getFakeTicketingEvents(orgId, params)
      debug.perf.end('ticketingEventsAdminService.fetchTicketingEvents')
      debug.data('TicketingEventsAdminService.fetchTicketingEvents', 'Response (fake)', { orgId, eventCount: result.data.length })
      console.groupEnd()
      return result as TicketingEventsResponse
    }

    const response = await authedFetch(`/api/orgs/${orgId}/events`, {
      method: 'GET',
      params: mapParams(params),
    })

    const resp = response as TicketingEventsResponse
    if (resp?.data && Array.isArray(resp.data)) {
      resp.data = resp.data.map(normalizeEvent)
    }
    debug.perf.end('ticketingEventsAdminService.fetchTicketingEvents')
    debug.data('TicketingEventsAdminService.fetchTicketingEvents', 'Response', { orgId, eventCount: resp.data.length })
    console.groupEnd()
    return resp
  } catch (err) {
    debug.perf.end('ticketingEventsAdminService.fetchTicketingEvents')
    debug.error('TicketingEventsAdminService.fetchTicketingEvents', 'Failed to fetch events', { error: err, orgId, params })
    console.groupEnd()
    throw err
  }
}

export async function createTicketingEvent(orgId: string, payload: Partial<TicketedEvent>) {
  console.groupCollapsed(`%ccreateTicketingEvent: ${orgId}`, 'color: #666; font-weight: bold;');
  debug.flow('TicketingEventsAdminService.createTicketingEvent', 'Creating event', { orgId, title: payload.title })
  debug.perf.start('ticketingEventsAdminService.createTicketingEvent')

  try {
    if (USE_FAKE_DATA || !isSupabaseConfigured) {
      const result = createFakeTicketingEvent(orgId, payload)
      debug.perf.end('ticketingEventsAdminService.createTicketingEvent')
      debug.flow('TicketingEventsAdminService.createTicketingEvent', 'Event created (fake)', { orgId, eventId: result.id })
      console.groupEnd()
      return result
    }
    const result = await authedFetch(`/api/orgs/${orgId}/events`, { method: 'POST', body: payload }) as Promise<TicketedEvent>
    debug.perf.end('ticketingEventsAdminService.createTicketingEvent')
    debug.flow('TicketingEventsAdminService.createTicketingEvent', 'Event created successfully', { orgId, eventId: (result as any).id })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('ticketingEventsAdminService.createTicketingEvent')
    debug.error('TicketingEventsAdminService.createTicketingEvent', 'Failed to create event', { error: err, orgId, payload })
    console.groupEnd()
    throw err
  }
}

export async function updateTicketingEvent(orgId: string, id: string, payload: Partial<TicketedEvent>) {
  console.groupCollapsed(`%cupdateTicketingEvent: ${orgId} - ${id}`, 'color: #666; font-weight: bold;');
  debug.flow('TicketingEventsAdminService.updateTicketingEvent', 'Updating event', { orgId, eventId: id, fields: Object.keys(payload) })
  debug.perf.start('ticketingEventsAdminService.updateTicketingEvent')

  try {
    if (USE_FAKE_DATA || !isSupabaseConfigured) {
      const result = updateFakeTicketingEvent(orgId, id, payload)
      debug.perf.end('ticketingEventsAdminService.updateTicketingEvent')
      debug.flow('TicketingEventsAdminService.updateTicketingEvent', 'Event updated (fake)', { orgId, eventId: id })
      console.groupEnd()
      return result
    }
    const result = await authedFetch(`/api/orgs/${orgId}/events/${id}`, { method: 'PATCH', body: payload }) as Promise<TicketedEvent>
    debug.perf.end('ticketingEventsAdminService.updateTicketingEvent')
    debug.flow('TicketingEventsAdminService.updateTicketingEvent', 'Event updated successfully', { orgId, eventId: id })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('ticketingEventsAdminService.updateTicketingEvent')
    debug.error('TicketingEventsAdminService.updateTicketingEvent', 'Failed to update event', { error: err, orgId, eventId: id, payload })
    console.groupEnd()
    throw err
  }
}

export async function deleteTicketingEvent(orgId: string, id: string) {
  console.groupCollapsed(`%cdeleteTicketingEvent: ${orgId} - ${id}`, 'color: #666; font-weight: bold;');
  debug.flow('TicketingEventsAdminService.deleteTicketingEvent', 'Deleting event', { orgId, eventId: id })
  debug.perf.start('ticketingEventsAdminService.deleteTicketingEvent')

  try {
    if (USE_FAKE_DATA || !isSupabaseConfigured) {
      const result = deleteFakeTicketingEvent(orgId, id)
      debug.perf.end('ticketingEventsAdminService.deleteTicketingEvent')
      debug.flow('TicketingEventsAdminService.deleteTicketingEvent', 'Event deleted (fake)', { orgId, eventId: id })
      console.groupEnd()
      return result
    }
    const result = await authedFetch(`/api/orgs/${orgId}/events/${id}`, { method: 'DELETE' })
    debug.perf.end('ticketingEventsAdminService.deleteTicketingEvent')
    debug.flow('TicketingEventsAdminService.deleteTicketingEvent', 'Event deleted successfully', { orgId, eventId: id })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('ticketingEventsAdminService.deleteTicketingEvent')
    debug.error('TicketingEventsAdminService.deleteTicketingEvent', 'Failed to delete event', { error: err, orgId, eventId: id })
    console.groupEnd()
    throw err
  }
}

export async function duplicateTicketingEvent(orgId: string, id: string) {
  console.groupCollapsed(`%cduplicateTicketingEvent: ${orgId} - ${id}`, 'color: #666; font-weight: bold;');
  debug.flow('TicketingEventsAdminService.duplicateTicketingEvent', 'Duplicating event', { orgId, eventId: id })
  debug.perf.start('ticketingEventsAdminService.duplicateTicketingEvent')

  try {
    if (USE_FAKE_DATA || !isSupabaseConfigured) {
      const result = duplicateFakeTicketingEvent(orgId, id)
      debug.perf.end('ticketingEventsAdminService.duplicateTicketingEvent')
      debug.flow('TicketingEventsAdminService.duplicateTicketingEvent', 'Event duplicated (fake)', { orgId, eventId: id, newEventId: result?.id })
      console.groupEnd()
      return result
    }
    const result = await authedFetch(`/api/orgs/${orgId}/events/${id}/duplicate`, { method: 'POST' }) as Promise<TicketedEvent>
    debug.perf.end('ticketingEventsAdminService.duplicateTicketingEvent')
    debug.flow('TicketingEventsAdminService.duplicateTicketingEvent', 'Event duplicated successfully', { orgId, eventId: id, newEventId: (result as any).id })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('ticketingEventsAdminService.duplicateTicketingEvent')
    debug.error('TicketingEventsAdminService.duplicateTicketingEvent', 'Failed to duplicate event', { error: err, orgId, eventId: id })
    console.groupEnd()
    throw err
  }
}

export async function bulkTicketingEvents(orgId: string, payload: { event_ids: string[]; action: string; [key: string]: any }) {
  console.groupCollapsed(`%cbulkTicketingEvents: ${orgId} - ${payload.action}`, 'color: #666; font-weight: bold;');
  debug.flow('TicketingEventsAdminService.bulkTicketingEvents', 'Bulk operation', { orgId, action: payload.action, eventCount: payload.event_ids.length })
  debug.perf.start('ticketingEventsAdminService.bulkTicketingEvents')

  try {
    if (USE_FAKE_DATA || !isSupabaseConfigured) {
      const result = bulkFakeTicketingEvents(orgId, payload.event_ids, payload.action, payload)
      debug.perf.end('ticketingEventsAdminService.bulkTicketingEvents')
      debug.flow('TicketingEventsAdminService.bulkTicketingEvents', 'Bulk operation completed (fake)', { orgId, action: payload.action })
      console.groupEnd()
      return result
    }
    const result = await authedFetch(`/api/orgs/${orgId}/events/bulk`, { method: 'POST', body: payload })
    debug.perf.end('ticketingEventsAdminService.bulkTicketingEvents')
    debug.flow('TicketingEventsAdminService.bulkTicketingEvents', 'Bulk operation completed successfully', { orgId, action: payload.action })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('ticketingEventsAdminService.bulkTicketingEvents')
    debug.error('TicketingEventsAdminService.bulkTicketingEvents', 'Failed to perform bulk operation', { error: err, orgId, payload })
    console.groupEnd()
    throw err
  }
}

// ---------------------------------------------------------------------------
// Programs / Seasons / Venues
// ---------------------------------------------------------------------------

export async function fetchTicketingPrograms(orgId: string): Promise<TicketingProgram[]> {
  console.groupCollapsed(`%cfetchTicketingPrograms: ${orgId}`, 'color: #666; font-weight: bold;');
  debug.data('TicketingEventsAdminService.fetchTicketingPrograms', 'Request', { orgId })
  debug.perf.start('ticketingEventsAdminService.fetchTicketingPrograms')

  try {
    if (USE_FAKE_DATA || !isSupabaseConfigured) {
      const result = getFakePrograms(orgId)
      debug.perf.end('ticketingEventsAdminService.fetchTicketingPrograms')
      debug.data('TicketingEventsAdminService.fetchTicketingPrograms', 'Response (fake)', { orgId, programCount: result.length })
      console.groupEnd()
      return result
    }
    const result = await authedFetch(`/api/orgs/${orgId}/programs`, { method: 'GET' }) as Promise<TicketingProgram[]>
    debug.perf.end('ticketingEventsAdminService.fetchTicketingPrograms')
    debug.data('TicketingEventsAdminService.fetchTicketingPrograms', 'Response', { orgId, programCount: (result as any).length || 0 })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('ticketingEventsAdminService.fetchTicketingPrograms')
    debug.error('TicketingEventsAdminService.fetchTicketingPrograms', 'Failed to fetch programs', { error: err, orgId })
    console.groupEnd()
    throw err
  }
}

export async function fetchTicketingSeasons(orgId: string): Promise<TicketingSeason[]> {
  console.groupCollapsed(`%cfetchTicketingSeasons: ${orgId}`, 'color: #666; font-weight: bold;');
  debug.data('TicketingEventsAdminService.fetchTicketingSeasons', 'Request', { orgId })
  debug.perf.start('ticketingEventsAdminService.fetchTicketingSeasons')

  try {
    if (USE_FAKE_DATA || !isSupabaseConfigured) {
      const result = getFakeSeasons(orgId)
      debug.perf.end('ticketingEventsAdminService.fetchTicketingSeasons')
      debug.data('TicketingEventsAdminService.fetchTicketingSeasons', 'Response (fake)', { orgId, seasonCount: result.length })
      console.groupEnd()
      return result
    }
    const result = await authedFetch(`/api/orgs/${orgId}/seasons`, { method: 'GET' }) as Promise<TicketingSeason[]>
    debug.perf.end('ticketingEventsAdminService.fetchTicketingSeasons')
    debug.data('TicketingEventsAdminService.fetchTicketingSeasons', 'Response', { orgId, seasonCount: (result as any).length || 0 })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('ticketingEventsAdminService.fetchTicketingSeasons')
    debug.error('TicketingEventsAdminService.fetchTicketingSeasons', 'Failed to fetch seasons', { error: err, orgId })
    console.groupEnd()
    throw err
  }
}

export async function fetchTicketingVenues(orgId: string): Promise<TicketingVenue[]> {
  console.groupCollapsed(`%cfetchTicketingVenues: ${orgId}`, 'color: #666; font-weight: bold;');
  debug.data('TicketingEventsAdminService.fetchTicketingVenues', 'Request', { orgId })
  debug.perf.start('ticketingEventsAdminService.fetchTicketingVenues')

  try {
    if (USE_FAKE_DATA || !isSupabaseConfigured) {
      const result = getFakeVenues(orgId)
      debug.perf.end('ticketingEventsAdminService.fetchTicketingVenues')
      debug.data('TicketingEventsAdminService.fetchTicketingVenues', 'Response (fake)', { orgId, venueCount: result.length })
      console.groupEnd()
      return result
    }
    const result = await authedFetch(`/api/orgs/${orgId}/venues`, { method: 'GET' }) as Promise<TicketingVenue[]>
    debug.perf.end('ticketingEventsAdminService.fetchTicketingVenues')
    debug.data('TicketingEventsAdminService.fetchTicketingVenues', 'Response', { orgId, venueCount: (result as any).length || 0 })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('ticketingEventsAdminService.fetchTicketingVenues')
    debug.error('TicketingEventsAdminService.fetchTicketingVenues', 'Failed to fetch venues', { error: err, orgId })
    console.groupEnd()
    throw err
  }
}

export async function createVenue(orgId: string, payload: Partial<TicketingVenue>) {
  console.groupCollapsed(`%ccreateVenue: ${orgId}`, 'color: #666; font-weight: bold;');
  debug.flow('TicketingEventsAdminService.createVenue', 'Creating venue', { orgId, name: payload.name })
  debug.perf.start('ticketingEventsAdminService.createVenue')

  try {
    if (USE_FAKE_DATA || !isSupabaseConfigured) {
      const list = getFakeVenues(orgId)
      const next: TicketingVenue = {
        id: `ven-${list.length + 1}`,
        org_id: orgId,
        name: payload.name || 'New Venue',
        address: payload.address || null,
        city: payload.city || null,
        state: payload.state || null,
        capacity: payload.capacity ?? null,
      }
      debug.perf.end('ticketingEventsAdminService.createVenue')
      debug.flow('TicketingEventsAdminService.createVenue', 'Venue created (fake)', { orgId, venueId: next.id })
      console.groupEnd()
      return next
    }
    const result = await authedFetch(`/api/orgs/${orgId}/venues`, { method: 'POST', body: payload }) as Promise<TicketingVenue>
    debug.perf.end('ticketingEventsAdminService.createVenue')
    debug.flow('TicketingEventsAdminService.createVenue', 'Venue created successfully', { orgId, venueId: (result as any).id })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('ticketingEventsAdminService.createVenue')
    debug.error('TicketingEventsAdminService.createVenue', 'Failed to create venue', { error: err, orgId, payload })
    console.groupEnd()
    throw err
  }
}

export type { TicketingEventsQuery }
