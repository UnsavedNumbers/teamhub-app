import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, PlatformDataTable, FilterBar, Button, Badge, Select, type ColumnConfig, DataState } from '../../components/platformAdmin'
import type { EntitlementOverrideWithDetails, OverrideStatus, OverrideTargetType } from '../../types/licenseTiers.types'
import { useOffline } from '../../hooks/useOffline'
import { isDemoMode } from '../../utils/demoMode'
import { showError } from '../../utils/toast'
import { useAuth } from '../../hooks/useAuth'
import { canPerformAction } from '../../utils/platformAdminPermissions'
import type { PlatformAdminRole } from '../../types/platformAdmin.types'

export default function Overrides() {
  const [overrides, setOverrides] = useState<EntitlementOverrideWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const navigate = useNavigate()
  const { isOffline } = useOffline()
  const demoMode = isDemoMode()
  const { profile } = useAuth()
  
  // Get admin role for permission checks (Issue 7)
  const adminRole = useMemo<PlatformAdminRole | null>(() => {
    return profile?.platformAdminRole ?? null
  }, [profile?.platformAdminRole])
  
  const canCreate = useMemo(() => {
    return adminRole ? canPerformAction(adminRole, 'manage_overrides') : false
  }, [adminRole])

  const fetchOverrides = useCallback(async () => {
    if (isOffline) {
      setError('You appear to be offline. Please reconnect and try again.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

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

      const { data, error: queryError, count } = await query

      if (queryError) {
        console.error('Error fetching overrides:', queryError)
        let errorMessage = `Failed to load overrides: ${queryError.message}`
        
        if (queryError.code === 'PGRST205') {
          errorMessage = 'The overrides view is not available. The database schema may need to refresh. Please try again in a moment or contact support if the issue persists.'
        } else if (queryError.code === 'PGRST301') {
          errorMessage = 'You do not have permission to view overrides.'
        } else if (queryError.code === 'PGRST116') {
          errorMessage = 'No overrides found.'
        }
        
        setError(errorMessage)
        setOverrides([])
        setTotalCount(0)
      } else {
        setOverrides((data || []) as unknown as EntitlementOverrideWithDetails[])
        setTotalCount(count || 0)
        setError(null)
      }
    } catch (err: any) {
      console.error('Error:', err)
      const errorMessage = err.message || 'An unexpected error occurred while loading overrides.'
      setError(errorMessage)
      setOverrides([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search, targetTypeFilter, statusFilter, isOffline])

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

  const handleCreateClick = () => {
    if (demoMode) {
      showError('Demo mode: Cannot create overrides. Please configure Supabase to enable write operations.')
      return
    }
    if (isOffline) {
      showError('You appear to be offline. Please reconnect and try again.')
      return
    }
    navigate('/platform-admin/licenses/overrides/new')
  }

  return (
    <div>
      {/* Demo mode indicator */}
      {demoMode && (
        <div
          className="pa-card pa-mb-4"
          style={{
            background: 'var(--pa-info-bg)',
            border: '1px solid var(--pa-info)',
            padding: 'var(--pa-space-3)',
          }}
        >
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-info)' }}>
              info
            </span>
            <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
              Demo mode: Changes will not be saved to the database.
            </span>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      {isOffline && (
        <div
          className="pa-card pa-mb-4"
          style={{
            background: 'var(--pa-warning-bg)',
            border: '1px solid var(--pa-warning)',
            padding: 'var(--pa-space-3)',
          }}
        >
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-warning)' }}>
              wifi_off
            </span>
            <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
              You appear to be offline. Some features may not be available.
            </span>
          </div>
        </div>
      )}

      <PageHeader
        title="Rules & Overrides"
        subtitle="Manage organization and user-level entitlement overrides"
        actions={
          <Button
            variant="primary"
            onClick={handleCreateClick}
            disabled={demoMode || isOffline || !canCreate}
            title={!canCreate ? 'You do not have permission to create overrides' : undefined}
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

      <DataState
        data={error ? null : overrides}
        loading={loading}
        error={error}
        onRetry={fetchOverrides}
        emptyMessage="No overrides found"
        emptyIcon="rule"
        emptyTitle="No overrides found"
        emptyDescription="Create your first override to get started."
        emptyAction={
          !demoMode && !isOffline
            ? {
                label: 'Create Override',
                onClick: handleCreateClick,
              }
            : undefined
        }
      >
        {(data) => (
          <PlatformDataTable
            columns={columns}
            rows={data}
            loading={false}
            emptyMessage="No overrides found"
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
