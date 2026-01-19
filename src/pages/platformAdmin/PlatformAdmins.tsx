import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, Card, PlatformDataTable, ConfirmDialog, type ColumnConfig } from '../../components/platformAdmin'
import { canPerformAction, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../utils/platformAdminPermissions'
import { isRpcSuccessResponse } from '../../utils/typeAdapters'
import type { AdminRpcResponse, PlatformAdminRole } from '../../types/platformAdmin.types'
import { Database } from '@/lib/database.types'

interface PlatformAdminWithUser {
  user_id: string
  role: PlatformAdminRole
  created_at: string | null
  email: string | null
  display_name: string | null
  id: string // For table key
}

export default function PlatformAdmins() {
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
  
  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: 'success' | 'danger' }>({
    show: false,
    message: '',
    variant: 'success',
  })
  
  // TODO: Fetch actual role
  const [adminRole] = useState<PlatformAdminRole>('super_admin')

  const fetchAdmins = useCallback(async () => {
    setLoading(true)

    try {
      const { data, error, count } = await supabase
        .from('platform_admins')
        .select(`
          user_id,
          role,
          created_at,
          users (email, display_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * rowsPerPage, (page + 1) * rowsPerPage - 1)

      if (error) {
        console.error('Error fetching platform admins:', error)
        setAdmins([])
        setTotalCount(0)
      } else {
        const adminsWithUser = (data || []).map((admin: any) => ({
          id: admin.user_id, // Use user_id as id for table key
          user_id: admin.user_id,
          role: admin.role,
          created_at: admin.created_at,
          email: admin.users?.email || null,
          display_name: admin.users?.display_name || null,
        }))
        setAdmins(adminsWithUser)
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Error:', err)
      setAdmins([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  // Auto-hide toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleAddAdmin = async () => {
    if (!addEmail || !addReason) return

    setAddLoading(true)
    setAddError(null)

    try {
      type AdminRpcArgs = Database['public']['Functions']['admin_add_platform_admin']['Args']
      
      const { data, error } = await supabase.rpc('admin_add_platform_admin', {
        target_email: addEmail,
        target_role: addRole,
        reason: addReason,
      } as AdminRpcArgs)

      if (error) {
        setAddError(error.message)
        return
      }

      if (data && !(data as AdminRpcResponse).success) {
        setAddError((data as AdminRpcResponse).error || 'Unknown error')
        return
      }

      setAddDialog(false)
      setAddEmail('')
      setAddRole('support_admin')
      setAddReason('')
      setToast({
        show: true,
        message: `Platform admin ${(data as AdminRpcResponse)?.action === 'updated' ? 'updated' : 'added'} successfully`,
        variant: 'success',
      })
      fetchAdmins()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setAddLoading(false)
    }
  }

  const handleRemoveAdmin = async (reason: string) => {
    if (!removeDialog.admin) return

    setRemoveLoading(true)
    setRemoveError(null)

    try {
      const { data, error } = await supabase.rpc('admin_remove_platform_admin', {
        target_user_id: removeDialog.admin.user_id,
        reason,
      } as any)

      if (error) {
        setRemoveError(error.message)
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
        setRemoveError((data as AdminRpcResponse)?.error || 'Unknown error')
        return
      }

      setRemoveDialog({ open: false, admin: null })
      setToast({
        show: true,
        message: 'Platform admin removed successfully',
        variant: 'success',
      })
      fetchAdmins()
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRemoveLoading(false)
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
          disabled={!canPerformAction(adminRole, 'remove_platform_admin')}
          onClick={() => setRemoveDialog({ open: true, admin: row })}
          style={{ color: 'var(--pa-danger)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
          Remove
        </button>
      ),
    },
  ]

  const canManageAdmins = canPerformAction(adminRole, 'add_platform_admin')

  return (
    <div>
      <PageHeader
        title="Platform Admins"
        subtitle="Manage users with platform-wide administrative access."
        actions={
          <button
            className="pa-btn pa-btn--primary pa-btn--compact"
            disabled={!canManageAdmins}
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
          onClick={() => setAddDialog(false)}
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
              />
              <div className="pa-helper">User must already exist in the system</div>
            </div>
            
            <div className="pa-form-group">
              <label className="pa-label pa-label--required">Role</label>
              <select
                className="pa-input pa-select"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as PlatformAdminRole)}
              >
                {(Object.keys(ROLE_LABELS) as PlatformAdminRole[]).map((role) => (
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
                disabled={addLoading || !addEmail || !addReason}
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
