import { TicketSaleStatus, TicketedEvent, TicketingProgram, TicketingSeason, TicketingVenue } from '@/types/ticketing'
import { DEMO_ORG_A_ID } from '../config'

type TicketingEventWithDerived = TicketedEvent & {
  ticket_types?: Array<{
    id: string
    name: string
    capacity_total: number
    capacity_remaining: number
    price_cents: number
  }>
}

const programs: TicketingProgram[] = [
  { id: 'prog-1', org_id: DEMO_ORG_A_ID, name: 'Premier Soccer', slug: 'premier-soccer', sport: 'soccer', color: '#2563eb', is_active: true },
  { id: 'prog-2', org_id: DEMO_ORG_A_ID, name: 'Elite Basketball', slug: 'elite-basketball', sport: 'basketball', color: '#f97316', is_active: true },
  { id: 'prog-3', org_id: DEMO_ORG_A_ID, name: 'Fall Cheer', slug: 'fall-cheer', sport: 'cheer', color: '#8b5cf6', is_active: true },
]

const seasons: TicketingSeason[] = [
  { id: 'sea-1', org_id: DEMO_ORG_A_ID, program_id: 'prog-1', name: 'Spring 2026', slug: 'spring-2026', start_date: '2026-03-01', end_date: '2026-06-30', is_active: true },
  { id: 'sea-2', org_id: DEMO_ORG_A_ID, program_id: 'prog-1', name: 'Summer 2026', slug: 'summer-2026', start_date: '2026-07-01', end_date: '2026-08-31', is_active: true },
  { id: 'sea-3', org_id: DEMO_ORG_A_ID, program_id: 'prog-2', name: 'AAU 2026', slug: 'aau-2026', start_date: '2026-04-01', end_date: '2026-07-31', is_active: true },
  { id: 'sea-4', org_id: DEMO_ORG_A_ID, program_id: 'prog-3', name: 'Fall 2026', slug: 'fall-2026', start_date: '2026-09-01', end_date: '2026-11-30', is_active: true },
]

const venues: TicketingVenue[] = [
  { id: 'ven-1', org_id: DEMO_ORG_A_ID, name: 'Memorial Stadium', city: 'Austin', state: 'TX', capacity: 12000 },
  { id: 'ven-2', org_id: DEMO_ORG_A_ID, name: 'Civic Arena', city: 'Dallas', state: 'TX', capacity: 8000 },
  { id: 'ven-3', org_id: DEMO_ORG_A_ID, name: 'Community Field', city: 'Round Rock', state: 'TX', capacity: 1500 },
]

