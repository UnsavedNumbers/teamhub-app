import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
} from '@mui/material'
import {
  Groups as TeamsIcon,
  People as PeopleIcon,
  Event as EventsIcon,
  Payment as PaymentsIcon,
  Checkroom as UniformsIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'

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

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    fetchDashboardData()
  }, [profile, currentOrganization, navigate])

  async function fetchDashboardData() {
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
  }

  async function fetchRecentActivity() {
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
      recentFees.forEach((assignment: any) => {
        activities.push({
          id: assignment.id,
          type: 'fee_assignment',
          message: `New fee assignment: ${assignment.fee?.title || 'Fee'}`,
          timestamp: assignment.created_at || new Date().toISOString(),
        })
      })
    }

    setRecentActivity(activities.slice(0, 5))
  }

  if (loading) {
    return <AdminSkeletonTable rows={6} columns={3} />
  }

  const statCards = [
    {
      title: 'Total Teams',
      value: stats.totalTeams,
      icon: <TeamsIcon />,
      color: '#3b82f6',
      action: () => navigate('/admin/teams'),
    },
    {
      title: 'Total Players',
      value: stats.totalPlayers,
      icon: <PeopleIcon />,
      color: '#10b981',
      action: () => navigate('/admin/children'),
    },
    {
      title: 'Active Seasons',
      value: stats.activeSeasons,
      icon: <TrendingUpIcon />,
      color: '#8b5cf6',
      action: () => navigate('/admin/teams'),
    },
    {
      title: 'Outstanding Payments',
      value: `$${(stats.outstandingPayments / 100).toFixed(2)}`,
      icon: <PaymentsIcon />,
      color: '#f59e0b',
      action: () => navigate('/admin/payments'),
    },
    {
      title: 'Upcoming Events',
      value: stats.upcomingEvents,
      icon: <EventsIcon />,
      color: '#ef4444',
      action: () => navigate('/admin/events'),
    },
    {
      title: 'Pending Uniforms',
      value: stats.pendingUniformOrders,
      icon: <UniformsIcon />,
      color: '#06b6d4',
      action: () => navigate('/admin/uniforms'),
    },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Admin Dashboard
      </Typography>

      {/* Quick Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={card.action}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: `${card.color}20`,
                      borderRadius: 2,
                      p: 1.5,
                      color: card.color,
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => navigate('/admin/teams')}
              >
                Create Team
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => navigate('/admin/payments/new')}
              >
                Create Fee
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => navigate('/admin/events/new')}
              >
                Create Event
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => navigate('/admin/users/new')}
              >
                Add Player
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Recent Activity
          </Typography>
          {recentActivity.length === 0 ? (
            <Typography color="textSecondary" sx={{ py: 2 }}>
              No recent activity
            </Typography>
          ) : (
            <List>
              {recentActivity.map((activity) => (
                <ListItem key={activity.id}>
                  <ListItemIcon>
                    <PaymentsIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.message}
                    secondary={new Date(activity.timestamp).toLocaleString()}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
