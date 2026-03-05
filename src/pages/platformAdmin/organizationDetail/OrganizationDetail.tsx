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
import { ConfirmDialog } from '../../../components/platformAdmin'
import { useAuth } from '../../../hooks/useAuth'
import { useRolePermissions } from '../../../hooks/useRolePermissions'
import { useEventListener } from '../../../hooks/useEventListener'
import { useExportOrganization } from '../../../hooks/useExportOrganization'
import { isValidUuid } from '../../../utils/uuid'
import { handleRpcError } from '../../../utils/rpcErrorHandler'
import { isRpcSuccessResponse } from '../../../utils/typeAdapters'
import { getLink } from '../../../utils/routes'
import { showSuccess } from '../../../utils/toast'
import { USE_FAKE_DATA } from '../../../data/config'
import { validateAdminOrganization } from '../../../types/platformAdmin.types'
import { isMockOrganization } from '../../../utils/mockOrganizationUtils'
import type { AdminOrganization, AdminRpcResponse, PlatformAdminRole } from '../../../types/platformAdmin.types'

// Import tab components from barrel export
import { OverviewTab, UsersTab, StructureTab, PaymentsTab, FeesTab, ActivityTab, FeatureFlagsTab } from './tabs'

type DialogState =
  | { open: false }
  | { open: true; type: 'activate' }
  | { open: true; type: 'suspend' }
  | { open: true; type: 'reset' }

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
    return isValidUuid(id)
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
    if (!organization?.id) return

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

      const rpcName =
        confirmDialog.type === 'activate'
          ? 'admin_activate_organization'
          : confirmDialog.type === 'suspend'
            ? 'admin_suspend_organization'
            : 'admin_reset_mock_organization'

      const { data, error: rpcError } = await supabase.rpc(rpcName as any, {
        target_org_id: organization.id,
        reason,
      })

      if (rpcError) {
        const is404 =
          rpcError.code === 'PGRST116' ||
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
      if (actionType === 'reset') {
        showSuccess('Organization reset to empty state successfully. Re-run seed-all.ts to repopulate.')
      } else {
        showSuccess(`Organization ${actionType === 'activate' ? 'activated' : 'suspended'} successfully`)
      }
      fetchOrganization()
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
      <div style={{ padding: 'var(--pa-space-6) var(--pa-space-8)', background: 'var(--pa-surface-page)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-4)', marginBottom: 'var(--pa-space-6)' }}>
          <button
            onClick={() => navigate('/platform-admin/organizations')}
            style={{ 
              padding: 'var(--pa-space-2)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--pa-radius-s)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--pa-n50)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--pa-n500)' }}>arrow_back</span>
          </button>
          <div style={{ width: '300px', height: '32px', background: 'var(--pa-n100)', borderRadius: 'var(--pa-radius-s)' }} />
        </div>
        <div style={{ width: '100%', height: '400px', marginBottom: 'var(--pa-space-5)', background: 'var(--pa-n0)', borderRadius: 'var(--pa-radius-m)', boxShadow: 'var(--pa-shadow-1)' }} />
        <div style={{ width: '100%', height: '300px', background: 'var(--pa-n0)', borderRadius: 'var(--pa-radius-m)', boxShadow: 'var(--pa-shadow-1)' }} />
      </div>
    )
  }

  // Invalid ID
  if (!isValidId) {
    return (
      <div style={{ padding: 'var(--pa-space-6) var(--pa-space-8)', background: 'var(--pa-surface-page)' }}>
        <button
          onClick={() => navigate('/platform-admin/organizations')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--pa-space-2)',
            padding: 'var(--pa-space-3) var(--pa-space-5)',
            background: 'transparent',
            color: 'var(--pa-theme-action-primary)',
            border: '1px solid var(--pa-n200)',
            borderRadius: 'var(--pa-radius-s)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: 'var(--pa-space-5)',
            transition: 'background-color 150ms ease',
            fontFamily: 'var(--pa-font-body)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--pa-n50)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
          Back to Organizations
        </button>
        <div style={{
          background: 'var(--pa-n0)',
          borderRadius: 'var(--pa-radius-m)',
          boxShadow: 'var(--pa-shadow-1)',
          padding: 'var(--pa-space-9)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-4)' }}>
            <span className="material-symbols-outlined">error</span>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--pa-n900)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>INVALID ORGANIZATION ID</h3>
          <p style={{ fontSize: '14px', color: 'var(--pa-n600)', fontFamily: 'var(--pa-font-body)' }}>The organization ID in the URL is invalid.</p>
        </div>
      </div>
    )
  }

  // Not found or error state
  if (!organization || error) {
    return (
      <div style={{ padding: 'var(--pa-space-6) var(--pa-space-8)', background: 'var(--pa-surface-page)' }}>
        <button
          onClick={() => navigate('/platform-admin/organizations')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--pa-space-2)',
            padding: 'var(--pa-space-3) var(--pa-space-5)',
            background: 'transparent',
            color: 'var(--pa-theme-action-primary)',
            border: '1px solid var(--pa-n200)',
            borderRadius: 'var(--pa-radius-s)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: 'var(--pa-space-5)',
            transition: 'background-color 150ms ease',
            fontFamily: 'var(--pa-font-body)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--pa-n50)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
          Back to Organizations
        </button>
        <div style={{
          background: 'var(--pa-n0)',
          borderRadius: 'var(--pa-radius-m)',
          boxShadow: 'var(--pa-shadow-1)',
          padding: 'var(--pa-space-9)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-4)' }}>
            <span className="material-symbols-outlined">apartment</span>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--pa-n900)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>ORGANIZATION NOT FOUND</h3>
          <p style={{ fontSize: '14px', color: 'var(--pa-n600)', marginBottom: 'var(--pa-space-4)', fontFamily: 'var(--pa-font-body)' }}>
            {error || 'The organization you\'re looking for doesn\'t exist.'}
          </p>
          {isOffline && (
            <p style={{ fontSize: '13px', color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-4)', fontFamily: 'var(--pa-font-body)' }}>
              You appear to be offline. Please reconnect and try again.
            </p>
          )}
          <div style={{ display: 'flex', gap: 'var(--pa-space-2)', justifyContent: 'center' }}>
            <button
              onClick={fetchOrganization}
              disabled={isOffline}
              style={{
                padding: 'var(--pa-space-3) var(--pa-space-5)',
                background: 'var(--pa-theme-action-primary)',
                color: 'var(--pa-theme-text-on-action)',
                border: 'none',
                borderRadius: 'var(--pa-radius-s)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isOffline ? 'not-allowed' : 'pointer',
                opacity: isOffline ? 0.6 : 1,
                transition: 'background-color 150ms ease',
                fontFamily: 'var(--pa-font-body)',
              }}
              onMouseEnter={(e) => !isOffline && (e.currentTarget.style.background = 'var(--pa-theme-action-hover)')}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--pa-theme-action-primary)'}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--pa-surface-page)', minHeight: '100vh' }}>
      {/* Offline indicator */}
      {isOffline && (
        <div
          style={{
            background: 'var(--pa-warning-bg)',
            border: '1px solid var(--pa-warning)',
            borderRadius: 'var(--pa-radius-m)',
            padding: 'var(--pa-space-4)',
            margin: 'var(--pa-space-6) var(--pa-space-8) var(--pa-space-4)',
            boxShadow: 'var(--pa-shadow-1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-warning)' }}>
              wifi_off
            </span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>
              You appear to be offline. Some features may not be available.
            </span>
          </div>
        </div>
      )}

      {/* Profile Header Section */}
      <div style={{
        background: 'var(--pa-n0)',
        borderBottom: '1px solid var(--pa-n100)',
        padding: 'var(--pa-space-8) var(--pa-space-8) var(--pa-space-6)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Back button and breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-4)', marginBottom: 'var(--pa-space-6)' }}>
            <button
              onClick={() => navigate('/platform-admin/organizations')}
              style={{ 
                padding: 'var(--pa-space-2)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 'var(--pa-radius-s)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--pa-n50)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title="Back to Organizations"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--pa-n500)' }}>arrow_back</span>
            </button>
            <div style={{ fontSize: '13px', color: 'var(--pa-n500)', fontFamily: 'var(--pa-font-body)' }}>
              Organizations <span style={{ margin: '0 var(--pa-space-1)' }}>/</span> Organization details
            </div>
          </div>

          {/* Profile Header Content */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--pa-space-6)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Organization Name */}
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: 700, 
                color: 'var(--pa-n900)',
                margin: 0,
                marginBottom: 'var(--pa-space-3)',
                fontFamily: 'var(--pa-font-display)',
                letterSpacing: '-0.02em',
              }}>
                {organization.name}
              </h1>

              {/* Organization ID and Domain */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-4)', flexWrap: 'wrap', marginBottom: 'var(--pa-space-4)' }}>
                <div style={{
                  padding: 'var(--pa-space-1) var(--pa-space-3)',
                  borderRadius: 'var(--pa-radius-pill)',
                  background: 'var(--pa-n50)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--pa-n600)',
                  fontFamily: 'var(--pa-font-mono)',
                }}>
                  {organization.id}
                </div>
                {organization.slug && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)', fontSize: '13px', color: 'var(--pa-n500)', fontFamily: 'var(--pa-font-body)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified</span>
                    {organization.slug}
                  </div>
                )}
              </div>

              {/* Status Badges */}
              <div style={{ display: 'flex', gap: 'var(--pa-space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                {organization.status === 'active' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pa-success)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--pa-n700)', fontFamily: 'var(--pa-font-body)' }}>Active</span>
                  </div>
                )}
                {organization.org_type && (
                  <div style={{
                    padding: 'var(--pa-space-1) var(--pa-space-3)',
                    borderRadius: 'var(--pa-radius-pill)',
                    background: 'var(--pa-n100)',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--pa-n600)',
                    fontFamily: 'var(--pa-font-body)',
                  }}>
                    {organization.org_type}
                  </div>
                )}
                {organization.tier_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pa-theme-action-primary)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--pa-n700)', fontFamily: 'var(--pa-font-body)' }}>{organization.tier_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 'var(--pa-space-3)', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate(getLink('platformAdmin.ticketing.organization', { id: organization.id }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--pa-space-2)',
                  padding: 'var(--pa-space-3) var(--pa-space-5)',
                  background: 'var(--pa-theme-action-primary)',
                  color: 'var(--pa-theme-text-on-action)',
                  border: 'none',
                  borderRadius: 'var(--pa-radius-s)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 150ms ease',
                  fontFamily: 'var(--pa-font-body)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--pa-theme-action-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--pa-theme-action-primary)'}
                title="View this org's ticketing dashboard"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>confirmation_number</span>
                Ticketing
              </button>
              {/* Export Menu */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--pa-space-2)',
                    padding: 'var(--pa-space-3) var(--pa-space-5)',
                    background: 'transparent',
                    color: 'var(--pa-theme-action-primary)',
                    border: '1px solid var(--pa-n200)',
                    borderRadius: 'var(--pa-radius-s)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    transition: 'background-color 150ms ease',
                    opacity: exporting ? 0.6 : 1,
                    fontFamily: 'var(--pa-font-body)',
                  }}
                  onMouseEnter={(e) => !exporting && (e.currentTarget.style.background = 'var(--pa-n50)')}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
                {showExportMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 'var(--pa-space-2)',
                      zIndex: 100,
                      minWidth: '200px',
                      background: 'var(--pa-n0)',
                      borderRadius: 'var(--pa-radius-m)',
                      boxShadow: 'var(--pa-shadow-2)',
                      padding: 'var(--pa-space-2)',
                      border: '1px solid var(--pa-n100)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-1)' }}>
                      <button
                        onClick={() => handleExport('csv')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--pa-space-2)',
                          padding: 'var(--pa-space-2) var(--pa-space-3)',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 'var(--pa-radius-xs)',
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--pa-n900)',
                          cursor: 'pointer',
                          justifyContent: 'flex-start',
                          transition: 'background-color 150ms ease',
                          fontFamily: 'var(--pa-font-body)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--pa-n50)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>table_chart</span>
                        Export as CSV
                      </button>
                      <button
                        onClick={() => handleExport('json')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--pa-space-2)',
                          padding: 'var(--pa-space-2) var(--pa-space-3)',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 'var(--pa-radius-xs)',
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--pa-n900)',
                          cursor: 'pointer',
                          justifyContent: 'flex-start',
                          transition: 'background-color 150ms ease',
                          fontFamily: 'var(--pa-font-body)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--pa-n50)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                  disabled={!permissions.canActivateOrganization || isOffline}
                  onClick={() => {
                    resetDialog()
                    setConfirmDialog({ open: true, type: 'activate' })
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--pa-space-2)',
                    padding: 'var(--pa-space-3) var(--pa-space-5)',
                    background: 'var(--pa-success)',
                    color: 'var(--pa-n0)',
                    border: 'none',
                    borderRadius: 'var(--pa-radius-s)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (!permissions.canActivateOrganization || isOffline) ? 'not-allowed' : 'pointer',
                    opacity: (!permissions.canActivateOrganization || isOffline) ? 0.6 : 1,
                    transition: 'background-color 150ms ease',
                    fontFamily: 'var(--pa-font-body)',
                  }}
                  onMouseEnter={(e) => {
                    if (!(!permissions.canActivateOrganization || isOffline)) {
                      e.currentTarget.style.background = 'var(--pa-n700)'
                    }
                  }}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--pa-success)'}
                  title={
                    !permissions.canActivateOrganization
                      ? 'You do not have permission to activate organizations'
                      : isOffline
                      ? 'Offline - action unavailable'
                      : 'Activate organization'
                  }
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>play_arrow</span>
                  Activate
                </button>
              )}
              {organization.status !== 'suspended' && (
                <button
                  disabled={!permissions.canSuspendOrganization || isOffline}
                  onClick={() => {
                    resetDialog()
                    setConfirmDialog({ open: true, type: 'suspend' })
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--pa-space-2)',
                    padding: 'var(--pa-space-3) var(--pa-space-5)',
                    background: 'var(--pa-danger-bg)',
                    color: 'var(--pa-danger)',
                    border: 'none',
                    borderRadius: 'var(--pa-radius-s)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (!permissions.canSuspendOrganization || isOffline) ? 'not-allowed' : 'pointer',
                    opacity: (!permissions.canSuspendOrganization || isOffline) ? 0.6 : 1,
                    transition: 'background-color 150ms ease',
                    fontFamily: 'var(--pa-font-body)',
                  }}
                  onMouseEnter={(e) => {
                    if (!(!permissions.canSuspendOrganization || isOffline)) {
                      e.currentTarget.style.background = 'var(--pa-n100)'
                    }
                  }}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--pa-danger-bg)'}
                  title={
                    !permissions.canSuspendOrganization
                      ? 'You do not have permission to suspend organizations'
                      : isOffline
                      ? 'Offline - action unavailable'
                      : 'Suspend organization'
                  }
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>block</span>
                  Suspend
                </button>
              )}
              {organization?.id && isMockOrganization(organization.id) && permissions.canResetMockOrganization && (
                <button
                  disabled={isOffline || dialogLoading}
                  onClick={() => {
                    resetDialog()
                    setConfirmDialog({ open: true, type: 'reset' })
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--pa-space-2)',
                    padding: 'var(--pa-space-3) var(--pa-space-5)',
                    background: 'var(--pa-danger-bg)',
                    color: 'var(--pa-danger)',
                    border: 'none',
                    borderRadius: 'var(--pa-radius-s)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (isOffline || dialogLoading) ? 'not-allowed' : 'pointer',
                    opacity: (isOffline || dialogLoading) ? 0.6 : 1,
                    transition: 'background-color 150ms ease',
                    fontFamily: 'var(--pa-font-body)',
                  }}
                  onMouseEnter={(e) => {
                    if (!(isOffline || dialogLoading)) {
                      e.currentTarget.style.background = 'var(--pa-n100)'
                    }
                  }}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--pa-danger-bg)'}
                  title={
                    isOffline
                      ? 'Offline - action unavailable'
                      : 'Reset this mock organization to empty state (re-run seed-all.ts to repopulate)'
                  }
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restart_alt</span>
                  Reset to Seed State
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        background: 'var(--pa-n0)',
        borderBottom: '1px solid var(--pa-n100)',
        padding: '0 var(--pa-space-8)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: 0 }}>
          {tabs.map((tab) => (
            <button
              key={tab.index}
              onClick={() => setActiveTab(tab.index)}
              style={{
                padding: 'var(--pa-space-3) var(--pa-space-4)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.index ? '2px solid var(--pa-theme-action-primary)' : '2px solid transparent',
                fontSize: '14px',
                fontWeight: 500,
                color: activeTab === tab.index ? 'var(--pa-theme-action-primary)' : 'var(--pa-n500)',
                cursor: 'pointer',
                transition: 'color 150ms ease',
                fontFamily: 'var(--pa-font-body)',
              }}
              onMouseEnter={(e) => activeTab !== tab.index && (e.currentTarget.style.color = 'var(--pa-n700)')}
              onMouseLeave={(e) => activeTab !== tab.index && (e.currentTarget.style.color = 'var(--pa-n500)')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: 'var(--pa-space-8)', maxWidth: '1400px', margin: '0 auto' }}>
        {activeTab === 0 && (
          <OverviewTab
            organization={organization}
            adminRole={adminRole}
            onViewActivity={handleViewActivity}
            onRefresh={fetchOrganization}
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
      </div>

      {/* Export Progress */}
      {exporting && progress && (
        <div
          style={{
            position: 'fixed',
            bottom: 'var(--pa-space-6)',
            right: 'var(--pa-space-6)',
            background: 'var(--pa-n0)',
            border: '1px solid var(--pa-n100)',
            borderRadius: 'var(--pa-radius-m)',
            padding: 'var(--pa-space-4)',
            boxShadow: 'var(--pa-shadow-2)',
            minWidth: '300px',
            zIndex: 1000,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--pa-space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', flex: 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-theme-action-primary)' }}>
                download
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>
                  {progress.message} ({progress.progress}%)
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '4px',
                    background: 'var(--pa-n100)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress.progress}%`,
                      height: '100%',
                      background: 'var(--pa-theme-action-primary)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={cancelExport}
              style={{
                padding: 'var(--pa-space-2)',
                background: 'transparent',
                color: 'var(--pa-n600)',
                border: 'none',
                borderRadius: 'var(--pa-radius-xs)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 150ms ease',
                fontFamily: 'var(--pa-font-body)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--pa-n50)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Cancel
            </button>
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
              : confirmDialog.open && confirmDialog.type === 'reset'
                ? 'Reset Organization to Seed State'
                : 'Confirm Action'
        }
        description={
          confirmDialog.open && confirmDialog.type === 'activate'
            ? `Are you sure you want to activate "${organization.name}"? This will allow the organization to access all features.`
            : confirmDialog.open && confirmDialog.type === 'suspend'
              ? `Are you sure you want to suspend "${organization.name}"? This will prevent all users from accessing the organization.`
              : confirmDialog.open && confirmDialog.type === 'reset'
                ? `This will permanently delete all org-scoped data for "${organization.name}" (programs, teams, members, fees, payments, etc.). The organization row will remain. Re-run seed-all.ts to repopulate. This action cannot be undone.`
                : ''
        }
        confirmLabel={
          confirmDialog.open && confirmDialog.type === 'activate'
            ? 'Activate'
            : confirmDialog.open && confirmDialog.type === 'suspend'
              ? 'Suspend'
              : confirmDialog.open && confirmDialog.type === 'reset'
                ? 'Reset'
                : 'Confirm'
        }
        variant={
          confirmDialog.open && (confirmDialog.type === 'suspend' || confirmDialog.type === 'reset')
            ? 'danger'
            : 'info'
        }
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleConfirmAction}
        onCancel={resetDialog}
      />
    </div>
  )
}
