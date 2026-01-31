import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { PageHeader, Card, Button, Badge, ConfirmDialog, DataState } from '../../components/platformAdmin'
import type { EntitlementOverrideWithDetails } from '../../types/licenseTiers.types'
import { useOffline } from '../../hooks/useOffline'
import { showError, showSuccess } from '../../utils/toast'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../i18n/useI18n'

export default function OverrideDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isOffline } = useOffline()
  const { t } = useI18n()
  const { profile } = useAuth()
  const [override, setOverride] = useState<EntitlementOverrideWithDetails | null>(null)
  const [overrideVersion, setOverrideVersion] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)
  const [revokeDialog, setRevokeDialog] = useState(false)
  const [conflictDialog, setConflictDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canRevoke = profile?.platformAdminRole === 'super_admin'

  const fetchOverride = useCallback(async () => {
    if (!id) {
      setError('Override ID is required')
      setLoading(false)
      return
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      setError('Invalid override ID format')
      setLoading(false)
      return
    }

    if (isOffline) {
      setError('You appear to be offline. Please reconnect and try again.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: overrideError } = await supabase
        .from('admin_entitlement_overrides_list')
        .select('*')
        .eq('id', id)
        .single()

      if (overrideError) {
        let errorMessage = overrideError.message || 'Failed to load override'
        
        if (overrideError.code === 'PGRST205') {
          errorMessage = 'The overrides view is not available. The database schema may need to refresh. Please try again in a moment or contact support if the issue persists.'
        } else if (overrideError.code === 'PGRST116') {
          errorMessage = 'Override not found. It may have been deleted or you may not have permission to view it.'
        } else if (overrideError.code === 'PGRST301') {
          errorMessage = 'You do not have permission to view this override.'
        }
        
        setError(errorMessage)
        setOverride(null)
        setOverrideVersion(null)
        return
      }

      if (!data) {
        setError('Override not found')
        setOverride(null)
        setOverrideVersion(null)
        return
      }

      // Cast view data to domain type (view may have nullable fields)
      setOverride(data as EntitlementOverrideWithDetails)
      // Get version from view data (view now includes version column)
      setOverrideVersion((data as any).version || 1)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching override:', err)
      setError(err.message || 'An unexpected error occurred while loading the override.')
      setOverride(null)
    } finally {
      setLoading(false)
    }
  }, [id, isOffline])

  useEffect(() => {
    fetchOverride()
  }, [fetchOverride])

  // Auto-refresh when window regains focus (Issue 2)
  useEffect(() => {
    const handleFocus = () => {
      if (!loading && id) {
        fetchOverride()
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchOverride, loading, id])

  const handleRevoke = async (reason: string) => {
    if (!id || !override) return

    // Block if offline
    if (isOffline) {
      const errorMsg = t('toast.error.offline')
      setError(errorMsg)
      showError(errorMsg)
      setRevokeDialog(false)
      return
    }

    // Check expiration before revoke (Issue 2)
    if (override.expires_at && new Date(override.expires_at) < new Date()) {
      showError(t('toast.error.overrideExpiredCannotRevoke'))
      setRevokeDialog(false)
      return
    }

    // Check status is active (Issue 2)
    if (override.status !== 'active') {
      showError(t('toast.error.overrideInvalidStatus'))
      setRevokeDialog(false)
      return
    }

    setRevoking(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('You must be logged in to revoke an override')
      }
      
      // Optimistic locking: check version (Issue 1 & 5)
      const currentVersion = overrideVersion || 1
      
      type OverrideUpdate = Database['public']['Tables']['entitlement_overrides']['Update']
      const updateData = {
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        revoked_reason: reason,
        updated_at: new Date().toISOString(),
      } satisfies OverrideUpdate
      
      const { data: _updatedData, error: revokeError } = await supabase
        .from('entitlement_overrides')
        .update(updateData)
        .eq('id', id)
        .eq('version', currentVersion) // Optimistic locking check
        .select('version')
        .single()

      if (revokeError) {
        if (revokeError.code === 'PGRST301') {
          throw new Error('You do not have permission to revoke this override.')
        } else if (revokeError.code === 'PGRST116') {
          // Version conflict or not found
          // Check if it's a version conflict by fetching current version
          const { data: current } = await supabase
            .from('entitlement_overrides')
            .select('version, revoked_at')
            .eq('id', id)
            .single()
          
          if (current && current.version !== currentVersion) {
            // Version conflict
            setConflictDialog(true)
            setRevokeDialog(false)
            setRevoking(false)
            return
          } else if (current && current.revoked_at) {
            throw new Error(t('toast.error.overrideAlreadyRevoked'))
          } else {
            throw new Error(t('toast.error.overrideNotFound'))
          }
        }
        throw revokeError
      }

      setRevokeDialog(false)
      showSuccess(t('toast.success.overrideRevoked'))
      fetchOverride()
    } catch (err: any) {
      let errorMessage = t('toast.error.operationFailed')
      if (err.message === t('toast.error.overrideAlreadyRevoked') || 
          err.message === t('toast.error.overrideNotFound') ||
          err.message === t('toast.error.permissionDenied')) {
        errorMessage = err.message
      } else if (err.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setRevoking(false)
    }
  }

  const handleConflictRefresh = () => {
    setConflictDialog(false)
    fetchOverride()
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
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-warning)' }}>
              wifi_off
            </span>
            <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
              You appear to be offline. Some features may not be available.
            </span>
          </div>
        </div>
      )}

      <DataState
        data={override ? [override] : null}
        loading={loading}
        error={error}
        onRetry={fetchOverride}
        emptyMessage="Override not found"
        emptyIcon="rule"
        emptyTitle="Override Not Found"
        emptyDescription="The override you're looking for doesn't exist or you may not have permission to view it."
        emptyAction={{
          label: 'Back to Overrides',
          onClick: () => navigate('/platform-admin/licenses/overrides'),
        }}
        loadingSkeleton={
          <div>
            <PageHeader title="Loading..." />
            <div className="pa-skeleton" style={{ width: '100%', height: '400px', marginTop: 'var(--pa-space-4)' }} />
          </div>
        }
      >
        {([overrideData]) => (
          <>
            <PageHeader
              title="Override Details"
              subtitle={`Override for ${overrideData.target_name || 'Unknown'}`}
              actions={
                <div className="pa-flex pa-flex-col sm:pa-flex-row pa-gap-2">
                  {overrideData.status === 'active' && (
                    <Button 
                      variant="danger" 
                      onClick={() => setRevokeDialog(true)}
                      disabled={isOffline || !canRevoke}
                      title={!canRevoke ? 'You do not have permission to revoke overrides' : undefined}
                      className="w-full sm:w-auto min-h-[44px]"
                    >
                      Revoke Override
                    </Button>
                  )}
                  <Button variant="blue" onClick={() => navigate('/platform-admin/licenses/overrides')} className="w-full sm:w-auto min-h-[44px]">
                    Back
                  </Button>
                </div>
              }
            />

            {/* Expiration Warning (Issue 2) */}
            {overrideData.expires_at && new Date(overrideData.expires_at) > new Date() && 
             new Date(overrideData.expires_at).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000 && (
              <div
                className="pa-card pa-mb-4"
                style={{
                  background: 'var(--pa-warning-bg)',
                  border: '1px solid var(--pa-warning)',
                  padding: 'var(--pa-space-3)',
                }}
              >
                <div className="pa-flex pa-items-center pa-gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-warning)' }}>
                    schedule
                  </span>
                  <div>
                    <div className="pa-body-m" style={{ fontWeight: 600, color: 'var(--pa-n900)' }}>
                      Override expires soon
                    </div>
                    <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
                      This override expires on {new Date(overrideData.expires_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pa-grid pa-grid-cols-1 lg:pa-grid-cols-2" style={{ gap: 'var(--pa-space-5)' }}>
              <Card title="Override Information">
                <div className="pa-grid pa-grid-2" style={{ gap: 'var(--pa-space-4)' }}>
                  <div>
                    <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Target</div>
                    <div className="pa-body-m" style={{ fontWeight: 600 }}>{overrideData.target_name || 'Unknown'}</div>
                    <Badge variant={overrideData.target_type === 'organization' ? 'info' : 'warning'} style={{ marginTop: 'var(--pa-space-1)' }}>
                      {overrideData.target_type === 'organization' ? 'Organization' : 'User'}
                    </Badge>
                  </div>
                  <div>
                    <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Status</div>
                    <Badge variant={overrideData.status === 'active' ? 'success' : overrideData.status === 'expired' ? 'warning' : 'neutral'}>
                      {overrideData.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Feature</div>
                    <div className="pa-body-m" style={{ fontWeight: 600 }}>{overrideData.feature_name || 'Unknown'}</div>
                    <div className="pa-body-s" style={{ color: 'var(--pa-n500)', fontFamily: 'var(--pa-font-mono)', marginTop: '4px' }}>
                      {overrideData.feature_key || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Action</div>
                    <div className="pa-body-m">{overrideData.override_action}</div>
                  </div>
                  {overrideData.limit_value !== null && (
                    <div>
                      <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Limit Value</div>
                      <div className="pa-body-m">{overrideData.limit_value}</div>
                    </div>
                  )}
                  {overrideData.expires_at && (
                    <div>
                      <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Expires At</div>
                      <div className="pa-body-m">{new Date(overrideData.expires_at).toLocaleString()}</div>
                      {new Date(overrideData.expires_at) < new Date() && (
                        <Badge variant="warning" style={{ marginTop: 'var(--pa-space-1)' }}>Expired</Badge>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              <Card title="Audit Information">
                <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2" style={{ gap: 'var(--pa-space-4)' }}>
                  <div>
                    <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Created By</div>
                    <div className="pa-body-m">{overrideData.created_by_email || 'Unknown'}</div>
                    <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
                      {new Date(overrideData.created_at).toLocaleString()}
                    </div>
                  </div>
                  {overrideData.revoked_at && (
                    <div>
                      <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Revoked By</div>
                      <div className="pa-body-m">{overrideData.revoked_by_email || 'Unknown'}</div>
                      <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
                        {new Date(overrideData.revoked_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Reason</div>
                    <div className="pa-body-m">{overrideData.reason || 'No reason provided'}</div>
                  </div>
                  {overrideData.revoked_reason && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Revocation Reason</div>
                      <div className="pa-body-m">{overrideData.revoked_reason}</div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </DataState>

      <ConfirmDialog
        open={revokeDialog}
        title="Revoke Override"
        description="Are you sure you want to revoke this override? This action cannot be undone."
        confirmLabel="Revoke"
        variant="danger"
        requireReason
        loading={revoking}
        error={error}
        onConfirm={handleRevoke}
        onCancel={() => {
          setRevokeDialog(false)
          setError(null)
        }}
      />

      {/* Version Conflict Dialog (Issue 1 & 5) */}
      <ConfirmDialog
        open={conflictDialog}
        title="Override Was Modified"
        description="This override was modified by another admin. Please refresh to see the latest state, then try again."
        confirmLabel="Refresh & Retry"
        variant="warning"
        requireReason={false}
        loading={false}
        error={null}
        onConfirm={handleConflictRefresh}
        onCancel={() => {
          setConflictDialog(false)
        }}
      />
    </div>
  )
}
