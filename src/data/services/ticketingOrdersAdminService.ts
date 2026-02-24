import { supabase } from '@/lib/supabase'
import { USE_FAKE_DATA, DEMO_ORG_A_ID } from '../config'
import { debug } from '../../lib/debug'
import {
  deleteFakeTicketOrder,
  getFakeTicketedEvents,
  getFakeTicketOrdersWithRelations,
} from '../fake/ticketingFakeService'

export interface TicketOrderItem {
  id: string
  ticket_type_id: string
  quantity: number
  unit_price_cents: number
  line_total_cents: number
  ticket_type?: {
    id: string
    name: string
    price_cents: number
  }
}

export interface TicketOrderWithRelations {
  id: string
  org_id: string
  ticketed_event_id: string
  purchaser_email: string
  purchaser_name: string | null
  purchaser_user_id: string | null
  total_cents: number
  platform_fee_cents: number | null
  org_revenue_cents: number | null
  payment_processor?: string | null
  payment_id?: string | null
  status: 'pending_payment' | 'paid' | 'refunded' | 'cancelled'
  created_at: string | null
  updated_at: string | null
  event?: {
    id: string
    title: string
    starts_at: string
    ends_at: string
    status: string
  }
  items?: TicketOrderItem[]
  ticket_count?: number
}

export interface TicketingOrdersQuery {
  search?: string
  eventId?: string
  status?: 'pending_payment' | 'paid' | 'refunded' | 'cancelled' | null
  dateFrom?: string | null
  dateTo?: string | null
  datePreset?: string | null
  sortBy?: string
  page?: number
  perPage?: number
}

export interface TicketingOrdersMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
  total_revenue_cents: number
  total_orders: number
}

export interface TicketingOrdersResponse {
  data: TicketOrderWithRelations[]
  meta: TicketingOrdersMeta
}

function getDatePresetStart(datePreset: string | null | undefined): Date | null {
  if (!datePreset) return null

  const now = new Date()
  switch (datePreset) {
    case 'today': {
      const value = new Date(now)
      value.setHours(0, 0, 0, 0)
      return value
    }
    case 'this_week': {
      const value = new Date(now)
      value.setDate(now.getDate() - now.getDay())
      value.setHours(0, 0, 0, 0)
      return value
    }
    case 'this_month':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'last_30_days': {
      const value = new Date(now)
      value.setDate(now.getDate() - 30)
      return value
    }
    default:
      return null
  }
}

function applyDateFilters(
  orders: TicketOrderWithRelations[],
  datePreset?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null,
): TicketOrderWithRelations[] {
  const presetStart = getDatePresetStart(datePreset)

  return orders.filter((order) => {
    if (!order.created_at) return false
    const createdAt = new Date(order.created_at)

    if (presetStart && createdAt < presetStart) return false
    if (!presetStart && dateFrom && createdAt < new Date(dateFrom)) return false
    if (!presetStart && dateTo && createdAt > new Date(dateTo)) return false

    return true
  })
}

function sortOrders(orders: TicketOrderWithRelations[], sortBy: string): TicketOrderWithRelations[] {
  const copy = [...orders]

  if (sortBy === 'amount') {
    copy.sort((a, b) => (b.total_cents || 0) - (a.total_cents || 0))
    return copy
  }

  copy.sort((a, b) => {
    const aValue = a[sortBy as keyof TicketOrderWithRelations]
    const bValue = b[sortBy as keyof TicketOrderWithRelations]

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return bValue.localeCompare(aValue)
    }

    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })

  return copy
}

function getEventFilterIds(query: TicketingOrdersQuery): string[] {
  const ids = new Set<string>()
  if (query.eventId) ids.add(query.eventId)

  const eventIds = (query as TicketingOrdersQuery & { eventIds?: string[] }).eventIds
  if (Array.isArray(eventIds)) {
    eventIds.forEach((id) => {
      if (id) ids.add(id)
    })
  }

  return Array.from(ids)
}

