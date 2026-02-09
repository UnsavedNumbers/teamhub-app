import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader, PlatformDataTable, FilterBar, Button, Badge, type ColumnConfig } from '../../components/platformAdmin'
import { JsonViewer } from '../../components/platformAdmin'
import type { EntitlementAuditLog } from '../../types/licenseTiers.types'

export default function LicensesAudit() {
  const db = supabase as any
  const [logs, setLogs] = useState<EntitlementAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('')
  const [targetIdFilter, setTargetIdFilter] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<'30days' | 'all'>('30days')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedLog, setSelectedLog] = useState<EntitlementAuditLog | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)

    try {
      let query = db
        .from('entitlement_audit_log')
        .select('*', { count: 'exact' })

      if (search) {
        query = query.or(`action.ilike.%${search}%,actor_email.ilike.%${search}%,target_type.ilike.%${search}%`)
      }

      if (actionFilter) {
        query = query.eq('action', actionFilter)
      }

      if (targetTypeFilter) {
        query = query.eq('target_type', targetTypeFilter)
      }

      if (targetIdFilter) {
        query = query.eq('target_id', targetIdFilter)
      }

      // Default to last 30 days unless "all" is selected
      if (dateFilter === '30days') {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        query = query.gte('created_at', thirtyDaysAgo.toISOString())
      }

      query = query.order('created_at', { ascending: false })

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching audit log:', error)
        setLogs([])
        setTotalCount(0)
      } else {
        setLogs(data as EntitlementAuditLog[])
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Error:', err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search, actionFilter, targetTypeFilter, targetIdFilter, dateFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const getActionBadgeVariant = (action: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    if (action.includes('delete') || action.includes('revoke') || action.includes('remove')) {
      return 'danger'
    }
    if (action.includes('create') || action.includes('assign') || action.includes('enable')) {
      return 'success'
    }
    if (action.includes('update') || action.includes('modify')) {
      return 'warning'
    }
    return 'info'
  }

  const columns: ColumnConfig<EntitlementAuditLog>[] = [
    {
      id: 'created_at',
      label: 'Timestamp',
      sortable: true,
      render: (row) => (
        <div>
          <div className="pa-body-m">{new Date(row.created_at).toLocaleDateString()}</div>
          <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>
            {new Date(row.created_at).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      id: 'actor_email',
      label: 'Actor',
      render: (row) => (
        <div className="pa-body-m">{row.actor_email || 'System'}</div>
      ),
    },
    {
      id: 'action',
      label: 'Action',
      render: (row) => (
        <Badge variant={getActionBadgeVariant(row.action)}>
          {row.action.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'target_type',
      label: 'Target',
      render: (row) => (
        <div>
          <div className="pa-body-m">{row.target_type || '—'}</div>
          {row.target_id && (
            <div className="pa-body-s" style={{ color: 'var(--pa-n500)', fontFamily: 'var(--pa-font-mono)', fontSize: '11px' }}>
              {row.target_id.substring(0, 8)}...
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'reason',
      label: 'Reason',
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n500)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.reason || '—'}
        </div>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Button
          variant="ghost"
            size="dense"
          onClick={() => setSelectedLog(row)}
        >
          View Details
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Audit & History"
        subtitle="View all licensing and entitlement changes"
      />

      <div style={{ display: 'flex', gap: '16px', marginBottom: 'var(--pa-space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search audit log..."
          onClearAll={() => {
            setSearch('')
            setActionFilter('')
            setTargetTypeFilter('')
            setTargetIdFilter('')
            setDateFilter('30days')
          }}
        />
        <select
          className="pa-select"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as '30days' | 'all')}
          style={{ minWidth: '150px' }}
        >
          <option value="30days">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
        <select
          className="pa-select"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ minWidth: '150px' }}
        >
          <option value="">All Actions</option>
          <option value="tier_created">Tier Created</option>
          <option value="tier_updated">Tier Updated</option>
          <option value="feature_created">Feature Created</option>
          <option value="feature_updated">Feature Updated</option>
          <option value="create_entitlement_override">Override Created</option>
          <option value="revoke_entitlement_override">Override Revoked</option>
        </select>
      </div>

      <PlatformDataTable
        columns={columns}
        rows={logs}
        loading={loading}
        emptyMessage="No audit log entries found"
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />

      {/* Detail Modal */}
      {selectedLog && (
        <div
          onClick={() => setSelectedLog(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 15, 20, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--pa-space-4)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="pa-card"
            style={{
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--pa-space-4)' }}>
              <h2 className="pa-h2">Audit Log Details</h2>
              <Button variant="ghost" onClick={() => setSelectedLog(null)}>
                <span className="material-symbols-outlined">close</span>
              </Button>
            </div>

            <div className="pa-grid pa-grid-2" style={{ gap: 'var(--pa-space-4)', marginBottom: 'var(--pa-space-4)' }}>
              <div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>Timestamp</div>
                <div className="pa-body-m">{new Date(selectedLog.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>Actor</div>
                <div className="pa-body-m">{selectedLog.actor_email || 'System'}</div>
              </div>
              <div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>Action</div>
                <div className="pa-body-m">{selectedLog.action}</div>
              </div>
              <div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>Target Type</div>
                <div className="pa-body-m">{selectedLog.target_type || '—'}</div>
              </div>
              {selectedLog.reason && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>Reason</div>
                  <div className="pa-body-m">{selectedLog.reason}</div>
                </div>
              )}
            </div>

            <div className="pa-grid pa-grid-2" style={{ gap: 'var(--pa-space-4)' }}>
              <div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)' }}>Before State</div>
                {selectedLog.before_state ? (
                  <JsonViewer data={selectedLog.before_state} />
                ) : (
                  <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>—</div>
                )}
              </div>
              <div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)' }}>After State</div>
                {selectedLog.after_state ? (
                  <JsonViewer data={selectedLog.after_state} />
                ) : (
                  <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>—</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
