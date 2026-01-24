import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { showSuccess, showError } from '../../utils/toast'
import { PageHeader, Badge, FilterBar, PlatformDataTable, ConfirmDialog, type ColumnConfig } from '../../components/platformAdmin'
import { canPerformAction, getDeniedMessage } from '../../utils/platformAdminPermissions'
import { getDisplayEmail } from '../../utils/platformAdminMasking'
import { isRpcSuccessResponse } from '../../utils/typeAdapters'
import type { AdminUser, AdminRpcResponse, PlatformAdminRole } from '../../types/platformAdmin.types'

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [orderBy, setOrderBy] = useState('created_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  
  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'disable' | 'enable'
    user: AdminUser | null
  }>({ open: false, type: 'disable', user: null })
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  
  // TODO: Fetch actual role
  const [adminRole] = useState<PlatformAdminRole>('super_admin')
  
  const navigate = useNavigate()

  const fetchUsers = useCallback(async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('admin_users')
        .select('*', { count: 'exact' })

      if (search) {
        query = query.ilike('email', `%${search}%`)
      }

      query = query.order(orderBy, { ascending: order === 'asc' })

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching users:', error)
        setUsers([])
        setTotalCount(0)
      } else {
        setUsers(data as AdminUser[] || [])
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Error:', err)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search, orderBy, order])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSort = (column: string) => {
    const isAsc = orderBy === column && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(column)
  }

  const handleRowClick = (user: AdminUser) => {
    navigate(`/platform-admin/users/${user.id}`)
  }

  const handleDisable = (user: AdminUser) => {
    if (!canPerformAction(adminRole, 'disable_user')) {
      setToast({ show: true, message: getDeniedMessage('disable_user'), variant: 'danger' })
      return
    }
    setDialogError(null)
    setConfirmDialog({ open: true, type: 'disable', user })
  }

  const handleConfirmAction = async (reason: string) => {
    if (!confirmDialog.user) return

    setDialogLoading(true)
    setDialogError(null)

    try {
      const rpcName = confirmDialog.type === 'enable' 
        ? 'admin_enable_user' 
        : 'admin_disable_user'

      const { data, error } = await supabase.rpc(rpcName, {
        target_user_id: confirmDialog.user.id,
        reason,
      } as any)

      if (error) {
        setDialogError(error.message)
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
        setDialogError((data as AdminRpcResponse)?.error || 'Unknown error')
        return
      }

      setConfirmDialog({ open: false, type: 'disable', user: null })
      showSuccess(`User ${confirmDialog.type === 'enable' ? 'enabled' : 'disabled'} successfully`)
      fetchUsers()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDialogLoading(false)
    }
  }

  const columns: ColumnConfig<AdminUser>[] = [
    {
      id: 'email',
      label: 'Email',
      sortable: true,
      minWidth: 200,
      render: (row) => getDisplayEmail(row.email, adminRole, false),
    },
    {
      id: 'display_name',
      label: 'Name',
      sortable: true,
      render: (row) => row.display_name || '—',
    },
    {
      id: 'roles',
      label: 'Roles',
      render: (row) => (
        <div className="pa-flex pa-gap-1" style={{ flexWrap: 'wrap' }}>
          {row.roles && row.roles.length > 0 ? (
            <>
              {row.roles.slice(0, 3).map((role: string) => (
                <Badge key={role} variant="neutral">{role}</Badge>
              ))}
              {row.roles.length > 3 && (
                <Badge variant="neutral">+{row.roles.length - 3}</Badge>
              )}
            </>
          ) : (
            <span className="pa-body-s pa-text-muted">No roles</span>
          )}
        </div>
      ),
    },
    {
      id: 'organizations',
      label: 'Organizations',
      render: (row) => {
        const orgs = row.organizations || []
        if (orgs.length === 0) return <span className="pa-body-s pa-text-muted">None</span>
        return (
          <Badge variant="neutral" title={orgs.map((o: { org_name: string }) => o.org_name).join(', ')}>
            {orgs.length === 1 ? orgs[0].org_name : `${orgs.length} orgs`}
          </Badge>
        )
      },
    },
    {
      id: 'is_platform_admin',
      label: 'Platform Admin',
      render: (row) => row.is_platform_admin ? (
        <Badge variant="info">Yes</Badge>
      ) : null,
    },
    {
      id: 'email_confirmed',
      label: 'Verified',
      render: (row) => (
        <Badge variant={row.email_confirmed ? 'success' : 'warning'}>
          {row.email_confirmed ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      id: 'created_at',
      label: 'Created',
      sortable: true,
      render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '—',
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (row) => (
        <div className="pa-table-actions" style={{ opacity: 1 }}>
          {canPerformAction(adminRole, 'disable_user') && (
            <button
              className="pa-btn pa-btn--ghost pa-btn--dense"
              onClick={(e) => { e.stopPropagation(); handleDisable(row) }}
              title="Disable User"
              style={{ color: 'var(--pa-danger)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>block</span>
              Disable
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${totalCount} users total`}
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(0) }}
        searchPlaceholder="Search by email..."
        onClearAll={() => {
          setSearch('')
          setPage(0)
        }}
      />

      <PlatformDataTable
        columns={columns as ColumnConfig<{ id: string }>[]}
        rows={users as { id: string }[]}
        loading={loading}
        emptyMessage="No users found."
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={(size) => { setRowsPerPage(size); setPage(0) }}
        onRowClick={handleRowClick as (row: { id: string }) => void}
        orderBy={orderBy}
        order={order}
        onSort={handleSort}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.type === 'enable' ? 'Enable User' : 'Disable User'}
        description={
          confirmDialog.type === 'enable'
            ? `Are you sure you want to enable "${confirmDialog.user?.email}"? This will allow them to sign in again.`
            : `Are you sure you want to disable "${confirmDialog.user?.email}"? This will prevent them from signing in.`
        }
        confirmLabel={confirmDialog.type === 'enable' ? 'Enable' : 'Disable'}
        variant={confirmDialog.type === 'disable' ? 'danger' : 'info'}
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog({ open: false, type: 'disable', user: null })}
      />

      {/* Toast */}
    </div>
  )
}
