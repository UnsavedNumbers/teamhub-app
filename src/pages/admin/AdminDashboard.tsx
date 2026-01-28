import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { getLink } from '../../utils/routes'
import { getTeams } from '../../data/services/teamsService'
import { getAthletes } from '../../data/services/familyService'
import { getUnpaidFeeAssignments } from '../../data/services/paymentsService'
import { getUpcomingEventsForUser } from '../../data/services/eventsService'
import { 
  AdminPageHeader, 
  StatCard, 
  Card, 
  Button, 
} from '../../components/platformAdmin'
import { cn } from '../../utils/cn'

interface DashboardStats {
  totalTeams: number
  totalPlayers: number
  activeSeasons: number
  outstandingPayments: number
  upcomingEvents: number
  pendingUniformOrders: number
}

interface RecentActivity {
  id: string
  type: string
  message: string
  timestamp: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTeams: 0, totalPlayers: 0, activeSeasons: 0, 
    outstandingPayments: 0, upcomingEvents: 0, pendingUniformOrders: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const { currentOrganization } = useOrganization()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()

  const fetchDashboardData = useCallback(async () => {
    if (!isReady) { setLoading(false); return }
    
    try {
      // Fetch all stats in parallel
      const [teamsResult, childrenResult, unpaidResult, eventsResult] = await Promise.all([
        getTeams(context, { activeOnly: false }),
        getAthletes(context),
        getUnpaidFeeAssignments(context),
        getUpcomingEventsForUser(context, 100),
      ])

      setStats({
        totalTeams: teamsResult.data.length,
        totalPlayers: childrenResult.data.length,
        activeSeasons: 2, // TODO: Implement seasons service
        outstandingPayments: unpaidResult.data.length,
        upcomingEvents: eventsResult.data.length,
        pendingUniformOrders: 0, // TODO: Implement uniforms service
      })

      // Generate recent activity from unpaid fees
      const activities: RecentActivity[] = unpaidResult.data.slice(0, 5).map(assignment => ({
        id: assignment.id,
        type: 'fee_assignment',
        message: `New fee assignment: ${assignment.fee?.title || 'Fee'}`,
        timestamp: assignment.created_at,
      }))
      
      setRecentActivity(activities)
    } finally { 
      setLoading(false) 
    }
  }, [context, isReady])

  useEffect(() => { 
    fetchDashboardData() 
  }, [fetchDashboardData])

  if (loading) {
    return (
      <div className="pa-root">
        <div className="pa-skeleton pa-mb-8" style={{ width: '40%', height: '40px' }} />
        <div className="pa-grid pa-grid-3 pa-gap-4 pa-mb-8">
            <div className="pa-skeleton" style={{ height: '140px' }} />
            <div className="pa-skeleton" style={{ height: '140px' }} />
            <div className="pa-skeleton" style={{ height: '140px' }} />
        </div>
        <div className="pa-skeleton" style={{ height: '400px' }} />
      </div>
    )
  }

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title={t('admin.dashboard.title')} 
        subtitle={currentOrganization?.name || t('admin.dashboard.subtitle')} 
        actions={
          <Button variant="secondary" onClick={() => fetchDashboardData()} icon="refresh">
            Refresh
          </Button>
        } 
      />

