import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { StatCard, PageHeader, Card, Badge, EmptyState } from '../../components/platformAdmin'
import { formatCurrency } from '../../utils/platformAdminMasking'
import type { AdminPlatformHealth, AdminAuditLog } from '../../types/platformAdmin.types'

// Loading skeleton for stats
function StatsSkeleton() {
  return (
    <div className="pa-grid pa-grid-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="pa-kpi-card">
          <div className="pa-skeleton" style={{ width: '60%', height: '14px', marginBottom: '8px' }} />
          <div className="pa-skeleton" style={{ width: '40%', height: '40px' }} />
        </div>
      ))}
    </div>
  )
}

export default function PlatformAdminDashboard() {
  const [health, setHealth] = useState<AdminPlatformHealth | null>(null)
  const [recentActivity, setRecentActivity] = useState<AdminAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()
  const navigate = useNavigate()

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch platform health metrics
      const { data: healthData, error: healthError } = await supabase
        .from('admin_platform_health')
        .select('*')
        .single()

      if (healthError) {
        if (healthError.code === 'PGRST116' || healthError.message?.includes('not found')) {
          setHealth({
            active_organizations: 0,
            trial_organizations: 0,
            suspended_organizations: 0,
            total_users: 0,
            platform_admin_count: 0,
            successful_payments: 0,
            failed_payments: 0,
            total_payment_volume_cents: 0,
            total_teams: 0,
            total_children: 0,
          })
        } else {
          console.error('Error fetching health:', healthError)
          setError('Failed to load platform health metrics')
        }
      } else {
        setHealth(healthData)
      }

      // Fetch recent audit log entries
      const { data: activityData, error: activityError } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (activityError) {
        if (!activityError.message?.includes('not found')) {
          console.error('Error fetching audit log:', activityError)
        }
        setRecentActivity([])
      } else {
        setRecentActivity(activityData || [])
      }
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const getBadgeVariant = (action: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    if (action.includes('suspend') || action.includes('disable') || action.includes('remove')) {
      return 'danger'
    }
    if (action.includes('activate') || action.includes('enable') || action.includes('add')) {
      return 'success'
    }
    if (action.includes('update') || action.includes('set')) {
      return 'warning'
    }
    return 'info'
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          subtitle={`Signed in as ${profile?.email ?? 'unknown'}`}
        />
        <StatsSkeleton />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Signed in as ${profile?.email ?? 'unknown'}`}
      />

      {error && (
        <div className="pa-card pa-mb-4" style={{ borderLeft: '3px solid var(--pa-warning)', background: 'var(--pa-warning-bg)' }}>
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ color: 'var(--pa-warning)' }}>warning</span>
            <span className="pa-body-m">{error}. The platform admin views may not be set up yet.</span>
          </div>
        </div>
      )}

      {/* Stats Row 1: Organizations & Users */}
      <div className="pa-grid pa-grid-4">
        <StatCard
          label="Active Organizations"
          value={health?.active_organizations ?? 0}
          icon="apartment"
          onClick={() => navigate('/platform-admin/organizations')}
        />
        <StatCard
          label="Trial Organizations"
          value={health?.trial_organizations ?? 0}
          icon="schedule"
          meta={`${health?.suspended_organizations ?? 0} suspended`}
          onClick={() => navigate('/platform-admin/organizations')}
        />
        <StatCard
          label="Total Users"
          value={health?.total_users ?? 0}
          icon="group"
          meta={`${health?.platform_admin_count ?? 0} platform admins`}
          onClick={() => navigate('/platform-admin/users')}
        />
        <StatCard
          label="Payment Volume"
          value={formatCurrency(health?.total_payment_volume_cents ?? 0)}
          icon="payments"
          onClick={() => navigate('/platform-admin/payments')}
        />
      </div>

      {/* Stats Row 2: Payments & Structure */}
      <div className="pa-grid pa-grid-4 pa-mt-5">
        <StatCard
          label="Successful Payments"
          value={health?.successful_payments ?? 0}
          icon="check_circle"
          delta={
            health?.successful_payments
              ? { value: 'Last 30 days', direction: 'neutral' as const }
              : undefined
          }
          onClick={() => navigate('/platform-admin/payments')}
        />
        <StatCard
          label="Failed Payments"
          value={health?.failed_payments ?? 0}
          icon="error"
          onClick={() => navigate('/platform-admin/payments')}
        />
        <StatCard
          label="Total Teams"
          value={health?.total_teams ?? 0}
          icon="groups"
          onClick={() => navigate('/platform-admin/structure')}
        />
        <StatCard
          label="Total Children"
          value={health?.total_children ?? 0}
          icon="child_care"
          onClick={() => navigate('/platform-admin/users')}
        />
      </div>

      {/* Recent Activity */}
      <div className="pa-mt-5">
        <Card
          title="Recent Activity"
          actions={
            <button className="pa-btn pa-btn--ghost pa-btn--dense">
              View All
            </button>
          }
        >
          {recentActivity.length === 0 ? (
            <EmptyState
              icon="history"
              title="No Activity Yet"
              description="Admin actions will appear here once the audit system is active."
            />
          ) : (
            <div className="pa-flex pa-flex-col pa-gap-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="pa-flex pa-items-center pa-gap-3"
                  style={{ padding: 'var(--pa-space-3) 0', borderBottom: '1px solid var(--pa-n100)' }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--pa-radius-s)',
                      background: 'var(--pa-n50)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--pa-n500)' }}>
                      history
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="pa-flex pa-items-center pa-gap-2 pa-mb-1">
                      <Badge variant={getBadgeVariant(activity.action)}>
                        {activity.action.replace(/_/g, ' ')}
                      </Badge>
                      <span className="pa-body-s">on {activity.entity_type}</span>
                    </div>
                    <p className="pa-caption" style={{ margin: 0 }}>
                      {activity.actor_email || 'System'} • {formatTimeAgo(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
