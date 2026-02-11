import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { StatCard, PageHeader, Card, Button, OfflineBanner } from '../../components/platformAdmin'
import type { LicenseMetrics, LicenseAlert } from '../../types/licenseTiers.types'

// Loading skeleton for stats
function StatsSkeleton() {
  return (
    <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 lg:pa-grid-cols-4 pa-gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="pa-kpi-card">
          <div className="pa-skeleton" style={{ width: '60%', height: '14px', marginBottom: '8px' }} />
          <div className="pa-skeleton" style={{ width: '40%', height: '40px' }} />
        </div>
      ))}
    </div>
  )
}

export default function LicensesOverview() {
  const [metrics, setMetrics] = useState<LicenseMetrics | null>(null)
  const [alerts, setAlerts] = useState<LicenseAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()
  const navigate = useNavigate()

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch license metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('admin_license_metrics')
        .select('*')
        .single()

      if (metricsError) {
        if (metricsError.code === 'PGRST116' || metricsError.message?.includes('not found')) {
          setMetrics({
            active_tiers: 0,
            total_features: 0,
            orgs_on_basic: 0,
            orgs_on_power: 0,
            active_overrides: 0,
            tiers_missing_price_id: 0,
            features_without_assignment: 0,
          })
        } else {
          console.error('Error fetching metrics:', metricsError)
          setError('Failed to load license metrics')
        }
      } else {
        setMetrics({
          ...metricsData,
          active_tiers: metricsData.active_tiers ?? 0,
          total_features: metricsData.total_features ?? 0,
          orgs_on_basic: metricsData.orgs_on_basic ?? 0,
          orgs_on_power: metricsData.orgs_on_power ?? 0,
          active_overrides: metricsData.active_overrides ?? 0,
          tiers_missing_price_id: metricsData.tiers_missing_price_id ?? 0,
          features_without_assignment: metricsData.features_without_assignment ?? 0,
          archived_features: metricsData.archived_features ?? undefined,
          tiers_with_archived_features: metricsData.tiers_with_archived_features ?? undefined,
        })
      }

      // Check for alerts
      const newAlerts: LicenseAlert[] = []
      
      if (metrics) {
        if (metrics.tiers_missing_price_id > 0) {
          newAlerts.push({
            type: 'error',
            message: `${metrics.tiers_missing_price_id} license tier(s) missing Stripe Price ID`,
            details: 'Each tier must have a valid Stripe Price ID linked.',
          })
        }

        if (metrics.features_without_assignment > 0) {
          newAlerts.push({
            type: 'warning',
            message: `${metrics.features_without_assignment} feature(s) not assigned to any tier`,
            details: 'Features should be assigned to at least one license tier.',
          })
        }

        // Check for tiers with archived features
        if (metrics.tiers_with_archived_features && metrics.tiers_with_archived_features > 0) {
          newAlerts.push({
            type: 'warning',
            message: `${metrics.tiers_with_archived_features} tier(s) include archived features`,
            details: 'Consider removing archived features from tiers to avoid confusion.',
          })
        }

        // Check for duplicate Stripe Price IDs
        const { data: tiersData } = await supabase
          .from('license_tiers')
          .select('stripe_price_id, tier_name')
          .not('stripe_price_id', 'is', null)
          .neq('stripe_price_id', '')

        if (tiersData) {
          const priceIdCounts = tiersData.reduce((acc, tier: any) => {
            acc[tier.stripe_price_id] = (acc[tier.stripe_price_id] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          const duplicates = Object.entries(priceIdCounts).filter(([_, count]: [string, number]) => count > 1)
          if (duplicates.length > 0) {
            newAlerts.push({
              type: 'error',
              message: `${duplicates.length} duplicate Stripe Price ID(s) detected`,
              details: 'Each tier must have a unique Stripe Price ID.',
            })
          }
        }
      }

      setAlerts(newAlerts)
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

  if (loading) {
    return (
      <div>
        <OfflineBanner />
        <PageHeader
          title="Licenses & Entitlements"
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
        title="Licenses & Entitlements"
        subtitle={`Signed in as ${profile?.email ?? 'unknown'}`}
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/platform-admin/licenses/tiers')}
          >
            Manage Tiers
          </Button>
        }
      />

      {error && (
        <div className="pa-card pa-mb-4" style={{ borderLeft: '3px solid var(--pa-warning)', background: 'var(--pa-warning-bg)' }}>
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ color: 'var(--pa-warning)' }}>warning</span>
            <span className="pa-body-m">{error}</span>
          </div>
        </div>
      )}

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <div className="pa-mb-5">
          <Card title="Alerts">
            <div className="pa-flex pa-flex-col pa-gap-3">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="pa-card"
                  style={{
                    borderLeft: `3px solid var(--pa-${alert.type === 'error' ? 'danger' : alert.type === 'warning' ? 'warning' : 'info'})`,
                    background: `var(--pa-${alert.type === 'error' ? 'danger' : alert.type === 'warning' ? 'warning' : 'info'}-bg)`,
                  }}
                >
                  <div className="pa-flex pa-items-start pa-gap-2">
                    <span
                      className="material-symbols-outlined"
                      style={{
                        color: `var(--pa-${alert.type === 'error' ? 'danger' : alert.type === 'warning' ? 'warning' : 'info'})`,
                        fontSize: '20px',
                        marginTop: '2px',
                      }}
                    >
                      {alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div className="pa-body-m" style={{ fontWeight: 600, marginBottom: '4px' }}>
                        {alert.message}
                      </div>
                      {alert.details && (
                        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
                          {alert.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Stats Row 1: Tiers & Features */}
      <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 lg:pa-grid-cols-4 pa-gap-4">
        <StatCard
          label="Active License Tiers"
          value={metrics?.active_tiers ?? 0}
          icon="workspace_premium"
          onClick={() => navigate('/platform-admin/licenses/tiers')}
        />
        <StatCard
          label="Features in Catalog"
          value={metrics?.total_features ?? 0}
          icon="inventory_2"
          onClick={() => navigate('/platform-admin/licenses/features')}
        />
        <StatCard
          label="Features (Power Only)"
          value="—"
          icon="star"
          meta="See Feature Catalog"
        />
        <StatCard
          label="Features (Basic)"
          value="—"
          icon="check_circle"
          meta="See Feature Catalog"
        />
      </div>

      {/* Stats Row 2: Organizations & Overrides */}
      <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 lg:pa-grid-cols-4 pa-gap-4 pa-mt-5">
        <StatCard
          label="Organizations on Basic"
          value={metrics?.orgs_on_basic ?? 0}
          icon="apartment"
          onClick={() => navigate('/platform-admin/organizations')}
        />
        <StatCard
          label="Organizations on Power"
          value={metrics?.orgs_on_power ?? 0}
          icon="apartment"
          onClick={() => navigate('/platform-admin/organizations')}
        />
        <StatCard
          label="Active Overrides"
          value={metrics?.active_overrides ?? 0}
          icon="rule"
          onClick={() => navigate('/platform-admin/licenses/overrides')}
        />
        <StatCard
          label="Tiers Missing Price ID"
          value={metrics?.tiers_missing_price_id ?? 0}
          icon="credit_card"
          meta={metrics?.tiers_missing_price_id ?? 0 > 0 ? 'Action required' : 'All configured'}
        />
      </div>

      {/* Quick Actions */}
      <div className="pa-mt-5">
        <Card
          title="Quick Actions"
          actions={
            <Button
              variant="ghost"
              size="dense"
              onClick={() => fetchDashboardData()}
            >
              Refresh
            </Button>
          }
        >
          <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 lg:pa-grid-cols-3" style={{ gap: 'var(--pa-space-4)' }}>
            <button
              className="pa-btn pa-btn--secondary"
              onClick={() => navigate('/platform-admin/licenses/features/new')}
              style={{ textAlign: 'left', justifyContent: 'flex-start', padding: 'var(--pa-space-4)' }}
            >
              <div className="pa-flex pa-items-center pa-gap-3">
                <span className="material-symbols-outlined">add</span>
                <div>
                  <div className="pa-body-m" style={{ fontWeight: 600 }}>Create Feature</div>
                  <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>Add new feature to catalog</div>
                </div>
              </div>
            </button>
            <button
              className="pa-btn pa-btn--secondary"
              onClick={() => navigate('/platform-admin/licenses/tiers/new')}
              style={{ textAlign: 'left', justifyContent: 'flex-start', padding: 'var(--pa-space-4)' }}
            >
              <div className="pa-flex pa-items-center pa-gap-3">
                <span className="material-symbols-outlined">workspace_premium</span>
                <div>
                  <div className="pa-body-m" style={{ fontWeight: 600 }}>Create Tier</div>
                  <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>Add new license tier</div>
                </div>
              </div>
            </button>
            <button
              className="pa-btn pa-btn--secondary"
              onClick={() => navigate('/platform-admin/licenses/overrides/new')}
              style={{ textAlign: 'left', justifyContent: 'flex-start', padding: 'var(--pa-space-4)' }}
            >
              <div className="pa-flex pa-items-center pa-gap-3">
                <span className="material-symbols-outlined">rule</span>
                <div>
                  <div className="pa-body-m" style={{ fontWeight: 600 }}>Create Override</div>
                  <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>Override entitlements for org/user</div>
                </div>
              </div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
