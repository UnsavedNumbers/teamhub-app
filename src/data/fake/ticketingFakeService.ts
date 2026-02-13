import type {
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  SeatMap,
  SeatMapSection,
  SeatMapWithSections,
  Ticket,
  TicketOrder,
  TicketOrderItem,
  TicketType,
  TicketedEvent,
  Venue,
} from '@/types/ticketing'
import { DEMO_ORG_A_ID } from '../config'
import {
  adjustFakeTicketTypeCapacity,
  getFakeTicketedEventById,
  getFakeTicketTypesForEvent,
  getFakeTicketingEvents,
  getFakeVenues,
  type TicketingEventsQuery,
} from './fakeTicketingEvents'
import { createServiceResponse } from '../services/responseHelpers'
import { getLink, RouteKeys } from '@/utils/routes'

const fakeOrders: TicketOrder[] = []
const fakeOrderItems: TicketOrderItem[] = []
const fakeTickets: Ticket[] = []
const fakeSeatMapsByOrg = new Map<string, FakeSeatMapRecord[]>()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function nowIso() {
  return new Date().toISOString()
}

function randomId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

function randomCode(length: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

function mapEventSummary(event: TicketedEvent | null) {
  if (!event) return null
  return {
    id: event.id,
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    venue_name: event.venue_name,
    venue_city: event.venue_city,
    venue_state: event.venue_state,
  }
}

function mapTicketTypeSummary(type: TicketType | undefined) {
  if (!type) return { name: 'General Admission', description: null }
  return { name: type.name, description: type.description }
}

interface FakeSeatMapRecord extends SeatMapWithSections {}

export interface FakeAdminSeatMapListItem {
  id: string
  name: string
  org_id: string
  venue_id: string | null
  team_id: string | null
  ticketed_event_id: string | null
  status: 'draft' | 'published'
  version: number
  chart_image_url: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  venue_name: string | null
  team_name: string | null
  event_title: string
  event_status: TicketedEvent['status']
  event_starts_at: string
  seat_count: number
  usage_count: number
}

function cloneSeatSection(section: SeatMapSection): SeatMapSection {
  return {
    ...section,
    position_metadata: { ...(section.position_metadata ?? {}) },
    seat_attributes: { ...(section.seat_attributes ?? {}) },
  }
}

function cloneSeatMapRecord(seatMap: FakeSeatMapRecord): FakeSeatMapRecord {
  return {
    ...seatMap,
    metadata: { ...(seatMap.metadata ?? {}) },
    sections: seatMap.sections.map(cloneSeatSection),
  }
}

function buildSeatSectionGrid(
  seatMapId: string,
  sectionLabel: string,
  rowStart: number,
  rowEnd: number,
  seatStart: number,
  seatEnd: number,
): SeatMapSection[] {
  const sections: SeatMapSection[] = []
  const createdAt = nowIso()

  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let seat = seatStart; seat <= seatEnd; seat += 1) {
      sections.push({
        id: randomId('seat'),
        seat_map_id: seatMapId,
        section_name: sectionLabel,
        row_identifier: String(row),
        seat_identifier: String(seat),
        position_metadata: {},
        seat_attributes: {},
        is_available: true,
        created_at: createdAt,
        updated_at: createdAt,
      })
    }
  }

  return sections
}

