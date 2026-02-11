/**
 * Validation Dashboard Page
 * 
 * Live validation dashboard with realtime counts for a specific event.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useT } from '@/i18n/useI18n'
import { useOrganization } from '@/contexts/OrganizationContext'
import { supabase } from '@/lib/supabase'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/platformAdmin'
import '../../styles/orgAdmin.css'

interface TicketStats {
  total_tickets: number
  validated: number
  remaining: number
  refunded: number
}

interface TicketTypeBreakdown {
  [typeName: string]: {
    total: number
    active: number
    used: number
    refunded: number
  }
}

interface RecentScan {
  id: string
  entry_code: string
  validated_at: string
  ticket_types: { name: string } | null
  ticket_orders: { purchaser_name: string | null } | null
}

export default function ValidationDashboard() {
  const t = useT()
  const { id: eventId } = useParams<{ id: string }>()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id

  const [stats, setStats] = useState<TicketStats>({
    total_tickets: 0,
    validated: 0,
    remaining: 0,
    refunded: 0,
  })
  const [ticketTypeBreakdown, setTicketTypeBreakdown] = useState<TicketTypeBreakdown>({})
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])

  // Load event details
  const { data: event } = useQuery({
    queryKey: ['ticketed-event', eventId, orgId],
    queryFn: async () => {
      if (!eventId || !orgId) return null
      
      const { data, error } = await supabase
        .from('ticketed_events')
        .select('id, title, starts_at')
        .eq('id', eventId)
        .eq('org_id', orgId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!eventId && !!orgId,
  })

  // Load initial stats
  const { refetch: refetchStats } = useQuery({
    queryKey: ['ticket-stats', eventId],
    queryFn: async () => {
      if (!eventId) return null

      // Get aggregate counts
      const { count: totalCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('ticketed_event_id', eventId)

      // Count by status
      const { data: statusData } = await supabase
        .from('tickets')
        .select('status')
        .eq('ticketed_event_id', eventId)

      const statusCounts = {
        active: statusData?.filter((t) => t.status === 'active').length || 0,
        used: statusData?.filter((t) => t.status === 'used').length || 0,
        refunded: statusData?.filter((t) => t.status === 'refunded').length || 0,
      }

      // Get breakdown by ticket type
      const { data: ticketsWithTypes } = await supabase
        .from('tickets')
        .select(`
          status,
          ticket_types (
            name
          )
        `)
        .eq('ticketed_event_id', eventId)

      const breakdown: TicketTypeBreakdown = {}
      ticketsWithTypes?.forEach((t: any) => {
        const typeName = t.ticket_types?.name || 'Unknown'
        if (!breakdown[typeName]) {
          breakdown[typeName] = { total: 0, active: 0, used: 0, refunded: 0 }
        }
        breakdown[typeName].total++
        if (t.status === 'active' || t.status === 'used' || t.status === 'refunded') {
          breakdown[typeName][t.status as 'active' | 'used' | 'refunded']++
        }
      })

      const newStats = {
        total_tickets: totalCount || 0,
        validated: statusCounts.used,
        remaining: statusCounts.active,
        refunded: statusCounts.refunded,
      }

      setStats(newStats)
      setTicketTypeBreakdown(breakdown)

      return { stats: newStats, breakdown }
    },
    enabled: !!eventId,
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  // Load recent scans
  const { refetch: refetchRecentScans } = useQuery({
    queryKey: ['recent-scans', eventId],
    queryFn: async () => {
      if (!eventId) return []

      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id,
          entry_code,
          used_at,
          ticket_types (
            name
          ),
          ticket_orders (
            purchaser_name
          )
        `)
        .eq('ticketed_event_id', eventId)
        .eq('status', 'used')
        .not('used_at', 'is', null)
        .order('used_at', { ascending: false })
        .limit(20)

      if (error) throw error
      const normalized = (data || []).map((item: any) => ({
        ...item,
        validated_at: item.used_at,
      })) as RecentScan[]
      setRecentScans(normalized)
      return normalized
    },
    enabled: !!eventId,
    refetchInterval: 3000, // Refresh every 3 seconds
  })

  // Realtime subscription for ticket updates
  useEffect(() => {
    if (!eventId) return

    const channel = supabase
      .channel(`event-${eventId}-tickets`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `ticketed_event_id=eq.${eventId}`,
        },
        () => {
          // Refetch stats when ticket is updated
          refetchStats()
          refetchRecentScans()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, refetchStats, refetchRecentScans])

  if (!eventId) {
    return (
      <div className="oa-page-container">
        <AdminPageHeader title={t('ticketing.dashboard.title')} />
        <div className="text-center py-12">
          <p className="text-gray-500">{t('common.error.label')}: Event ID required</p>
        </div>
      </div>
    )
  }

  const progressPercent = stats.total_tickets > 0 
    ? Math.round((stats.validated / stats.total_tickets) * 100) 
    : 0

  return (
    <div className="oa-page-container">
      <AdminPageHeader
        title={t('ticketing.dashboard.title')}
        breadcrumbs={[
          { label: 'Home', path: '/admin' },
          { label: 'Ticketing', path: '/admin/ticketing/events' },
          { label: event?.title || 'Event' },
          { label: t('ticketing.dashboard.title') },
        ]}
      />

      <div className="mt-8 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <p className="text-3xl font-black text-green-600 dark:text-green-400">
              {stats.validated}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('ticketing.dashboard.validated')}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <p className="text-3xl font-black text-[#137fec]">
              {stats.remaining}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('ticketing.dashboard.remaining')}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <p className="text-3xl font-black text-gray-900 dark:text-white">
              {stats.total_tickets}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('ticketing.dashboard.totalSold')}
            </p>
          </div>
          {stats.refunded > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
              <p className="text-3xl font-black text-red-600 dark:text-red-400">
                {stats.refunded}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('ticketing.orderContext.refunded')}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {progressPercent}% {t('ticketing.dashboard.checkedIn')}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className="bg-[#137fec] h-4 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Breakdown by ticket type */}
        {Object.keys(ticketTypeBreakdown).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {t('ticketing.dashboard.byTicketType')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('ticketing.dashboard.type')}
                    </th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('ticketing.dashboard.validated')}
                    </th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('ticketing.dashboard.remaining')}
                    </th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('ticketing.dashboard.totalSold')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(ticketTypeBreakdown).map(([type, counts]) => (
                    <tr key={type} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-4 text-sm text-gray-900 dark:text-white">{type}</td>
                      <td className="py-2 px-4 text-sm text-right text-gray-900 dark:text-white">
                        {counts.used}
                      </td>
                      <td className="py-2 px-4 text-sm text-right text-gray-900 dark:text-white">
                        {counts.active}
                      </td>
                      <td className="py-2 px-4 text-sm text-right text-gray-900 dark:text-white">
                        {counts.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent scans */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {t('ticketing.dashboard.recentScans')}
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentScans.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No scans yet
              </p>
            ) : (
              recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                      {scan.entry_code}
                    </span>
                    {scan.ticket_types?.name && (
                      <Badge variant="info">{scan.ticket_types.name}</Badge>
                    )}
                    {scan.ticket_orders?.purchaser_name && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {scan.ticket_orders.purchaser_name}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    {scan.validated_at
                      ? new Date(scan.validated_at).toLocaleTimeString()
                      : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
