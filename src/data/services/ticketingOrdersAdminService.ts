import { supabase } from '@/lib/supabase'

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

export async function fetchTicketingOrders(
  orgId: string,
  query: TicketingOrdersQuery = {}
): Promise<TicketingOrdersResponse> {
  console.log('[fetchTicketingOrders] START orgId:', orgId, 'query:', query)

  const {
    search = '',
    eventId,
    status,
    dateFrom,
    dateTo,
    datePreset,
    sortBy = 'created_at',
    page = 1,
    perPage = 20,
  } = query

  let baseQuery = supabase
    .from('ticket_orders')
    .select(`
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
    `, { count: 'exact' })
    .eq('org_id', orgId)

  // Apply filters
  if (search) {
    baseQuery = baseQuery.or(`purchaser_email.ilike.%${search}%,purchaser_name.ilike.%${search}%,id.ilike.%${search}%`)
  }

  if (eventId) {
    baseQuery = baseQuery.eq('ticketed_event_id', eventId)
  }

  if (status) {
    baseQuery = baseQuery.eq('status', status)
  }

  // Date filtering
  if (datePreset) {
    const now = new Date()
    let fromDate: Date | null = null
    
    switch (datePreset) {
      case 'today':
        fromDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'this_week':
        fromDate = new Date(now.setDate(now.getDate() - now.getDay()))
        fromDate.setHours(0, 0, 0, 0)
        break
      case 'this_month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'last_30_days':
        fromDate = new Date(now.setDate(now.getDate() - 30))
        break
    }

    if (fromDate) {
      baseQuery = baseQuery.gte('created_at', fromDate.toISOString())
    }
  } else {
    if (dateFrom) {
      baseQuery = baseQuery.gte('created_at', dateFrom)
    }
    if (dateTo) {
      baseQuery = baseQuery.lte('created_at', dateTo)
    }
  }

  // Sorting
  const sortColumn = sortBy === 'amount' ? 'total_cents' : sortBy
  baseQuery = baseQuery.order(sortColumn, { ascending: false })

  // Pagination
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  baseQuery = baseQuery.range(from, to)

  console.log('[fetchTicketingOrders] About to execute query, range:', from, to)

  const { data, error, count } = await baseQuery

  console.log('[fetchTicketingOrders] result count:', count, 'data length:', data?.length, 'error:', error)
  console.log('[fetchTicketingOrders] data:', data)

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = (data || []) as any as TicketOrderWithRelations[]

  // Calculate ticket count for each order
  const ordersWithCount = orders.map(order => ({
    ...order,
    ticket_count: order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
  }))

  // Calculate aggregates
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_cents || 0), 0)

  return {
    data: ordersWithCount,
    meta: {
      page,
      per_page: perPage,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / perPage),
      total_revenue_cents: totalRevenue,
      total_orders: count || 0,
    },
  }
}

export async function fetchTicketingEvents(orgId: string) {
  const { data, error } = await supabase
    .from('ticketed_events')
    .select('id, title, starts_at, status')
    .eq('org_id', orgId)
    .order('starts_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return data || []
}

export async function deleteTicketOrder(orgId: string, orderId: string) {
  // First check if order belongs to org
  const { data: order } = await supabase
    .from('ticket_orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('org_id', orgId)
    .single()

  if (!order) {
    throw new Error('Order not found or unauthorized')
  }

  if (order.status === 'paid') {
    throw new Error('Cannot delete paid orders. Please refund first.')
  }

  const { error } = await supabase
    .from('ticket_orders')
    .delete()
    .eq('id', orderId)
    .eq('org_id', orgId)

  if (error) throw error
}
