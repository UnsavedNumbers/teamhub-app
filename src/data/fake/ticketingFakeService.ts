import type {
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  SeatMap,
  SeatMapSection,
  SeatMapWithSections,
  Ticket,
  TicketOrder,
  TicketOrderItem,
  TicketOrderStatus,
  TicketStatus,
  TicketType,
  TicketedEvent,
  ValidateScanRequest,
  ValidateScanResponse,
  Venue,
} from '@/types/ticketing'
import { DEMO_ORG_A_ID, DEMO_ORG_B_ID, DEMO_TRANSACTION_DELAY_MS, DEMO_USER_IDS } from '../config'
import {
  adjustFakeTicketTypeCapacity,
  DEMO_SOCIAL_RESERVED_TICKETED_EVENT_ID,
  getFakeTicketedEventById,
  getFakeTicketTypesForEvent,
  getFakeTicketingEvents,
  getFakeVenues,
  type TicketingEventsQuery,
} from './fakeTicketingEvents'
import { DEMO_RESERVED_SEAT_MAP_ID } from './ticketingFakeConstants'
import { createServiceResponse } from '../services/responseHelpers'
import { getLink, RouteKeys } from '@/utils/routes'
import { fakeUsers } from './fakeUsers'
import { generateOrderNumber } from './generators'
import { loadTicketingState, saveTicketingState } from './demoStorage'

const fakeOrders: TicketOrder[] = []
const fakeOrderItems: TicketOrderItem[] = []
const fakeTickets: Ticket[] = []
const fakeSeatMapsByOrg = new Map<string, FakeSeatMapRecord[]>()
let hasSeededOrderHistory = false

