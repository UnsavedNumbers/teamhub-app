/**
 * OrganizationDetail Component (Refactored)
 * 
 * Main component for viewing and managing organization details.
 * Uses lazy loading for tabs and component-based architecture.
 * 
 * Technical Safeguards:
 * - Mounted refs prevent state updates after unmount
 * - useEventListener for offline detection
 * - Lazy loading reduces initial load time
 * - Unified error handling
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { Badge, ConfirmDialog, Button } from '../../../components/platformAdmin'
import { useAuth } from '../../../hooks/useAuth'
import { useRolePermissions } from '../../../hooks/useRolePermissions'
import { useEventListener } from '../../../hooks/useEventListener'
import { useExportOrganization } from '../../../hooks/useExportOrganization'
import { isValidUUID } from '../../../utils/uuid'
import { handleRpcError } from '../../../utils/rpcErrorHandler'
import { isRpcSuccessResponse } from '../../../utils/typeAdapters'
import { showSuccess, showError } from '../../../utils/toast'
import { USE_FAKE_DATA } from '../../../data/config'
import { getStatusVariant } from '../../../utils/organizationUtils'
import { validateAdminOrganization } from '../../../types/platformAdmin.types'
import type { AdminOrganization, AdminRpcResponse, PlatformAdminRole } from '../../../types/platformAdmin.types'

// Import tab components from barrel export
import { OverviewTab, UsersTab, StructureTab, PaymentsTab, FeesTab, ActivityTab, FeatureFlagsTab } from './tabs'

type DialogState =
  | { open: false }
  | { open: true; type: 'activate' }
  | { open: true; type: 'suspend' }

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const permissions = useRolePermissions()
  const isMountedRef = useRef(true)

  const [organization, setOrganization] = useState<AdminOrganization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Dialog state with reset function
  const [confirmDialog, setConfirmDialog] = useState<DialogState>({ open: false })
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  // Export organization hook
  const { exporting, progress, exportData, cancelExport } = useExportOrganization(id ?? null)

  // Get admin role
  const adminRole = useMemo<PlatformAdminRole | null>(() => {
    return profile?.platformAdminRole ?? null
  }, [profile?.platformAdminRole])

  // Offline detection using useEventListener hook
  useEventListener('online', () => {
    if (isMountedRef.current) setIsOffline(false)
  })
  useEventListener('offline', () => {
    if (isMountedRef.current) setIsOffline(true)
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Validate route parameter
  const isValidId = useMemo(() => {
    if (!id) return false
    return isValidUUID(id)
  }, [id])

  // Reset dialog function
  const resetDialog = useCallback(() => {
    setConfirmDialog({ open: false })
    setDialogError(null)
  }, [])

  // Reset dialog when it closes
  useEffect(() => {
    if (!confirmDialog.open) {
      resetDialog()
    }
  }, [confirmDialog.open, resetDialog])

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
      const { data, error: orgError } = await supabase
        .from('admin_organizations')
        .select('*')
        .eq('id', id)
        .single()

      if (orgError) {
        if (orgError.code === 'PGRST116') {
          setError('Organization not found')
          setOrganization(null)
        } else {
          console.error('[OrganizationDetail] Error fetching organization:', orgError)
          const normalized = handleRpcError(orgError, 'fetch_organization')
          setError(normalized.message)
          setOrganization(null)
        }
      } else if (data && typeof data === 'object' && data !== null) {
        // Validate data before using
        if (validateAdminOrganization(data)) {
          setOrganization(data)
        } else {
          console.warn('[OrganizationDetail] Validation failed, but using data anyway')
          // Still set the organization even if validation fails
          setOrganization(data as AdminOrganization)
        }
      } else {
        setError('Organization not found')
        setOrganization(null)
      }
    } catch (err) {
      console.error('[OrganizationDetail] Unexpected error:', err)
      const normalized = handleRpcError(err, 'fetch_organization')
      setError(normalized.message)
      setOrganization(null)
    } finally {
      // Always set loading to false, even if component unmounts
      setLoading(false)
    }
  }, [id, isValidId, isOffline])

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  const handleConfirmAction = async (reason: string) => {
    if (!organization) return

    if (USE_FAKE_DATA) {
      showError('This action is not available in demo mode')
      resetDialog()
      return
    }

    if (isOffline) {
      setDialogError('You appear to be offline. Please reconnect and try again.')
      return
    }

    setDialogLoading(true)
    setDialogError(null)

    try {
      if (!confirmDialog.open) {
        setDialogError('Dialog state is invalid')
        return
      }
      
      const rpcName = confirmDialog.type === 'activate'
        ? 'admin_activate_organization'
        : 'admin_suspend_organization'

      const { data, error: rpcError } = await supabase.rpc(rpcName, {
        target_org_id: organization.id,
        reason,
      })

      if (rpcError) {
        // Check if RPC function doesn't exist
        const is404 = rpcError.code === 'PGRST116' || 
                      rpcError.message.includes('404') || 
                      rpcError.message.includes('not found') ||
                      rpcError.message.includes('function') ||
                      rpcError.message.includes('does not exist')
        
        if (is404) {
          setDialogError(`RPC function '${rpcName}' not available. Please ensure database migrations are up to date.`)
        } else {
          const normalized = handleRpcError(rpcError, rpcName)
          setDialogError(normalized.message)
        }
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
        setDialogError((data as AdminRpcResponse)?.error || 'Unknown error')
        return
      }

      resetDialog()
      const actionType = confirmDialog.open ? confirmDialog.type : 'activate'
      showSuccess(`Organization ${actionType === 'activate' ? 'activated' : 'suspended'} successfully`)
      fetchOrganization() // Refresh to get updated status
    } catch (err) {
      console.error('[OrganizationDetail] Error in handleConfirmAction:', err)
      const normalized = handleRpcError(err, 'organization_action')
      setDialogError(normalized.message)
    } finally {
      setDialogLoading(false)
    }
  }

  const handleViewActivity = () => {
    navigate(`/platform-admin/audit?org_id=${organization?.id}`)
  }

  const handleExport = (format: 'csv' | 'json') => {
    if (!organization) return
    exportData({
      format,
      includeUsers: true,
      includePayments: true,
      includeStructure: true,
      includeFees: true,
      includeActivity: true,
    })
    setShowExportMenu(false)
  }

  const tabs = [
    { label: 'Overview', index: 0 },
    { label: 'Users', index: 1 },
    { label: 'Structure', index: 2 },
    { label: 'Payments', index: 3 },
    { label: 'Fees', index: 4 },
    { label: 'Activity', index: 5 },
    { label: 'Feature Flags', index: 6 },
  ]

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
        <div className="pa-card">
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined">error</span>
            </div>
            <h3 className="pa-empty-title">INVALID ORGANIZATION ID</h3>
            <p className="pa-empty-text">The organization ID in the URL is invalid.</p>
          </div>
        </div>
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
        <div className="pa-card">
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
        </div>
      </div>
    )
  }

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
          {/* Export Menu */}
          <div style={{ position: 'relative' }}>
            <Button
              variant="blue"
              size="compact"
              icon="download"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
            {showExportMenu && (
              <div
                className="pa-card"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  zIndex: 100,
                  minWidth: '200px',
                  boxShadow: 'var(--pa-shadow-2)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    className="pa-btn pa-btn--ghost"
                    onClick={() => handleExport('csv')}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>table_chart</span>
                    Export as CSV
                  </button>
                  <button
                    className="pa-btn pa-btn--ghost"
                    onClick={() => handleExport('json')}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>code</span>
                    Export as JSON
                  </button>
                </div>
              </div>
            )}
          </div>

          {organization.status !== 'active' && (
            <button
              className="pa-btn pa-btn--primary pa-btn--compact"
              disabled={!permissions.canActivateOrganization || isOffline || USE_FAKE_DATA}
              onClick={() => {
                resetDialog() // Clear any stale state
                setConfirmDialog({ open: true, type: 'activate' })
              }}
              title={
                !permissions.canActivateOrganization
                  ? 'You do not have permission to activate organizations'
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
              disabled={!permissions.canSuspendOrganization || isOffline || USE_FAKE_DATA}
              onClick={() => {
                resetDialog() // Clear any stale state
                setConfirmDialog({ open: true, type: 'suspend' })
              }}
              title={
                !permissions.canSuspendOrganization
                  ? 'You do not have permission to suspend organizations'
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
        {tabs.map((tab) => (
          <button
            key={tab.index}
            className="pa-btn pa-btn--ghost"
            onClick={() => setActiveTab(tab.index)}
            style={{
              borderRadius: 0,
              borderBottom: activeTab === tab.index ? '2px solid var(--pa-n900)' : '2px solid transparent',
              fontWeight: activeTab === tab.index ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content with Lazy Loading */}
      {activeTab === 0 && (
        <OverviewTab
          organization={organization}
          adminRole={adminRole}
          onViewActivity={handleViewActivity}
        />
      )}

      {activeTab === 1 && (
        <UsersTab organizationId={organization.id} adminRole={adminRole} />
      )}

      {activeTab === 2 && (
        <StructureTab organizationId={organization.id} />
      )}

      {activeTab === 3 && (
        <PaymentsTab organizationId={organization.id} adminRole={adminRole} />
      )}

      {activeTab === 4 && (
        <FeesTab organizationId={organization.id} />
      )}

      {activeTab === 5 && (
        <ActivityTab organizationId={organization.id} />
      )}

      {activeTab === 6 && (
        <FeatureFlagsTab
          organizationId={organization.id}
          adminRole={adminRole}
          onFlagToggled={fetchOrganization}
        />
      )}

      {/* Export Progress */}
      {exporting && progress && (
        <div
          className="pa-card pa-mb-4"
          style={{
            background: 'var(--pa-info-bg)',
            border: '1px solid var(--pa-info)',
            padding: 'var(--pa-space-3)',
          }}
        >
          <div className="pa-flex pa-items-center pa-justify-between">
            <div className="pa-flex pa-items-center pa-gap-2" style={{ flex: 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                download
              </span>
              <div style={{ flex: 1 }}>
                <div className="pa-body-m" style={{ marginBottom: '4px' }}>
                  {progress.message} ({progress.progress}%)
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '4px',
                    background: 'var(--pa-n200)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress.progress}%`,
                      height: '100%',
                      background: 'var(--pa-primary)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>
            <Button variant="ghost" size="dense" onClick={cancelExport}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99,
          }}
          onClick={() => setShowExportMenu(false)}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={
          confirmDialog.open && confirmDialog.type === 'activate'
            ? 'Activate Organization'
            : confirmDialog.open && confirmDialog.type === 'suspend'
            ? 'Suspend Organization'
            : 'Confirm Action'
        }
        description={
          confirmDialog.open && confirmDialog.type === 'activate'
            ? `Are you sure you want to activate "${organization.name}"? This will allow the organization to access all features.`
            : confirmDialog.open && confirmDialog.type === 'suspend'
            ? `Are you sure you want to suspend "${organization.name}"? This will prevent all users from accessing the organization.`
            : ''
        }
        confirmLabel={
          confirmDialog.open && confirmDialog.type === 'activate'
            ? 'Activate'
            : confirmDialog.open && confirmDialog.type === 'suspend'
            ? 'Suspend'
            : 'Confirm'
        }
        variant={confirmDialog.open && confirmDialog.type === 'suspend' ? 'danger' : 'info'}
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleConfirmAction}
        onCancel={resetDialog}
      />
    </div>
  )
}
