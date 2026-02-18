import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, StatCard, Badge, FilterBar, PlatformDataTable, type ColumnConfig, OfflineBanner, ErrorState } from '../../components/platformAdmin'
import { useQueryParams } from '../../hooks/useQueryParams'
import { 
  formatCurrency, 
  getDisplayEmail, 
  truncateStripeId, 
  canCopyFullStripeId,
  copyStripeIdToClipboard,
} from '../../utils/platformAdminMasking'
import type { AdminPayment, PlatformAdminRole } from '../../types/platformAdmin.types'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { showSuccess, showInfo } from '../../utils/toast'

// Status filter options
const statusOptions = [
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
]

export default function PlatformPayments() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [orderBy, setOrderBy] = useState('created_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  
  // Stats
  const [stats, setStats] = useState({
    totalVolume: 0,
    successCount: 0,
    failedCount: 0,
  })
  
  // Deep link support: org_id query param
  const { getUUID } = useQueryParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const orgFilter = getUUID('org_id')

  const clearOrgFilter = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('org_id')
    setSearchParams(newParams)
    setPage(0)
  }

  // TODO: Fetch actual role
  const [adminRole] = useState<PlatformAdminRole>('super_admin')

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('admin_payments')
        .select('*', { count: 'exact' })

      if (search) {
        query = query.or(`parent_email.ilike.%${search}%,child_name.ilike.%${search}%`)
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter as Database["public"]["Enums"]["payment_status_new"])
      }

      query = query.order(orderBy, { ascending: order === 'asc' })

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching payments:', error)
        setError(error.message || 'Failed to load payments')
        setPayments([])
        setTotalCount(0)
      } else {
        setPayments((data || []) as unknown as AdminPayment[])
        setTotalCount(count || 0)
        setError(null)
      }

      // Fetch stats
      const { data: allPayments } = await supabase
        .from('admin_payments')
        .select('amount_cents, status')

      if (allPayments) {
        const succeeded = allPayments.filter((p: any) => p.status === 'succeeded')
        const failed = allPayments.filter((p: any) => p.status === 'failed')
        setStats({
          totalVolume: succeeded.reduce((sum, p: any) => sum + (p.amount_cents || 0), 0),
          successCount: succeeded.length,
          failedCount: failed.length,
        })
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search, statusFilter, orderBy, order, orgFilter])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleSort = (column: string) => {
    const isAsc = orderBy === column && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(column)
  }

  const handleCopyStripeId = async (stripeId: string | null) => {
    if (!stripeId) return
    
    const { wasTruncated } = await copyStripeIdToClipboard(stripeId, adminRole)
    if (wasTruncated) {
      showInfo('Copied truncated ID (full ID requires finance role)')
    } else {
      showSuccess('Copied to clipboard')
    }
  }

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (status) {
      case 'succeeded': return 'success'
      case 'failed': return 'danger'
      case 'pending': return 'warning'
      case 'refunded': return 'info'
      default: return 'neutral'
    }
  }

  const columns: ColumnConfig<AdminPayment>[] = [
    {
      id: 'created_at',
      label: 'Date',
      sortable: true,
      minWidth: 120,
      render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '—',
    },
    {
      id: 'amount_cents',
      label: 'Amount',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(row.amount_cents, row.currency || 'USD')}
        </span>
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
      id: 'organization_name',
      label: 'Organization',
      minWidth: 150,
    },
    {
      id: 'fee_title',
      label: 'Fee',
      minWidth: 120,
      render: (row) => row.fee_title || '—',
    },
    {
      id: 'child_name',
      label: 'Child',
      minWidth: 120,
      render: (row) => row.child_name || '—',
    },
    {
      id: 'parent_email',
      label: 'Parent',
      minWidth: 150,
      render: (row) => getDisplayEmail(row.parent_email, adminRole, true),
    },
    {
      id: 'stripe_payment_intent_id',
      label: 'Stripe ID',
      minWidth: 120,
      render: (row) => row.stripe_payment_intent_id ? (
        <div className="pa-flex pa-items-center pa-gap-1">
          <code style={{ fontSize: '12px', color: 'var(--pa-n500)' }}>
            {truncateStripeId(row.stripe_payment_intent_id)}
          </code>
          <button
            className="pa-table-action-btn"
            onClick={(e) => { e.stopPropagation(); handleCopyStripeId(row.stripe_payment_intent_id) }}
            title={canCopyFullStripeId(adminRole) ? 'Copy full ID' : 'Copy truncated ID'}
            style={{ width: '24px', height: '24px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
          </button>
        </div>
      ) : '—',
    },
  ]

  return (
    <div>
      <OfflineBanner />
      <PageHeader
        title="Payments"
        subtitle="Platform-wide payment activity"
      />

      {/* Stats */}
      <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-3 pa-gap-4 pa-mb-4">
        <StatCard
          label="Total Volume"
          value={formatCurrency(stats.totalVolume)}
          icon="payments"
        />
        <StatCard
          label="Successful"
          value={stats.successCount}
          icon="check_circle"
        />
        <StatCard
          label="Failed"
          value={stats.failedCount}
          icon="error"
        />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(0) }}
        searchPlaceholder="Search by parent email or child name..."
        statusOptions={statusOptions}
        statusValue={statusFilter}
        onStatusChange={(value) => { setStatusFilter(value); setPage(0) }}
        statusLabel="Status"
        onClearAll={() => {
          setSearch('')
          setStatusFilter('')
          setPage(0)
          clearOrgFilter()
        }}
      />

      {error && !loading && (
        <ErrorState
          message={error}
          onRetry={fetchPayments}
          retryLabel="Retry"
        />
      )}

      {!error && (
        <PlatformDataTable
          columns={columns}
          rows={payments}
          loading={loading}
          emptyMessage="No payments found for the selected criteria."
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={setPage}
          onRowsPerPageChange={(size) => { setRowsPerPage(size); setPage(0) }}
          orderBy={orderBy}
          order={order}
          onSort={handleSort}
        />
      )}

      {/* Toast */}
    </div>
  )
}