function persistTicketingState() {
    if (typeof window === 'undefined') return
    saveTicketingState({
        orders: [...fakeOrders],
        orderItems: [...fakeOrderItems],
        tickets: [...fakeTickets],
        version: 1,
    })
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function nowIso() {
  return new Date().toISOString()
}

function randomUuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function randomId(prefix: string) {
  return `${prefix}-${randomUuid()}`
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

function getDemoPurchasers() {
  return fakeUsers.slice(0, 220).map((user) => {
    const nameParts = user.display_name.split(' ')
    return {
      id: user.id,
      email: user.email.toLowerCase(),
      name: user.display_name,
      firstName: nameParts[0] || 'Demo',
      lastName: nameParts.slice(1).join(' ') || 'User',
    }
  })
}

function getPastIso(daysAgo: number, hourOffset: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - daysAgo)
  date.setUTCHours((9 + hourOffset) % 24, (hourOffset * 11) % 60, 0, 0)
  return date.toISOString()
}

function pickOrderStatus(index: number): TicketOrderStatus {
  if (index < 520) return 'paid'
  if (index < 544) return 'pending_payment'
  if (index < 576) return 'refunded'
  return 'cancelled'
}

function ensureSeededOrderHistory() {
  if (hasSeededOrderHistory) return
  hasSeededOrderHistory = true

  const stored = typeof window !== 'undefined' ? loadTicketingState() : null
  if (stored?.orders?.length) {
    fakeOrders.splice(0, fakeOrders.length, ...(stored.orders as TicketOrder[]))
    fakeOrderItems.splice(0, fakeOrderItems.length, ...(stored.orderItems as TicketOrderItem[]))
    fakeTickets.splice(0, fakeTickets.length, ...(stored.tickets as Ticket[]))
    return
  }

  const purchasers = getDemoPurchasers()
  const allEvents = [
    ...getFakeTicketedEvents({ org_id: DEMO_ORG_A_ID }),
    ...getFakeTicketedEvents({ org_id: DEMO_ORG_B_ID }),
  ]
  const paidEvents = allEvents.filter((event) => event.status === 'published' || event.status === 'completed')
  const pendingEvents = allEvents.filter((event) => event.status === 'published' && new Date(event.starts_at) > new Date())
  const refundedEvents = allEvents.filter((event) => event.status === 'completed' || event.status === 'cancelled' || event.status === 'published')
  const cancelledEvents = allEvents.filter((event) => event.status === 'published' || event.status === 'cancelled')

  for (let orderIndex = 0; orderIndex < 588; orderIndex += 1) {
    const status = pickOrderStatus(orderIndex)
    const purchaser = purchasers[orderIndex % purchasers.length]

    const eventPool = status === 'pending_payment'
      ? pendingEvents
      : status === 'refunded'
        ? refundedEvents
        : status === 'cancelled'
          ? cancelledEvents
          : paidEvents
    const event = eventPool[orderIndex % eventPool.length]
    if (!event) continue

    const allTicketTypes = getFakeTicketTypesForEvent(event.id, event.org_id).filter((ticketType) => ticketType.is_active)
    if (allTicketTypes.length === 0) continue

    const createdAt = getPastIso(orderIndex % 180, orderIndex % 12)
    const orderId = randomUuid()
    const selectedTypeCount = Math.min(1 + (orderIndex % 3), allTicketTypes.length)
    const selectedTypes = allTicketTypes.slice(0, selectedTypeCount)
    let subtotalCents = 0
    let ticketCount = 0

    const itemRecords: TicketOrderItem[] = selectedTypes.map((ticketType, itemIndex) => {
      const quantity = 1 + ((orderIndex + itemIndex) % 4)
      const lineTotal = quantity * ticketType.price_cents
      subtotalCents += lineTotal
      ticketCount += quantity

      return {
        id: randomId('item'),
        order_id: orderId,
        ticket_type_id: ticketType.id,
        quantity,
        unit_price_cents: ticketType.price_cents,
        line_total_cents: lineTotal,
        created_at: createdAt,
      }
    })

    const taxCents = Math.round(subtotalCents * 0.0725)
    const feesCents = 99 * ticketCount + 199
    const totalCents = subtotalCents + taxCents + feesCents
    const platformFeeCents = Math.round(totalCents * 0.08)
    const orgRevenueCents = totalCents - platformFeeCents
    const processedAt = status === 'pending_payment' ? null : createdAt
    const chargeId = status === 'cancelled' ? null : `ch_${randomCode(14)}`
    const paymentIntentId = status === 'cancelled' ? null : `pi_${randomCode(14)}`

    const order: TicketOrder & { order_number?: string } = {
      id: orderId,
      org_id: event.org_id || DEMO_ORG_A_ID,
      ticketed_event_id: event.id,
      purchaser_user_id: purchaser.id,
      order_number: generateOrderNumber(orderIndex),
      purchaser_email: purchaser.email,
      purchaser_name: purchaser.name,
      status,
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      fees_cents: feesCents,
      total_cents: totalCents,
      stripe_checkout_session_id: `cs_demo_${randomCode(20)}`,
      stripe_payment_intent_id: paymentIntentId,
      receipt_email_sent_at: status === 'pending_payment' ? null : createdAt,
      stripe_connect_account_id: `acct_demo_${event.org_id.slice(0, 8)}`,
      platform_fee_cents: platformFeeCents,
      org_revenue_cents: orgRevenueCents,
      stripe_charge_id: chargeId,
      stripe_application_fee_id: status === 'pending_payment' ? null : `fee_${randomCode(10)}`,
      processed_at: processedAt,
      created_at: createdAt,
      updated_at: createdAt,
    }

    const ticketsForOrder: Ticket[] = []
    if (status !== 'cancelled') {
      itemRecords.forEach((item, itemIndex) => {
        for (let quantityIndex = 0; quantityIndex < item.quantity; quantityIndex += 1) {
          let ticketStatus: TicketStatus = 'active'
          if (status === 'refunded') {
            ticketStatus = 'refunded'
          } else if (status === 'paid') {
            if ((orderIndex + itemIndex + quantityIndex) % 9 === 0) ticketStatus = 'used'
            if ((orderIndex + itemIndex + quantityIndex) % 41 === 0) ticketStatus = 'refunded'
          }

          const usedAt = ticketStatus === 'used' ? createdAt : null
          ticketsForOrder.push({
            id: randomId('tkt'),
            org_id: order.org_id,
            ticketed_event_id: event.id,
            order_id: order.id,
            ticket_type_id: item.ticket_type_id,
            status: ticketStatus,
            qr_token_hash: randomId('qr'),
            entry_code: randomCode(12),
            used_at: usedAt,
            used_by_user_id: usedAt ? 'scanner-demo-user' : null,
            created_at: createdAt,
            updated_at: createdAt,
          })
        }
      })
    }

    fakeOrders.push(order)
    fakeOrderItems.push(...itemRecords)
    fakeTickets.push(...ticketsForOrder)
  }

  fakeOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  persistTicketingState()
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
  const useDeterministicIds = orgId === DEMO_ORG_A_ID
  const mapAId = useDeterministicIds ? DEMO_RESERVED_SEAT_MAP_ID : randomId('smap')
  const mapBId = useDeterministicIds ? 'seatmap-lower-bowl-001' : randomId('smap')
  const mapCId = useDeterministicIds ? 'seatmap-practice-court-001' : randomId('smap')

  const primaryEvent = events.find((event) => event.id === DEMO_SOCIAL_RESERVED_TICKETED_EVENT_ID) ?? events[0] ?? null
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
      sections: buildSeatSectionGrid(mapAId, 'A', 1, 14, 1, 32),
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
  return getFakeVenues(orgId || DEMO_ORG_A_ID)
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

  for (const orgId of [DEMO_ORG_A_ID, DEMO_ORG_B_ID]) {
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
  fan_visible_only?: boolean
}) {
  const orgId = filters?.org_id || DEMO_ORG_A_ID
  const params: TicketingEventsQuery = {
    status: filters?.status ?? null,
    datePreset: filters?.upcoming_only ? 'upcoming' : null,
    fanVisibleOnly: filters?.fan_visible_only ?? false,
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
  ensureSeededOrderHistory()
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
  ensureSeededOrderHistory()
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

export function getFakeMyTicketOrders(userId?: string | null) {
  ensureSeededOrderHistory()
  if (!userId) return [...fakeOrders]
  const userOrders = fakeOrders.filter((o) => o.purchaser_user_id === userId)
  const demoFanId = DEMO_USER_IDS['fan-only@example.com']
  const requiredOrgIds = [DEMO_ORG_A_ID, DEMO_ORG_B_ID]

  const withCrossOrgCoverage = (orders: TicketOrder[]): TicketOrder[] => {
    const normalized = [...orders]
    const existingOrgIds = new Set(normalized.map((order) => order.org_id))
    for (const orgId of requiredOrgIds) {
      if (existingOrgIds.has(orgId)) continue
      const fallbackOrder = fakeOrders.find((order) => order.org_id === orgId)
      if (!fallbackOrder) continue
      normalized.push(fallbackOrder)
      existingOrgIds.add(orgId)
    }
    return normalized
  }

  if (userId === demoFanId) {
    return withCrossOrgCoverage(userOrders.length > 0 ? userOrders : fakeOrders.slice(0, 6))
  }

  if (userOrders.length === 0) {
    return fakeOrders.slice(0, 3)
  }

  return userOrders
}

export function getFakeTicketOrdersWithRelations(orgId?: string): Array<TicketOrder & {
  event: {
    id: string
    title: string
    starts_at: string
    ends_at: string
    status: string
  } | undefined
  items: Array<TicketOrderItem & {
    ticket_type: {
      id: string
      name: string
      price_cents: number
    }
  }>
  ticket_count: number
}> {
  ensureSeededOrderHistory()

  return fakeOrders
    .filter((order) => !orgId || order.org_id === orgId)
    .map((order) => {
      const event = getFakeTicketedEventById(order.ticketed_event_id, order.org_id) || undefined
      const ticketTypes = getFakeTicketTypesForEvent(order.ticketed_event_id, order.org_id)
      const ticketTypeMap = new Map(ticketTypes.map((ticketType) => [ticketType.id, ticketType]))
      const items = fakeOrderItems
        .filter((item) => item.order_id === order.id)
        .map((item) => {
          const ticketType = ticketTypeMap.get(item.ticket_type_id)
          return {
            ...item,
            ticket_type: {
              id: ticketType?.id ?? item.ticket_type_id,
              name: ticketType?.name ?? 'General Admission',
              price_cents: ticketType?.price_cents ?? item.unit_price_cents,
            },
          }
        })

      return {
        ...order,
        event: event
          ? {
            id: event.id,
            title: event.title,
            starts_at: event.starts_at,
            ends_at: event.ends_at,
            status: event.status,
          }
          : undefined,
        items,
        ticket_count: items.reduce((sum, item) => sum + item.quantity, 0),
      }
    })
}

export function deleteFakeTicketOrder(orgId: string, orderId: string): void {
  ensureSeededOrderHistory()
  const index = fakeOrders.findIndex((order) => order.id === orderId && order.org_id === orgId)
  if (index === -1) {
    throw new Error('Order not found or unauthorized')
  }
  if (fakeOrders[index].status === 'paid') {
    throw new Error('Cannot delete paid orders. Please refund first.')
  }

  fakeOrders.splice(index, 1)
  for (let i = fakeOrderItems.length - 1; i >= 0; i -= 1) {
    if (fakeOrderItems[i].order_id === orderId) fakeOrderItems.splice(i, 1)
  }
  for (let i = fakeTickets.length - 1; i >= 0; i -= 1) {
    if (fakeTickets[i].order_id === orderId) fakeTickets.splice(i, 1)
  }
  persistTicketingState()
}

export function processFakeTicketOrderRefund(
  orderId: string,
  amountCents?: number,
): { refund_id: string; amount: number; status: string; message: string } {
  ensureSeededOrderHistory()
  const order = fakeOrders.find((entry) => entry.id === orderId)
  if (!order) {
    throw new Error('Order not found')
  }
  if (order.status !== 'paid') {
    throw new Error('Only paid orders can be refunded')
  }

  order.status = 'refunded'
  order.updated_at = nowIso()
  order.processed_at = nowIso()

  fakeTickets.forEach((ticket) => {
    if (ticket.order_id === orderId && ticket.status !== 'voided') {
      ticket.status = 'refunded'
      ticket.updated_at = order.updated_at
    }
  })

  persistTicketingState()
  return {
    refund_id: `rfnd_${randomCode(12)}`,
    amount: amountCents ?? order.total_cents,
    status: 'succeeded',
    message: 'Refund processed successfully (DEMO)',
  }
}

export function manuallyCompleteFakeTicketOrder(orderId: string): { success: boolean; message: string; tickets_created: number } {
  ensureSeededOrderHistory()
  const order = fakeOrders.find((entry) => entry.id === orderId)
  if (!order) {
    throw new Error('Order not found')
  }
  if (order.status !== 'pending_payment') {
    throw new Error('Only pending orders can be manually completed')
  }

  const items = fakeOrderItems.filter((item) => item.order_id === orderId)
  const timestamp = nowIso()
  let ticketsCreated = 0

  items.forEach((item) => {
    for (let i = 0; i < item.quantity; i += 1) {
      fakeTickets.push({
        id: randomId('tkt'),
        org_id: order.org_id,
        ticketed_event_id: order.ticketed_event_id,
        order_id: order.id,
        ticket_type_id: item.ticket_type_id,
        status: 'active',
        qr_token_hash: randomId('qr'),
        entry_code: randomCode(12),
        used_at: null,
        used_by_user_id: null,
        created_at: timestamp,
        updated_at: timestamp,
      })
      ticketsCreated += 1
    }
  })

  order.status = 'paid'
  order.updated_at = timestamp
  order.processed_at = timestamp
  order.receipt_email_sent_at = timestamp
  order.stripe_payment_intent_id = order.stripe_payment_intent_id || `pi_${randomCode(14)}`
  order.stripe_charge_id = order.stripe_charge_id || `ch_${randomCode(14)}`

  persistTicketingState()
  return {
    success: true,
    message: 'Order manually completed (DEMO)',
    tickets_created: ticketsCreated,
  }
}

export function validateFakeTicketScan(request: ValidateScanRequest): ValidateScanResponse {
  ensureSeededOrderHistory()

  const entryCode = request.entry_code?.toUpperCase().replace(/[^A-Z0-9]/g, '') || null
  const qrRaw = request.qr_token_raw || null

  if (!request.ticketed_event_id) {
    return {
      result: 'invalid',
      reason: 'not_found',
      message: 'Event is required.',
    }
  }

  if (!entryCode && !qrRaw) {
    return {
      result: 'invalid',
      reason: 'not_found',
      message: 'Scan code is required.',
    }
  }

  const ticket = fakeTickets.find((candidate) =>
    (entryCode && candidate.entry_code === entryCode) ||
    (qrRaw && candidate.qr_token_hash === qrRaw),
  )

  if (!ticket) {
    return {
      result: 'not_found',
      reason: 'not_found',
      message: 'Ticket not found.',
    }
  }

  const ticketEvent = getFakeTicketedEventById(ticket.ticketed_event_id, ticket.org_id)
  const selectedEvent = getFakeTicketedEventById(request.ticketed_event_id, ticket.org_id)

  if (ticket.ticketed_event_id !== request.ticketed_event_id && !request.cross_event_admission) {
    return {
      result: 'wrong_event',
      reason: 'wrong_event',
      message: `This ticket is for ${ticketEvent?.title || 'another event'}.`,
      event_mismatch: true,
      ticket_event_id: ticket.ticketed_event_id,
      ticket_event_name: ticketEvent?.title,
      selected_event_id: request.ticketed_event_id,
      selected_event_name: selectedEvent?.title,
    }
  }

  if (ticket.status === 'refunded') {
    return {
      result: 'refunded',
      reason: 'refunded',
      message: 'Ticket has been refunded.',
    }
  }

  if (ticket.status === 'voided') {
    return {
      result: 'voided',
      reason: 'voided',
      message: 'Ticket has been voided.',
    }
  }

  if (ticket.status === 'used' && !request.force_validate) {
    return {
      result: 'already_used',
      message: 'Ticket already scanned.',
      used_at: ticket.used_at,
      original_scanned_at: ticket.used_at,
    }
  }

  const order = fakeOrders.find((candidate) => candidate.id === ticket.order_id)
  const ticketType = getFakeTicketTypesForEvent(ticket.ticketed_event_id, ticket.org_id)
    .find((candidate) => candidate.id === ticket.ticket_type_id)

  ticket.status = 'used'
  ticket.used_at = nowIso()
  ticket.updated_at = ticket.used_at

  return {
    result: 'valid',
    message: 'Valid ticket.',
    ticket_type_name: ticketType?.name || 'General Admission',
    event_confirmation: ticketEvent?.title || 'Event confirmed',
    used_at: ticket.used_at,
    purchaser_name: order?.purchaser_name || null,
    validated_count: 1,
  }
}

export async function createFakeCheckoutSession(
  request: CreateCheckoutRequest,
): Promise<{ data: CreateCheckoutResponse | null; error: Error | null }> {
  await new Promise((r) => setTimeout(r, DEMO_TRANSACTION_DELAY_MS))
  ensureSeededOrderHistory()
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

  const orderId = randomUuid()
  const timestamp = nowIso()

  const order: TicketOrder & { order_number?: string } = {
    id: orderId,
    org_id: event.org_id || DEMO_ORG_A_ID,
    ticketed_event_id: event.id,
    purchaser_user_id: null,
    purchaser_email: email,
    order_number: generateOrderNumber(fakeOrders.length + 100000),
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
  persistTicketingState()

  const baseUrl = request.return_base_url || (typeof window !== 'undefined' ? window.location.origin : '')
  const orderPath = request.org_slug
    ? getLink(RouteKeys.PORTAL_ORG_TICKET_ORDER, { orgSlug: request.org_slug, orderId })
    : getLink(RouteKeys.PORTAL_TICKET_ORDER_SUCCESS, { orderId })
  const checkoutUrl = baseUrl ? `${baseUrl}${orderPath}` : orderPath

  return createServiceResponse({ checkout_url: checkoutUrl, order_id: orderId }, null)
}

export async function resendFakeTickets(
  orderId: string,
  email: string
): Promise<{ success: boolean; message: string; tickets_resent: number }> {
  ensureSeededOrderHistory()
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
