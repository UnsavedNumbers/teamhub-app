import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, PlatformDataTable, FilterBar, Button, Badge, Select, type ColumnConfig } from '../../components/platformAdmin'
import type { EntitlementOverrideWithDetails, OverrideStatus, OverrideTargetType } from '../../types/licenseTiers.types'

export default function Overrides() {
  const [overrides, setOverrides] = useState<EntitlementOverrideWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const navigate = useNavigate()

  const fetchOverrides = useCallback(async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('admin_entitlement_overrides_list')
        .select('*', { count: 'exact' })

      if (search) {
        query = query.or(`target_name.ilike.%${search}%,feature_key.ilike.%${search}%,feature_name.ilike.%${search}%`)
      }

      if (targetTypeFilter) {
        query = query.eq('target_type', targetTypeFilter as OverrideTargetType)
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter as OverrideStatus)
      }

      query = query.order('created_at', { ascending: false })

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching overrides:', error)
        setOverrides([])
        setTotalCount(0)
      } else {
        setOverrides(data || [])
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Error:', err)
      setOverrides([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search, targetTypeFilter, statusFilter])

  useEffect(() => {
    fetchOverrides()
  }, [fetchOverrides])

  const getOverrideSummary = (override: EntitlementOverrideWithDetails): string => {
    const parts: string[] = []
    if (override.override_action === 'enable') {
      parts.push('+ Enable')
    } else if (override.override_action === 'disable') {
      parts.push('- Disable')
    } else if (override.override_action === 'set_limit') {
      parts.push(`Limit = ${override.limit_value}`)
    }
    parts.push(override.feature_name)
    return parts.join(' ')
  }

  const columns: ColumnConfig<EntitlementOverrideWithDetails>[] = [
    {
      id: 'target_name',
      label: 'Target',
      render: (row) => (
        <div>
          <div className="pa-body-m" style={{ fontWeight: 600 }}>
            {row.target_name || 'Unknown'}
          </div>
          <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
            <Badge variant={row.target_type === 'organization' ? 'info' : 'warning'}>
              {row.target_type === 'organization' ? 'Organization' : 'User'}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      id: 'feature_name',
      label: 'Feature',
      render: (row) => (
        <div>
          <div className="pa-body-m">{row.feature_name}</div>
          <div className="pa-body-s" style={{ color: 'var(--pa-n500)', fontFamily: 'var(--pa-font-mono)', marginTop: '4px' }}>
            {row.feature_key}
          </div>
        </div>
      ),
    },
    {
      id: 'override_summary',
      label: 'Override Summary',
      render: (row) => (
        <div className="pa-body-m">{getOverrideSummary(row)}</div>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : row.status === 'expired' ? 'warning' : 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'reason',
      label: 'Reason',
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n500)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.reason}
        </div>
      ),
    },
    {
      id: 'created_at',
      label: 'Created',
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>
          {new Date(row.created_at).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: 'expires_at',
      label: 'Expires',
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>
          {row.expires_at ? new Date(row.expires_at).toLocaleDateString() : 'Never'}
        </div>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            size="dense"
            onClick={() => navigate(`/platform-admin/licenses/overrides/${row.id}`)}
          >
            View
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Rules & Overrides"
        subtitle="Manage organization and user-level entitlement overrides"
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/platform-admin/licenses/overrides/new')}
          >
            Create Override
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-4)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search overrides..."
            onClearAll={() => {
              setSearch('')
              setTargetTypeFilter('')
              setStatusFilter('')
            }}
          />
        </div>
        <Select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          style={{ minWidth: '150px' }}
          options={[
            { value: '', label: 'All Types' },
            { value: 'organization', label: 'Organization' },
            { value: 'user', label: 'User' },
          ]}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ minWidth: '150px' }}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' },
            { value: 'revoked', label: 'Revoked' },
          ]}
        />
      </div>

      <PlatformDataTable
        columns={columns}
        rows={overrides}
        loading={loading}
        emptyMessage="No overrides found"
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />
    </div>
  )
}
