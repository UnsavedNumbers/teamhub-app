import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, FilterBar, PlatformDataTable, type ColumnConfig } from '../../components/platformAdmin'
import { formatCurrency } from '../../utils/platformAdminMasking'
import { mapAdminFeeStatus } from '../../utils/typeAdapters'
import type { AdminFeeStatus } from '../../types/platformAdmin.types'

export default function Fees() {
  const [fees, setFees] = useState<AdminFeeStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [orderBy, setOrderBy] = useState('due_date')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const fetchFees = useCallback(async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('admin_fees_status')
        .select('*', { count: 'exact' })

      if (search) {
        query = query.or(`fee_name.ilike.%${search}%,organization_name.ilike.%${search}%`)
      }

      query = query.order(orderBy, { ascending: order === 'asc', nullsFirst: false })

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching fees:', error)
        setFees([])
        setTotalCount(0)
      } else {
        // Map rows to include id field
        const mapped = (data || []).map(row => mapAdminFeeStatus(row as any))
        setFees(mapped)
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Error:', err)
      setFees([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search, orderBy, order])

  useEffect(() => {
    fetchFees()
  }, [fetchFees])

  const handleSort = (column: string) => {
    const isAsc = orderBy === column && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(column)
  }

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (status) {
      case 'published': return 'success'
      case 'draft': return 'neutral'
      case 'closed': return 'info'
      case 'archived': return 'warning'
      default: return 'neutral'
    }
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const columns: ColumnConfig<AdminFeeStatus & { id: string }>[] = [
    {
      id: 'fee_name',
      label: 'Fee Name',
      sortable: true,
      minWidth: 180,
      render: (row) => (
        <div>
          <div className="pa-body-m" style={{ fontWeight: 500 }}>{row.fee_name}</div>
          {isOverdue(row.due_date) && row.unpaid_count > 0 && (
            <Badge variant="danger">Overdue</Badge>
          )}
        </div>
      ),
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
      id: 'organization_name',
      label: 'Organization',
      sortable: true,
      minWidth: 150,
    },
    {
      id: 'due_date',
      label: 'Due Date',
      sortable: true,
      render: (row) => row.due_date ? (
        <span style={{ color: isOverdue(row.due_date) ? 'var(--pa-danger)' : 'inherit' }}>
          {new Date(row.due_date).toLocaleDateString()}
        </span>
      ) : '—',
    },
    {
      id: 'fee_status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={getStatusVariant(row.fee_status)}>{row.fee_status}</Badge>
      ),
    },
    {
      id: 'assigned_count',
      label: 'Assigned',
      sortable: true,
      align: 'right',
    },
    {
      id: 'paid_count',
      label: 'Paid',
      sortable: true,
      align: 'right',
      render: (row) => (
        <Badge variant="success">{row.paid_count}</Badge>
      ),
    },
    {
      id: 'unpaid_count',
      label: 'Unpaid',
      sortable: true,
      align: 'right',
      render: (row) => (
        <Badge variant={row.unpaid_count > 0 ? 'danger' : 'neutral'}>
          {row.unpaid_count}
        </Badge>
      ),
    },
    {
      id: 'payment_rate_percent',
      label: 'Payment Rate',
      sortable: true,
      minWidth: 150,
      render: (row) => {
        const rate = row.payment_rate_percent
        const color = rate >= 80 ? 'var(--pa-success)' : rate >= 50 ? 'var(--pa-warning)' : 'var(--pa-danger)'
        return (
          <div className="pa-flex pa-items-center pa-gap-2">
            <div
              style={{
                flex: 1,
                height: '8px',
                background: 'var(--pa-n100)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${rate}%`,
                  height: '100%',
                  background: color,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span className="pa-body-s" style={{ minWidth: '40px', textAlign: 'right' }}>
              {rate}%
            </span>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Fees Status"
        subtitle="Overview of fee assignments and payment status across all organizations."
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(0) }}
        searchPlaceholder="Search by fee name or organization..."
        onClearAll={() => {
          setSearch('')
          setPage(0)
        }}
      />

      <PlatformDataTable
        columns={columns as ColumnConfig<{ id: string }>[]}
        rows={fees as ({ id: string })[]}
        loading={loading}
        emptyMessage="No fees found."
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={(size) => { setRowsPerPage(size); setPage(0) }}
        orderBy={orderBy}
        order={order}
        onSort={handleSort}
      />
    </div>
  )
}
