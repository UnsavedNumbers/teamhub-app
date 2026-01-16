import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'
import { NoOrganizationEmptyState } from '../../components/admin/NoOrganizationEmptyState'
import { AdminCard, AdminStatCard, MdButton } from '../../components/adminMd'

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
    totalTeams: 0,
    totalPlayers: 0,
    activeSeasons: 0,
    outstandingPayments: 0,
    upcomingEvents: 0,
    pendingUniformOrders: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const fetchRecentActivity = useCallback(async () => {
    if (!currentOrganization?.id) return
    
    // Simplified recent activity - can be enhanced with payment_events table
    const activities: RecentActivity[] = []
    
    // Get recent fee assignments
    const { data: recentFees } = await supabase
      .from('fee_assignments')
      .select('id, created_at, fee:fees(title)')
      .eq('organization_id', currentOrganization.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentFees) {
      type RecentFeeAssignment = {
        id: string
        created_at: string | null
        fee: { title: string | null } | null
      }

      ;(recentFees as unknown as RecentFeeAssignment[]).forEach((assignment) => {
        activities.push({
          id: assignment.id,
          type: 'fee_assignment',
          message: `New fee assignment: ${assignment.fee?.title || 'Fee'}`,
          timestamp: assignment.created_at || new Date().toISOString(),
        })
      })
    }

    setRecentActivity(activities.slice(0, 5))
  }, [currentOrganization?.id])

  const fetchDashboardData = useCallback(async () => {
    if (!currentOrganization?.id) {
      setLoading(false)
      return
    }

    try {
      // Fetch all stats in parallel
      const [
        teamsResult,
        playersResult,
        seasonsResult,
        paymentsResult,
        eventsResult,
        uniformsResult,
      ] = await Promise.all([
        // Total Teams
        supabase
          .from('teams')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', currentOrganization.id),
        
        // Total Players (children via families)
        supabase
          .from('children')
          .select('id, family:families(org_id)', { count: 'exact', head: true })
          .eq('family.org_id', currentOrganization.id),
        
        // Active Seasons
        supabase
          .from('seasons')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id)
          .eq('is_active', true),
        
        // Outstanding Payments (using new payments schema)
        supabase
          .from('fee_assignments')
          .select('balance_cents')
          .eq('organization_id', currentOrganization.id)
          .in('status', ['unpaid', 'partial']),
        
        // Upcoming Events (next 7 days)
        supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .gte('start_time', new Date().toISOString())
          .lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Pending Uniform Orders
        supabase
          .from('uniform_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ])

      // Calculate outstanding payments total
      let outstandingTotal = 0
      if (paymentsResult.data) {
        outstandingTotal = paymentsResult.data.reduce((sum: number, assignment: { balance_cents: number | null }) => {
          return sum + (assignment.balance_cents || 0)
        }, 0)
      }

      setStats({
        totalTeams: teamsResult.count || 0,
        totalPlayers: playersResult.count || 0,
        activeSeasons: seasonsResult.count || 0,
        outstandingPayments: outstandingTotal,
        upcomingEvents: eventsResult.count || 0,
        pendingUniformOrders: uniformsResult.count || 0,
      })

      // Fetch recent activity (simplified - can be enhanced with payment_events table)
      await fetchRecentActivity()
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [currentOrganization?.id, fetchRecentActivity])

  useEffect(() => {
    if (!profile || (!profile.isPlatformAdmin && profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    fetchDashboardData()
  }, [profile, currentOrganization, navigate, fetchDashboardData])

  if (loading) {
    return <AdminSkeletonTable rows={6} columns={3} />
  }

  // Show empty state if no organization
  if (!currentOrganization?.id) {
    return <NoOrganizationEmptyState variant="card" />
  }

  const statCards = [
    {
      title: 'Total Teams',
      value: stats.totalTeams,
      icon: <i className="fas fa-users" />,
      action: () => navigate('/admin/teams'),
    },
    {
      title: 'Total Players',
      value: stats.totalPlayers,
      icon: <i className="fas fa-child" />,
      action: () => navigate('/admin/children'),
    },
    {
      title: 'Active Seasons',
      value: stats.activeSeasons,
      icon: <i className="fas fa-chart-line" />,
      action: () => navigate('/admin/teams'),
    },
    {
      title: 'Outstanding Payments',
      value: `$${(stats.outstandingPayments / 100).toFixed(2)}`,
      icon: <i className="fas fa-credit-card" />,
      action: () => navigate('/admin/payments'),
    },
    {
      title: 'Upcoming Events',
      value: stats.upcomingEvents,
      icon: <i className="fas fa-calendar-alt" />,
      action: () => navigate('/admin/events'),
    },
    {
      title: 'Pending Uniforms',
      value: stats.pendingUniformOrders,
      icon: <i className="fas fa-tshirt" />,
      action: () => navigate('/admin/uniforms'),
    },
  ]

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <h4 className="font-weight-bolder mb-0">Admin Dashboard</h4>
        </div>
      </div>

      <div className="row">
        {statCards.map((card) => (
          <div key={card.title} className="col-xl-4 col-sm-6 mb-4">
            <div onClick={card.action} style={{ cursor: 'pointer' }}>
              <AdminStatCard
                title={card.title}
                value={String(card.value)}
                icon={card.icon}
                footer={
                  <span className="text-secondary text-sm">
                    <i className="fas fa-arrow-right ms-1" /> View details
                  </span>
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <AdminCard title="Quick Actions">
            <div className="row">
              <div className="col-12 col-md-3 mb-2">
                <MdButton variant="primary" fullWidth onClick={() => navigate('/admin/teams')}>
                  <i className="fas fa-plus me-2" />
                  Create Team
                </MdButton>
              </div>
              <div className="col-12 col-md-3 mb-2">
                <MdButton variant="primary" fullWidth onClick={() => navigate('/admin/payments/new')}>
                  <i className="fas fa-plus me-2" />
                  Create Fee
                </MdButton>
              </div>
              <div className="col-12 col-md-3 mb-2">
                <MdButton variant="primary" fullWidth onClick={() => navigate('/admin/events/new')}>
                  <i className="fas fa-plus me-2" />
                  Create Event
                </MdButton>
              </div>
              <div className="col-12 col-md-3 mb-2">
                <MdButton variant="primary" fullWidth onClick={() => navigate('/admin/users/new')}>
                  <i className="fas fa-plus me-2" />
                  Add Player
                </MdButton>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <AdminCard title="Recent Activity">
            {recentActivity.length === 0 ? (
              <p className="text-secondary py-2 mb-0">No recent activity</p>
            ) : (
              <ul className="list-group list-group-flush">
                {recentActivity.map((activity) => (
                  <li key={activity.id} className="list-group-item px-0">
                    <div className="d-flex align-items-center">
                      <div className="icon icon-shape icon-sm bg-gradient-primary text-white border-radius-md me-3">
                        <i className="fas fa-credit-card" />
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-0 text-sm">{activity.message}</h6>
                        <p className="text-xs text-secondary mb-0">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
      </div>
    </div>
  )
}
