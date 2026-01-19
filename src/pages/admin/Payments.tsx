import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getFeeAssignmentsForUser, getOrgPaymentSummary, formatCurrency } from '../../data/services/paymentsService'
import { 
  AdminPageHeader, 
  Badge, 
  StatCard, 
  PlatformDataTable, 
  type ColumnConfig 
} from '../../components/platformAdmin'

interface PaymentDisplay {
  id: string
  child_name: string
  fee_title: string
  total_display: string
  paid_display: string
  status: 'unpaid' | 'partial' | 'paid' | 'waived' | 'overdue'
  created_at: string
}

export default function Payments() {
  const [payments, setPayments] = useState<PaymentDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    outstanding: 0,
    collected: 0,
  })



  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const fetchPayments = useCallback(async () => {
    if (!isReady) return

    setLoading(true)

    try {
      // Fetch fee assignments
      const { data, error } = await getFeeAssignmentsForUser(context)

      if (error) {
        console.error('Error fetching payments:', error)
        setLoading(false)
        return
      }

      // Transform to display format
      const displayPayments: PaymentDisplay[] = data.map(assignment => ({
        id: assignment.id,
        child_name: assignment.child_id ? getChildName(assignment.child_id) : 'Unknown',
        fee_title: assignment.fee?.title ?? 'Fee',
        total_display: formatCurrency(assignment.amount_due_cents),
        paid_display: formatCurrency(assignment.amount_paid_cents),
        status: assignment.status as PaymentDisplay['status'],
        created_at: assignment.created_at,
      }))

      // Apply filter
      let filtered = displayPayments
      if (filter === 'unpaid') {
        filtered = displayPayments.filter(p => p.status === 'unpaid' || p.status === 'overdue')
      } else if (filter === 'partial') {
        filtered = displayPayments.filter(p => p.status === 'partial')
      } else if (filter === 'paid') {
        filtered = displayPayments.filter(p => p.status === 'paid')
      }

      setTotalCount(filtered.length)
      
      // Client-side pagination
      const from = page * rowsPerPage
      const to = from + rowsPerPage
      setPayments(filtered.slice(from, to))

      // Fetch stats
      const { data: summaryData } = await getOrgPaymentSummary(context)
      if (summaryData) {
        setStats({
          outstanding: summaryData.totalOutstandingCents / 100,
          collected: summaryData.totalPaidCents / 100,
        })
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [context, isReady, filter, page, rowsPerPage])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Helper to get child name (in real implementation, comes from joined data)
  const getChildName = (childId: string): string => {
    const names: Record<string, string> = {
      'child-emma-001': 'Emma Johnson',
      'child-liam-002': 'Liam Williams',
      'child-sophia-003': 'Sophia Brown',
      'child-jackson-004': 'Jackson Davis',
    }
    return names[childId] ?? 'Child'
  }

  const columns: ColumnConfig<PaymentDisplay>[] = [
    { id: 'child_name', label: 'Athlete' },
    { id: 'fee_title', label: 'Fee' },
    { id: 'total_display', label: 'Total', align: 'right' },
    { id: 'paid_display', label: 'Paid', align: 'right' },
    { 
      id: 'status', 
      label: 'Status',
      render: (row) => {
        const variant = 
          row.status === 'paid' ? 'success' : 
          row.status === 'partial' ? 'warning' : 'danger'
        return <Badge variant={variant}>{row.status.toUpperCase()}</Badge>
      }
    },
    { 
      id: 'created_at', 
      label: 'Assigned',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
  ]

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Payments" 
        actions={
          <button className="pa-btn pa-btn--primary" onClick={() => navigate('/admin/payments/create')}>
            <span className="material-symbols-outlined">add</span>
            Assign Fee
          </button>
        }
      />

      <div className="pa-grid pa-grid-2 pa-mb-5">
        <StatCard 
          label="COLLECTED" 
          value={`$${stats.collected.toLocaleString()}`}
          icon="check_circle"
        />
        <StatCard 
          label="OUTSTANDING" 
          value={`$${stats.outstanding.toLocaleString()}`}
          icon="error"
        />
      </div>

      <div className="pa-flex pa-gap-2 pa-mb-4">
        {(['all', 'unpaid', 'partial', 'paid'] as const).map((f) => (
          <button
            key={f}
            className={`pa-btn pa-btn--compact ${filter === f ? 'pa-btn--primary' : 'pa-btn--secondary'}`}
            onClick={() => {
              setFilter(f)
              setPage(0)
            }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <PlatformDataTable
        columns={columns}
        rows={payments}
        loading={loading}
        totalCount={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRowClick={(row) => navigate(`/admin/payments/${row.id}`)}
      />
    </div>
  )
}
