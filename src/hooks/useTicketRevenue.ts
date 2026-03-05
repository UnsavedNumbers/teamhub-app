/**
 * Hook for ticket revenue reporting.
 * Uses unified provider-backed service (demo + real share the same DTOs).
 */

import { useQuery } from '@tanstack/react-query'
import { getTicketingSummary } from '@/services/ticketingService'

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
  month: string
  gross_cents: number
  platform_fee_cents: number
  org_revenue_cents: number
  order_count: number
  ticket_count: number
}

/**
 * Get ticket revenue by event for an organization.
 */
export function useTicketRevenueByEvent(orgId: string | undefined, dateRange?: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ['ticket-revenue-by-event', orgId, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async (): Promise<TicketRevenueByEvent[]> => {
      if (!orgId) return []
      const { data, error } = await getTicketingSummary(orgId, {
        start: dateRange?.start ?? null,
        end: dateRange?.end ?? null,
      })
      if (error) throw error
      return data?.byEvent ?? []
    },
    enabled: !!orgId,
    retry: 2,
    retryDelay: 1000,
  })
}

/**
 * Get monthly ticket revenue summary for an organization.
 */
export function useMonthlyTicketRevenue(orgId: string | undefined, months: number = 12) {
  return useQuery({
    queryKey: ['monthly-ticket-revenue', orgId, months],
    queryFn: async (): Promise<MonthlyTicketRevenue[]> => {
      if (!orgId) return []
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - months)

      const { data, error } = await getTicketingSummary(orgId, { start, end })
      if (error) throw error
      return data?.byMonth ?? []
    },
    enabled: !!orgId,
    retry: 2,
    retryDelay: 1000,
  })
}