function ensureFakeSeatMaps(orgId: string): FakeSeatMapRecord[] {
  const existing = fakeSeatMapsByOrg.get(orgId)
  if (existing) {
    return existing
  }

  const events = getFakeTicketedEvents({ org_id: orgId })
  const now = nowIso()
  const mapAId = randomId('smap')
  const mapBId = randomId('smap')
  const mapCId = randomId('smap')

  const primaryEvent = events[0] ?? null
  const secondaryEvent = events[1] ?? null

  const maps: FakeSeatMapRecord[] = [
    {
      id: mapAId,
      org_id: orgId,
      venue_id: primaryEvent?.venue_id ?? null,
      team_id: primaryEvent?.team_id ?? null,
      ticketed_event_id: primaryEvent?.id ?? null,
      name: 'Main Floor',
      chart_image_url: null,
      metadata: {},
      status: 'published',
      version: 2,
      published_at: now,
      published_snapshot_id: null,
      created_at: now,
      updated_at: now,
      sections: buildSeatSectionGrid(mapAId, 'A', 1, 4, 1, 12),
    },
    {
      id: mapBId,
      org_id: orgId,
      venue_id: secondaryEvent?.venue_id ?? primaryEvent?.venue_id ?? null,
      team_id: secondaryEvent?.team_id ?? null,
      ticketed_event_id: secondaryEvent?.id ?? null,
      name: 'Lower Bowl',
      chart_image_url: null,
      metadata: {},
      status: 'draft',
      version: 1,
      published_at: null,
      published_snapshot_id: null,
      created_at: now,
      updated_at: now,
      sections: buildSeatSectionGrid(mapBId, 'B', 1, 6, 1, 16),
    },
    {
      id: mapCId,
      org_id: orgId,
      venue_id: primaryEvent?.venue_id ?? null,
      team_id: null,
      ticketed_event_id: null,
      name: 'Practice Court',
      chart_image_url: null,
      metadata: {},
      status: 'draft',
      version: 1,
      published_at: null,
      published_snapshot_id: null,
      created_at: now,
      updated_at: now,
      sections: buildSeatSectionGrid(mapCId, 'GA', 1, 2, 1, 10),
    },
  ]

  fakeSeatMapsByOrg.set(orgId, maps)
  return maps
}

export function getFakeVenuesForOrg(orgId: string): Venue[] {
  return getFakeVenues(orgId)
}

