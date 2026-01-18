import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, Card, ConfirmDialog, PlatformDataTable, type ColumnConfig } from '../../components/platformAdmin'
import { canPerformAction } from '../../utils/platformAdminPermissions'
import { isRpcSuccessResponse } from '../../utils/typeAdapters'
import type { 
  AdminOrganization, 
  AdminFeatureFlag, 
  PlatformAdminRole, 
  OrganizationStatus,
} from '../../types/platformAdmin.types'

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [organization, setOrganization] = useState<AdminOrganization | null>(null)
  const [featureFlags, setFeatureFlags] = useState<AdminFeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  
  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'activate' | 'suspend'
  }>({ open: false, type: 'activate' })
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  
  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: 'success' | 'danger' }>({
    show: false,
    message: '',
    variant: 'success',
  })
  
  // TODO: Fetch actual role
  const [adminRole] = useState<PlatformAdminRole>('super_admin')

  const fetchOrganization = useCallback(async () => {
    if (!id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('admin_organizations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching organization:', error)
        setOrganization(null)
      } else {
        setOrganization(data)
      }

      const { data: flags, error: flagsError } = await supabase
        .from('admin_feature_flags')
        .select('*')
        .eq('organization_id', id)

      if (!flagsError) {
        setFeatureFlags(flags || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  // Auto-hide toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleConfirmAction = async (reason: string) => {
    if (!organization) return

    setDialogLoading(true)
    setDialogError(null)

    try {
      const rpcName = confirmDialog.type === 'activate' 
        ? 'admin_activate_organization' 
        : 'admin_suspend_organization'

      const { data, error } = await supabase.rpc(rpcName, {
        target_org_id: organization.id,
        reason,
      })

      if (error) {
        setDialogError(error.message)
        return
      }

      if (!isRpcSuccessResponse(data) || !data.success) {
        setDialogError(data?.error || 'Unknown error')
        return
      }

      setConfirmDialog({ open: false, type: 'activate' })
      setToast({
        show: true,
        message: `Organization ${confirmDialog.type === 'activate' ? 'activated' : 'suspended'} successfully`,
        variant: 'success',
      })
      fetchOrganization()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDialogLoading(false)
    }
  }

  const getStatusVariant = (status: OrganizationStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (status) {
      case 'active': return 'success'
      case 'trial': return 'info'
      case 'suspended': return 'danger'
      case 'expired': return 'warning'
      default: return 'neutral'
    }
  }

  if (loading) {
    return (
      <div>
        <div className="pa-flex pa-items-center pa-gap-3 pa-mb-5">
          <button className="pa-btn pa-btn--ghost" onClick={() => navigate('/platform-admin/organizations')}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="pa-skeleton" style={{ width: '300px', height: '32px' }} />
        </div>
        <div className="pa-skeleton" style={{ width: '100%', height: '300px' }} />
      </div>
    )
  }

  if (!organization) {
    return (
      <div>
        <button
          className="pa-btn pa-btn--ghost pa-mb-4"
          onClick={() => navigate('/platform-admin/organizations')}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Organizations
        </button>
        <Card>
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined">apartment</span>
            </div>
            <h3 className="pa-empty-title">ORGANIZATION NOT FOUND</h3>
            <p className="pa-empty-text">The organization you're looking for doesn't exist.</p>
          </div>
        </Card>
      </div>
    )
  }

  const flagColumns: ColumnConfig<AdminFeatureFlag>[] = [
    { id: 'feature_key', label: 'Feature' },
    { 
      id: 'enabled', 
      label: 'Status',
      render: (row) => (
        <Badge variant={row.enabled ? 'success' : 'neutral'}>
          {row.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    { 
      id: 'updated_at', 
      label: 'Last Updated',
      render: (row) => row.updated_at ? new Date(row.updated_at).toLocaleString() : '—',
    },
  ]

  const tabs = ['Overview', 'Feature Flags']

  return (
    <div>
      {/* Header */}
      <div className="pa-flex pa-items-center pa-gap-3 pa-mb-5">
        <button
          className="pa-btn pa-btn--ghost"
          onClick={() => navigate('/platform-admin/organizations')}
          style={{ padding: '8px' }}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--pa-blue)' }}>
          apartment
        </span>
        <div style={{ flex: 1 }}>
          <h1 className="pa-h1" style={{ marginBottom: '4px' }}>{organization.name}</h1>
          <div className="pa-flex pa-gap-2">
            <Badge variant={getStatusVariant(organization.status)}>{organization.status}</Badge>
            {organization.org_type && (
              <Badge variant="neutral">{organization.org_type}</Badge>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="pa-flex pa-gap-2">
          {organization.status !== 'active' && (
            <button
              className="pa-btn pa-btn--primary pa-btn--compact"
              disabled={!canPerformAction(adminRole, 'activate_organization')}
              onClick={() => setConfirmDialog({ open: true, type: 'activate' })}
              style={{ background: 'var(--pa-success)' }}
            >
              <span className="material-symbols-outlined">play_arrow</span>
              Activate
            </button>
          )}
          {organization.status !== 'suspended' && (
            <button
              className="pa-btn pa-btn--secondary pa-btn--compact"
              disabled={!canPerformAction(adminRole, 'suspend_organization')}
              onClick={() => setConfirmDialog({ open: true, type: 'suspend' })}
              style={{ color: 'var(--pa-danger)', borderColor: 'var(--pa-danger)' }}
            >
              <span className="material-symbols-outlined">block</span>
              Suspend
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="pa-flex pa-gap-1 pa-mb-4" style={{ borderBottom: '1px solid var(--pa-n100)' }}>
        {tabs.map((tab, index) => (
          <button
            key={tab}
            className={`pa-btn pa-btn--ghost`}
            onClick={() => setActiveTab(index)}
            style={{
              borderRadius: 0,
              borderBottom: activeTab === index ? '2px solid var(--pa-n900)' : '2px solid transparent',
              fontWeight: activeTab === index ? 600 : 400,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 0 && (
        <div className="pa-grid pa-grid-2">
          <Card title="Organization Details">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pa-space-4)' }}>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">ID</div>
                <code style={{ fontSize: '12px' }}>{organization.id}</code>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Created</div>
                <div className="pa-body-m">
                  {organization.created_at ? new Date(organization.created_at).toLocaleDateString() : '—'}
                </div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Teams</div>
                <div className="pa-body-m">{organization.team_count}</div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Users</div>
                <div className="pa-body-m">{organization.user_count}</div>
              </div>
            </div>
          </Card>

          <Card title="License & Billing">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pa-space-4)' }}>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">License Status</div>
                <div className="pa-body-m">{organization.license_status || '—'}</div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Plan</div>
                <div className="pa-body-m">{organization.license_plan || '—'}</div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Stripe</div>
                <Badge variant={organization.stripe_connected ? 'success' : 'neutral'}>
                  {organization.stripe_connected ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Payouts</div>
                <Badge variant={organization.payouts_enabled ? 'success' : 'neutral'}>
                  {organization.payouts_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Feature Flags Tab */}
      {activeTab === 1 && (
        <PlatformDataTable
          columns={flagColumns}
          rows={featureFlags}
          loading={false}
          emptyMessage="No feature flags configured for this organization."
          page={0}
          rowsPerPage={50}
          totalCount={featureFlags.length}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.type === 'activate' ? 'Activate Organization' : 'Suspend Organization'}
        description={
          confirmDialog.type === 'activate'
            ? `Are you sure you want to activate "${organization.name}"?`
            : `Are you sure you want to suspend "${organization.name}"?`
        }
        confirmLabel={confirmDialog.type === 'activate' ? 'Activate' : 'Suspend'}
        variant={confirmDialog.type === 'suspend' ? 'danger' : 'info'}
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog({ open: false, type: 'activate' })}
      />

      {/* Toast */}
      {toast.show && (
        <div
          style={{
            position: 'fixed',
            bottom: 'var(--pa-space-5)',
            right: 'var(--pa-space-5)',
            zIndex: 1000,
          }}
        >
          <div
            className="pa-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--pa-space-3)',
              padding: 'var(--pa-space-3) var(--pa-space-4)',
              borderLeft: `3px solid var(--pa-${toast.variant})`,
              boxShadow: 'var(--pa-shadow-2)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: `var(--pa-${toast.variant})`, fontSize: '20px' }}
            >
              {toast.variant === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="pa-body-m">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}