      <div className={cn('pa-grid', 'pa-grid-1', 'md:pa-grid-3', 'pa-gap-6', 'pa-mb-10')}>
        <StatCard 
            label={t('admin.dashboard.totalTeams')} 
            value={stats.totalTeams} 
            icon="groups" 
            onClick={() => navigate(getLink('admin.teams.list'))} 
            style={{ borderBottom: '4px solid var(--pa-primary, #0066cc)' }}
        />
        <StatCard 
            label={t('admin.dashboard.totalAthletes')} 
            value={stats.totalPlayers} 
            icon="person" 
            onClick={() => navigate(getLink('admin.athletes.list'))} 
            style={{ borderBottom: '4px solid var(--pa-success, #10b981)' }}
        />
        <StatCard 
            label={t('admin.dashboard.activeSeasons')} 
            value={stats.activeSeasons} 
            icon="calendar_today" 
            style={{ borderBottom: '4px solid var(--pa-warning, #f59e0b)' }}
        />
        <StatCard 
            label={t('admin.dashboard.unpaidFees')} 
            value={stats.outstandingPayments} 
            icon="payments" 
            onClick={() => navigate('/admin/payments')} 
            style={{ borderBottom: '4px solid var(--pa-danger, #ef4444)' }}
        />
        <StatCard 
            label={t('admin.dashboard.upcomingEvents')} 
            value={stats.upcomingEvents} 
            icon="event" 
            onClick={() => navigate('/admin/events')} 
            style={{ borderBottom: '4px solid #8b5cf6' }}
        />
        <StatCard 
            label={t('admin.dashboard.uniformOrders')} 
            value={stats.pendingUniformOrders} 
            icon="checkroom" 
            onClick={() => navigate('/admin/uniforms')} 
            style={{ borderBottom: '4px solid #ec4899' }}
        />
      </div>

      <div className={cn('pa-grid', 'pa-grid-1', 'pa-gap-6', 'pa-dashboard-grid')}>
        <div className="pa-dashboard-main">
          <Card>
            <div className="pa-p-4 sm:pa-p-6">
                <h3 className="pa-overline pa-mb-6 sm:pa-mb-8">QUICK ACTIONS</h3>
                <div className={cn('pa-grid', 'pa-grid-1', 'pa-gap-3', 'pa-actions-grid')}>
                  <Button 
                    className={cn('pa-flex', 'pa-flex-col', 'pa-items-center', 'pa-justify-center', 'pa-gap-3', 'pa-p-6', 'sm:pa-p-8', 'pa-h-auto')}
                    onClick={() => navigate('/admin/events/new')}
                    variant="secondary"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add_circle</span>
                    <span className="pa-font-bold">New Event</span>
                  </Button>
                  <Button 
                    variant="secondary" 
                    className={cn('pa-flex', 'pa-flex-col', 'pa-items-center', 'pa-justify-center', 'pa-gap-3', 'pa-p-6', 'sm:pa-p-8', 'pa-h-auto')}
                    onClick={() => navigate('/admin/users/new')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>person_add</span>
                    <span className="pa-font-bold">Add User</span>
                  </Button>
                  <Button 
                    variant="secondary" 
                    className={cn('pa-flex', 'pa-flex-col', 'pa-items-center', 'pa-justify-center', 'pa-gap-3', 'pa-p-6', 'sm:pa-p-8', 'pa-h-auto')}
                    onClick={() => navigate('/admin/fees/new')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>request_quote</span>
                    <span className="pa-font-bold">Assign Fee</span>
                  </Button>
                </div>
            </div>
          </Card>
        </div>

        <div className="pa-dashboard-sidebar">
          <Card noPadding>
            <div className="pa-p-6 pa-border-b pa-border-slate-100">
                <h3 className="pa-overline">RECENT ACTIVITY</h3>
            </div>
            <div className="pa-p-6">
                {recentActivity.length === 0 ? (
                  <div className="pa-body-m pa-text-muted pa-text-center pa-py-10">No recent activity</div>
                ) : (
                  <div className="pa-flex pa-flex-col pa-gap-6">
                    {recentActivity.map(a => (
                      <div key={a.id} className="pa-flex pa-gap-4 pa-items-start">
                        <div 
                          className="pa-bg-neutral-light pa-size-10 pa-flex pa-items-center pa-justify-center pa-rounded-full"
                        >
                          <span className="material-symbols-outlined pa-text-slate-400 pa-icon-sm">notifications</span>
                        </div>
                        <div className="pa-flex-1 pa-pt-1">
                          <div className="pa-text-sm pa-font-bold pa-text-slate-900 pa-mb-1">{a.message}</div>
                          <div className="pa-text-[10px] pa-font-black pa-text-slate-400 pa-uppercase pa-tracking-widest">{new Date(a.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
            {recentActivity.length > 0 && (
                <div className="pa-p-4 pa-border-t pa-border-slate-100 pa-text-center">
                    <Button variant="ghost" size="dense">View All Activity</Button>
                </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
