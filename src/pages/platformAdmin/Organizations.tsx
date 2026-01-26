import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, FilterBar, PlatformDataTable, ConfirmDialog, type ColumnConfig, OfflineBanner, ErrorState } from '../../components/platformAdmin'
import { canPerformAction, getDeniedMessage } from '../../utils/platformAdminPermissions'
import { isRpcSuccessResponse } from '../../utils/typeAdapters'
import type { AdminOrganization, AdminRpcResponse, PlatformAdminRole, OrganizationStatus } from '../../types/platformAdmin.types'
import { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { showSuccess, showError } from '../../utils/toast'
import { cn } from '../../utils/cn'

// Status filter options
const statusOptions = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired', label: 'Expired' },
]

export default function Organizations() {
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [orderBy, setOrderBy] = useState('created_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  
  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'activate' | 'suspend'
    org: AdminOrganization | null
  }>({ open: false, type: 'activate', org: null })
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  
  // TODO: Fetch actual role
  const [adminRole] = useState<PlatformAdminRole>('super_admin')
  
  const navigate = useNavigate()

  const fetchOrganizations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('admin_organizations')
        .select('*', { count: 'exact' })

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter as Database["public"]["Enums"]["org_status"])
      }

      query = query.order(orderBy, { ascending: order === 'asc' })

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching organizations:', error)
        setError(error.message || 'Failed to load organizations')
        setOrganizations([])
        setTotalCount(0)
      } else {
        setOrganizations(data as AdminOrganization[])
        setTotalCount(count || 0)
        setError(null)
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search, statusFilter, orderBy, order])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  const handleSort = (column: string) => {
    const isAsc = orderBy === column && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(column)
  }

  const handleRowClick = (org: AdminOrganization) => {
    navigate(`/platform-admin/organizations/${org.id}`)
  }

  const handleActivate = (org: AdminOrganization) => {
    if (!canPerformAction(adminRole, 'activate_organization')) {
      showError(getDeniedMessage('activate_organization'))
      return
    }
    setDialogError(null)
    setConfirmDialog({ open: true, type: 'activate', org })
  }

  const handleSuspend = (org: AdminOrganization) => {
    if (!canPerformAction(adminRole, 'suspend_organization')) {
      showError(getDeniedMessage('suspend_organization'))
      return
    }
    setDialogError(null)
    setConfirmDialog({ open: true, type: 'suspend', org })
  }

  const handleConfirmAction = async (reason: string) => {
    if (!confirmDialog.org) return

    setDialogLoading(true)
    setDialogError(null)

    try {
      const rpcName = confirmDialog.type === 'activate' 
        ? 'admin_activate_organization' 
        : 'admin_suspend_organization'

      const { data, error } = await supabase.rpc(rpcName, {
        target_org_id: confirmDialog.org.id,
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

      setConfirmDialog({ open: false, type: 'activate', org: null })
      showSuccess(`Organization ${confirmDialog.type === 'activate' ? 'activated' : 'suspended'} successfully`)
      fetchOrganizations()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDialogLoading(false)
    }
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

  const columns: ColumnConfig<AdminOrganization>[] = [
    {
      id: 'name',
      label: 'Name',
      sortable: true,
      minWidth: 200,
    },
    {
      id: 'org_type',
      label: 'Type',
      sortable: true,
      render: (row) => (
        <Badge variant="neutral">{row.org_type || 'Unknown'}</Badge>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      id: 'team_count',
      label: 'Teams',
      sortable: true,
      align: 'right',
    },
    {
      id: 'user_count',
      label: 'Users',
      sortable: true,
      align: 'right',
    },
    {
      id: 'stripe_connected',
      label: 'Stripe',
      render: (row) => (
        <Badge variant={row.stripe_connected ? 'success' : 'neutral'}>
          {row.stripe_connected ? 'Connected' : 'Not Connected'}
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
        <div className={cn('pa-table-actions', 'pa-opacity-100')}>
          {row.status !== 'active' && canPerformAction(adminRole, 'activate_organization') && (
            <button
              className="pa-btn pa-btn--ghost pa-btn--dense pa-text-success"
              onClick={(e) => { e.stopPropagation(); handleActivate(row) }}
              title="Activate"
            >
              <span className="material-symbols-outlined pa-icon-md">play_arrow</span>
              Activate
            </button>
          )}
          {row.status !== 'suspended' && canPerformAction(adminRole, 'suspend_organization') && (
            <button
              className="pa-btn pa-btn--ghost pa-btn--dense pa-text-danger"
              onClick={(e) => { e.stopPropagation(); handleSuspend(row) }}
              title="Suspend"
            >
              <span className="material-symbols-outlined pa-icon-md">block</span>
              Suspend
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <OfflineBanner />
      <PageHeader
        title="Organizations"
        subtitle={`${totalCount} organizations total`}
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(0) }}
        searchPlaceholder="Search by organization name..."
        statusOptions={statusOptions}
        statusValue={statusFilter}
        onStatusChange={(value) => { setStatusFilter(value); setPage(0) }}
        statusLabel="Status"
        onClearAll={() => {
          setSearch('')
          setStatusFilter('')
          setPage(0)
        }}
      />

      {error && !loading && (
        <ErrorState
          message={error}
          onRetry={fetchOrganizations}
          retryLabel="Retry"
        />
      )}

      {!error && (
        <PlatformDataTable
          columns={columns}
          rows={organizations}
          loading={loading}
          emptyMessage="No organizations found. Try adjusting your filters."
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={setPage}
          onRowsPerPageChange={(size) => { setRowsPerPage(size); setPage(0) }}
          onRowClick={handleRowClick}
          orderBy={orderBy}
          order={order}
          onSort={handleSort}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.type === 'activate' ? 'Activate Organization' : 'Suspend Organization'}
        description={
          confirmDialog.type === 'activate'
            ? `Are you sure you want to activate "${confirmDialog.org?.name}"? This will allow the organization to access all features.`
            : `Are you sure you want to suspend "${confirmDialog.org?.name}"? This will prevent all users from accessing the organization.`
        }
        confirmLabel={confirmDialog.type === 'activate' ? 'Activate' : 'Suspend'}
        variant={confirmDialog.type === 'suspend' ? 'danger' : 'info'}
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog({ open: false, type: 'activate', org: null })}
      />

    </div>
  )
}