export async function fetchTicketingOrders(
  orgId: string,
  query: TicketingOrdersQuery = {},
): Promise<TicketingOrdersResponse> {
  console.groupCollapsed(`%cfetchTicketingOrders: ${orgId}`, 'color: #666; font-weight: bold;');
  debug.data('TicketingOrdersAdminService.fetchTicketingOrders', 'Request', { orgId, search: query.search, status: query.status, page: query.page, perPage: query.perPage })
  debug.perf.start('ticketingOrdersAdminService.fetchTicketingOrders')

  try {
    const {
      search = '',
      status,
      dateFrom,
      dateTo,
      datePreset,
      sortBy = 'created_at',
      page = 1,
      perPage = 20,
    } = query

    const eventFilterIds = getEventFilterIds(query)

    if (USE_FAKE_DATA) {
    // In demo mode, use DEMO_ORG_A_ID to get fake orders regardless of actual orgId
    const baseOrders = getFakeTicketOrdersWithRelations(DEMO_ORG_A_ID).map((order) => ({
      ...order,
      payment_processor: 'demo-card',
      payment_id: order.stripe_payment_intent_id,
    })) as TicketOrderWithRelations[]

    let filtered = baseOrders

    if (search) {
      const queryText = search.toLowerCase()
      filtered = filtered.filter((order) =>
        [order.purchaser_email, order.purchaser_name, order.id]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(queryText)),
      )
    }

    if (eventFilterIds.length > 0) {
      filtered = filtered.filter((order) => eventFilterIds.includes(order.ticketed_event_id))
    }

    if (status) {
      filtered = filtered.filter((order) => order.status === status)
    }

    filtered = applyDateFilters(filtered, datePreset, dateFrom, dateTo)
    filtered = sortOrders(filtered, sortBy)

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const from = (page - 1) * perPage
    const paged = filtered.slice(from, from + perPage)

      const result = {
        data: paged,
        meta: {
          page,
          per_page: perPage,
          total,
          total_pages: totalPages,
          total_revenue_cents: filtered.reduce((sum, order) => sum + (order.total_cents || 0), 0),
          total_orders: total,
        },
      }
      debug.perf.end('ticketingOrdersAdminService.fetchTicketingOrders')
      debug.data('TicketingOrdersAdminService.fetchTicketingOrders', 'Response (fake)', { orgId, orderCount: result.data.length, total: result.meta.total })
      console.groupEnd()
      return result
    }

    let baseQuery = supabase
    .from('ticket_orders')
    .select(
      `
      *,
      event:ticketed_events!ticket_orders_ticketed_event_id_fkey (
        id,
        title,
        starts_at,
        ends_at,
        status
      ),
      items:ticket_order_items (
        id,
        ticket_type_id,
        quantity,
        unit_price_cents,
        line_total_cents,
        ticket_type:ticket_types (
          id,
          name,
          price_cents
        )
      )
    `,
      { count: 'exact' },
    )
    .eq('org_id', orgId)

  if (search) {
    baseQuery = baseQuery.or(`purchaser_email.ilike.%${search}%,purchaser_name.ilike.%${search}%,id.ilike.%${search}%`)
  }

  if (eventFilterIds.length > 0) {
    if (eventFilterIds.length === 1) {
      baseQuery = baseQuery.eq('ticketed_event_id', eventFilterIds[0])
    } else {
      baseQuery = baseQuery.in('ticketed_event_id', eventFilterIds)
    }
  }

  if (status) {
    baseQuery = baseQuery.eq('status', status)
  }

  const presetStart = getDatePresetStart(datePreset)
  if (presetStart) {
    baseQuery = baseQuery.gte('created_at', presetStart.toISOString())
  } else {
    if (dateFrom) {
      baseQuery = baseQuery.gte('created_at', dateFrom)
    }
    if (dateTo) {
      baseQuery = baseQuery.lte('created_at', dateTo)
    }
  }

  const sortColumn = sortBy === 'amount' ? 'total_cents' : sortBy
  baseQuery = baseQuery.order(sortColumn, { ascending: false })

  const from = (page - 1) * perPage
  const to = from + perPage - 1
  baseQuery = baseQuery.range(from, to)

  const { data, error, count } = await baseQuery
  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = (data || []) as any as TicketOrderWithRelations[]
  const ordersWithCount = orders.map((order) => ({
    ...order,
    ticket_count: order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
  }))

  return {
    data: ordersWithCount,
    meta: {
      page,
      per_page: perPage,
      total: count || 0,
      total_pages: Math.max(1, Math.ceil((count || 0) / perPage)),
      total_revenue_cents: orders.reduce((sum, order) => sum + (order.total_cents || 0), 0),
      total_orders: count || 0,
    },
  }
  } catch (err) {
    debug.perf.end('ticketingOrdersAdminService.fetchTicketingOrders')
    debug.error('TicketingOrdersAdminService.fetchTicketingOrders', 'Failed to fetch orders', { error: err, orgId })
    console.groupEnd()
    return {
      data: [],
      meta: {
        page: 1,
        per_page: query.perPage ?? 20,
        total: 0,
        total_pages: 0,
        total_revenue_cents: 0,
        total_orders: 0,
      },
    }
  }
}

