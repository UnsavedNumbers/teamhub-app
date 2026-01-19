import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { PageHeader, Card, Button, Badge, ConfirmDialog } from '../../components/platformAdmin'
import type { EntitlementOverrideWithDetails } from '../../types/licenseTiers.types'

export default function OverrideDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [override, setOverride] = useState<EntitlementOverrideWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)
  const [revokeDialog, setRevokeDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOverride = useCallback(async () => {
    if (!id) return

    setLoading(true)
    try {
      const { data, error: overrideError } = await supabase
        .from('admin_entitlement_overrides_list')
        .select('*')
        .eq('id', id)
        .single()

      if (overrideError) throw overrideError
      setOverride(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load override')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOverride()
  }, [fetchOverride])

  const handleRevoke = async (reason: string) => {
    if (!id || !override) return

    setRevoking(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      type OverrideUpdate = Database['public']['Tables']['entitlement_overrides']['Update']
      const updateData = {
        revoked_at: new Date().toISOString(),
        revoked_by: user?.id || null,
        revoked_reason: reason,
      } satisfies OverrideUpdate
      const { error: revokeError } = await supabase
        .from('entitlement_overrides')
        .update(updateData)
        .eq('id', id)

      if (revokeError) throw revokeError

      setRevokeDialog(false)
      fetchOverride()
    } catch (err: any) {
      setError(err.message || 'Failed to revoke override')
    } finally {
      setRevoking(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading..." />
      </div>
    )
  }

  if (!override) {
    return (
      <div>
        <PageHeader title="Override Not Found" />
        <div className="pa-card">
          <div className="pa-body-m">The override you're looking for doesn't exist.</div>
          <Button variant="secondary" onClick={() => navigate('/platform-admin/licenses/overrides')} style={{ marginTop: 'var(--pa-space-4)' }}>
            Back to Overrides
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Override Details"
        subtitle={`Override for ${override.target_name || 'Unknown'}`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--pa-space-3)' }}>
            {override.status === 'active' && (
              <Button variant="danger" onClick={() => setRevokeDialog(true)}>
                Revoke Override
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/platform-admin/licenses/overrides')}>
              Back
            </Button>
          </div>
        }
      />

      {error && (
        <div className="pa-card pa-mb-4" style={{ borderLeft: '3px solid var(--pa-danger)', background: 'var(--pa-danger-bg)' }}>
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ color: 'var(--pa-danger)' }}>error</span>
            <span className="pa-body-m">{error}</span>
          </div>
        </div>
      )}

      <div className="pa-grid pa-grid-2" style={{ gap: 'var(--pa-space-5)' }}>
        <Card title="Override Information">
          <div className="pa-grid pa-grid-2" style={{ gap: 'var(--pa-space-4)' }}>
            <div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Target</div>
              <div className="pa-body-m" style={{ fontWeight: 600 }}>{override.target_name || 'Unknown'}</div>
              <Badge variant={override.target_type === 'organization' ? 'info' : 'warning'} style={{ marginTop: 'var(--pa-space-1)' }}>
                {override.target_type === 'organization' ? 'Organization' : 'User'}
              </Badge>
            </div>
            <div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Status</div>
              <Badge variant={override.status === 'active' ? 'success' : override.status === 'expired' ? 'warning' : 'neutral'}>
                {override.status}
              </Badge>
            </div>
            <div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Feature</div>
              <div className="pa-body-m" style={{ fontWeight: 600 }}>{override.feature_name}</div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', fontFamily: 'var(--pa-font-mono)', marginTop: '4px' }}>
                {override.feature_key}
              </div>
            </div>
            <div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Action</div>
              <div className="pa-body-m">{override.override_action}</div>
            </div>
            {override.limit_value !== null && (
              <div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Limit Value</div>
                <div className="pa-body-m">{override.limit_value}</div>
              </div>
            )}
            {override.expires_at && (
              <div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Expires At</div>
                <div className="pa-body-m">{new Date(override.expires_at).toLocaleString()}</div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Audit Information">
          <div className="pa-grid pa-grid-2" style={{ gap: 'var(--pa-space-4)' }}>
            <div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Created By</div>
              <div className="pa-body-m">{override.created_by_email || 'Unknown'}</div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
                {new Date(override.created_at).toLocaleString()}
              </div>
            </div>
            {override.revoked_at && (
              <div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Revoked By</div>
                <div className="pa-body-m">{override.revoked_by_email || 'Unknown'}</div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
                  {new Date(override.revoked_at).toLocaleString()}
                </div>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Reason</div>
              <div className="pa-body-m">{override.reason}</div>
            </div>
            {override.revoked_reason && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)' }}>Revocation Reason</div>
                <div className="pa-body-m">{override.revoked_reason}</div>
              </div>
            )}
          </div>
        </Card>
      </div>

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
