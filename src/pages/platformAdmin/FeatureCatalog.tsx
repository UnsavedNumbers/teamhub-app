import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, PlatformDataTable, FilterBar, Button, Badge, Select, type ColumnConfig } from '../../components/platformAdmin'
import type { FeatureEntitlementWithCounts } from '../../types/licenseTiers.types'
import { FEATURE_CATEGORIES, FEATURE_TYPES } from '../../utils/licenseTierConstants'
import { SupabaseExtended as Database } from '../../lib/supabase.extended.types'

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  ...FEATURE_CATEGORIES.map(cat => ({ value: cat, label: cat })),
]

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  ...FEATURE_TYPES.map(type => ({ value: type, label: type })),
]

export default function FeatureCatalog() {
  const [features, setFeatures] = useState<FeatureEntitlementWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const navigate = useNavigate()

  const fetchFeatures = useCallback(async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('admin_feature_entitlements_list')
        .select('*', { count: 'exact' })
        .is('archived_at', null)

      if (search) {
        query = query.or(`feature_key.ilike.%${search}%,display_name.ilike.%${search}%,description.ilike.%${search}%`)
      }

      if (categoryFilter) {
        query = query.eq('category', categoryFilter)
      }

      if (typeFilter) {
        query = query.eq('feature_type', typeFilter as Database["public"]["Tables"]["feature_entitlements"]["Row"]["feature_type"])
      }

      query = query.order('category', { ascending: true }).order('display_name', { ascending: true })

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching features:', error)
        setFeatures([])
        setTotalCount(0)
      } else {
        setFeatures(data as FeatureEntitlementWithCounts[])
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Error:', err)
      setFeatures([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search, categoryFilter, typeFilter])

  useEffect(() => {
    fetchFeatures()
  }, [fetchFeatures])

  const columns: ColumnConfig<FeatureEntitlementWithCounts>[] = [
    {
      id: 'display_name',
      label: 'Feature',
      sortable: true,
      render: (row) => (
        <div>
          <div className="pa-body-m" style={{ fontWeight: 600 }}>
            {row.display_name}
          </div>
          <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px', fontFamily: 'var(--pa-font-mono)' }}>
            {row.feature_key}
          </div>
          {row.description && (
            <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginTop: '4px' }}>
              {row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'category',
      label: 'Category',
      sortable: true,
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>
          {row.category}
        </div>
      ),
    },
    {
      id: 'feature_type',
      label: 'Type',
      render: (row) => (
        <Badge variant="neutral">{row.feature_type}</Badge>
      ),
    },
    {
      id: 'rollout_status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.rollout_status === 'live' ? 'success' : row.rollout_status === 'beta' ? 'warning' : 'neutral'}>
          {row.rollout_status}
        </Badge>
      ),
    },
    {
      id: 'tier_assignments_count',
      label: 'Tier Assignments',
      align: 'center',
      render: (row) => (
        <div className="pa-body-m">{row.tier_assignments_count}</div>
      ),
    },
    {
      id: 'active_overrides_count',
      label: 'Active Overrides',
      align: 'center',
      render: (row) => (
        <div className="pa-body-m">{row.active_overrides_count}</div>
      ),
    },
    {
      id: 'updated_at',
      label: 'Last Updated',
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>
          {new Date(row.updated_at).toLocaleDateString()}
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
            onClick={() => navigate(`/platform-admin/licenses/features/${row.id}`)}
          >
            View/Edit
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Feature Catalog"
        subtitle="Manage all platform features and entitlements"
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/platform-admin/licenses/features/new')}
          >
            Create Feature
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-4)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search features..."
            onClearAll={() => setSearch('')}
          />
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ minWidth: '200px' }}
          options={CATEGORY_OPTIONS}
        />
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ minWidth: '150px' }}
          options={TYPE_OPTIONS}
        />
      </div>

      <PlatformDataTable
        columns={columns}
        rows={features}
        loading={loading}
        emptyMessage="No features found"
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />
    </div>
  )
}
