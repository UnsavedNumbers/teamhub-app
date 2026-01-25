import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, FilterBar, PlatformDataTable, type ColumnConfig, Button } from '../../components/platformAdmin'
import { EventLogDetailModal } from '../../components/platformAdmin/EventLogDetailModal'
import { useQueryParams } from '../../hooks/useQueryParams'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import type { AdminEventLog, EventCategory } from '../../types/eventLog.types'

// Category options for filtering
const categoryOptions = [
  { value: 'AUTH', label: 'Auth' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'USER', label: 'User' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'CHILD', label: 'Child' },
  { value: 'TEAM', label: 'Team' },
  { value: 'SEASON', label: 'Season' },
  { value: 'EVENT', label: 'Event' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'TRYOUT', label: 'Tryout' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'UNIFORM', label: 'Uniform' },
  { value: 'FEATURE_FLAG', label: 'Feature Flag' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SYSTEM', label: 'System' },
]

export default function EventLog() {
  const [logs, setLogs] = useState<AdminEventLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Database["public"]["Enums"]["event_category"] | null>(null)
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  
  // Deep link support: org_id query param
  const { getUUID } = useQueryParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const orgFilterFromQuery = getUUID('org_id')
  const [orgFilter, setOrgFilter] = useState(orgFilterFromQuery || '')
  const [orgFilterName, setOrgFilterName] = useState<string | null>(null)

  // Sync orgFilter with query param
  useEffect(() => {
    if (orgFilterFromQuery) {
      setOrgFilter(orgFilterFromQuery)
    } else {
      setOrgFilter('')
    }
  }, [orgFilterFromQuery])

  useEffect(() => {
    if (orgFilter) {
      supabase
        .from('admin_organizations')
        .select('name')
        .eq('id', orgFilter)
        .single()
        .then(({ data }) => {
          if (data) setOrgFilterName((data as any).name)
        })
    } else {
      setOrgFilterName(null)
    }
  }, [orgFilter])

  const clearOrgFilter = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('org_id')
    setSearchParams(newParams)
    setOrgFilter('')
    setPage(0)
  }
  const [dateFrom, setDateFrom] = useState(() => {
    // Default to 90 days ago
    const date = new Date()
    date.setDate(date.getDate() - 90)
    return date.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<AdminEventLog | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('admin_event_logs')
        .select('*', { count: 'exact' })

      if (search) {
        query = query.or(`actor_email.ilike.%${search}%,actor_name.ilike.%${search}%`)
      }

      if (categoryFilter) {
        query = query.eq('category', categoryFilter)
      }

      if (eventTypeFilter) {
        query = query.eq('event_type', eventTypeFilter)
      }

      if (orgFilter) {
        query = query.eq('org_id', orgFilter)
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
        console.error('Error fetching event logs:', error)
        setLogs([])
        setTotalCount(0)
      } else {
        setLogs(data as AdminEventLog[])
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Error:', err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search, categoryFilter, eventTypeFilter, orgFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const getCategoryVariant = (category: EventCategory): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (category) {
      case 'AUTH':
        return 'info'
      case 'PAYMENT':
        return 'success'
      case 'ADMIN':
        return 'warning'
      case 'SYSTEM':
        return 'neutral'
      case 'ORGANIZATION':
        return 'info'
      default:
        return 'neutral'
    }
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

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getMetadataSummary = (metadata: Record<string, unknown>) => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return '-'
    }
    const keys = Object.keys(metadata).slice(0, 2)
    return keys.map(key => `${key}: ${String(metadata[key]).substring(0, 20)}`).join(', ')
  }

  const handleRowClick = (event: AdminEventLog) => {
    setSelectedEvent(event)
    setShowDetailModal(true)
  }

  const handleExportCSV = () => {
    // Build CSV content
    const headers = ['Timestamp', 'Category', 'Event Type', 'Actor', 'Organization', 'Target Entity', 'Summary']
    const rows = logs.map(log => [
      new Date(log.created_at).toISOString(),
      log.category,
      log.event_type,
      log.actor_email || log.actor_name || 'System',
      log.organization_name || '-',
      log.target_entity_type ? `${log.target_entity_type}:${log.target_entity_id?.substring(0, 8)}` : '-',
      getMetadataSummary(log.metadata),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event_logs_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(logs, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event_logs_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns: ColumnConfig<AdminEventLog>[] = [
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
      id: 'category',
      label: 'Category',
      minWidth: 120,
      render: (row) => (
        <Badge variant={getCategoryVariant(row.category)}>
          {row.category}
        </Badge>
      ),
    },
    {
      id: 'event_type',
      label: 'Event Type',
      minWidth: 180,
      render: (row) => formatEventType(row.event_type),
    },
    {
      id: 'actor',
      label: 'Actor',
      minWidth: 180,
      render: (row) => row.actor_email || row.actor_name || 'System',
    },
    {
      id: 'organization',
      label: 'Organization',
      minWidth: 150,
      render: (row) => row.organization_name || '-',
    },
    {
      id: 'summary',
      label: 'Summary',
      minWidth: 200,
      render: (row) => (
        <div className="pa-caption" style={{ color: 'var(--pa-n700)' }}>
          {getMetadataSummary(row.metadata)}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Event Log"
        subtitle="Comprehensive audit trail of all platform actions. Default view: last 90 days."
      />

      {/* Org Filter Indicator */}
      {orgFilter && (
        <div className="pa-card pa-mb-4" style={{ background: 'var(--pa-primary-bg)', borderLeft: '3px solid var(--pa-primary)' }}>
          <div className="pa-flex pa-items-center pa-justify-between">
            <div className="pa-flex pa-items-center pa-gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-primary)' }}>
                filter_alt
              </span>
              <span className="pa-body-m">
                Filtered by organization: <strong>{orgFilterName || orgFilter}</strong>
              </span>
            </div>
            <Button variant="ghost" size="dense" onClick={clearOrgFilter}>
              Clear Filter
            </Button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
        <FilterBar
          searchValue={search}
          onSearchChange={(value) => { setSearch(value); setPage(0) }}
          searchPlaceholder="Search by actor email or name..."
          statusOptions={categoryOptions}
          statusValue={categoryFilter as string}
          onStatusChange={(value) => { setCategoryFilter(value as Database["public"]["Enums"]["event_category"] | null); setPage(0) }}
          statusLabel="Category"
          showDateRange
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(value) => { setDateFrom(value); setPage(0) }}
          onDateToChange={(value) => { setDateTo(value); setPage(0) }}
          onClearAll={() => {
            setSearch('')
            setCategoryFilter(null)
            setEventTypeFilter('')
            clearOrgFilter()
            const date = new Date()
            date.setDate(date.getDate() - 90)
            setDateFrom(date.toISOString().split('T')[0])
            setDateTo('')
            setPage(0)
          }}
        />
        <button
          onClick={handleExportCSV}
          className="pa-button pa-button-secondary"
          style={{ whiteSpace: 'nowrap' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '8px' }}>
            download
          </span>
          Export CSV
        </button>
        <button
          onClick={handleExportJSON}
          className="pa-button pa-button-secondary"
          style={{ whiteSpace: 'nowrap' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '8px' }}>
            download
          </span>
          Export JSON
        </button>
      </div>

      <PlatformDataTable
        columns={columns}
        rows={logs}
        loading={loading}
        emptyMessage="No event logs found for the selected filters."
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={(size) => { setRowsPerPage(size); setPage(0) }}
        onRowClick={handleRowClick}
      />

      {showDetailModal && selectedEvent && (
        <EventLogDetailModal
          event={selectedEvent}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedEvent(null)
          }}
        />
      )}
    </div>
  )
}