let events: TicketingEventWithDerived[] = [
  {
    id: 'evt-1',
    org_id: DEMO_ORG_A_ID,
    program_id: 'prog-1',
    season_id: 'sea-1',
    venue_id: 'ven-1',
    opponent: 'Cedar Park Lions',
    is_home: true,
    event_type: 'game',
    title: 'Premier Soccer vs Cedar Park',
    description: 'League opener under the lights.',
    event_description: 'Gates open 6:30pm',
    starts_at: '2026-03-15T19:00:00Z',
    ends_at: '2026-03-15T21:00:00Z',
    timezone: 'America/Chicago',
    venue_name: 'Memorial Stadium',
    venue_city: 'Austin',
    venue_state: 'TX',
    venue_postal_code: '78701',
    sales_start_at: '2026-02-15T12:00:00Z',
    sales_end_at: '2026-03-15T18:30:00Z',
    cover_image_path: null,
    ticket_banner_url: null,
    status: 'published',
    created_at: '2026-02-01T15:00:00Z',
    updated_at: '2026-02-01T15:00:00Z',
    ticket_types: [
      { id: 'tt-1', name: 'General', capacity_total: 8000, capacity_remaining: 2600, price_cents: 1500 },
      { id: 'tt-2', name: 'VIP', capacity_total: 500, capacity_remaining: 120, price_cents: 4500 },
    ],
  },
  {
    id: 'evt-2',
    org_id: DEMO_ORG_A_ID,
    program_id: 'prog-2',
    season_id: 'sea-3',
    venue_id: 'ven-2',
    opponent: 'San Antonio Heat',
    is_home: true,
    event_type: 'game',
    title: 'Elite Basketball Showcase',
    description: 'AAU regional showcase.',
    event_description: null,
    starts_at: '2026-04-20T00:00:00Z',
    ends_at: '2026-04-20T02:00:00Z',
    timezone: 'America/Chicago',
    venue_name: 'Civic Arena',
    venue_city: 'Dallas',
    venue_state: 'TX',
    venue_postal_code: '75201',
    sales_start_at: '2026-03-10T12:00:00Z',
    sales_end_at: '2026-04-20T00:00:00Z',
    cover_image_path: null,
    ticket_banner_url: null,
    status: 'published',
    created_at: '2026-02-01T15:00:00Z',
    updated_at: '2026-02-01T15:00:00Z',
    ticket_types: [
      { id: 'tt-3', name: 'Lower Bowl', capacity_total: 5000, capacity_remaining: 4100, price_cents: 2500 },
      { id: 'tt-4', name: 'Courtside', capacity_total: 200, capacity_remaining: 30, price_cents: 8500 },
    ],
  },
  {
    id: 'evt-3',
    org_id: DEMO_ORG_A_ID,
    program_id: 'prog-1',
    season_id: 'sea-2',
    venue_id: 'ven-3',
    opponent: 'Waco United',
    is_home: false,
    event_type: 'game',
    title: 'Premier Soccer Friendly',
    description: 'Summer friendly warm-up.',
    event_description: null,
    starts_at: '2026-07-10T18:00:00Z',
    ends_at: '2026-07-10T20:00:00Z',
    timezone: 'America/Chicago',
    venue_name: 'Community Field',
    venue_city: 'Round Rock',
    venue_state: 'TX',
    venue_postal_code: '78664',
    sales_start_at: '2026-05-15T12:00:00Z',
    sales_end_at: '2026-07-10T17:00:00Z',
    cover_image_path: null,
    ticket_banner_url: null,
    status: 'published',
    created_at: '2026-02-01T15:00:00Z',
    updated_at: '2026-02-01T15:00:00Z',
    ticket_types: [
      { id: 'tt-5', name: 'General', capacity_total: 1200, capacity_remaining: 1200, price_cents: 1200 },
    ],
  },
  {
    id: 'evt-4',
    org_id: DEMO_ORG_A_ID,
    program_id: 'prog-3',
    season_id: 'sea-4',
    venue_id: 'ven-1',
    opponent: null,
    is_home: true,
    event_type: 'fundraiser',
    title: 'Cheer Program Showcase',
    description: 'Season kickoff and fundraiser.',
    event_description: null,
    starts_at: '2026-09-12T22:00:00Z',
    ends_at: '2026-09-13T00:00:00Z',
    timezone: 'America/Chicago',
    venue_name: 'Memorial Stadium',
    venue_city: 'Austin',
    venue_state: 'TX',
    venue_postal_code: '78701',
    sales_start_at: '2026-08-01T12:00:00Z',
    sales_end_at: '2026-09-12T21:30:00Z',
    cover_image_path: null,
    ticket_banner_url: null,
    status: 'draft',
    created_at: '2026-02-01T15:00:00Z',
    updated_at: '2026-02-01T15:00:00Z',
    ticket_types: [
      { id: 'tt-6', name: 'General', capacity_total: 6000, capacity_remaining: 6000, price_cents: 1000 },
    ],
  },
  {
    id: 'evt-5',
    org_id: DEMO_ORG_A_ID,
    program_id: 'prog-2',
    season_id: 'sea-3',
    venue_id: 'ven-2',
    opponent: 'Houston Flight',
    is_home: true,
    event_type: 'tournament',
    title: 'AAU Regional Finals',
    description: 'Championship rounds.',
    event_description: null,
    starts_at: '2026-06-05T18:00:00Z',
    ends_at: '2026-06-05T22:00:00Z',
    timezone: 'America/Chicago',
    venue_name: 'Civic Arena',
    venue_city: 'Dallas',
    venue_state: 'TX',
    venue_postal_code: '75201',
    sales_start_at: '2026-05-01T12:00:00Z',
    sales_end_at: '2026-06-05T17:30:00Z',
    cover_image_path: null,
    ticket_banner_url: null,
    status: 'published',
    created_at: '2026-02-01T15:00:00Z',
    updated_at: '2026-02-01T15:00:00Z',
    ticket_types: [
      { id: 'tt-7', name: 'Lower Bowl', capacity_total: 4800, capacity_remaining: 0, price_cents: 3000 },
      { id: 'tt-8', name: 'Courtside', capacity_total: 150, capacity_remaining: 0, price_cents: 9500 },
    ],
  },
  {
    id: 'evt-6',
    org_id: DEMO_ORG_A_ID,
    program_id: 'prog-1',
    season_id: 'sea-1',
    venue_id: 'ven-3',
    opponent: null,
    is_home: true,
    event_type: 'practice',
    title: 'Open Training Session',
    description: 'Free entry open practice with fan Q&A.',
    event_description: null,
    starts_at: '2026-02-10T22:00:00Z',
    ends_at: '2026-02-11T00:00:00Z',
    timezone: 'America/Chicago',
    venue_name: 'Community Field',
    venue_city: 'Round Rock',
    venue_state: 'TX',
    venue_postal_code: '78664',
    sales_start_at: null,
    sales_end_at: null,
    cover_image_path: null,
    ticket_banner_url: null,
    status: 'completed',
    created_at: '2026-01-15T15:00:00Z',
    updated_at: '2026-01-15T15:00:00Z',
    ticket_types: [],
  },
]

