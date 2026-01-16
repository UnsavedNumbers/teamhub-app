import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
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
  const navigate = useNavigate()

  const fetchDashboardData = useCallback(async () => {
    if (!currentOrganization?.id) { setLoading(false); return }
    try {
      const [teams, players, seasons, payments, events, uniforms] = await Promise.all([
        supabase.from('teams').select('*', { count: 'exact', head: true }).eq('org_id', currentOrganization.id),
        supabase.from('children').select('id, family:families(org_id)', { count: 'exact', head: true }).filter('family.org_id', 'eq', currentOrganization.id),
        supabase.from('seasons').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('fee_assignments').select('*', { count: 'exact', head: true }).eq('organization_id', currentOrganization.id).eq('status', 'unpaid'),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('org_id', currentOrganization.id).gte('start_time', new Date().toISOString()),
        supabase.from('uniform_submissions').select('*', { count: 'exact', head: true }).not('status', 'eq', 'fulfilled'),
      ])

      setStats({
        totalTeams: teams.count || 0,
        totalPlayers: players.count || 0,
        activeSeasons: seasons.count || 0,
        outstandingPayments: payments.count || 0,
        upcomingEvents: events.count || 0,
        pendingUniformOrders: uniforms.count || 0,
      })

      const { data: recentFees } = await supabase.from('fee_assignments').select('id, created_at, fee:fees(title)').eq('organization_id', currentOrganization.id).order('created_at', { ascending: false }).limit(5)
      const activities = ((recentFees as any[]) || []).map(r => ({
        id: r.id, type: 'fee_assignment', message: `New fee assignment: ${r.fee?.title || 'Fee'}`, timestamp: r.created_at || new Date().toISOString()
      }))
      setRecentActivity(activities)
    } finally { setLoading(false) }
  }, [currentOrganization?.id])

  useEffect(() => { fetchDashboardData() }, [fetchDashboardData])

  if (loading) return <div className="pa-skeleton" style={{ height: '500px' }} />

  return (
    <div className="pa-root">
      <PageHeader 
        title="DASHBOARD" 
        subtitle={currentOrganization?.name?.toUpperCase()} 
        actions={<Button variant="secondary" onClick={() => fetchDashboardData()}>Refresh</Button>} 
      />

      <div className="pa-grid pa-grid-3 pa-gap-4 pa-mb-8">
        <StatCard title="TOTAL TEAMS" value={stats.totalTeams} icon="groups" onClick={() => navigate('/admin/teams')} />
        <StatCard title="TOTAL PLAYERS" value={stats.totalPlayers} icon="person" onClick={() => navigate('/admin/roster')} />
        <StatCard title="ACTIVE SEASONS" value={stats.activeSeasons} icon="calendar_today" />
        <StatCard title="UNPAID FEES" value={stats.outstandingPayments} icon="payments" onClick={() => navigate('/admin/payments')} variant="danger" />
        <StatCard title="UPCOMING EVENTS" value={stats.upcomingEvents} icon="event" onClick={() => navigate('/admin/events')} />
        <StatCard title="UNIFORM ORDERS" value={stats.pendingUniformOrders} icon="checkroom" onClick={() => navigate('/admin/uniforms')} />
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
