/**
 * FeesTab Component
 * 
 * Displays fee status summary for the organization.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { PlatformDataTable, type ColumnConfig, Badge } from '../../../../components/platformAdmin'
import { DataState } from '../../../../components/platformAdmin/DataState'
import { handleRpcError } from '../../../../utils/rpcErrorHandler'
import { formatCurrency } from '../../../../utils/platformAdminMasking'
import { safeString, safeDate, safeNumber } from '../../../../utils/safeAccessors'
import type { AdminFeeStatus } from '../../../../types/platformAdmin.types'

interface FeesTabProps {
  organizationId: string
}

export function FeesTab({ organizationId }: FeesTabProps) {
  const isMountedRef = useRef(true)
  const [fees, setFees] = useState<AdminFeeStatus[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchFees = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('admin_fees_status')
        .select('*')
        .eq('org_id', organizationId)
        .order('due_date', { ascending: true, nullsFirst: false })

      if (!isMountedRef.current) return

      if (fetchError) {
        const normalized = handleRpcError(fetchError, 'fetch_fees')
        setError(normalized.message)
        setFees([])
        return
      }

      // Filter out rows with null required fields
      const validData = (data || []).filter((row): row is typeof row & { fee_id: string } => 
        row.fee_id !== null
      )
      setFees(validData as AdminFeeStatus[])
    } catch (err) {
      if (!isMountedRef.current) return
      const normalized = handleRpcError(err, 'fetch_fees')
      setError(normalized.message)
      setFees([])
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [organizationId])

  useEffect(() => {
    fetchFees()
  }, [fetchFees])

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success'
      case 'overdue':
        return 'danger'
      case 'pending':
        return 'warning'
      default:
        return 'neutral'
    }
  }

  const columns: ColumnConfig<AdminFeeStatus>[] = [
    {
      id: 'fee_name',
      label: 'Fee Name',
      render: (row) => safeString(row.fee_name),
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
      id: 'due_date',
      label: 'Due Date',
      render: (row) => safeDate(row.due_date),
    },
    {
      id: 'fee_status',
      label: 'Status',
      render: (row) => (
        <Badge variant={getStatusVariant(row.fee_status)}>{row.fee_status}</Badge>
      ),
    },
    {
      id: 'assigned_count',
      label: 'Assigned',
      align: 'right',
      render: (row) => safeNumber(row.assigned_count, 0),
    },
    {
      id: 'paid_count',
      label: 'Paid',
      align: 'right',
      render: (row) => (
        <span style={{ color: 'var(--pa-success)' }}>
          {safeNumber(row.paid_count, 0)}
        </span>
      ),
    },
    {
      id: 'unpaid_count',
      label: 'Unpaid',
      align: 'right',
      render: (row) => (
        <span style={{ color: 'var(--pa-danger)' }}>
          {safeNumber(row.unpaid_count, 0)}
        </span>
      ),
    },
    {
      id: 'payment_rate_percent',
      label: 'Payment Rate',
      align: 'right',
      render: (row) => (
        <Badge
          variant={row.payment_rate_percent >= 90 ? 'success' : row.payment_rate_percent >= 50 ? 'warning' : 'danger'}
        >
          {safeNumber(row.payment_rate_percent, 0).toFixed(1)}%
        </Badge>
      ),
    },
  ]

  return (
    <div>
      <DataState
        data={fees}
        loading={loading}
        error={error}
        onRetry={fetchFees}
        emptyMessage="No fees found for this organization"
        emptyIcon="receipt"
      >
        {(data) => (
          <PlatformDataTable
            columns={columns}
            rows={data.map((row) => ({ ...row, id: row.fee_id }))}
            loading={false}
            emptyMessage="No fees found"
            page={0}
            rowsPerPage={50}
            totalCount={data.length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
          />
        )}
      </DataState>
    </div>
  )
}