const fakeOrdersByEvent: Record<string, { ticketsSold: number; revenueCents: number }> = {
  'evt-1': { ticketsSold: 5780, revenueCents: 18300000 },
  'evt-2': { ticketsSold: 1070, revenueCents: 4205000 },
  'evt-3': { ticketsSold: 0, revenueCents: 0 },
  'evt-4': { ticketsSold: 0, revenueCents: 0 },
  'evt-5': { ticketsSold: 4950, revenueCents: 19050000 },
  'evt-6': { ticketsSold: 0, revenueCents: 0 },
}

function computeSaleStatus(event: TicketingEventWithDerived, ticketsSold: number, capacity: number | null): TicketSaleStatus {
  const now = new Date()
  if (event.status !== 'published') return 'off'
  const start = event.sales_start_at ? new Date(event.sales_start_at) : null
  const end = event.sales_end_at ? new Date(event.sales_end_at) : null
  if (start && start > now) return 'scheduled'
  if (end && end < now) return 'ended'
  if (capacity && ticketsSold >= capacity) return 'sold_out'
  return 'on_sale'
}

function deriveEvent(event: TicketingEventWithDerived): TicketedEvent {
  const capacityTotal = (event.ticket_types || []).reduce((sum, tt) => sum + (tt.capacity_total ?? 0), 0)
  const capacityRemaining = (event.ticket_types || []).reduce((sum, tt) => sum + (tt.capacity_remaining ?? 0), 0)
  const orderMetrics = fakeOrdersByEvent[event.id] || { ticketsSold: capacityTotal - capacityRemaining, revenueCents: 0 }
  const ticketsSold = orderMetrics.ticketsSold ?? 0
  const sale_status = computeSaleStatus(event, ticketsSold, capacityTotal || null)
  const program = programs.find(p => p.id === event.program_id) || null
  const season = seasons.find(s => s.id === event.season_id) || null
  const venue = venues.find(v => v.id === event.venue_id) || null
  return {
    ...event,
    program,
    season,
    venue,
    capacity_total: capacityTotal,
    capacity_remaining: capacityRemaining,
    tickets_sold: ticketsSold,
    revenue_cents: orderMetrics.revenueCents,
    ticket_progress_pct: capacityTotal ? Math.round((ticketsSold / capacityTotal) * 100) : null,
    sale_status,
  }
}

export interface TicketingEventsQuery {
  search?: string | null
  programIds?: string[]
  seasonIds?: string[]
  venueIds?: string[]
  status?: string | null
  saleStatus?: TicketSaleStatus | null
  dateFrom?: string | null
  dateTo?: string | null
  datePreset?: string | null
  sortBy?: string | null
  page?: number
  perPage?: number
}

export function getFakePrograms(orgId: string): TicketingProgram[] {
  return programs.filter(p => p.org_id === orgId)
}

export function getFakeSeasons(orgId: string): TicketingSeason[] {
  return seasons.filter(s => s.org_id === orgId)
}

export function getFakeVenues(orgId: string): TicketingVenue[] {
  return venues.filter(v => v.org_id === orgId)
}

