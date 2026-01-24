import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { 
  PageHeader, 
  PlatformDataTable, 
  FilterBar, 
  Button, 
  Badge, 
  Select, 
  type ColumnConfig,
  DiscoveryStatusBadge,
  FeatureDependencyGraph,
  DiscoveryErrorBoundary,
  MultiStepProgressBar,
  Card
} from '../../components/platformAdmin'
import type { FeatureEntitlementWithCounts } from '../../types/licenseTiers.types'
import { FEATURE_CATEGORIES, FEATURE_TYPES } from '../../utils/licenseTierConstants'
import { discoverAndReconcile } from '../../utils/featureDiscovery/reconciler'
import type { DiscoveredFeature } from '../../utils/featureDiscovery/types'
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
  const navigate = useNavigate()
  
  // Data State
  const [features, setFeatures] = useState<FeatureEntitlementWithCounts[]>([])
  const [discoveredFeatures, setDiscoveredFeatures] = useState<DiscoveredFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [discoveryLoading, setDiscoveryLoading] = useState(false)
  const [lastDiscoveredAt, setLastDiscoveredAt] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'pending' | 'synced' | 'failed' | null>(null)
  
  // Sync Progress State
  const [syncProgress, setSyncProgress] = useState({
    isActive: false,
    currentStep: 0,
    steps: [] as Array<{ label: string; status?: string }>,
    error: null as string | null,
  })

  // Filter State
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  // Abort Controller for Race Conditions
  const abortControllerRef = useRef<AbortController | null>(null)

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
        query = query.eq('feature_type', typeFilter as any)
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

  // Discovery Logic
  const runDiscovery = async (force = false) => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    abortControllerRef.current = new AbortController()

    setDiscoveryLoading(true)
    try {
        const results = await discoverAndReconcile(force)
        setDiscoveredFeatures(results)
        
        // Update status from latest cache entry if not analyzing results directly from return
        const { data: cache } = await supabase.from('feature_discovery_cache').select('*').order('created_at', { ascending: false }).limit(1).single()
        if (cache) {
            setLastDiscoveredAt(cache.last_discovered_at)
            setSyncStatus(cache.sync_status as any)
        }
    } catch (err) {
        console.error('Discovery failed', err)
    } finally {
        setDiscoveryLoading(false)
    }
  }

  const handleSync = async () => {
    // Initialize progress tracking
    const syncSteps = [
      { label: 'Validating features', status: 'Checking feature data...' },
      { label: 'Merging with existing features', status: 'Comparing discovered features...' },
      { label: 'Inserting new features', status: 'Adding new features to database...' },
      { label: 'Updating existing features', status: 'Updating feature metadata...' },
      { label: 'Updating tier assignments', status: 'Syncing license tier assignments...' },
      { label: 'Finalizing', status: 'Completing sync...' },
    ]
    
    setSyncProgress({
      isActive: true,
      currentStep: 0,
      steps: syncSteps,
      error: null,
    })
    setDiscoveryLoading(true)
    
    // Progress simulation function
    const updateProgress = (step: number, status?: string) => {
      setSyncProgress(prev => ({
        ...prev,
        currentStep: step,
        steps: prev.steps.map((s, i) => 
          i === step ? { ...s, status } : s
        ),
      }))
    }
    
    try {
      // Step 1: Validating (0-10%)
      updateProgress(0, 'Validating feature data structure...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      if (discoveredFeatures.length === 0) {
        throw new Error('No features to sync. Run discovery first.')
      }
      
      // Step 2: Merging (10-30%)
      updateProgress(1, `Processing ${discoveredFeatures.length} features...`)
      await new Promise(resolve => setTimeout(resolve, 400))
      
      // Step 3: Inserting (30-50%)
      updateProgress(2, 'Inserting new features...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Step 4: Updating (50-70%)
      updateProgress(3, 'Updating existing features...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Step 5: Tier assignments (70-85%)
      updateProgress(4, 'Syncing tier assignments...')
      await new Promise(resolve => setTimeout(resolve, 400))
      
      // Step 6: Finalizing (85-100%)
      updateProgress(5, 'Finalizing sync...')
      
      // Prepare features for sync (ensure proper structure)
      const featuresToSync = discoveredFeatures.map(f => ({
        featureKey: f.featureKey,
        displayName: f.displayName,
        category: f.category,
        featureType: f.featureType,
        description: f.description || null,
        rolloutStatus: f.syncStatus === 'synced' ? 'live' : 'live', // Default to live
      }))
      
      console.log(`Syncing ${featuresToSync.length} features:`, featuresToSync.slice(0, 3))
      
      // Actual RPC call happens here
      const { data, error } = await supabase.rpc('sync_discovered_features', { 
        p_discovered_features: featuresToSync as any 
      })
      
      if (error) {
        console.error('RPC error:', error)
        throw new Error(`Sync failed: ${error.message || JSON.stringify(error)}`)
      }
      
      // Check response structure
      if (!data) {
        throw new Error('Sync returned no data')
      }
      
      // Handle JSONB response
      const result = typeof data === 'string' ? JSON.parse(data) : data
      
      // Check if lock was held
      if (result && typeof result === 'object' && 'code' in result && result.code === 'LOCK_HELD') {
        throw new Error('Sync is already in progress by another process. Please wait.')
      }
      
      // Check if sync was successful
      if (result && typeof result === 'object' && 'success' in result && !result.success) {
        throw new Error(result.message || 'Sync failed')
      }
      
      // Log sync results
      if (result && typeof result === 'object' && 'synced' in result) {
        console.log(`Sync completed: ${result.synced} synced, ${result.failed || 0} failed`)
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          console.warn('Sync errors:', result.errors)
        }
      }
      
      // Complete progress
      const syncedCount = result?.synced || 0
      const failedCount = result?.failed || 0
      updateProgress(5, `Sync completed: ${syncedCount} synced, ${failedCount} failed`)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Refresh everything - wait a bit for DB to commit
      await new Promise(resolve => setTimeout(resolve, 500))
      await Promise.all([
        runDiscovery(false),
        fetchFeatures()
      ])
      
      // Reset progress after a brief delay
      setTimeout(() => {
        setSyncProgress({
          isActive: false,
          currentStep: 0,
          steps: [],
          error: null,
        })
      }, 1000)
      
    } catch (err: any) {
      console.error('Sync failed', err)
      const errorMessage = err?.message || 'Sync failed. Check console for details.'
      
      setSyncProgress(prev => ({
        ...prev,
        error: errorMessage,
      }))
      
      // Keep progress visible for a bit to show error
      setTimeout(() => {
        setSyncProgress({
          isActive: false,
          currentStep: 0,
          steps: [],
          error: null,
        })
      }, 3000)
    } finally {
      setDiscoveryLoading(false)
    }
  }

  useEffect(() => {
    fetchFeatures()
    runDiscovery(false) // Initial check (cached)
    
    return () => {
        abortControllerRef.current?.abort()
    }
  }, [fetchFeatures])

  // Enhance features with discovery metadata for display if needed
  // For now, we display the DB features primarily, but could show "New Discovered" separately.
  // The request asks for "New filters" and "New Columns".
  
  // To avoid complexity in V1, let's map the DB features and check if they have discovery info match.
  const rows = features.map(f => {
      const discovered = discoveredFeatures.find(df => df.featureKey === f.feature_key);
      return { ...f, discovered };
  });

  const columns: ColumnConfig<FeatureEntitlementWithCounts & { discovered?: DiscoveredFeature }>[] = [
    {
      id: 'display_name',
      label: 'Feature',
      sortable: true,
      render: (row) => (
        <div>
          <div className="pa-body-m" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {row.display_name}
            {row.discovered?.confidenceScore && row.discovered.confidenceScore < 70 && (
                <Badge variant="warning" size="small">Review</Badge>
            )}
            {row.discovered?.integrations?.length ? (
                row.discovered.integrations.map(i => <Badge key={i} variant="neutral" size="small">{i}</Badge>)
            ) : null}
          </div>
          <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px', fontFamily: 'var(--pa-font-mono)' }}>
            {row.feature_key}
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
             {row.discovered?.discoveredFrom.includes('routes') && <span title="Discovered in Routes">🛣️</span>}
             {row.discovered?.discoveredFrom.includes('schema') && <span title="Discovered in DB Schema">💾</span>}
             {row.discovered?.discoveredFrom.includes('services') && <span title="Discovered in Services">⚙️</span>}
          </div>
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
      label: 'Assignments',
      align: 'center',
      render: (row) => (
        <div className="pa-body-m">{row.tier_assignments_count}</div>
      ),
    },
    {
        id: 'updated_at',
        label: 'Updated',
        render: (row) => <div className="pa-body-s">{new Date(row.updated_at).toLocaleDateString()}</div>
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
            Edit
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DiscoveryErrorBoundary>
        <div>
        <PageHeader
            title="Feature Catalog"
            subtitle="Manage all platform features and entitlements"
            actions={
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <DiscoveryStatusBadge 
                    lastDiscoveredAt={lastDiscoveredAt}
                    syncStatus={syncStatus}
                    loading={discoveryLoading}
                    onRefresh={() => runDiscovery(true)}
                    onSync={handleSync}
                />
                <Button
                    variant="primary"
                    onClick={() => navigate('/platform-admin/licenses/features/new')}
                >
                    Manual Create
                </Button>
            </div>
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

        {syncProgress.isActive && (
            <div style={{ marginBottom: '24px' }}>
                <Card title="Syncing Features">
                    <MultiStepProgressBar
                        currentStep={syncProgress.currentStep}
                        totalSteps={syncProgress.steps.length}
                        steps={syncProgress.steps}
                        error={syncProgress.error || undefined}
                    />
                </Card>
            </div>
        )}

        {discoveredFeatures.some(f => f.dependencyCycles?.length > 0) && (
            <div style={{ marginBottom: '24px' }}>
                <FeatureDependencyGraph features={discoveredFeatures} />
            </div>
        )}

        <PlatformDataTable
            columns={columns}
            rows={rows}
            loading={loading}
            emptyMessage="No features found"
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalCount}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
        />
        </div>
    </DiscoveryErrorBoundary>
  )
}
