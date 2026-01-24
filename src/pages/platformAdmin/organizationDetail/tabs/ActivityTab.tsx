/**
 * ActivityTab Component
 * 
 * Displays event log/audit trail for the organization.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { PlatformDataTable, type ColumnConfig, Badge, FilterBar, Button } from '../../../../components/platformAdmin'
import { DataState } from '../../../../components/platformAdmin/DataState'
import { EventLogDetailModal } from '../../../../components/platformAdmin/EventLogDetailModal'
import { usePagination } from '../../../../hooks/usePagination'
import { handleRpcError } from '../../../../utils/rpcErrorHandler'
import { safeString, safeDate } from '../../../../utils/safeAccessors'
import type { AdminEventLog } from '../../../../types/eventLog.types'

interface ActivityTabProps {
  organizationId: string
}

export function ActivityTab({ organizationId }: ActivityTabProps) {
  const isMountedRef = useRef(true)
  const [logs, setLogs] = useState<AdminEventLog[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<AdminEventLog | null>(null)
  const { page, rowsPerPage, totalCount, setPage, setRowsPerPage, setTotalCount } = usePagination(0, 50)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('admin_event_logs')
        .select('*', { count: 'exact' })
        .eq('org_id', organizationId)

      if (search) {
        query = query.or(`actor_email.ilike.%${search}%,actor_name.ilike.%${search}%`)
      }

      if (categoryFilter) {
        query = query.eq('category', categoryFilter)
      }

      query = query.order('created_at', { ascending: false })

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)

      const { data, error: fetchError, count } = await query

      if (!isMountedRef.current) return

      if (fetchError) {
        // Handle 404 specifically - view might not exist or migration not run
        if (fetchError.code === 'PGRST116' || fetchError.message.includes('404') || fetchError.message.includes('not found')) {
          setError('Event logs view not available. Please ensure database migrations are up to date.')
        } else {
          const normalized = handleRpcError(fetchError, 'fetch_event_logs')
          setError(normalized.message)
        }
        setLogs([])
        setTotalCount(0)
        return
      }

      setLogs((data || []) as AdminEventLog[])
      setTotalCount(count || 0)
    } catch (err) {
      if (!isMountedRef.current) return
      const normalized = handleRpcError(err, 'fetch_event_logs')
      setError(normalized.message)
      setLogs([])
      setTotalCount(0)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [organizationId, search, categoryFilter, page, rowsPerPage, setTotalCount])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return safeDate(dateString)
    } catch {
      return safeDate(dateString)
    }
  }

  const getCategoryVariant = (category: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (category) {
      case 'PAYMENT':
        return 'success'
      case 'ADMIN':
        return 'warning'
      case 'AUTH':
      case 'ORGANIZATION':
        return 'info'
      default:
        return 'neutral'
    }
  }

  const columns: ColumnConfig<AdminEventLog>[] = [
    {
      id: 'created_at',
      label: 'Time',
      render: (row) => (
        <div>
          <div className="pa-body-s">{formatTimeAgo(row.created_at)}</div>
          <div className="pa-caption pa-text-muted">{safeDate(row.created_at)}</div>
        </div>
      ),
    },
    {
      id: 'category',
      label: 'Category',
      render: (row) => (
        <Badge variant={getCategoryVariant(row.category)}>{row.category}</Badge>
      ),
    },
    {
      id: 'event_type',
      label: 'Event',
      render: (row) => safeString(row.event_type),
    },
    {
      id: 'actor',
      label: 'Actor',
      render: (row) => safeString(row.actor_name || row.actor_email),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Button
          variant="ghost"
          size="dense"
          onClick={() => setSelectedEvent(row)}
        >
          View Details
        </Button>
      ),
    },
  ]

  return (
    <div>
      {/* Link to full activity page */}
      <div className="pa-flex pa-items-center pa-justify-between pa-mb-4">
        <div />
        <Button
          variant="ghost"
          size="dense"
          icon="open_in_new"
          onClick={() => window.location.href = `/platform-admin/audit?org_id=${organizationId}`}
        >
          View Full Activity Log
        </Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(0)
        }}
        searchPlaceholder="Search by actor email or name..."
        statusOptions={[
          { value: '', label: 'All Categories' },
          { value: 'AUTH', label: 'Auth' },
          { value: 'ORGANIZATION', label: 'Organization' },
          { value: 'USER', label: 'User' },
          { value: 'PAYMENT', label: 'Payment' },
          { value: 'ADMIN', label: 'Admin' },
          { value: 'SYSTEM', label: 'System' },
        ]}
        statusValue={categoryFilter}
        onStatusChange={(value) => {
          setCategoryFilter(value)
          setPage(0)
        }}
        statusLabel="Category"
        onClearAll={() => {
          setSearch('')
          setCategoryFilter('')
          setPage(0)
        }}
      />

      <DataState
        data={logs}
        loading={loading}
        error={error}
        onRetry={fetchLogs}
        emptyMessage="No activity found for this organization"
        emptyIcon="history"
      >
        {(data) => (
          <PlatformDataTable
            columns={columns}
            rows={data}
            loading={false}
            emptyMessage="No activity found"
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalCount}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        )}
      </DataState>

      {selectedEvent && (
        <EventLogDetailModal
          event={selectedEvent}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}
