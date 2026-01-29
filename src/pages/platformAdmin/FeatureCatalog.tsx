import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { 
  PageHeader, 
  PlatformDataTable, 
  EnhancedFilterBar,
  BulkActionsToolbar,
  Button, 
  Badge, 
  Select,
  type ColumnConfig,
  DiscoveryStatusBadge,
  FeatureDependencyGraph,
  DiscoveryErrorBoundary,
  MultiStepProgressBar,
  Card,
  ApplyToTiersModal,
  ChangeStatusModal,
  ChangeVisibilityModal,
  UpdateCategoryModal,
  OfflineBanner,
} from '../../components/platformAdmin'
import type { FeatureEntitlementWithCounts } from '../../types/licenseTiers.types'
import { FEATURE_CATEGORIES, FEATURE_TYPES } from '../../utils/licenseTierConstants'
import { discoverAndReconcile } from '../../utils/featureDiscovery/reconciler'
import type { DiscoveredFeature } from '../../utils/featureDiscovery/types'
import { 
  bulkUpdateStatus, 
  bulkUpdateCategory, 
  bulkApplyToTiers, 
  bulkUpdateRoleVisibility 
} from '../../data/services/featureBulkOperations'
import { showSuccess, showError, showInfo } from '../../utils/toast'
import type { FeatureCategory } from '../../types/licenseTiers.types'
import { useI18n } from '../../i18n/useI18n'
import { formatToastMessage, formatPlural } from '../../utils/toastMessages'

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  ...FEATURE_CATEGORIES.map(cat => ({ value: cat, label: cat })),
]

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  ...FEATURE_TYPES.map(type => ({ value: type, label: type })),
]

// Helper to normalize array fields from database
function normalizeArrayField(value: unknown): string[] | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

