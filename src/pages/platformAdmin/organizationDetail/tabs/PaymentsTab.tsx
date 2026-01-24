/**
 * PaymentsTab Component
 * 
 * Displays payment history for the organization.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { PlatformDataTable, type ColumnConfig, Badge, FilterBar, Button } from '../../../../components/platformAdmin'
import { DataState } from '../../../../components/platformAdmin/DataState'
import { usePagination } from '../../../../hooks/usePagination'
import { handleRpcError } from '../../../../utils/rpcErrorHandler'
import { formatCurrency, getDisplayEmail } from '../../../../utils/platformAdminMasking'
import { MaskedStripeId } from '../../../../components/platformAdmin/MaskedStripeId'
import { safeString, safeDate } from '../../../../utils/safeAccessors'
import { useRolePermissions } from '../../../../hooks/useRolePermissions'
import type { AdminPayment } from '../../../../types/platformAdmin.types'
import type { PlatformAdminRole } from '../../../../types/platformAdmin.types'

interface PaymentsTabProps {
  organizationId: string
  adminRole: PlatformAdminRole | null
}

export function PaymentsTab({ organizationId, adminRole }: PaymentsTabProps) {
  const isMountedRef = useRef(true)
  const permissions = useRolePermissions()
  const [payments, setPayments] = useState<AdminPayment[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { page, rowsPerPage, totalCount, setPage, setRowsPerPage, setTotalCount } = usePagination(0, 50)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchPayments = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('admin_payments')
        .select('*', { count: 'exact' })
        .eq('org_id', organizationId)

      if (search) {
        query = query.or(`parent_email.ilike.%${search}%,child_name.ilike.%${search}%`)
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      query = query.order('created_at', { ascending: false })

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)

      const { data, error: fetchError, count } = await query

      if (!isMountedRef.current) return

      if (fetchError) {
        const normalized = handleRpcError(fetchError, 'fetch_payments')
        setError(normalized.message)
        setPayments([])
        setTotalCount(0)
        return
      }

      setPayments((data || []) as AdminPayment[])
      setTotalCount(count || 0)
    } catch (err) {
      if (!isMountedRef.current) return
      const normalized = handleRpcError(err, 'fetch_payments')
      setError(normalized.message)
      setPayments([])
      setTotalCount(0)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [organizationId, search, statusFilter, page, rowsPerPage, setTotalCount])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (status) {
      case 'succeeded':
        return 'success'
      case 'failed':
        return 'danger'
      case 'pending':
        return 'warning'
      case 'refunded':
        return 'info'
      default:
        return 'neutral'
    }
  }

  const columns: ColumnConfig<AdminPayment>[] = [
    {
      id: 'created_at',
      label: 'Date',
      render: (row) => safeDate(row.created_at),
    },
    {
      id: 'amount_cents',
      label: 'Amount',
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
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      id: 'child_name',
      label: 'Child',
      render: (row) => safeString(row.child_name),
    },
    {
      id: 'parent_email',
      label: 'Parent',
      render: (row) => getDisplayEmail(row.parent_email, adminRole, true),
    },
    {
      id: 'fee_title',
      label: 'Fee',
      render: (row) => safeString(row.fee_title),
    },
    {
      id: 'stripe_payment_intent_id',
      label: 'Stripe ID',
      render: (row) => (
        <MaskedStripeId
          stripeId={row.stripe_payment_intent_id}
          role={adminRole}
          showCopy
        />
      ),
    },
  ]

  return (
    <div>
      {/* Link to full payments page */}
      <div className="pa-flex pa-items-center pa-justify-between pa-mb-4">
        <div />
        <Button
          variant="ghost"
          size="dense"
          icon="open_in_new"
          onClick={() => window.location.href = `/platform-admin/payments?org_id=${organizationId}`}
        >
          View All Payments
        </Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(0)
        }}
        searchPlaceholder="Search by parent email or child name..."
        statusOptions={[
          { value: '', label: 'All Statuses' },
          { value: 'succeeded', label: 'Succeeded' },
          { value: 'failed', label: 'Failed' },
          { value: 'pending', label: 'Pending' },
          { value: 'refunded', label: 'Refunded' },
        ]}
        statusValue={statusFilter}
        onStatusChange={(value) => {
          setStatusFilter(value)
          setPage(0)
        }}
        statusLabel="Status"
        onClearAll={() => {
          setSearch('')
          setStatusFilter('')
          setPage(0)
        }}
      />

      <DataState
        data={payments}
        loading={loading}
        error={error}
        onRetry={fetchPayments}
        emptyMessage="No payments found for this organization"
        emptyIcon="payments"
      >
        {(data) => (
          <PlatformDataTable
            columns={columns}
            rows={data}
            loading={false}
            emptyMessage="No payments found"
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalCount}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        )}
      </DataState>
    </div>
  )
}
