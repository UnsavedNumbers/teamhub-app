/**
 * Hook for ticket revenue reporting
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface TicketRevenueByEvent {
  ticketed_event_id: string
  event_title: string
  gross_cents: number
  platform_fee_cents: number
  org_revenue_cents: number
  order_count: number
  ticket_count: number
}

export interface MonthlyTicketRevenue {
  month: string // YYYY-MM
  gross_cents: number
  platform_fee_cents: number
  org_revenue_cents: number
  order_count: number
  ticket_count: number
}

/**
 * Get ticket revenue by event for an organization
 */
export function useTicketRevenueByEvent(orgId: string | undefined, dateRange?: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ['ticket-revenue-by-event', orgId, dateRange],
    queryFn: async () => {
      if (!orgId) return []

      const startDate = dateRange?.start || new Date(new Date().getFullYear(), 0, 1)
      const endDate = dateRange?.end || new Date()

      // Query stripe_connect_transactions joined with ticket_orders and ticketed_events
      const { data: transactions, error } = await supabase
        .from('stripe_connect_transactions')
        .select(`
          gross_amount_cents,
          application_fee_cents,
          net_amount_cents,
          ticket_orders!inner(
            org_id,
            ticketed_event_id,
            ticketed_events!inner(
              id,
              title
            ),
            ticket_order_items(quantity)
          )
        `)
        .eq('ticket_orders.org_id', orgId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (error) throw error

      if (!transactions || transactions.length === 0) {
        return []
      }

      // Group by event
      const eventMap = new Map<string, TicketRevenueByEvent>()

      for (const tx of transactions) {
        const order = tx.ticket_orders as any
        const event = order?.ticketed_events
        const items = order?.ticket_order_items || []

        if (!event) continue

        const eventId = event.id
        const ticketCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)

        if (!eventMap.has(eventId)) {
          eventMap.set(eventId, {
            ticketed_event_id: eventId,
            event_title: event.title || 'Unknown Event',
            gross_cents: 0,
            platform_fee_cents: 0,
            org_revenue_cents: 0,
            order_count: 0,
            ticket_count: 0,
          })
        }

        const eventRevenue = eventMap.get(eventId)!
        eventRevenue.gross_cents += tx.gross_amount_cents || 0
        eventRevenue.platform_fee_cents += tx.application_fee_cents || 0
        eventRevenue.org_revenue_cents += tx.net_amount_cents || 0
        eventRevenue.order_count += 1
        eventRevenue.ticket_count += ticketCount
      }

      return Array.from(eventMap.values()).sort((a, b) => b.org_revenue_cents - a.org_revenue_cents)
    },
    enabled: !!orgId,
    retry: 2,
    retryDelay: 1000,
  })
}

/**
 * Get monthly ticket revenue summary for an organization
 */
export function useMonthlyTicketRevenue(orgId: string | undefined, months: number = 12) {
  return useQuery({
    queryKey: ['monthly-ticket-revenue', orgId, months],
    queryFn: async () => {
      if (!orgId) return []

      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)

      const { data: transactions, error } = await supabase
        .from('stripe_connect_transactions')
        .select(`
          gross_amount_cents,
          application_fee_cents,
          net_amount_cents,
          created_at,
          ticket_orders!inner(
            org_id,
            ticket_order_items(quantity)
          )
        `)
        .eq('ticket_orders.org_id', orgId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (error) throw error

      if (!transactions || transactions.length === 0) {
        return []
      }

      // Group by month
      const monthMap = new Map<string, MonthlyTicketRevenue>()

      for (const tx of transactions) {
        const order = tx.ticket_orders as any
        const items = order?.ticket_order_items || []
        const ticketCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)

        const txDate = new Date(tx.created_at)
        const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, {
            month: monthKey,
            gross_cents: 0,
            platform_fee_cents: 0,
            org_revenue_cents: 0,
            order_count: 0,
            ticket_count: 0,
          })
        }

        const monthRevenue = monthMap.get(monthKey)!
        monthRevenue.gross_cents += tx.gross_amount_cents || 0
        monthRevenue.platform_fee_cents += tx.application_fee_cents || 0
        monthRevenue.org_revenue_cents += tx.net_amount_cents || 0
        monthRevenue.order_count += 1
        monthRevenue.ticket_count += ticketCount
      }

      return Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month))
    },
    enabled: !!orgId,
    retry: 2,
    retryDelay: 1000,
  })
}
