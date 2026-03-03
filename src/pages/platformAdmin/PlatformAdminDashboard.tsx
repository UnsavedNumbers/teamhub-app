import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n/useI18n'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { PageHeader, Card, Badge, EmptyState, OfflineBanner } from '../../components/platformAdmin'
import { TopLevelStats } from '../../components/common/TopLevelStats'
import { formatCurrency } from '../../utils/platformAdminMasking'
import type { AdminPlatformHealth, AdminAuditLog } from '../../types/platformAdmin.types'
import { mapEventLogsToAuditLogs, type AdminEventLog } from '../../utils/auditLogMapper'
import { getLink, RouteKeys } from '@/utils/routes'
import { cn } from '../../utils/cn'

// Loading skeleton for stats
function StatsSkeleton() {
  return (
    <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 lg:pa-grid-cols-4 pa-gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="pa-kpi-card">
          <div className={cn('pa-skeleton', 'pa-w-3-5', 'pa-h-4', 'pa-mb-2')} />
          <div className={cn('pa-skeleton', 'pa-w-2-5', 'pa-h-10')} />
        </div>
      ))}
    </div>
  )
}

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function PlatformAdminDashboard() {
  useDebugLifecycle('PlatformAdminDashboard')
  
  const [health, setHealth] = useState<AdminPlatformHealth | null>(null)
  const [recentActivity, setRecentActivity] = useState<AdminAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()
  const t = useT()
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
        setHealth({
          ...healthData,
          active_organizations: healthData.active_organizations ?? 0,
          trial_organizations: healthData.trial_organizations ?? 0,
          suspended_organizations: healthData.suspended_organizations ?? 0,
          total_users: healthData.total_users ?? 0,
          platform_admin_count: healthData.platform_admin_count ?? 0,
          successful_payments: healthData.successful_payments ?? 0,
          failed_payments: healthData.failed_payments ?? 0,
          total_payment_volume_cents: healthData.total_payment_volume_cents ?? 0,
          total_teams: healthData.total_teams ?? 0,
          total_children: healthData.total_athletes ?? 0,
        })
      }

      // Fetch recent audit log entries
      const { data: activityData, error: activityError } = await supabase
        .from('admin_event_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (activityError) {
        if (!activityError.message?.includes('not found')) {
          console.error('Error fetching audit log:', activityError)
        }
        setRecentActivity([])
      } else {
        // Map event logs to audit log format for UI compatibility
        const mappedLogs = mapEventLogsToAuditLogs((activityData || []) as AdminEventLog[])
        setRecentActivity(mappedLogs)
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
      <OfflineBanner />
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
      <OfflineBanner />
      <PageHeader
        title={t('platformAdmin.dashboard.title')}
        subtitle={t('platformAdmin.dashboard.subtitle', { email: profile?.email ?? 'unknown' })}
      />

      {error && (
        <div 
          className={cn(
            'pa-card',
            'pa-mb-4',
            'pa-border-l-3',
            'pa-border-warning',
            'pa-bg-warning-bg'
          )}
        >
          <div className={cn('pa-flex', 'pa-items-center', 'pa-gap-2')}>
            <span 
              className={cn('material-symbols-outlined', 'pa-text-warning')}
            >
              warning
            </span>
            <span className="pa-body-m">{error}. {t('platformAdmin.dashboard.setupWarning')}</span>
          </div>
        </div>
      )}

      <TopLevelStats
        className="pa-mb-5"
        ariaLabel="Platform dashboard summary metrics"
        items={[
          { id: 'active-orgs', label: t('platformAdmin.dashboard.activeOrganizations'), value: health?.active_organizations ?? 0, icon: 'apartment', onClick: () => navigate('/platform-admin/organizations') },
          { id: 'trial-orgs', label: t('platformAdmin.dashboard.trialOrganizations'), value: health?.trial_organizations ?? 0, icon: 'schedule', meta: t('platformAdmin.dashboard.suspendedOrganizations', { count: health?.suspended_organizations ?? 0 }), onClick: () => navigate('/platform-admin/organizations') },
          { id: 'users', label: t('platformAdmin.dashboard.totalUsers'), value: health?.total_users ?? 0, icon: 'group', meta: t('platformAdmin.dashboard.platformAdmins', { count: health?.platform_admin_count ?? 0 }), onClick: () => navigate('/platform-admin/users') },
          { id: 'volume', label: 'Payment Volume', value: formatCurrency(health?.total_payment_volume_cents ?? 0), icon: 'payments', onClick: () => navigate('/platform-admin/payments') },
          { id: 'successful-payments', label: 'Successful Payments', value: health?.successful_payments ?? 0, icon: 'check_circle', meta: health?.successful_payments ? 'Last 30 days' : undefined, tone: 'success', onClick: () => navigate('/platform-admin/payments') },
          { id: 'failed-payments', label: 'Failed Payments', value: health?.failed_payments ?? 0, icon: 'error', tone: (health?.failed_payments ?? 0) > 0 ? 'danger' : 'default', onClick: () => navigate('/platform-admin/payments') },
          { id: 'teams', label: 'Total Teams', value: health?.total_teams ?? 0, icon: 'groups', onClick: () => navigate('/platform-admin/structure') },
          { id: 'children', label: 'Total Children', value: health?.total_children ?? 0, icon: 'child_care', onClick: () => navigate('/platform-admin/users') },
        ]}
      />

      {/* Recent Activity */}
      <div className="pa-mt-5">
        <Card
          title="Recent Activity"
          actions={
            <button
              className="pa-btn pa-btn--ghost pa-btn--dense"
              onClick={() => navigate(getLink(RouteKeys.PLATFORM_AUDIT))}
            >
              View All
            </button>
          }
        >
          {recentActivity.length === 0 ? (
            <EmptyState
              icon="history"
              title="No Activity Yet"
              description="Admin actions will appear here once the audit system is active."
              noCard
            />
          ) : (
            <div className={cn('pa-flex', 'pa-flex-col', 'pa-gap-3')}>
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className={cn(
                    'pa-flex',
                    'pa-items-center',
                    'pa-gap-3',
                    'pa-py-3',
                    'pa-border-b'
                  )}
                >
                  <div
                    className={cn(
                      'pa-w-9',
                      'pa-h-9',
                      'pa-rounded-s',
                      'pa-bg-n50',
                      'pa-flex',
                      'pa-items-center',
                      'pa-justify-center'
                    )}
                  >
                    <span 
                      className={cn('material-symbols-outlined', 'pa-text-n500', 'pa-icon-md')}
                    >
                      history
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className={cn('pa-flex', 'pa-items-center', 'pa-gap-2', 'pa-mb-1')}>
                      <Badge variant={getBadgeVariant(activity.action)}>
                        {activity.action.replace(/_/g, ' ')}
                      </Badge>
                      <span className="pa-body-s">on {activity.entity_type}</span>
                    </div>
                    <p className={cn('pa-caption', 'pa-mb-0')}>
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