export default function FeatureCatalog() {
  const navigate = useNavigate()
  const { t } = useI18n()
  
  // Data State
  const [features, setFeatures] = useState<FeatureEntitlementWithCounts[]>([])
  const [discoveredFeatures, setDiscoveredFeatures] = useState<DiscoveredFeature[]>([])
  const [availableTiers, setAvailableTiers] = useState<Array<{ id: string; tier_key: string; tier_name: string }>>([])
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

  // Enhanced Filter State
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [tierFilter, setTierFilter] = useState<string[]>([])
  const [roleFilter, setRoleFilter] = useState<string[]>([])
  const [integrationFilter, setIntegrationFilter] = useState<string[]>([])
  const [quantifiableFilter, setQuantifiableFilter] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const [systemFeatureFilter, setSystemFeatureFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [platformAdminOnlyFilter, setPlatformAdminOnlyFilter] = useState<'all' | 'yes' | 'no'>('all')

  // Pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  // Selection State
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set())
  const [selectAllMode, setSelectAllMode] = useState<'none' | 'page' | 'all'>('none')
  const prevFiltersRef = useRef<{ statusFilter: string[]; tierFilter: string[]; roleFilter: string[]; integrationFilter: string[]; quantifiableFilter: string | null; sourceFilter: string | null; systemFeatureFilter: 'all' | 'yes' | 'no'; platformAdminOnlyFilter: 'all' | 'yes' | 'no' }>({ 
    statusFilter: [], 
    tierFilter: [], 
    roleFilter: [], 
    integrationFilter: [], 
    quantifiableFilter: null, 
    sourceFilter: null,
    systemFeatureFilter: 'all',
    platformAdminOnlyFilter: 'all'
  })

  // Modal States
  const [showApplyToTiersModal, setShowApplyToTiersModal] = useState(false)
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false)
  const [showChangeVisibilityModal, setShowChangeVisibilityModal] = useState(false)
  const [showUpdateCategoryModal, setShowUpdateCategoryModal] = useState(false)
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false)

  // Abort Controller for Race Conditions
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch license tiers for filter
  const fetchTiers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('license_tiers')
        .select('id, tier_key, tier_name')
        .eq('status', 'active')
        .order('tier_key', { ascending: true })

      if (error) {
        console.error('Error fetching tiers:', error)
      } else {
        setAvailableTiers(data || [])
      }
    } catch (err) {
      console.error('Error fetching tiers:', err)
    }
  }, [])

  // Fetch features with enhanced filters
  const fetchFeatures = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('admin_feature_entitlements_list')
        .select('*', { count: 'exact' })
        .is('archived_at', null)

      // Search (use debounced value, require at least 2 characters for search)
      if (debouncedSearch && debouncedSearch.length >= 2) {
        query = query.or(`feature_key.ilike.%${debouncedSearch}%,display_name.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`)
      }

      // Category filter
      if (categoryFilter) {
        query = query.eq('category', categoryFilter)
      }

      // Type filter
      if (typeFilter) {
        query = query.eq('feature_type', typeFilter as any)
      }

      // Status filter (map UI to DB values)
      if (statusFilter.length > 0) {
        const dbStatuses = statusFilter.map(s => {
          if (s === 'Live') return 'live'
          if (s === 'Disabled' || s === 'Deprecated') return 'hidden'
          if (s === 'Draft' || s === 'Review') return 'beta'
          return s
        })
        query = query.in('rollout_status', dbStatuses)
      }

      // License tier filter
      if (tierFilter.length > 0) {
        if (tierFilter.includes('unassigned')) {
          query = query.or('tier_assignments_count.is.null,tier_assignments_count.eq.0')
        } else {
          // Filter by tier keys - try overlaps operator
          try {
            query = query.overlaps('assigned_tier_keys', tierFilter)
          } catch (err) {
            // Fallback: if overlaps doesn't work, we'll need an RPC
            console.warn('Overlaps operator not supported, using alternative filter')
          }
        }
      }

      // Role visibility filter
      if (roleFilter.includes('orgAdmin')) {
        query = query.eq('visible_to_admin', true)
      }
      if (roleFilter.includes('coach')) {
        query = query.eq('visible_to_coach', true)
      }
      if (roleFilter.includes('guardian')) {
        query = query.eq('visible_to_parent', true)
      }

      // Integration filter
      if (integrationFilter.length > 0) {
        if (integrationFilter.includes('None')) {
          query = query.or('integrations.is.null,integrations.eq.{}')
        } else {
          try {
            query = query.overlaps('integrations', integrationFilter)
          } catch (err) {
            console.warn('Integration filter overlaps not supported')
          }
        }
      }

      // Quantifiable filter
      if (quantifiableFilter === 'has_limits') {
        query = query.eq('is_quantifiable', true)
      } else if (quantifiableFilter === 'unlimited') {
        query = query.eq('is_quantifiable', false)
      }

      // Source filter
      if (sourceFilter) {
        query = query.eq('discovery_source', sourceFilter)
      }

      // System feature filter
      if (systemFeatureFilter === 'yes') {
        query = query.eq('is_system_feature', true)
      } else if (systemFeatureFilter === 'no') {
        query = query.eq('is_system_feature', false)
      }

      // Platform admin only filter
      if (platformAdminOnlyFilter === 'yes') {
        query = query.eq('platform_admin_only', true)
      } else if (platformAdminOnlyFilter === 'no') {
        query = query.eq('platform_admin_only', false)
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
        // Normalize array fields and set features
        const normalized = (data || []).map(row => ({
          ...row,
          assigned_tier_keys: normalizeArrayField(row.assigned_tier_keys) || [],
          integrations: normalizeArrayField(row.integrations) || [],
        })) as FeatureEntitlementWithCounts[]
        setFeatures(normalized)
        setTotalCount(count || 0)
      }
    } catch (err: any) {
      // Ignore timeout/cancellation errors from rapid typing
      if (err?.code === '57014' || err?.message?.includes('cancel')) {
        console.log('Query cancelled or timed out, likely due to new search')
        return
      }
      console.error('Error:', err)
      setFeatures([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, debouncedSearch, categoryFilter, typeFilter, statusFilter, tierFilter, roleFilter, integrationFilter, quantifiableFilter, sourceFilter, systemFeatureFilter, platformAdminOnlyFilter])

  // Debounce search input (400ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Auto-filter selections when results change
  const prevSelectionCountRef = useRef(0)
  useEffect(() => {
    const currentIds = new Set(features.map(f => f.id))
    setSelectedFeatureIds(prev => {
      const filtered = new Set([...prev].filter(id => currentIds.has(id)))
      const afterCount = filtered.size
      
      // Track count change for filter notification
      prevSelectionCountRef.current = afterCount
      
      // Clear select-all mode if selections no longer match
      if (selectAllMode === 'page' && filtered.size !== features.length) {
        setSelectAllMode('none')
      }
      return filtered
    })
  }, [features, selectAllMode])

  // Track filter changes and notify user when selections are removed
  useEffect(() => {
    const filtersChanged = 
      JSON.stringify(prevFiltersRef.current.statusFilter) !== JSON.stringify(statusFilter) ||
      JSON.stringify(prevFiltersRef.current.tierFilter) !== JSON.stringify(tierFilter) ||
      JSON.stringify(prevFiltersRef.current.roleFilter) !== JSON.stringify(roleFilter) ||
      JSON.stringify(prevFiltersRef.current.integrationFilter) !== JSON.stringify(integrationFilter) ||
      prevFiltersRef.current.quantifiableFilter !== quantifiableFilter ||
      prevFiltersRef.current.sourceFilter !== sourceFilter ||
      prevFiltersRef.current.systemFeatureFilter !== systemFeatureFilter ||
      prevFiltersRef.current.platformAdminOnlyFilter !== platformAdminOnlyFilter

    if (filtersChanged) {
      const beforeCount = prevSelectionCountRef.current || selectedFeatureIds.size
      // The selection filtering effect will run after this, so we check in the next tick
      const timeoutId = setTimeout(() => {
        const afterCount = selectedFeatureIds.size
        if (beforeCount > afterCount && afterCount >= 0) {
          const removed = beforeCount - afterCount
          if (removed > 0) {
            showInfo(`${removed} selection${removed === 1 ? '' : 's'} removed (no longer match filters)`)
          }
        }
        prevSelectionCountRef.current = afterCount
      }, 150)
      
      return () => clearTimeout(timeoutId)
    }
    prevFiltersRef.current = { statusFilter, tierFilter, roleFilter, integrationFilter, quantifiableFilter, sourceFilter, systemFeatureFilter, platformAdminOnlyFilter }
  }, [statusFilter, tierFilter, roleFilter, integrationFilter, quantifiableFilter, sourceFilter, systemFeatureFilter, platformAdminOnlyFilter, selectedFeatureIds.size])

  // Discovery Logic
  const runDiscovery = useCallback(async (force = false) => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    abortControllerRef.current = new AbortController()

    setDiscoveryLoading(true)
    try {
        const results = await discoverAndReconcile(force)
        setDiscoveredFeatures(results)
        
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
  }, [])

  const handleSync = async () => {
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
      updateProgress(0, 'Validating feature data structure...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      if (discoveredFeatures.length === 0) {
        throw new Error('No features to sync. Run discovery first.')
      }
      
      updateProgress(1, `Processing ${discoveredFeatures.length} features...`)
      await new Promise(resolve => setTimeout(resolve, 400))
      
      updateProgress(2, 'Inserting new features...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      updateProgress(3, 'Updating existing features...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      updateProgress(4, 'Syncing tier assignments...')
      await new Promise(resolve => setTimeout(resolve, 400))
      
      updateProgress(5, 'Finalizing sync...')
      
      const featuresToSync = discoveredFeatures.map(f => ({
        featureKey: f.featureKey,
        displayName: f.displayName,
        category: f.category,
        featureType: f.featureType,
        description: f.description || null,
        rolloutStatus: f.syncStatus === 'synced' ? 'live' : 'live',
      }))
      
      const { data, error } = await supabase.rpc('sync_discovered_features', { 
        p_discovered_features: featuresToSync as any 
      })
      
      if (error) {
        throw new Error(`Sync failed: ${error.message || JSON.stringify(error)}`)
      }
      
      if (!data) {
        throw new Error('Sync returned no data')
      }
      
      const result = typeof data === 'string' ? JSON.parse(data) : data
      
      if (result && typeof result === 'object' && 'code' in result && result.code === 'LOCK_HELD') {
        throw new Error('Sync is already in progress by another process. Please wait.')
      }
      
      if (result && typeof result === 'object' && 'success' in result && !result.success) {
        throw new Error(result.message || 'Sync failed')
      }
      
      if (result && typeof result === 'object' && 'synced' in result) {
        console.log(`Sync completed: ${result.synced} synced, ${result.failed || 0} failed`)
      }
      
      const syncedCount = result?.synced || 0
      const failedCount = result?.failed || 0
      updateProgress(5, `Sync completed: ${syncedCount} synced, ${failedCount} failed`)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      await new Promise(resolve => setTimeout(resolve, 500))
      await Promise.all([
        runDiscovery(false),
        fetchFeatures()
      ])
      
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

  // Selection handlers
  const handleSelectionChange = useCallback((
    updater: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => {
    if (typeof updater === 'function') {
      setSelectedFeatureIds(prev => updater(prev))
    } else {
      setSelectedFeatureIds(updater)
    }
    setSelectAllMode('none') // Clear mode on individual change
  }, [])

  const handleSelectAllChange = useCallback((mode: 'none' | 'page' | 'all') => {
    setSelectAllMode(mode)
    if (mode === 'page') {
      const pageIds = new Set(features.map(f => f.id))
      setSelectedFeatureIds(prev => {
        const next = new Set(prev)
        pageIds.forEach(id => next.add(id))
        return next
      })
    } else if (mode === 'all') {
      // For "select all results", we'd need to fetch all IDs
      // For now, just select all on current page
      const pageIds = new Set(features.map(f => f.id))
      setSelectedFeatureIds(pageIds)
      setSelectAllMode('page')
    }
    // Note: Don't clear selections when mode is 'none' - that's handled by 
    // handleSelectAll in PlatformDataTable when user clicks the header checkbox
  }, [features])

  // Bulk operation handlers
  const selectedFeatures = useMemo(() => {
    return features.filter(f => selectedFeatureIds.has(f.id))
  }, [features, selectedFeatureIds])

  // Filter out locked features for bulk operations
  const getToggleableFeatures = useCallback((featureIds: string[]) => {
    return featureIds.filter(id => {
      const feature = features.find(f => f.id === id)
      return feature && feature.is_toggleable !== false
    })
  }, [features])

  const getLockedFeatures = useCallback((featureIds: string[]) => {
    return features.filter(f => 
      featureIds.includes(f.id) && 
      (f.is_toggleable === false || f.is_removable === false)
    )
  }, [features])

  const handleBulkApplyToTiers = async (tierIds: string[], action: 'add' | 'remove', roleVisibility: { admin: boolean; coach: boolean; parent: boolean }) => {
    try {
      const featureIds = Array.from(selectedFeatureIds)
      // For remove action, filter out non-toggleable features
      const applicableIds = action === 'remove' 
        ? getToggleableFeatures(featureIds)
        : featureIds
      const lockedFeatures = action === 'remove' ? getLockedFeatures(featureIds) : []

      // Warn about locked features when removing
      if (action === 'remove' && lockedFeatures.length > 0) {
        const lockedNames = lockedFeatures.map(f => f.display_name).join(', ')
        showError(
          `${lockedFeatures.length} locked feature${lockedFeatures.length === 1 ? '' : 's'} cannot be removed: ${lockedNames}. ` +
          (lockedFeatures[0]?.lock_reason || 'These features are required for platform functionality.')
        )
      }

      if (action === 'remove' && applicableIds.length === 0) {
        showError(t('toast.error.noToggleableFeaturesForRemoval'))
        throw new Error('ALL_LOCKED')
      }

      const result = await bulkApplyToTiers(
        applicableIds,
        tierIds,
        action,
        roleVisibility
      )

      if (result.success) {
        showSuccess(`${result.processed || 0} feature${result.processed === 1 ? '' : 's'} ${action === 'add' ? 'added to' : 'removed from'} tier${tierIds.length === 1 ? '' : 's'}`)
        await fetchFeatures()
      } else {
        if (result.code === 'FEATURE_LOCKED') {
          const lockedNames = result.locked_features?.map(f => f.display_name).join(', ') || 'locked features'
          showError(formatToastMessage(t('toast.error.lockedFeaturesCannotModify'), {
            count: result.locked_features?.length || 0,
            plural: formatPlural(result.locked_features?.length || 0),
            names: lockedNames
          }))
          throw new Error('FEATURE_LOCKED')
        } else if (result.code === 'LOCK_HELD') {
          showError('Another bulk operation is in progress. Please wait.')
          throw new Error('LOCK_HELD')
        } else {
          showError(result.error || 'Operation failed')
          throw new Error(result.error || 'Operation failed')
        }
      }
    } catch (err: any) {
      if (err.message !== 'LOCK_HELD' && err.message !== 'Operation failed' && err.message !== 'FEATURE_LOCKED' && err.message !== 'ALL_LOCKED') {
        showError(err.message || t('toast.error.operationFailed'))
      }
      throw err // Re-throw to let modal handle it
    }
  }

  // Handler for when modal completes all operations
  const handleApplyToTiersComplete = () => {
    setShowApplyToTiersModal(false)
    setSelectedFeatureIds(new Set())
    setBulkOperationLoading(false)
  }

  const handleBulkChangeStatus = async (status: 'Live' | 'Disabled' | 'Draft' | 'Deprecated' | 'Review') => {
    setBulkOperationLoading(true)
    try {
      const featureIds = Array.from(selectedFeatureIds)
      const toggleableIds = getToggleableFeatures(featureIds)
      const lockedFeatures = getLockedFeatures(featureIds)

      // Warn about locked features
      if (lockedFeatures.length > 0) {
        const lockedNames = lockedFeatures.map(f => f.display_name).join(', ')
        showError(
          `${lockedFeatures.length} locked feature${lockedFeatures.length === 1 ? '' : 's'} excluded: ${lockedNames}. ` +
          (lockedFeatures[0]?.lock_reason || 'These features cannot be modified.')
        )
      }

      if (toggleableIds.length === 0) {
        showError('No toggleable features selected. All selected features are locked.')
        setBulkOperationLoading(false)
        return
      }

      const result = await bulkUpdateStatus(
        toggleableIds,
        status,
        (_processed, _total) => {
          // Progress callback could update UI
        }
      )

      if (result.success) {
        showSuccess(`${result.updated || 0} feature${result.updated === 1 ? '' : 's'} status updated to ${status}`)
        setShowChangeStatusModal(false)
        await fetchFeatures()
        setSelectedFeatureIds(new Set())
      } else {
        if (result.code === 'FEATURE_LOCKED') {
          const lockedNames = result.locked_features?.map(f => f.display_name).join(', ') || 'locked features'
          showError(`Cannot update locked features: ${lockedNames}`)
        } else if (result.code === 'LOCK_HELD') {
          showError('Another bulk operation is in progress. Please wait.')
        } else {
          showError(result.error || 'Operation failed')
        }
      }
    } catch (err: any) {
      showError(err.message || 'Operation failed')
    } finally {
      setBulkOperationLoading(false)
    }
  }

  const handleBulkChangeVisibility = async (roleType: 'admin' | 'coach' | 'parent', visible: boolean) => {
    setBulkOperationLoading(true)
    try {
      const featureIds = Array.from(selectedFeatureIds)
      // When hiding visibility, filter out non-toggleable features
      const applicableIds = visible === false 
        ? getToggleableFeatures(featureIds)
        : featureIds
      const lockedFeatures = visible === false ? getLockedFeatures(featureIds) : []

      // Warn about locked features when hiding
      if (visible === false && lockedFeatures.length > 0) {
        const lockedNames = lockedFeatures.map(f => f.display_name).join(', ')
        showError(
          `${lockedFeatures.length} locked feature${lockedFeatures.length === 1 ? '' : 's'} cannot be hidden: ${lockedNames}. ` +
          (lockedFeatures[0]?.lock_reason || 'These features are required for platform functionality.')
        )
      }

      if (visible === false && applicableIds.length === 0) {
        showError('No toggleable features selected. All selected features are locked and cannot have visibility hidden.')
        setBulkOperationLoading(false)
        return
      }

      const result = await bulkUpdateRoleVisibility(
        applicableIds,
        roleType,
        visible
      )

      if (result.success) {
        const roleName = roleType === 'admin' ? 'Org Admin' : roleType === 'coach' ? 'Coach' : 'Guardian'
        showSuccess(`${result.updated || 0} feature${result.updated === 1 ? '' : 's'} visibility updated for ${roleName}`)
        setShowChangeVisibilityModal(false)
        await fetchFeatures()
        setSelectedFeatureIds(new Set())
      } else {
        if (result.code === 'FEATURE_LOCKED') {
          const lockedNames = result.locked_features?.map(f => f.display_name).join(', ') || 'locked features'
          showError(`Cannot hide visibility of locked features: ${lockedNames}`)
        } else {
          showError(result.error || 'Operation failed')
        }
      }
    } catch (err: any) {
      showError(err.message || 'Operation failed')
    } finally {
      setBulkOperationLoading(false)
    }
  }

  const handleBulkUpdateCategory = async (category: FeatureCategory) => {
    setBulkOperationLoading(true)
    try {
      const result = await bulkUpdateCategory(
        Array.from(selectedFeatureIds),
        category
      )

      if (result.success) {
        showSuccess(`${result.updated || 0} feature${result.updated === 1 ? '' : 's'} category updated to ${category}`)
        setShowUpdateCategoryModal(false)
        await fetchFeatures()
        setSelectedFeatureIds(new Set())
      } else {
        showError(result.error || 'Operation failed')
      }
    } catch (err: any) {
      showError(err.message || 'Operation failed')
    } finally {
      setBulkOperationLoading(false)
    }
  }

  const handleEnableAll = () => {
    // Enable all is safe - locked features are already enabled
    handleBulkChangeStatus('Live')
  }

  const handleDisableAll = () => {
    // Disable all will filter out locked features automatically
    handleBulkChangeStatus('Disabled')
  }

  const handleClearFilters = () => {
    setSearch('')
    setCategoryFilter('')
    setTypeFilter('')
    setStatusFilter([])
    setTierFilter([])
    setRoleFilter([])
    setIntegrationFilter([])
    setQuantifiableFilter(null)
    setSourceFilter(null)
    setSystemFeatureFilter('all')
    setPlatformAdminOnlyFilter('all')
  }

  // Reset to first page when any filter changes so results make sense
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, categoryFilter, typeFilter, statusFilter, tierFilter, roleFilter, integrationFilter, quantifiableFilter, sourceFilter, systemFeatureFilter, platformAdminOnlyFilter])

  // Initial data fetch on mount
  // Initial mount: fetch tiers and run discovery once
  useEffect(() => {
    fetchTiers()
    runDiscovery(false)
    
    return () => {
        abortControllerRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Fetch features when filters change
  useEffect(() => {
    fetchFeatures()
  }, [fetchFeatures])

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

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
            {(row.is_toggleable === false || row.is_removable === false) && (
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '18px',
                  color: 'var(--pa-warning, #f59e0b)',
                  cursor: 'help',
                }}
                title={row.lock_reason || 'This feature is locked and cannot be modified'}
              >
                lock
              </span>
            )}
            {row.is_system_feature && (
              <Badge variant="info" size="small" title="Always available for all license tiers, including new tiers">
                System
              </Badge>
            )}
            {row.platform_admin_only && (
              <Badge variant="neutral" size="small" title="Not available to org users; platform admin only">
                Platform Admin
              </Badge>
            )}
            {row.discovered?.confidenceScore && row.discovered.confidenceScore < 70 && (
                <Badge variant="warning" size="small">Review</Badge>
            )}
            {row.integrations?.length ? (
                row.integrations.map((i: string) => <Badge key={i} variant="neutral" size="small">{i}</Badge>)
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
      render: (row) => {
        // Map DB status to UI status for display
        const statusMap: Record<string, string> = {
          'live': 'Live',
          'beta': row.rollout_status === 'beta' ? 'Draft' : 'Review',
          'hidden': 'Disabled',
        }
        const displayStatus = statusMap[row.rollout_status] || row.rollout_status
        return (
          <Badge variant={row.rollout_status === 'live' ? 'success' : row.rollout_status === 'beta' ? 'warning' : 'neutral'}>
            {displayStatus}
          </Badge>
        )
      },
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
        <OfflineBanner />
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

        {/* Enhanced Filter Bar */}
        <EnhancedFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search features..."
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          tierFilter={tierFilter}
          onTierFilterChange={setTierFilter}
          availableTiers={availableTiers}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          integrationFilter={integrationFilter}
          onIntegrationFilterChange={setIntegrationFilter}
          quantifiableFilter={quantifiableFilter}
          onQuantifiableFilterChange={setQuantifiableFilter}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          systemFeatureFilter={systemFeatureFilter}
          onSystemFeatureFilterChange={setSystemFeatureFilter}
          platformAdminOnlyFilter={platformAdminOnlyFilter}
          onPlatformAdminOnlyFilterChange={setPlatformAdminOnlyFilter}
          onClearAll={handleClearFilters}
        />

        {/* Category + Type filters */}
        <div style={{ display: 'flex', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
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
          <div className="pa-body-s" style={{ color: 'var(--pa-n500)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span>module = feature/capability</span>
            <span>permission = access right</span>
            <span>limit = numeric cap (e.g. max teams)</span>
            <span>visibility = who can see it</span>
            <span>integration = external service</span>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        <BulkActionsToolbar
          selectedCount={selectedFeatureIds.size}
          totalCount={totalCount}
          onApplyToTiers={() => setShowApplyToTiersModal(true)}
          onChangeStatus={() => setShowChangeStatusModal(true)}
          onChangeVisibility={() => setShowChangeVisibilityModal(true)}
          onUpdateCategory={() => setShowUpdateCategoryModal(true)}
          onEnableAll={handleEnableAll}
          onDisableAll={handleDisableAll}
          onClearSelection={() => {
            setSelectedFeatureIds(new Set())
            setSelectAllMode('none')
          }}
          onSelectAllPage={() => handleSelectAllChange('page')}
          onSelectAllResults={() => handleSelectAllChange('all')}
          isSelectAllPage={selectAllMode === 'page'}
          isSelectAllResults={selectAllMode === 'all'}
        />

        {/* Locked Features Warning */}
        {selectedFeatureIds.size > 0 && (() => {
          const locked = getLockedFeatures(Array.from(selectedFeatureIds))
          if (locked.length > 0) {
            return (
              <div 
                className="pa-card pa-mb-4" 
                style={{ 
                  borderLeft: '3px solid var(--pa-warning)', 
                  background: 'var(--pa-warning-bg)',
                  padding: 'var(--pa-space-3)',
                }}
              >
                <div className="pa-flex pa-items-center pa-gap-2">
                  <span className="material-symbols-outlined" style={{ color: 'var(--pa-warning)' }}>lock</span>
                  <div>
                    <div className="pa-body-s" style={{ fontWeight: 600 }}>
                      {locked.length} locked feature{locked.length === 1 ? '' : 's'} in selection
                    </div>
                    <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginTop: 'var(--pa-space-1)' }}>
                      {locked.map(f => f.display_name).join(', ')} will be excluded from bulk operations.
                    </div>
                  </div>
                </div>
              </div>
            )
          }
          return null
        })()}

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
            emptyMessage="No features found. Try adjusting your filters or run feature discovery."
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalCount}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
            selectable={true}
            selectedIds={selectedFeatureIds}
            onSelectionChange={handleSelectionChange}
            selectAllMode={selectAllMode}
            onSelectAllChange={handleSelectAllChange}
        />

        {/* Bulk Action Modals */}
        <ApplyToTiersModal
          open={showApplyToTiersModal}
          selectedFeatures={selectedFeatures}
          availableTiers={availableTiers}
          onConfirm={handleBulkApplyToTiers}
          onCancel={() => {
            setShowApplyToTiersModal(false)
            setBulkOperationLoading(false)
          }}
          onComplete={handleApplyToTiersComplete}
          loading={bulkOperationLoading}
        />

        <ChangeStatusModal
          open={showChangeStatusModal}
          selectedFeatures={selectedFeatures}
          onConfirm={handleBulkChangeStatus}
          onCancel={() => setShowChangeStatusModal(false)}
          loading={bulkOperationLoading}
        />

        <ChangeVisibilityModal
          open={showChangeVisibilityModal}
          selectedFeatures={selectedFeatures}
          onConfirm={handleBulkChangeVisibility}
          onCancel={() => setShowChangeVisibilityModal(false)}
          loading={bulkOperationLoading}
        />

        <UpdateCategoryModal
          open={showUpdateCategoryModal}
          selectedFeatures={selectedFeatures}
          onConfirm={handleBulkUpdateCategory}
          onCancel={() => setShowUpdateCategoryModal(false)}
          loading={bulkOperationLoading}
        />
        </div>
    </DiscoveryErrorBoundary>
  )
}