export function getFakeTicketingEvents(orgId: string, params: TicketingEventsQuery) {
  const page = params.page ?? 1
  const perPage = params.perPage ?? 20
  let data = events.filter(e => e.org_id === orgId).map(deriveEvent)

  if (params.search) {
    const q = params.search.toLowerCase()
    data = data.filter(e =>
      [e.title, e.description, e.venue?.name, e.opponent, e.program?.name]
        .filter(Boolean)
        .some(field => (field as string).toLowerCase().includes(q))
    )
  }
  if (params.programIds?.length) {
    data = data.filter(e => e.program_id && params.programIds!.includes(e.program_id))
  }
  if (params.seasonIds?.length) {
    data = data.filter(e => e.season_id && params.seasonIds!.includes(e.season_id))
  }
  if (params.venueIds?.length) {
    data = data.filter(e => e.venue_id && params.venueIds!.includes(e.venue_id))
  }
  if (params.status) {
    data = data.filter(e => e.status === params.status)
  }
  if (params.saleStatus) {
    data = data.filter(e => e.sale_status === params.saleStatus)
  }

  if (params.datePreset === 'upcoming') {
    const now = new Date()
    data = data.filter(e => new Date(e.starts_at) >= now)
  } else if (params.datePreset === 'past') {
    const now = new Date()
    data = data.filter(e => new Date(e.starts_at) < now)
  }

  if (params.dateFrom) {
    data = data.filter(e => new Date(e.starts_at) >= new Date(params.dateFrom!))
  }
  if (params.dateTo) {
    data = data.filter(e => new Date(e.starts_at) <= new Date(params.dateTo!))
  }

  if (params.sortBy === 'revenue') {
    data = [...data].sort((a, b) => (b.revenue_cents ?? 0) - (a.revenue_cents ?? 0))
  } else if (params.sortBy === 'tickets_sold') {
    data = [...data].sort((a, b) => (b.tickets_sold ?? 0) - (a.tickets_sold ?? 0))
  } else if (params.sortBy === 'created_at') {
    data = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else {
    data = [...data].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  }

  const counts_by_status = data.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {})

  const counts_by_program = data.reduce<Record<string, number>>((acc, e) => {
    const label = e.program?.name || 'Unassigned'
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {})

  const total = data.length
  const total_pages = Math.max(1, Math.ceil(total / perPage))
  const sliceStart = (page - 1) * perPage
  const sliceEnd = sliceStart + perPage

  return {
    data: data.slice(sliceStart, sliceEnd),
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages,
      counts_by_status,
      counts_by_program,
      total_revenue_cents: data.reduce((sum, e) => sum + (e.revenue_cents ?? 0), 0),
      total_tickets_sold: data.reduce((sum, e) => sum + (e.tickets_sold ?? 0), 0),
    },
  }
}

export function createFakeTicketingEvent(orgId: string, payload: Partial<TicketedEvent>) {
  const newEvent: TicketingEventWithDerived = {
    id: `evt-${events.length + 1}`,
    org_id: orgId,
    event_type: payload.event_type || 'game',
    title: payload.title || 'Untitled Event',
    description: payload.description || null,
    event_description: payload.event_description || null,
    starts_at: payload.starts_at || new Date().toISOString(),
    ends_at: payload.ends_at || new Date().toISOString(),
    timezone: payload.timezone || 'America/Chicago',
    venue_name: payload.venue_name || null,
    venue_city: payload.venue_city || null,
    venue_state: payload.venue_state || null,
    venue_postal_code: payload.venue_postal_code || null,
    sales_start_at: payload.sales_start_at || null,
    sales_end_at: payload.sales_end_at || null,
    cover_image_path: payload.cover_image_path || null,
    ticket_banner_url: payload.ticket_banner_url || null,
    status: payload.status || 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    program_id: payload.program_id || null,
    season_id: payload.season_id || null,
    venue_id: payload.venue_id || null,
    opponent: payload.opponent || null,
    is_home: payload.is_home ?? true,
    ticket_types: [],
  }
  events = [newEvent, ...events]
  return deriveEvent(newEvent)
}

export function updateFakeTicketingEvent(orgId: string, id: string, payload: Partial<TicketedEvent>) {
  events = events.map(ev => {
    if (ev.id !== id || ev.org_id !== orgId) return ev
    return { ...ev, ...payload, updated_at: new Date().toISOString() }
  })
  const updated = events.find(e => e.id === id && e.org_id === orgId)
  return updated ? deriveEvent(updated) : null
}

export function deleteFakeTicketingEvent(orgId: string, id: string) {
  const before = events.length
  events = events.filter(e => !(e.id === id && e.org_id === orgId))
  return before !== events.length
}

export function duplicateFakeTicketingEvent(orgId: string, id: string) {
  const source = events.find(e => e.id === id && e.org_id === orgId)
  if (!source) return null
  const clone = { ...source, id: `evt-${events.length + 1}`, title: `${source.title} (Copy)`, status: 'draft' }
  events = [clone, ...events]
  return deriveEvent(clone)
}

export function bulkFakeTicketingEvents(orgId: string, ids: string[], action: string, payload?: any) {
  if (action === 'delete') {
    events = events.filter(e => !(ids.includes(e.id) && e.org_id === orgId))
    return { deleted: ids.length }
  }
  if (action === 'move') {
    events = events.map(e => (ids.includes(e.id) && e.org_id === orgId ? { ...e, ...payload } : e))
    return { moved: ids.length }
  }
  if (action === 'update') {
    events = events.map(e => (ids.includes(e.id) && e.org_id === orgId ? { ...e, ...payload } : e))
    return { updated: ids.length }
  }
  if (action === 'duplicate') {
    const created: string[] = []
    ids.forEach(id => {
      const dup = duplicateFakeTicketingEvent(orgId, id)
      if (dup) created.push(dup.id)
    })
    return { duplicated: created.length, new_ids: created }
  }
  return { handled: false }
}
