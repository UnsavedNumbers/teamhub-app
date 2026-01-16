import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { adaptFeeAssignmentToTableRow, FeeAssignmentTableRow } from '../../utils/dataAdapters'
import type { Database } from '../../lib/database.types.ts'
import { 
  PageHeader, 
  Card, 
  Badge, 
  StatCard, 
  PlatformDataTable, 
  type ColumnConfig 
} from '../../components/platformAdmin'

type FeeAssignmentRow = Database['public']['Tables']['fee_assignments']['Row']
type FeeAssignmentJoinedRow = FeeAssignmentRow & {
  child: { first_name: string; last_name: string } | null
  parent: { display_name: string | null } | null
  fee: { title: string | null } | null
}

export default function Payments() {
  const [payments, setPayments] = useState<FeeAssignmentTableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    outstanding: 0,
    collected: 0,
  })

  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const fetchPayments = useCallback(async () => {
    if (!currentOrganization?.id) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      // Build query
      let query = supabase
        .from('fee_assignments')
        .select('*, child:children(first_name, last_name), parent:users(display_name), fee:fees(title)', { count: 'exact' })
        .eq('organization_id', currentOrganization.id)

      // Apply filter
      if (filter === 'unpaid') {
        query = query.eq('status', 'unpaid')
      } else if (filter === 'partial') {
        query = query.eq('status', 'partial')
      } else if (filter === 'paid') {
        query = query.eq('status', 'paid')
      }

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Error fetching payments:', error)
        setLoading(false)
        return
      }

      setTotalCount(count || 0)
      const rows = (data || []) as FeeAssignmentJoinedRow[]
      setPayments(rows.map(assignment => adaptFeeAssignmentToTableRow(assignment, assignment.child, assignment.parent, assignment.fee)))

      // Fetch stats
      const { data: statsData } = await supabase
        .from('fee_assignments')
        .select('amount_total, amount_paid')
        .eq('organization_id', currentOrganization.id)

      if (statsData) {
        let outstanding = 0
        let collected = 0
        statsData.forEach(row => {
          collected += (row.amount_paid || 0)
          outstanding += (row.amount_total || 0) - (row.amount_paid || 0)
        })
        setStats({ outstanding, collected })
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [currentOrganization?.id, filter, page, rowsPerPage])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const columns: ColumnConfig<FeeAssignmentTableRow>[] = [
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
      <PageHeader 
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
