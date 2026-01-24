import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { PageHeader, Badge, Card, PlatformDataTable, ConfirmDialog, type ColumnConfig } from '../../components/platformAdmin'
import { canPerformAction, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../utils/platformAdminPermissions'
import { isAdminRpcResponse } from '../../utils/typeAdapters'
import { normalizeSupabaseError } from '../../utils/errorUtils'
import { getPlatformAdmins } from '../../data/services/platformAdminsService'
import type { PlatformAdminRole } from '../../types/platformAdmin.types'
import { VALID_ROLES } from '../../types/platformAdmin.types'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { showSuccess } from '../../utils/toast'

interface PlatformAdminWithUser {
  user_id: string
  role: PlatformAdminRole
  created_at: string | null
  email: string | null
  display_name: string | null
  id: string // For table key
}

/**
 * Validate add admin parameters (Technical Bug #6, #10)
 */
function validateAddAdminParams(email: string, role: PlatformAdminRole, reason: string): string | null {
  if (!email || !email.trim()) {
    return 'Email is required'
  }
  if (!email.includes('@')) {
    return 'Invalid email format'
  }
  if (!VALID_ROLES.includes(role)) {
    return 'Invalid role'
  }
  if (!reason || reason.trim().length === 0) {
    return 'Reason is required'
  }
  return null // Valid
}

export default function PlatformAdmins() {
  const { profile, refreshProfile } = useAuth()
  const adminRole = profile?.platformAdminRole ?? null // Bug Prevention #1, Technical Bug #4

  const [admins, setAdmins] = useState<PlatformAdminWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  
  // Add dialog
  const [addDialog, setAddDialog] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<PlatformAdminRole>('support_admin')
  const [addReason, setAddReason] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  
  // Remove dialog
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean
    admin: PlatformAdminWithUser | null
  }>({ open: false, admin: null })
  const [removeLoading, setRemoveLoading] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  
  // Technical Bug #3: Mounted ref to prevent state updates after unmount
  const mountedRef = useRef(true)
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  // Technical Bug #2: Wrap fetchAdmins in useCallback with stable dependencies
  const fetchAdmins = useCallback(async () => {
    if (!mountedRef.current) return

    setLoading(true)

    try {
      // Use service function (Bug Prevention #3)
      const { admins: fetchedAdmins, totalCount: fetchedCount } = await getPlatformAdmins(page, rowsPerPage)

      if (!mountedRef.current) return

      const adminsWithUser: PlatformAdminWithUser[] = fetchedAdmins.map((admin) => ({
        id: admin.user_id,
        user_id: admin.user_id,
        role: admin.role,
        created_at: admin.created_at,
        email: admin.email ?? null,
        display_name: admin.display_name ?? null,
      }))

      setAdmins(adminsWithUser)
      setTotalCount(fetchedCount)
    } catch (err) {
      console.error('Error fetching platform admins:', err)
      if (!mountedRef.current) return
      setAdmins([])
      setTotalCount(0)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [page, rowsPerPage])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])


  const handleAddAdmin = async () => {
    if (!addEmail || !addReason) return

    // Technical Bug #10: Validate parameters before RPC call
    const validationError = validateAddAdminParams(addEmail.trim(), addRole, addReason.trim())
    if (validationError) {
      setAddError(validationError)
      return
    }

    if (!mountedRef.current) return
    setAddLoading(true)
    setAddError(null)

    try {
      type AdminRpcArgs = Database['public']['Functions']['admin_add_platform_admin']['Args']
      
      const { data, error } = await supabase.rpc('admin_add_platform_admin', {
        target_email: addEmail.trim(),
        target_role: addRole,
        reason: addReason.trim(),
      } as AdminRpcArgs)

      if (!mountedRef.current) return

      // Technical Bug #9: Normalize Supabase errors
      if (error) {
        setAddError(normalizeSupabaseError(error))
        return
      }

      // Technical Bug #1: Use type guard for RPC response
      if (!isAdminRpcResponse(data)) {
        setAddError('Invalid response from server')
        return
      }

      if (!data.success) {
        setAddError(data.error || 'Unknown error')
        return
      }

      // Bug Prevention #8: Refresh profile if current user might be affected
      // (Note: We can't easily check if target user is current user from email,
      // but refreshing is safe and ensures consistency)
      await refreshProfile()

      if (!mountedRef.current) return

      setAddDialog(false)
      setAddEmail('')
      setAddRole('support_admin')
      setAddReason('')
      showSuccess(`Platform admin ${data.action === 'updated' ? 'updated' : 'added'} successfully`)
      fetchAdmins()
    } catch (err) {
      if (!mountedRef.current) return
      setAddError(normalizeSupabaseError(err))
    } finally {
      if (mountedRef.current) {
        setAddLoading(false)
      }
    }
  }

  const handleRemoveAdmin = async (reason: string) => {
    if (!removeDialog.admin) return

    if (!mountedRef.current) return
    setRemoveLoading(true)
    setRemoveError(null)

    try {
      const { data, error } = await supabase.rpc('admin_remove_platform_admin', {
        target_user_id: removeDialog.admin.user_id,
        reason: reason.trim(),
      })

      if (!mountedRef.current) return

      // Technical Bug #9: Normalize Supabase errors
      if (error) {
        setRemoveError(normalizeSupabaseError(error))
        return
      }

      // Technical Bug #1: Use type guard for RPC response
      if (!isAdminRpcResponse(data)) {
        setRemoveError('Invalid response from server')
        return
      }

      if (!data.success) {
        setRemoveError(data.error || 'Unknown error')
        return
      }

      // Bug Prevention #8: Refresh profile if current user might be affected
      // Check if removed user is current user
      if (removeDialog.admin.user_id === profile?.id) {
        await refreshProfile()
      }

      if (!mountedRef.current) return

      setRemoveDialog({ open: false, admin: null })
      showSuccess('Platform admin removed successfully')
      fetchAdmins()
    } catch (err) {
      if (!mountedRef.current) return
      setRemoveError(normalizeSupabaseError(err))
    } finally {
      if (mountedRef.current) {
        setRemoveLoading(false)
      }
    }
  }

  const getRoleVariant = (role: PlatformAdminRole): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (role) {
      case 'super_admin': return 'danger'
      case 'ops_admin': return 'info'
      case 'finance_admin': return 'success'
      case 'support_admin': return 'neutral'
      default: return 'neutral'
    }
  }

  const columns: ColumnConfig<PlatformAdminWithUser>[] = [
    {
      id: 'email',
      label: 'Email',
      minWidth: 200,
      render: (row) => row.email || '—',
    },
    {
      id: 'display_name',
      label: 'Name',
      minWidth: 150,
      render: (row) => row.display_name || '—',
    },
    {
      id: 'role',
      label: 'Role',
      minWidth: 150,
      render: (row: PlatformAdminWithUser) => {
        const role: PlatformAdminRole = row.role
        return (
          <Badge variant={getRoleVariant(role)}>
            {ROLE_LABELS[role]}
          </Badge>
        )
      },
    },
    {
      id: 'created_at',
      label: 'Added',
      minWidth: 120,
      render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '—',
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (row) => (
        <button
          className="pa-btn pa-btn--ghost pa-btn--dense"
          disabled={!adminRole || !canPerformAction(adminRole, 'remove_platform_admin')}
          onClick={() => setRemoveDialog({ open: true, admin: row })}
          style={{ color: 'var(--pa-danger)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
          Remove
        </button>
      ),
    },
  ]

  const canManageAdmins = adminRole ? canPerformAction(adminRole, 'add_platform_admin') : false

  return (
    <div>
      <PageHeader
        title="Platform Admins"
        subtitle="Manage users with platform-wide administrative access."
        actions={
          <button
            className="pa-btn pa-btn--primary pa-btn--compact"
            disabled={!canManageAdmins || addLoading || removeLoading}
            onClick={() => setAddDialog(true)}
          >
            <span className="material-symbols-outlined">add</span>
            Add Admin
          </button>
        }
      />

      {!canManageAdmins && (
        <div
          className="pa-card pa-mb-4"
          style={{ borderLeft: '3px solid var(--pa-info)', background: 'var(--pa-info-bg)' }}
        >
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ color: 'var(--pa-info)' }}>info</span>
            <span className="pa-body-m">Only Super Admins can manage platform administrators.</span>
          </div>
        </div>
      )}

      <PlatformDataTable
        columns={columns}
        rows={admins}
        loading={loading}
        emptyMessage="No platform admins found."
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={(size) => { setRowsPerPage(size); setPage(0) }}
      />

      {/* Add Admin Dialog */}
      {addDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            if (!addLoading) {
              setAddDialog(false)
            }
          }}
        >
          <Card
            style={{ width: '100%', maxWidth: '480px' }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <h2 className="pa-h2 pa-mb-4">Add Platform Admin</h2>
            
            {addError && (
              <div
                className="pa-card pa-mb-4"
                style={{ borderLeft: '3px solid var(--pa-danger)', background: 'var(--pa-danger-bg)', padding: 'var(--pa-space-3)' }}
              >
                <span className="pa-body-m" style={{ color: 'var(--pa-danger)' }}>{addError}</span>
              </div>
            )}
            
            <div className="pa-form-group">
              <label className="pa-label pa-label--required">Email</label>
              <input
                type="email"
                className="pa-input"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={addLoading}
              />
              <div className="pa-helper">User must already exist in the system</div>
            </div>
            
            <div className="pa-form-group">
              <label className="pa-label pa-label--required">Role</label>
              <select
                className="pa-input pa-select"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as PlatformAdminRole)}
                disabled={addLoading}
              >
                {VALID_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]} — {ROLE_DESCRIPTIONS[role]}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="pa-form-group">
              <label className="pa-label pa-label--required">Reason</label>
              <textarea
                className="pa-input pa-textarea"
                value={addReason}
                onChange={(e) => setAddReason(e.target.value)}
                placeholder="Why is this user being granted admin access?"
                rows={2}
                disabled={addLoading}
              />
            </div>
            
            <div className="pa-flex pa-gap-3 pa-mt-5" style={{ justifyContent: 'flex-end' }}>
              <button
                className="pa-btn pa-btn--secondary"
                onClick={() => setAddDialog(false)}
                disabled={addLoading}
              >
                Cancel
              </button>
              <button
                className="pa-btn pa-btn--primary"
                onClick={handleAddAdmin}
                disabled={addLoading || !addEmail.trim() || !addReason.trim()}
              >
                {addLoading ? 'Adding...' : 'Add Admin'}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Remove Admin Dialog */}
      <ConfirmDialog
        open={removeDialog.open}
        title="Remove Platform Admin"
        description={`Are you sure you want to remove "${removeDialog.admin?.email}" from platform admins? They will lose all administrative access.`}
        confirmLabel="Remove"
        variant="danger"
        requireReason
        loading={removeLoading}
        error={removeError}
        onConfirm={handleRemoveAdmin}
        onCancel={() => setRemoveDialog({ open: false, admin: null })}
      />

      {/* Toast */}
    </div>
  )
}