export async function fetchTicketingEvents(orgId: string) {
  console.groupCollapsed(`%cfetchTicketingEvents: ${orgId}`, 'color: #666; font-weight: bold;');
  debug.data('TicketingOrdersAdminService.fetchTicketingEvents', 'Request', { orgId })
  debug.perf.start('ticketingOrdersAdminService.fetchTicketingEvents')

  try {
    if (USE_FAKE_DATA) {
      const fakeOrgId = DEMO_ORG_A_ID
      const result = getFakeTicketedEvents({ org_id: fakeOrgId })
        .map((event) => ({
          id: event.id,
          title: event.title,
          starts_at: event.starts_at,
          status: event.status,
      }))
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
      .slice(0, 100)
      debug.perf.end('ticketingOrdersAdminService.fetchTicketingEvents')
      debug.data('TicketingOrdersAdminService.fetchTicketingEvents', 'Response (fake)', { orgId, eventCount: result.length })
      console.groupEnd()
      return result
    }

    const { data, error } = await supabase
      .from('ticketed_events')
      .select('id, title, starts_at, status')
      .eq('org_id', orgId)
      .order('starts_at', { ascending: false })
      .limit(100)

    if (error) throw error
    debug.perf.end('ticketingOrdersAdminService.fetchTicketingEvents')
    debug.data('TicketingOrdersAdminService.fetchTicketingEvents', 'Response', { orgId, eventCount: data?.length || 0 })
    console.groupEnd()
    return data || []
  } catch (err) {
    debug.perf.end('ticketingOrdersAdminService.fetchTicketingEvents')
    debug.error('TicketingOrdersAdminService.fetchTicketingEvents', 'Failed to fetch events', { error: err, orgId })
    console.groupEnd()
    throw err
  }
}

export async function deleteTicketOrder(orgId: string, orderId: string) {
  console.groupCollapsed(`%cdeleteTicketOrder: ${orgId} - ${orderId}`, 'color: #666; font-weight: bold;');
  debug.flow('TicketingOrdersAdminService.deleteTicketOrder', 'Deleting order', { orgId, orderId })
  debug.perf.start('ticketingOrdersAdminService.deleteTicketOrder')

  try {
    if (USE_FAKE_DATA) {
      deleteFakeTicketOrder(orgId, orderId)
      debug.perf.end('ticketingOrdersAdminService.deleteTicketOrder')
      debug.flow('TicketingOrdersAdminService.deleteTicketOrder', 'Order deleted (fake)', { orgId, orderId })
      console.groupEnd()
      return
    }

    const { data: order } = await supabase
    .from('ticket_orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('org_id', orgId)
    .single()

    if (!order) {
      debug.perf.end('ticketingOrdersAdminService.deleteTicketOrder')
      debug.error('TicketingOrdersAdminService.deleteTicketOrder', 'Order not found or unauthorized', { orgId, orderId })
      console.groupEnd()
      throw new Error('Order not found or unauthorized')
    }

    if (order.status === 'paid') {
      debug.perf.end('ticketingOrdersAdminService.deleteTicketOrder')
      debug.error('TicketingOrdersAdminService.deleteTicketOrder', 'Cannot delete paid orders', { orgId, orderId, status: order.status })
      console.groupEnd()
      throw new Error('Cannot delete paid orders. Please refund first.')
    }

    const { error } = await supabase
      .from('ticket_orders')
      .delete()
      .eq('id', orderId)
      .eq('org_id', orgId)

    if (error) throw error

    debug.perf.end('ticketingOrdersAdminService.deleteTicketOrder')
    debug.flow('TicketingOrdersAdminService.deleteTicketOrder', 'Order deleted successfully', { orgId, orderId })
    console.groupEnd()
  } catch (err) {
    debug.perf.end('ticketingOrdersAdminService.deleteTicketOrder')
    debug.error('TicketingOrdersAdminService.deleteTicketOrder', 'Failed to delete order', { error: err, orgId, orderId })
    console.groupEnd()
    throw err
  }
}
