import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Badge, Card, ConfirmDialog } from '../../components/platformAdmin'
import { canPerformAction } from '../../utils/platformAdminPermissions'
import { getDisplayEmail } from '../../utils/platformAdminMasking'
import { isRpcSuccessResponse } from '../../utils/typeAdapters'
import type { AdminUser, AdminRpcResponse, PlatformAdminRole } from '../../types/platformAdmin.types'

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'disable' | 'enable' | 'resend' | 'logout'
  }>({ open: false, type: 'disable' })
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

  const fetchUser = useCallback(async () => {
    if (!id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching user:', error)
        setUser(null)
      } else {
        setUser(data as AdminUser)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Auto-hide toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleConfirmAction = async (reason: string) => {
    if (!user) return

    setDialogLoading(true)
    setDialogError(null)

    try {
      let rpcName: 'admin_enable_user' | 'admin_disable_user'
      let targetUserId = user.id

      switch (confirmDialog.type) {
        case 'enable':
          rpcName = 'admin_enable_user'
          break
        case 'disable':
          rpcName = 'admin_disable_user'
          break
        case 'resend':
          setDialogError('Resend verification requires server-side function (not yet implemented)')
          setDialogLoading(false)
          return
        case 'logout':
          setDialogError('Force logout requires server-side function (not yet implemented)')
          setDialogLoading(false)
          return
        default:
          return
      }

      const { data, error } = await supabase.rpc(rpcName, { target_user_id: targetUserId ?? '', reason })

      if (error) {
        setDialogError(error.message)
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
        setDialogError((data as AdminRpcResponse)?.error || 'Unknown error')
        return
      }

      setConfirmDialog({ open: false, type: 'disable' })
      setToast({
        show: true,
        message: 'Action completed successfully',
        variant: 'success',
      })
      fetchUser()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDialogLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="pa-flex pa-items-center pa-gap-3 pa-mb-5">
          <button className="pa-btn pa-btn--ghost" onClick={() => navigate('/platform-admin/users')}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="pa-skeleton" style={{ width: '300px', height: '32px' }} />
        </div>
        <div className="pa-skeleton" style={{ width: '100%', height: '300px' }} />
      </div>
    )
  }

  if (!user) {
    return (
      <div>
        <button
          className="pa-btn pa-btn--ghost pa-mb-4"
          onClick={() => navigate('/platform-admin/users')}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Users
        </button>
        <Card>
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined">person</span>
            </div>
            <h3 className="pa-empty-title">USER NOT FOUND</h3>
            <p className="pa-empty-text">The user you're looking for doesn't exist.</p>
          </div>
        </Card>
      </div>
    )
  }

  const getDialogTitle = () => {
    switch (confirmDialog.type) {
      case 'enable': return 'Enable User'
      case 'disable': return 'Disable User'
      case 'resend': return 'Resend Verification Email'
      case 'logout': return 'Force Logout'
      default: return 'Confirm Action'
    }
  }

  const getDialogDescription = () => {
    switch (confirmDialog.type) {
      case 'enable': return `Are you sure you want to enable "${user.email}"?`
      case 'disable': return `Are you sure you want to disable "${user.email}"? They will not be able to sign in.`
      case 'resend': return `Resend verification email to "${user.email}"?`
      case 'logout': return `Force logout all sessions for "${user.email}"?`
      default: return 'Are you sure?'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="pa-flex pa-items-center pa-gap-3 pa-mb-5">
        <button
          className="pa-btn pa-btn--ghost"
          onClick={() => navigate('/platform-admin/users')}
          style={{ padding: '8px' }}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--pa-blue)' }}>
          person
        </span>
        <div style={{ flex: 1 }}>
          <h1 className="pa-h1" style={{ marginBottom: '4px' }}>
            {user.display_name || getDisplayEmail(user.email, adminRole, false)}
          </h1>
          <div className="pa-flex pa-gap-2">
            {user.is_platform_admin && (
              <Badge variant="info">Platform Admin</Badge>
            )}
            <Badge variant={user.email_confirmed ? 'success' : 'warning'}>
              {user.email_confirmed ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pa-flex pa-gap-2 pa-mb-5" style={{ flexWrap: 'wrap' }}>
        <button
          className="pa-btn pa-btn--secondary pa-btn--compact"
          disabled={!canPerformAction(adminRole, 'disable_user')}
          onClick={() => setConfirmDialog({ open: true, type: 'disable' })}
          style={{ color: 'var(--pa-danger)', borderColor: 'var(--pa-danger)' }}
        >
          <span className="material-symbols-outlined">block</span>
          Disable User
        </button>
        <button
          className="pa-btn pa-btn--secondary pa-btn--compact"
          disabled={!canPerformAction(adminRole, 'enable_user')}
          onClick={() => setConfirmDialog({ open: true, type: 'enable' })}
          style={{ color: 'var(--pa-success)', borderColor: 'var(--pa-success)' }}
        >
          <span className="material-symbols-outlined">play_arrow</span>
          Enable User
        </button>
        <button
          className="pa-btn pa-btn--secondary pa-btn--compact"
          disabled={!canPerformAction(adminRole, 'resend_verification')}
          onClick={() => setConfirmDialog({ open: true, type: 'resend' })}
        >
          <span className="material-symbols-outlined">refresh</span>
          Resend Verification
        </button>
        <button
          className="pa-btn pa-btn--secondary pa-btn--compact"
          disabled={!canPerformAction(adminRole, 'force_logout')}
          onClick={() => setConfirmDialog({ open: true, type: 'logout' })}
        >
          <span className="material-symbols-outlined">logout</span>
          Force Logout
        </button>
      </div>

      {/* User Details */}
      <div className="pa-grid pa-grid-2">
        <Card title="User Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pa-space-4)' }}>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">ID</div>
              <code style={{ fontSize: '12px' }}>{user.id}</code>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Email</div>
              <div className="pa-body-m">{getDisplayEmail(user.email, adminRole, false)}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Display Name</div>
              <div className="pa-body-m">{user.display_name || '—'}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Created</div>
              <div className="pa-body-m">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              </div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Last Sign In</div>
              <div className="pa-body-m">
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Organizations">
          {user.organizations && user.organizations.length > 0 ? (
            <div className="pa-flex pa-flex-col pa-gap-2">
              {user.organizations.map((org) => (
                <div
                  key={org.organization_id}
                  className="pa-flex pa-items-center pa-justify-between"
                  style={{ padding: 'var(--pa-space-2) 0', borderBottom: '1px solid var(--pa-n100)' }}
                >
                  <span className="pa-body-m">{org.org_name}</span>
                  <Badge variant="neutral">{org.role}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <span className="pa-body-m pa-text-muted">
              User is not a member of any organizations.
            </span>
          )}
        </Card>

        <Card title="Roles">
          <div className="pa-flex pa-gap-2" style={{ flexWrap: 'wrap' }}>
            {user.roles && user.roles.length > 0 ? (
              user.roles.map((role) => (
                <Badge key={role} variant="neutral">{role}</Badge>
              ))
            ) : (
              <span className="pa-body-m pa-text-muted">No roles assigned.</span>
            )}
          </div>
        </Card>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={getDialogTitle()}
        description={getDialogDescription()}
        confirmLabel="Confirm"
        variant={confirmDialog.type === 'disable' ? 'danger' : 'warning'}
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog({ open: false, type: 'disable' })}
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
