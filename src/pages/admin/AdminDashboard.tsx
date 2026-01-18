import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getTeams } from '../../data/services/teamsService'
import { getChildren } from '../../data/services/familyService'
import { getUnpaidFeeAssignments } from '../../data/services/paymentsService'
import { getUpcomingEventsForUser } from '../../data/services/eventsService'
import { 
  PageHeader, 
  StatCard, 
  Card, 
  Button, 
  Badge 
} from '../../components/platformAdmin'

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

  const fetchDashboardData = useCallback(async () => {
    if (!isReady) { setLoading(false); return }
    
    try {
      // Fetch all stats in parallel
      const [teamsResult, childrenResult, unpaidResult, eventsResult] = await Promise.all([
        getTeams(context, { activeOnly: false }),
        getChildren(context),
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

  if (loading) return <div className="pa-skeleton" style={{ height: '500px' }} />

  return (
    <div className="pa-root">
      <PageHeader 
        title="DASHBOARD" 
        subtitle={currentOrganization?.name?.toUpperCase()} 
        actions={<Button variant="secondary" onClick={() => fetchDashboardData()}>Refresh</Button>} 
      />

      <div className="pa-grid pa-grid-3 pa-gap-4 pa-mb-8">
        <StatCard label="TOTAL TEAMS" value={stats.totalTeams} icon="groups" onClick={() => navigate('/admin/teams')} />
        <StatCard label="TOTAL PLAYERS" value={stats.totalPlayers} icon="person" onClick={() => navigate('/admin/roster')} />
        <StatCard label="ACTIVE SEASONS" value={stats.activeSeasons} icon="calendar_today" />
        <StatCard label="UNPAID FEES" value={stats.outstandingPayments} icon="payments" onClick={() => navigate('/admin/payments')} />
        <StatCard label="UPCOMING EVENTS" value={stats.upcomingEvents} icon="event" onClick={() => navigate('/admin/events')} />
        <StatCard label="UNIFORM ORDERS" value={stats.pendingUniformOrders} icon="checkroom" onClick={() => navigate('/admin/uniforms')} />
      </div>

      <div className="pa-grid pa-grid-12 pa-gap-6">
        <div className="pa-col-8">
          <Card>
            <h3 className="pa-h3 pa-mb-6">QUICK ACTIONS</h3>
            <div className="pa-grid pa-grid-3 pa-gap-3">
              <Button style={{ height: 'auto', padding: 'var(--pa-space-4)', flexDirection: 'column', gap: '8px' }} onClick={() => navigate('/admin/events/new')}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add_circle</span>
                New Event
              </Button>
              <Button style={{ height: 'auto', padding: 'var(--pa-space-4)', flexDirection: 'column', gap: '8px' }} variant="secondary" onClick={() => navigate('/admin/users/new')}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>person_add</span>
                Add User
              </Button>
              <Button style={{ height: 'auto', padding: 'var(--pa-space-4)', flexDirection: 'column', gap: '8px' }} variant="secondary" onClick={() => navigate('/admin/fees/new')}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>request_quote</span>
                Assign Fee
              </Button>
            </div>
          </Card>
        </div>

        <div className="pa-col-4">
          <Card>
            <h3 className="pa-h3 pa-mb-6">RECENT ACTIVITY</h3>
            {recentActivity.length === 0 ? (
              <div className="pa-body-m pa-text-muted">No recent activity</div>
            ) : (
              <div className="pa-flex pa-flex-col pa-gap-4">
                {recentActivity.map(a => (
                  <div key={a.id} className="pa-flex pa-gap-3 pa-items-start">
                    <div className="pa-badge pa-badge--neutral pa-p-2" style={{ borderRadius: '50%' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
                    </div>
                    <div>
                      <div className="pa-body-s" style={{ fontWeight: 600 }}>{a.message}</div>
                      <div className="pa-text-overline pa-text-muted">{new Date(a.timestamp).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
