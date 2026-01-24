import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { PageHeader, Card, Button, Badge, ConfirmDialog, ErrorState, DataState } from '../../components/platformAdmin'
import type { EntitlementOverrideWithDetails } from '../../types/licenseTiers.types'
import { useOffline } from '../../hooks/useOffline'
import { isDemoMode, assertNotDemoMode } from '../../utils/demoMode'
import { showError, showSuccess } from '../../utils/toast'

export default function OverrideDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isOffline } = useOffline()
  const demoMode = isDemoMode()
  const [override, setOverride] = useState<EntitlementOverrideWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)
  const [revokeDialog, setRevokeDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        if (overrideError.code === 'PGRST116') {
          setError('Override not found. It may have been deleted or you may not have permission to view it.')
        } else if (overrideError.code === 'PGRST301') {
          setError('You do not have permission to view this override.')
        } else {
          setError(overrideError.message || 'Failed to load override')
        }
        setOverride(null)
        return
      }

      if (!data) {
        setError('Override not found')
        setOverride(null)
        return
      }

      setOverride(data)
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

  const handleRevoke = async (reason: string) => {
    if (!id || !override) return

    // Block in demo mode
    try {
      assertNotDemoMode('revoke override')
    } catch (err: any) {
      setError(err.message)
      showError(err.message)
      setRevokeDialog(false)
      return
    }

    // Block if offline
    if (isOffline) {
      const errorMsg = 'You appear to be offline. Please reconnect and try again.'
      setError(errorMsg)
      showError(errorMsg)
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
      
      type OverrideUpdate = Database['public']['Tables']['entitlement_overrides']['Update']
      const updateData = {
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        revoked_reason: reason,
        updated_at: new Date().toISOString(),
      } satisfies OverrideUpdate
      
      const { error: revokeError } = await supabase
        .from('entitlement_overrides')
        .update(updateData)
        .eq('id', id)

      if (revokeError) {
        if (revokeError.code === 'PGRST301') {
          throw new Error('You do not have permission to revoke this override.')
        } else if (revokeError.code === 'PGRST116') {
          throw new Error('Override not found. It may have already been revoked.')
        }
        throw revokeError
      }

      setRevokeDialog(false)
      showSuccess('Override revoked successfully')
      fetchOverride()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to revoke override'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div>
      {/* Demo mode indicator */}
      {demoMode && (
        <div
          className="pa-card pa-mb-4"
          style={{
            background: 'var(--pa-info-bg)',
            border: '1px solid var(--pa-info)',
            padding: 'var(--pa-space-3)',
          }}
        >
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-info)' }}>
              info
            </span>
            <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
              Demo mode: Changes will not be saved to the database.
            </span>
          </div>
        </div>
      )}

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
                <div style={{ display: 'flex', gap: 'var(--pa-space-3)' }}>
                  {overrideData.status === 'active' && (
                    <Button 
                      variant="danger" 
                      onClick={() => setRevokeDialog(true)}
                      disabled={demoMode || isOffline}
                    >
                      Revoke Override
                    </Button>
                  )}
                  <Button variant="blue" onClick={() => navigate('/platform-admin/licenses/overrides')}>
                    Back
                  </Button>
                </div>
              }
            />

            <div className="pa-grid pa-grid-2" style={{ gap: 'var(--pa-space-5)' }}>
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
                <div className="pa-grid pa-grid-2" style={{ gap: 'var(--pa-space-4)' }}>
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
    </div>
  )
}