export function getFakeSeatMapsForOrgAdmin(orgId: string): FakeAdminSeatMapListItem[] {
  const seatMaps = ensureFakeSeatMaps(orgId).map(cloneSeatMapRecord)
  const events = getFakeTicketedEvents({ org_id: orgId })
  const eventsById = new Map(events.map((event) => [event.id, event]))
  const venuesById = new Map(getFakeVenues(orgId).map((venue) => [venue.id, venue]))

  return seatMaps
    .map((seatMap) => {
      const event = seatMap.ticketed_event_id ? eventsById.get(seatMap.ticketed_event_id) ?? null : null
      const venueName = seatMap.venue_id ? venuesById.get(seatMap.venue_id)?.name ?? null : null

      return {
        id: seatMap.id,
        name: seatMap.name,
        org_id: seatMap.org_id,
        venue_id: seatMap.venue_id,
        team_id: seatMap.team_id,
        ticketed_event_id: seatMap.ticketed_event_id,
        status: seatMap.status,
        version: seatMap.version,
        chart_image_url: seatMap.chart_image_url,
        created_at: seatMap.created_at,
        updated_at: seatMap.updated_at,
        published_at: seatMap.published_at,
        venue_name: event?.venue_name ?? venueName,
        team_name: null,
        event_title: event?.title ?? 'Unassigned',
        event_status: event?.status ?? 'draft',
        event_starts_at: event?.starts_at ?? seatMap.created_at,
        seat_count: seatMap.sections.length,
        usage_count: seatMap.ticketed_event_id ? 1 : 0,
      }
    })
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export function getFakeSeatMapsForEvent(eventId: string): SeatMap[] {
  const event = getFakeTicketedEventById(eventId, null)
  const orgId = event?.org_id ?? DEMO_ORG_A_ID
  const seatMaps = ensureFakeSeatMaps(orgId)

  return seatMaps
    .map((seatMap) => {
      const cloned = cloneSeatMapRecord(seatMap)
      return {
        id: cloned.id,
        org_id: cloned.org_id,
        venue_id: cloned.venue_id,
        team_id: cloned.team_id,
        ticketed_event_id: cloned.ticketed_event_id,
        name: cloned.name,
        chart_image_url: cloned.chart_image_url,
        metadata: cloned.metadata,
        status: cloned.status,
        version: cloned.version,
        published_at: cloned.published_at,
        published_snapshot_id: cloned.published_snapshot_id,
        created_at: cloned.created_at,
        updated_at: cloned.updated_at,
      }
    })
    .sort((a, b) => {
      const aRank = a.ticketed_event_id === eventId ? 0 : 1
      const bRank = b.ticketed_event_id === eventId ? 0 : 1
      if (aRank !== bRank) return aRank - bRank
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
}

export function getFakeSeatMapWithSeats(seatMapId: string): SeatMapWithSections | null {
  for (const seatMaps of fakeSeatMapsByOrg.values()) {
    const seatMap = seatMaps.find((entry) => entry.id === seatMapId)
    if (seatMap) {
      return cloneSeatMapRecord(seatMap)
    }
  }

  for (const orgId of [DEMO_ORG_A_ID]) {
    const seatMaps = ensureFakeSeatMaps(orgId)
    const seatMap = seatMaps.find((entry) => entry.id === seatMapId)
    if (seatMap) {
      return cloneSeatMapRecord(seatMap)
    }
  }

  return null
}

export function getFakeTicketedEvents(filters?: {
  org_id?: string
  status?: 'published' | 'draft' | 'cancelled' | 'completed'
  upcoming_only?: boolean
}) {
  const orgId = filters?.org_id || DEMO_ORG_A_ID
  const params: TicketingEventsQuery = {
    status: filters?.status ?? null,
    datePreset: filters?.upcoming_only ? 'upcoming' : null,
    page: 1,
    perPage: 200,
  }
  const result = getFakeTicketingEvents(orgId, params)
  return result.data
}

export function getFakeTicketedEvent(eventId: string, orgId?: string | null) {
  return getFakeTicketedEventById(eventId, orgId)
}

export function getFakeTicketTypes(eventId: string, orgId?: string | null) {
  return getFakeTicketTypesForEvent(eventId, orgId)
}

export function getFakeTicketTypesTotalCount(eventId: string, orgId?: string | null): number {
  const allTypes = getFakeTicketTypesForEvent(eventId, orgId)
  return allTypes.length
}

export function createFakeStaffValidationLink(ticketedEventId: string): string {
  const token = randomCode(24)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const validatePath = getLink(RouteKeys.PORTAL_TICKET_VALIDATE, { token })
  if (!ticketedEventId) return `${baseUrl}${validatePath}`
  return `${baseUrl}${validatePath}`
}

export function getFakeTicketOrderById(orderId: string, orgId?: string | null) {
  const order = fakeOrders.find(item => item.id === orderId)
  if (!order) return null
  if (orgId && order.org_id !== orgId) return null

  const event = getFakeTicketedEventById(order.ticketed_event_id, order.org_id)
  const ticketTypes = getFakeTicketTypesForEvent(order.ticketed_event_id, order.org_id)
  const typeMap = new Map(ticketTypes.map(type => [type.id, type]))

  const orderItems = fakeOrderItems
    .filter(item => item.order_id === order.id)
    .map(item => ({
      ...item,
      ticket_types: mapTicketTypeSummary(typeMap.get(item.ticket_type_id)),
    }))

  return {
    ...order,
    ticket_order_items: orderItems,
    ticketed_events: mapEventSummary(event),
  }
}

export function getFakeTicketsForOrder(orderId: string) {
  const tickets = fakeTickets.filter(ticket => ticket.order_id === orderId)
  if (tickets.length === 0) return []

  const event = getFakeTicketedEventById(tickets[0].ticketed_event_id, tickets[0].org_id)
  const ticketTypes = getFakeTicketTypesForEvent(tickets[0].ticketed_event_id, tickets[0].org_id)
  const typeMap = new Map(ticketTypes.map(type => [type.id, type]))

  return tickets.map(ticket => ({
    ...ticket,
    ticket_types: mapTicketTypeSummary(typeMap.get(ticket.ticket_type_id)),
    ticketed_events: mapEventSummary(event),
  }))
}

export function getFakeMyTicketOrders() {
  return [...fakeOrders]
}

export async function createFakeCheckoutSession(
  request: CreateCheckoutRequest,
): Promise<{ data: CreateCheckoutResponse | null; error: Error | null }> {
  const email = request.purchaser_email?.trim() || ''
  if (!request.ticketed_event_id) {
    return createServiceResponse(null, new Error('Event is required'))
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return createServiceResponse(null, new Error('A valid email address is required'))
  }
  if (!request.items?.length) {
    return createServiceResponse(null, new Error('Select at least one ticket'))
  }

  const event = getFakeTicketedEventById(request.ticketed_event_id, null)
  if (!event || event.status !== 'published') {
    return createServiceResponse(null, new Error('Event not available for purchase'))
  }

  const ticketTypes = getFakeTicketTypesForEvent(event.id, event.org_id)
  const typeMap = new Map(ticketTypes.map(type => [type.id, type]))

  const normalizedItems = request.items.map(item => ({
    ticket_type_id: item.ticket_type_id,
    quantity: Math.max(0, Math.floor(item.quantity || 0)),
  }))

  if (normalizedItems.some(item => item.quantity === 0)) {
    return createServiceResponse(null, new Error('Ticket quantities must be greater than zero'))
  }

  for (const item of normalizedItems) {
    const ticketType = typeMap.get(item.ticket_type_id)
    if (!ticketType) {
      return createServiceResponse(null, new Error('Selected ticket type is not available'))
    }
    if (ticketType.capacity_remaining !== null && ticketType.capacity_remaining < item.quantity) {
      return createServiceResponse(null, new Error(`Only ${ticketType.capacity_remaining} tickets remain for ${ticketType.name}`))
    }
  }

  const subtotal = normalizedItems.reduce((sum, item) => {
    const ticketType = typeMap.get(item.ticket_type_id)
    return sum + (ticketType ? ticketType.price_cents * item.quantity : 0)
  }, 0)

  const orderId = randomId('ord')
  const timestamp = nowIso()

  const order: TicketOrder = {
    id: orderId,
    org_id: event.org_id || DEMO_ORG_A_ID,
    ticketed_event_id: event.id,
    purchaser_user_id: null,
    purchaser_email: email,
    purchaser_name: null,
    status: 'paid',
    subtotal_cents: subtotal,
    tax_cents: 0,
    fees_cents: 0,
    total_cents: subtotal,
    stripe_checkout_session_id: `demo_${orderId}`,
    stripe_payment_intent_id: null,
    receipt_email_sent_at: timestamp,
    stripe_connect_account_id: null,
    platform_fee_cents: null,
    org_revenue_cents: null,
    stripe_charge_id: null,
    stripe_application_fee_id: null,
    processed_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  }

  const orderItems = normalizedItems.map(item => {
    const ticketType = typeMap.get(item.ticket_type_id)!
    return {
      id: randomId('item'),
      order_id: orderId,
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity,
      unit_price_cents: ticketType.price_cents,
      line_total_cents: ticketType.price_cents * item.quantity,
      created_at: timestamp,
    } satisfies TicketOrderItem
  })

  for (const item of orderItems) {
    const ok = adjustFakeTicketTypeCapacity(event.id, item.ticket_type_id, -item.quantity)
    if (!ok) {
      return createServiceResponse(null, new Error('Unable to reserve requested tickets'))
    }
  }

  const tickets: Ticket[] = []
  orderItems.forEach(item => {
    for (let i = 0; i < item.quantity; i += 1) {
      tickets.push({
        id: randomId('tkt'),
        org_id: order.org_id,
        ticketed_event_id: event.id,
        order_id: orderId,
        ticket_type_id: item.ticket_type_id,
        status: 'active',
        qr_token_hash: randomId('qr'),
        entry_code: randomCode(12),
        used_at: null,
        used_by_user_id: null,
        created_at: timestamp,
        updated_at: timestamp,
      })
    }
  })

  fakeOrders.unshift(order)
  fakeOrderItems.push(...orderItems)
  fakeTickets.push(...tickets)

  const baseUrl = request.return_base_url || (typeof window !== 'undefined' ? window.location.origin : '')
  const orderPath = request.org_slug
    ? getLink(RouteKeys.PORTAL_ORG_TICKET_ORDER, { orgSlug: request.org_slug, orderId })
    : getLink(RouteKeys.PORTAL_TICKET_ORDER_SUCCESS, { orderId })
  const checkoutUrl = baseUrl ? `${baseUrl}${orderPath}` : orderPath

  return createServiceResponse({ checkout_url: checkoutUrl, order_id: orderId, purchaser_email: email }, null)
}

export async function resendFakeTickets(
  orderId: string,
  email: string
): Promise<{ success: boolean; message: string; tickets_resent: number }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800))

  if (!orderId || !email) {
    throw new Error('Missing order ID or email')
  }

  return {
    success: true,
    message: 'Tickets resent successfully (DEMO)',
    tickets_resent: 1
  }
}
