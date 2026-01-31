import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, FilterBar, PlatformDataTable, JsonViewer, type ColumnConfig, OfflineBanner } from '../../components/platformAdmin'
import type { AdminAuditLog } from '../../types/platformAdmin.types'
import { mapEventLogsToAuditLogs, type AdminEventLog } from '../../utils/auditLogMapper'

// Action types for filtering
const actionOptions = [
  { value: 'activate_organization', label: 'Activate Organization' },
  { value: 'suspend_organization', label: 'Suspend Organization' },
  { value: 'disable_user', label: 'Disable User' },
  { value: 'enable_user', label: 'Enable User' },
  { value: 'set_feature_flag', label: 'Set Feature Flag' },
  { value: 'add_platform_admin', label: 'Add Platform Admin' },
  { value: 'remove_platform_admin', label: 'Remove Platform Admin' },
]

export default function AuditLog() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    // Default to 90 days ago
    const date = new Date()
    date.setDate(date.getDate() - 90)
    return date.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('admin_event_logs')
        .select('*', { count: 'exact' })

      if (search) {
        query = query.ilike('actor_email', `%${search}%`)
      }

      if (actionFilter) {
        // Map action filter to event_type column
        query = query.eq('event_type', actionFilter)
      }

      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00`)
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`)
      }

      query = query.order('created_at', { ascending: false })

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching audit logs:', error)
        setLogs([])
        setTotalCount(0)
      } else {
        // Map event logs to audit log format for UI compatibility
        const mappedLogs = mapEventLogsToAuditLogs((data || []) as AdminEventLog[])
        setLogs(mappedLogs)
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Error:', err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search, actionFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const getActionVariant = (action: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    if (action.includes('suspend') || action.includes('disable') || action.includes('remove')) {
      return 'danger'
    }
    if (action.includes('activate') || action.includes('enable') || action.includes('add')) {
      return 'success'
    }
    if (action.includes('update') || action.includes('set')) {
      return 'warning'
    }
    return 'neutral'
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const columns: ColumnConfig<AdminAuditLog>[] = [
    {
      id: 'created_at',
      label: 'Time',
      minWidth: 150,
      render: (row) => (
        <div>
          <div className="pa-body-m">{formatTimeAgo(row.created_at)}</div>
          <div className="pa-caption pa-text-muted">
            {new Date(row.created_at).toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      id: 'actor_email',
      label: 'Actor',
      minWidth: 180,
      render: (row) => row.actor_email || 'System',
    },
    {
      id: 'action',
      label: 'Action',
      minWidth: 180,
      render: (row) => (
        <Badge variant={getActionVariant(row.action)}>
          {row.action.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'entity_type',
      label: 'Entity Type',
      minWidth: 120,
      render: (row) => (
        <Badge variant="neutral">{row.entity_type}</Badge>
      ),
    },
    {
      id: 'entity_id',
      label: 'Entity ID',
      minWidth: 100,
      render: (row) => (
        <code style={{ fontSize: '12px', color: 'var(--pa-n500)' }}>
          {row.entity_id.slice(0, 8)}...
        </code>
      ),
    },
    {
      id: 'metadata',
      label: 'Details',
      minWidth: 200,
      render: (row) => (
        <JsonViewer 
          data={row.metadata} 
          title="View Details"
          defaultExpanded={false}
        />
      ),
    },
  ]

  return (
    <div>
      <OfflineBanner />
      <PageHeader
        title="Audit Log"
        subtitle="View all platform admin actions. Default view: last 90 days."
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(0) }}
        searchPlaceholder="Search by actor email..."
        statusOptions={actionOptions}
        statusValue={actionFilter}
        onStatusChange={(value) => { setActionFilter(value); setPage(0) }}
        statusLabel="Action"
        showDateRange
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(value) => { setDateFrom(value); setPage(0) }}
        onDateToChange={(value) => { setDateTo(value); setPage(0) }}
        onClearAll={() => {
          setSearch('')
          setActionFilter('')
          const date = new Date()
          date.setDate(date.getDate() - 90)
          setDateFrom(date.toISOString().split('T')[0])
          setDateTo('')
          setPage(0)
        }}
      />

      <PlatformDataTable
        columns={columns}
        rows={logs}
        loading={loading}
        emptyMessage="No audit logs found for the selected filters."
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={(size) => { setRowsPerPage(size); setPage(0) }}
      />
    </div>
  )
}
