import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { USE_FAKE_DATA } from '../config'
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
  if (USE_FAKE_DATA || !isSupabaseConfigured) {
    const result = getFakeTicketingEvents(orgId, params)
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
  return resp
}

export async function createTicketingEvent(orgId: string, payload: Partial<TicketedEvent>) {
  if (USE_FAKE_DATA || !isSupabaseConfigured) {
    return createFakeTicketingEvent(orgId, payload)
  }
  return authedFetch(`/api/orgs/${orgId}/events`, { method: 'POST', body: payload }) as Promise<TicketedEvent>
}

export async function updateTicketingEvent(orgId: string, id: string, payload: Partial<TicketedEvent>) {
  if (USE_FAKE_DATA || !isSupabaseConfigured) {
    return updateFakeTicketingEvent(orgId, id, payload)
  }
  return authedFetch(`/api/orgs/${orgId}/events/${id}`, { method: 'PATCH', body: payload }) as Promise<TicketedEvent>
}

export async function deleteTicketingEvent(orgId: string, id: string) {
  if (USE_FAKE_DATA || !isSupabaseConfigured) {
    return deleteFakeTicketingEvent(orgId, id)
  }
  return authedFetch(`/api/orgs/${orgId}/events/${id}`, { method: 'DELETE' })
}

export async function duplicateTicketingEvent(orgId: string, id: string) {
  if (USE_FAKE_DATA || !isSupabaseConfigured) {
    return duplicateFakeTicketingEvent(orgId, id)
  }
  return authedFetch(`/api/orgs/${orgId}/events/${id}/duplicate`, { method: 'POST' }) as Promise<TicketedEvent>
}

export async function bulkTicketingEvents(orgId: string, payload: { event_ids: string[]; action: string; [key: string]: any }) {
  if (USE_FAKE_DATA || !isSupabaseConfigured) {
    return bulkFakeTicketingEvents(orgId, payload.event_ids, payload.action, payload)
  }
  return authedFetch(`/api/orgs/${orgId}/events/bulk`, { method: 'POST', body: payload })
}

// ---------------------------------------------------------------------------
// Programs / Seasons / Venues
// ---------------------------------------------------------------------------

export async function fetchTicketingPrograms(orgId: string): Promise<TicketingProgram[]> {
  if (USE_FAKE_DATA || !isSupabaseConfigured) {
    return getFakePrograms(orgId)
  }
  return authedFetch(`/api/orgs/${orgId}/programs`, { method: 'GET' }) as Promise<TicketingProgram[]>
}

export async function fetchTicketingSeasons(orgId: string): Promise<TicketingSeason[]> {
  if (USE_FAKE_DATA || !isSupabaseConfigured) {
    return getFakeSeasons(orgId)
  }
  return authedFetch(`/api/orgs/${orgId}/seasons`, { method: 'GET' }) as Promise<TicketingSeason[]>
}

export async function fetchTicketingVenues(orgId: string): Promise<TicketingVenue[]> {
  if (USE_FAKE_DATA || !isSupabaseConfigured) {
    return getFakeVenues(orgId)
  }
  return authedFetch(`/api/orgs/${orgId}/venues`, { method: 'GET' }) as Promise<TicketingVenue[]>
}

export async function createVenue(orgId: string, payload: Partial<TicketingVenue>) {
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
    return next
  }
  return authedFetch(`/api/orgs/${orgId}/venues`, { method: 'POST', body: payload }) as Promise<TicketingVenue>
}

export type { TicketingEventsQuery }
