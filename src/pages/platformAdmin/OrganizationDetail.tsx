import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Badge, Card, ConfirmDialog, PlatformDataTable, type ColumnConfig } from '../../components/platformAdmin'
import { canPerformAction, getDeniedMessage } from '../../utils/platformAdminPermissions'
import { isRpcSuccessResponse } from '../../utils/typeAdapters'
import { isValidUUID } from '../../utils/uuid'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { USE_FAKE_DATA } from '../../data/config'
import type { AdminRpcResponse } from '../../types/platformAdmin.types'
import type { 
  AdminOrganization, 
  AdminFeatureFlag, 
  PlatformAdminRole, 
  OrganizationStatus,
} from '../../types/platformAdmin.types'

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  
  const [organization, setOrganization] = useState<AdminOrganization | null>(null)
  const [featureFlags, setFeatureFlags] = useState<AdminFeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  
  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'activate' | 'suspend' | 'toggle_flag'
    flagId?: string
    flagKey?: string
    currentEnabled?: boolean
  }>({ open: false, type: 'activate' })
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  
  // Get admin role from profile (replaces hardcoded TODO)
  const adminRole = useMemo<PlatformAdminRole | null>(() => {
    return profile?.platformAdminRole ?? null
  }, [profile?.platformAdminRole])

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Validate route parameter
  const isValidId = useMemo(() => {
    if (!id) return false
    return isValidUUID(id)
  }, [id])

  const fetchOrganization = useCallback(async () => {
    if (!id || !isValidId) {
      setError('Invalid organization ID')
      setLoading(false)
      return
    }

    if (isOffline && !USE_FAKE_DATA) {
      setError('You appear to be offline. Please reconnect and try again.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch organization
      const { data, error: orgError } = await supabase
        .from('admin_organizations')
        .select('*')
        .eq('id', id)
        .single()

      if (orgError) {
        if (orgError.code === 'PGRST116') {
          // No rows returned
          setError('Organization not found')
          setOrganization(null)
        } else {
          console.error('[OrganizationDetail] Error fetching organization:', orgError)
          setError(getErrorMessage(orgError) || 'Failed to load organization')
          setOrganization(null)
        }
      } else if (data) {
        setOrganization(data as AdminOrganization)
      } else {
        setError('Organization not found')
        setOrganization(null)
      }

      // Fetch feature flags
      const { data: flags, error: flagsError } = await supabase
        .from('admin_feature_flags')
        .select('*')
        .eq('org_id', id)
        .order('feature_key', { ascending: true })

      if (flagsError) {
        console.error('[OrganizationDetail] Error fetching feature flags:', flagsError)
        // Don't set error state - feature flags are secondary data
        setFeatureFlags([])
      } else {
        setFeatureFlags((flags || []) as AdminFeatureFlag[])
      }
    } catch (err) {
      console.error('[OrganizationDetail] Unexpected error:', err)
      setError(getErrorMessage(err) || 'An unexpected error occurred')
      setOrganization(null)
      setFeatureFlags([])
    } finally {
      setLoading(false)
    }
  }, [id, isValidId, isOffline])

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  const handleConfirmAction = async (reason: string) => {
    if (!organization) return

    // Block in demo mode
    if (USE_FAKE_DATA) {
      showError('This action is not available in demo mode')
      setConfirmDialog({ open: false, type: 'activate' })
      return
    }

    // Check offline
    if (isOffline) {
      setDialogError('You appear to be offline. Please reconnect and try again.')
      return
    }

    setDialogLoading(true)
    setDialogError(null)

    try {
      if (confirmDialog.type === 'toggle_flag') {
        // Handle feature flag toggle
        if (!confirmDialog.flagKey || confirmDialog.currentEnabled === undefined) {
          setDialogError('Invalid feature flag data')
          return
        }

        const { data, error: rpcError } = await supabase.rpc('admin_set_feature_flag', {
          target_org_id: organization.id,
          target_feature_key: confirmDialog.flagKey,
          target_enabled: !confirmDialog.currentEnabled,
          reason,
        })

        if (rpcError) {
          setDialogError(rpcError.message)
          return
        }

        if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
          setDialogError((data as AdminRpcResponse)?.error || 'Unknown error')
          return
        }

        setConfirmDialog({ open: false, type: 'activate' })
        showSuccess(`Feature flag ${!confirmDialog.currentEnabled ? 'enabled' : 'disabled'} successfully`)
        fetchOrganization() // Refresh to get updated flags
      } else {
        // Handle activate/suspend
        const rpcName = confirmDialog.type === 'activate' 
          ? 'admin_activate_organization' 
          : 'admin_suspend_organization'

        const { data, error: rpcError } = await supabase.rpc(rpcName, {
          target_org_id: organization.id,
          reason,
        })

        if (rpcError) {
          setDialogError(rpcError.message)
          return
        }

        if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
          setDialogError((data as AdminRpcResponse)?.error || 'Unknown error')
          return
        }

        setConfirmDialog({ open: false, type: 'activate' })
        showSuccess(`Organization ${confirmDialog.type === 'activate' ? 'activated' : 'suspended'} successfully`)
        fetchOrganization() // Refresh to get updated status
      }
    } catch (err) {
      console.error('[OrganizationDetail] Error in handleConfirmAction:', err)
      setDialogError(getErrorMessage(err) || 'An unexpected error occurred')
    } finally {
      setDialogLoading(false)
    }
  }

  const handleToggleFeatureFlag = (flag: AdminFeatureFlag) => {
    if (!canPerformAction(adminRole, 'toggle_feature_flag')) {
      showError(getDeniedMessage('toggle_feature_flag'))
      return
    }

    if (USE_FAKE_DATA) {
      showError('This action is not available in demo mode')
      return
    }

    setDialogError(null)
    setConfirmDialog({
      open: true,
      type: 'toggle_flag',
      flagId: flag.id,
      flagKey: flag.feature_key,
      currentEnabled: flag.enabled,
    })
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

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return '—'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="pa-flex pa-items-center pa-gap-3 pa-mb-5">
          <button 
            className="pa-btn pa-btn--ghost" 
            onClick={() => navigate('/platform-admin/organizations')}
            style={{ padding: '8px' }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="pa-skeleton" style={{ width: '300px', height: '32px' }} />
        </div>
        <div className="pa-skeleton" style={{ width: '100%', height: '300px', marginBottom: 'var(--pa-space-4)' }} />
        <div className="pa-skeleton" style={{ width: '100%', height: '200px' }} />
      </div>
    )
  }

  // Invalid ID
  if (!isValidId) {
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
              <span className="material-symbols-outlined">error</span>
            </div>
            <h3 className="pa-empty-title">INVALID ORGANIZATION ID</h3>
            <p className="pa-empty-text">The organization ID in the URL is invalid.</p>
          </div>
        </Card>
      </div>
    )
  }

  // Not found or error state
  if (!organization || error) {
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
            <p className="pa-empty-text">
              {error || 'The organization you\'re looking for doesn\'t exist.'}
            </p>
            {isOffline && (
              <p className="pa-body-s pa-text-muted pa-mt-2">
                You appear to be offline. Please reconnect and try again.
              </p>
            )}
            <div className="pa-flex pa-gap-2 pa-mt-4" style={{ justifyContent: 'center' }}>
              <button
                className="pa-btn pa-btn--primary"
                onClick={fetchOrganization}
                disabled={isOffline}
              >
                Retry
              </button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const flagColumns: ColumnConfig<AdminFeatureFlag>[] = [
    { 
      id: 'feature_key', 
      label: 'Feature',
      render: (row) => (
        <code style={{ fontSize: '12px', background: 'var(--pa-n100)', padding: '2px 6px', borderRadius: '4px' }}>
          {row.feature_key}
        </code>
      ),
    },
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
      render: (row) => formatDate(row.updated_at),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <button
          className="pa-btn pa-btn--ghost pa-btn--compact"
          onClick={(e) => {
            e.stopPropagation()
            handleToggleFeatureFlag(row)
          }}
          disabled={!canPerformAction(adminRole, 'toggle_feature_flag') || USE_FAKE_DATA}
          title={
            !canPerformAction(adminRole, 'toggle_feature_flag')
              ? getDeniedMessage('toggle_feature_flag')
              : USE_FAKE_DATA
              ? 'Not available in demo mode'
              : `Toggle ${row.feature_key}`
          }
        >
          <span className="material-symbols-outlined">
            {row.enabled ? 'toggle_on' : 'toggle_off'}
          </span>
        </button>
      ),
    },
  ]

  const tabs = ['Overview', 'Feature Flags']

  return (
    <div>
      {/* Offline indicator */}
      {isOffline && (
        <div
          className="pa-card pa-mb-4"
          style={{
            background: 'var(--pa-warning-bg)',
            border: '1px solid var(--pa-warning)',
            padding: 'var(--pa-space-3)',
          }}
        >
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              wifi_off
            </span>
            <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
              You appear to be offline. Some features may not be available.
            </span>
          </div>
        </div>
      )}

      {/* Demo mode indicator */}
      {USE_FAKE_DATA && (
        <div
          className="pa-card pa-mb-4"
          style={{
            background: 'var(--pa-info-bg)',
            border: '1px solid var(--pa-info)',
            padding: 'var(--pa-space-3)',
          }}
        >
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              info
            </span>
            <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
              Demo mode: Changes will not be saved to the database.
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="pa-flex pa-items-center pa-gap-3 pa-mb-5">
        <button
          className="pa-btn pa-btn--ghost"
          onClick={() => navigate('/platform-admin/organizations')}
          style={{ padding: '8px' }}
          title="Back to Organizations"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--pa-blue)' }}>
          apartment
        </span>
        <div style={{ flex: 1 }}>
          <h1 className="pa-h1" style={{ marginBottom: '4px' }}>{organization.name}</h1>
          <div className="pa-flex pa-gap-2 pa-flex-wrap">
            <Badge variant={getStatusVariant(organization.status)}>{organization.status}</Badge>
            {organization.org_type && (
              <Badge variant="neutral">{organization.org_type}</Badge>
            )}
            {organization.license_plan && (
              <Badge variant="info">{organization.license_plan}</Badge>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="pa-flex pa-gap-2">
          {organization.status !== 'active' && (
            <button
              className="pa-btn pa-btn--primary pa-btn--compact"
              disabled={!canPerformAction(adminRole, 'activate_organization') || isOffline || USE_FAKE_DATA}
              onClick={() => {
                setDialogError(null)
                setConfirmDialog({ open: true, type: 'activate' })
              }}
              title={
                !canPerformAction(adminRole, 'activate_organization')
                  ? getDeniedMessage('activate_organization')
                  : isOffline
                  ? 'Offline - action unavailable'
                  : USE_FAKE_DATA
                  ? 'Not available in demo mode'
                  : 'Activate organization'
              }
              style={{ background: 'var(--pa-success)' }}
            >
              <span className="material-symbols-outlined">play_arrow</span>
              Activate
            </button>
          )}
          {organization.status !== 'suspended' && (
            <button
              className="pa-btn pa-btn--secondary pa-btn--compact"
              disabled={!canPerformAction(adminRole, 'suspend_organization') || isOffline || USE_FAKE_DATA}
              onClick={() => {
                setDialogError(null)
                setConfirmDialog({ open: true, type: 'suspend' })
              }}
              title={
                !canPerformAction(adminRole, 'suspend_organization')
                  ? getDeniedMessage('suspend_organization')
                  : isOffline
                  ? 'Offline - action unavailable'
                  : USE_FAKE_DATA
                  ? 'Not available in demo mode'
                  : 'Suspend organization'
              }
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
        <div className="pa-grid pa-grid-2 pa-gap-4">
          <Card title="Organization Details">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pa-space-4)' }}>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">ID</div>
                <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>{organization.id}</code>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Created</div>
                <div className="pa-body-m">{formatDate(organization.created_at)}</div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Updated</div>
                <div className="pa-body-m">{formatDate(organization.updated_at)}</div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Type</div>
                <div className="pa-body-m">{organization.org_type || '—'}</div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Teams</div>
                <div className="pa-body-m">{organization.team_count}</div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Sports</div>
                <div className="pa-body-m">{organization.sport_count}</div>
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
                <div className="pa-body-m">
                  {organization.license_status ? (
                    <Badge variant={organization.license_status === 'active' ? 'success' : 'neutral'}>
                      {organization.license_status}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Plan</div>
                <div className="pa-body-m">{organization.license_plan || '—'}</div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Trial Ends</div>
                <div className="pa-body-m">{formatDate(organization.license_trial_ends_at)}</div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Period End</div>
                <div className="pa-body-m">{formatDate(organization.license_current_period_end)}</div>
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
              {organization.payout_account_id && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="pa-caption pa-text-muted pa-mb-1">Payout Account ID</div>
                  <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                    {organization.payout_account_id}
                  </code>
                </div>
              )}
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
        title={
          confirmDialog.type === 'activate'
            ? 'Activate Organization'
            : confirmDialog.type === 'suspend'
            ? 'Suspend Organization'
            : `Toggle Feature Flag: ${confirmDialog.flagKey}`
        }
        description={
          confirmDialog.type === 'activate'
            ? `Are you sure you want to activate "${organization.name}"? This will allow the organization to access all features.`
            : confirmDialog.type === 'suspend'
            ? `Are you sure you want to suspend "${organization.name}"? This will prevent all users from accessing the organization.`
            : `Are you sure you want to ${confirmDialog.currentEnabled ? 'disable' : 'enable'} the feature "${confirmDialog.flagKey}" for "${organization.name}"?`
        }
        confirmLabel={
          confirmDialog.type === 'activate'
            ? 'Activate'
            : confirmDialog.type === 'suspend'
            ? 'Suspend'
            : confirmDialog.currentEnabled
            ? 'Disable'
            : 'Enable'
        }
        variant={confirmDialog.type === 'suspend' ? 'danger' : 'info'}
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setDialogError(null)
          setConfirmDialog({ open: false, type: 'activate' })
        }}
      />
    </div>
  )
}
