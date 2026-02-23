import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getLink, RouteKeys } from '../../utils/routes'
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
  SetAsSystemFeatureModal,
  SetPlatformOnlyModal,
  ExcludeFromDiscoveryModal,
  ImportFeaturesModal,
  OfflineBanner,
  ErrorState,
} from '../../components/platformAdmin'
import type { FeatureEntitlementWithCounts } from '../../types/licenseTiers.types'
import { FEATURE_CATEGORIES, FEATURE_TYPES } from '../../utils/licenseTierConstants'
import { discoverAndReconcile } from '../../utils/featureDiscovery/reconciler'
import type { DiscoveredFeature } from '../../utils/featureDiscovery/types'
import { 
  bulkUpdateStatus, 
  bulkUpdateCategory, 
  bulkApplyToTiers, 
  bulkUpdateRoleVisibility,
  bulkSetSystemFeature,
  bulkSetPlatformOnly,
  bulkExcludeFromDiscovery
} from '../../data/services/featureBulkOperations'
import { showSuccess, showError, showInfo } from '../../utils/toast'
import type { FeatureCategory } from '../../types/licenseTiers.types'
import { useI18n } from '../../i18n/useI18n'
import { formatToastMessage, formatPlural } from '../../utils/toastMessages'
import { exportToCSV, exportToXLSX } from '../../utils/reporting/exportFormatters'
import { importFeaturesFromJSON } from '../../data/services/featureImportService'

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

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FeatureCatalog() {
  useDebugLifecycle('FeatureCatalog')
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  // Silent refresh: invalidate query cache (declared early for use in useEffects)
  const silentRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['feature-catalog'] })
  }, [queryClient])

  // Platform admin check
  if (!profile?.isPlatformAdmin) {
    return <Navigate to={getLink(RouteKeys.PORTAL_DASHBOARD)} replace />
  }
  const [exporting, setExporting] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false)
      }
    }

    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [exportMenuOpen])

  // Fetch all features for export (not paginated)
  const fetchAllFeaturesForExport = useCallback(async () => {
    try {
      let query = supabase
        .from('admin_feature_entitlements_list')
        .select('feature_key, display_name, category, feature_type, description')
        .is('archived_at', null)
        .order('category', { ascending: true })
        .order('display_name', { ascending: true })

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data || []
    } catch (err: any) {
      console.error('Error fetching features for export:', err)
      throw err
    }
  }, [])

  // Import handler
  const handleImport = useCallback(async (file: File) => {
    setImporting(true)
    try {
      const text = await file.text()
      const jsonData = JSON.parse(text)

      if (!jsonData.features || !Array.isArray(jsonData.features)) {
        throw new Error('Invalid JSON format: features array is required')
      }

      const result = await importFeaturesFromJSON(jsonData, (processed, total) => {
        // Progress callback could update UI
        console.log(`Importing: ${processed}/${total}`)
      })

      if (result.success) {
        showSuccess(
          `Import completed: ${result.updated} feature${result.updated === 1 ? '' : 's'} updated, ` +
          `${result.skipped} skipped${result.errors.length > 0 ? `, ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}` : ''}`
        )
        setShowImportModal(false)
        await queryClient.invalidateQueries({ queryKey: ['feature-catalog'] })
      } else {
        const errorMessages = result.errors.map(e => `${e.feature_key}: ${e.error}`).join('; ')
        showError(`Import completed with errors: ${errorMessages}`)
      }
    } catch (err: any) {
      console.error('Import failed:', err)
      showError(err.message || 'Failed to import features')
      throw err
    } finally {
      setImporting(false)
    }
  }, [queryClient])

  // Export handler
  const handleExport = useCallback(async (format: 'csv' | 'xlsx') => {
    setExporting(true)
    setExportMenuOpen(false)

    try {
      const allFeatures = await fetchAllFeaturesForExport()

      if (!allFeatures || allFeatures.length === 0) {
        showError('No features to export')
        return
      }

      // Format data with requested fields: feature_key, name, category, type, description
      const exportData = allFeatures.map((feature: any) => ({
        'Feature Key': feature.feature_key || '',
        Name: feature.display_name || '',
        Category: feature.category || '',
        Type: feature.feature_type || '',
        Description: feature.description || '',
      }))

      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `features-export-${timestamp}`

      if (format === 'csv') {
        exportToCSV(exportData, filename)
        showSuccess(`Exported ${allFeatures.length} features to CSV`)
      } else {
        exportToXLSX(exportData, filename, 'Features')
        showSuccess(`Exported ${allFeatures.length} features to Excel`)
      }
    } catch (err: any) {
      console.error('Export failed:', err)
      showError(err.message || 'Failed to export features')
    } finally {
      setExporting(false)
    }
  }, [fetchAllFeaturesForExport])
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
  const [tierExclusiveMode, setTierExclusiveMode] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string[]>([])
  const [roleExclusiveMode, setRoleExclusiveMode] = useState(false)
  const [integrationFilter, setIntegrationFilter] = useState<string[]>([])
  const [quantifiableFilter, setQuantifiableFilter] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const [systemFeatureFilter, setSystemFeatureFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [platformAdminOnlyFilter, setPlatformAdminOnlyFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [hierarchyFilter, setHierarchyFilter] = useState<'all' | 'parents' | 'children'>('all')
  const [addonFilter, setAddonFilter] = useState<'all' | 'yes' | 'no'>('all')

  // Pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)

  // Selection State
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set())
  const [selectAllMode, setSelectAllMode] = useState<'none' | 'page' | 'all'>('none')
  const prevFiltersRef = useRef<{ statusFilter: string[]; tierFilter: string[]; roleFilter: string[]; integrationFilter: string[]; quantifiableFilter: string | null; sourceFilter: string | null; systemFeatureFilter: 'all' | 'yes' | 'no'; platformAdminOnlyFilter: 'all' | 'yes' | 'no'; hierarchyFilter: 'all' | 'parents' | 'children'; addonFilter: 'all' | 'yes' | 'no' }>({ 
    statusFilter: [], 
    tierFilter: [], 
    roleFilter: [], 
    integrationFilter: [], 
    quantifiableFilter: null, 
    sourceFilter: null,
    systemFeatureFilter: 'all',
    platformAdminOnlyFilter: 'all',
    hierarchyFilter: 'all',
    addonFilter: 'all'
  })

  // Modal States
  const [showApplyToTiersModal, setShowApplyToTiersModal] = useState(false)
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false)
  const [showChangeVisibilityModal, setShowChangeVisibilityModal] = useState(false)
  const [showUpdateCategoryModal, setShowUpdateCategoryModal] = useState(false)
  const [showSetSystemFeatureModal, setShowSetSystemFeatureModal] = useState(false)
  const [showSetPlatformOnlyModal, setShowSetPlatformOnlyModal] = useState(false)
  const [showExcludeFromDiscoveryModal, setShowExcludeFromDiscoveryModal] = useState(false)
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [excludedFeatureIds, setExcludedFeatureIds] = useState<Set<string>>(new Set())
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set<string>())

  // Fetch license tiers for filter
  const { data: availableTiers = [] } = useQuery({
    queryKey: ['feature-catalog-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('license_tiers')
        .select('id, tier_key, tier_name')
        .eq('status', 'active')
        .order('tier_key', { ascending: true })
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Fetch features with enhanced filters
  const { data: featuresData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['feature-catalog', page, rowsPerPage, debouncedSearch, categoryFilter, typeFilter, statusFilter, tierFilter, roleFilter, integrationFilter, quantifiableFilter, sourceFilter, systemFeatureFilter, platformAdminOnlyFilter, hierarchyFilter, addonFilter, tierExclusiveMode, roleExclusiveMode],
    queryFn: async () => {
      let query = supabase
        .from('admin_feature_entitlements_list')
        .select('*', { count: 'exact' })
        .is('archived_at', null)
        // Filter out excluded features at database level (handle both false and null)
        .or('excluded_from_discovery.is.null,excluded_from_discovery.eq.false')

      // Search (use debounced value, require at least 2 characters for search)
      if (debouncedSearch && debouncedSearch.length >= 2) {
        query = query.or(`feature_key.ilike.%${debouncedSearch}%,display_name.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`)
      }

      // Category filter
      if (categoryFilter) {
        if (categoryFilter === 'Uncategorized') {
          query = query.or('category.is.null,category.eq.')
        } else {
          query = query.eq('category', categoryFilter)
        }
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
        } else if (tierExclusiveMode && tierFilter.length === 1) {
          query = query
            .contains('assigned_tier_keys', [tierFilter[0]])
            .containedBy('assigned_tier_keys', [tierFilter[0]])
        } else {
          try {
            query = query.overlaps('assigned_tier_keys', tierFilter)
          } catch (err) {
            console.warn('Overlaps operator not supported, using alternative filter')
          }
        }
      }

      // Role visibility filter
      if (roleExclusiveMode && roleFilter.length === 1) {
        const role = roleFilter[0]
        if (role === 'orgAdmin') {
          query = query.eq('visible_to_admin', true).eq('visible_to_coach', false).eq('visible_to_parent', false)
        } else if (role === 'coach') {
          query = query.eq('visible_to_admin', false).eq('visible_to_coach', true).eq('visible_to_parent', false)
        } else if (role === 'guardian') {
          query = query.eq('visible_to_admin', false).eq('visible_to_coach', false).eq('visible_to_parent', true)
        }
      } else {
        if (roleFilter.includes('orgAdmin')) {
          query = query.eq('visible_to_admin', true)
        }
        if (roleFilter.includes('coach')) {
          query = query.eq('visible_to_coach', true)
        }
        if (roleFilter.includes('guardian')) {
          query = query.eq('visible_to_parent', true)
        }
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

      // Hierarchy filter
      if (hierarchyFilter === 'parents') {
        query = query.is('parent_feature_key', null)
      } else if (hierarchyFilter === 'children') {
        query = query.not('parent_feature_key', 'is', null)
      }

      // Add-on filter
      if (addonFilter === 'yes') {
        query = query.eq('available_as_addon', true)
      } else if (addonFilter === 'no') {
        query = query.eq('available_as_addon', false)
      }

      query = query.order('category', { ascending: true }).order('display_name', { ascending: true })

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      const normalized = (data || []).map(row => ({
        ...row,
        assigned_tier_keys: normalizeArrayField(row.assigned_tier_keys) || [],
        integrations: normalizeArrayField(row.integrations) || [],
      })) as FeatureEntitlementWithCounts[]

      // Filter out excluded features (backup filter in case view doesn't have the column)
      const filtered = normalized.filter(f => {
        const excluded = (f as any).excluded_from_discovery
        return excluded !== true && excluded !== 'true'
      })
      const filteredCount = count ? count - (normalized.length - filtered.length) : filtered.length

      return { features: filtered, totalCount: filteredCount }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Memoize features to prevent unnecessary re-renders
  // Use a stable reference by checking if featuresData exists
  const features = useMemo(() => {
    if (!featuresData?.features) return []
    return featuresData.features
  }, [featuresData])
  const totalCount = featuresData?.totalCount || 0

  // Track if we've initialized expanded parents to prevent infinite loops
  const hasInitializedExpandedParents = useRef(false)
  const prevFeatureKeysRef = useRef<string>('')

  // Auto-expand all parents by default when features load (only once per data load)
  useEffect(() => {
    if (features.length === 0) {
      // Reset flag if features are cleared
      if (hasInitializedExpandedParents.current) {
        hasInitializedExpandedParents.current = false
        prevFeatureKeysRef.current = ''
      }
      return
    }

    // Create a stable key from feature keys to detect actual data changes
    const currentFeatureKeys = features.map(f => f.feature_key).sort().join(',')
    
    // Only run if feature keys actually changed (new data loaded)
    if (currentFeatureKeys !== prevFeatureKeysRef.current) {
      const parentKeys = new Set<string>()
      features.forEach(f => {
        if (!(f as any).parent_feature_key) {
          // Check if this parent has children
          const hasChildren = features.some(child => (child as any).parent_feature_key === f.feature_key)
          if (hasChildren) {
            parentKeys.add(f.feature_key)
          }
        }
      })
      
      // Only update state if there are actually changes
      setExpandedParents(prev => {
        const prevKeysArray = Array.from(prev).sort()
        const newKeysArray = Array.from(parentKeys).sort()
        const keysChanged = prevKeysArray.length !== newKeysArray.length || 
                           prevKeysArray.some((key, i) => key !== newKeysArray[i])
        
        if (!keysChanged) {
          return prev // No change needed, return same reference
        }
        return parentKeys // Expand all parents by default
      })
      
      prevFeatureKeysRef.current = currentFeatureKeys
      hasInitializedExpandedParents.current = true
    }
  }, [features])

  // Debounce search input (400ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Auto-filter selections when results change
  const prevSelectionCountRef = useRef(0)
  const prevFeatureIdsRef = useRef<Set<string>>(new Set())
  
  useEffect(() => {
    const currentIds = new Set(features.map(f => f.id))
    const currentIdsString = Array.from(currentIds).sort().join(',')
    const prevIdsString = Array.from(prevFeatureIdsRef.current).sort().join(',')
    
    // Only update if the feature IDs actually changed
    if (currentIdsString !== prevIdsString) {
      prevFeatureIdsRef.current = currentIds
      
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
    }
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
    prevFiltersRef.current = {
      statusFilter,
      tierFilter,
      roleFilter,
      integrationFilter,
      quantifiableFilter,
      sourceFilter,
      systemFeatureFilter,
      platformAdminOnlyFilter,
      hierarchyFilter,
      addonFilter,
    }
  }, [statusFilter, tierFilter, roleFilter, integrationFilter, quantifiableFilter, sourceFilter, systemFeatureFilter, platformAdminOnlyFilter, hierarchyFilter, addonFilter, selectedFeatureIds.size])

  // Discovery Logic
  const { data: discoveryData, isLoading: discoveryLoading } = useQuery({
    queryKey: ['feature-catalog-discovery'],
    queryFn: async () => {
      const results = await discoverAndReconcile(false)
      const { data: cache } = await supabase.from('feature_discovery_cache').select('*').order('created_at', { ascending: false }).limit(1).single()
      return {
        features: results,
        lastDiscoveredAt: cache?.last_discovered_at || null,
        syncStatus: cache?.sync_status || null,
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  })

  const discoveredFeatures = discoveryData?.features || []
  const lastDiscoveredAt = discoveryData?.lastDiscoveredAt || null
  const syncStatus = discoveryData?.syncStatus || null

  const runDiscovery = useCallback(async (force = false) => {
    if (force) {
      const results = await discoverAndReconcile(true)
      const { data: cache } = await supabase.from('feature_discovery_cache').select('*').order('created_at', { ascending: false }).limit(1).single()
      queryClient.setQueryData(['feature-catalog-discovery'], {
        features: results,
        lastDiscoveredAt: cache?.last_discovered_at || null,
        syncStatus: cache?.sync_status || null,
      })
    } else {
      await queryClient.invalidateQueries({ queryKey: ['feature-catalog-discovery'] })
    }
  }, [queryClient])

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
    setSyncLoading(true)
    
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
      
      // Clear feature gate cache after sync
      const { clearFeatureGateCache } = await import('../../lib/featureGate/api')
      clearFeatureGateCache()
      
      await new Promise(resolve => setTimeout(resolve, 500))
      await queryClient.invalidateQueries({ queryKey: ['feature-catalog-discovery'] })
      await queryClient.invalidateQueries({ queryKey: ['feature-catalog'] })
      
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
      setSyncLoading(false)
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
    setBulkOperationLoading(true)
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
        setShowApplyToTiersModal(false)
        setSelectedFeatureIds(new Set())
        setBulkOperationLoading(false)
        await silentRefresh()
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
      setBulkOperationLoading(false)
      if (err.message !== 'LOCK_HELD' && err.message !== 'Operation failed' && err.message !== 'FEATURE_LOCKED' && err.message !== 'ALL_LOCKED') {
        showError(err.message || t('toast.error.operationFailed'))
      }
      throw err // Re-throw to let modal handle it
    }
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
        await silentRefresh()
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
        await silentRefresh()
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
        await silentRefresh()
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

  const handleBulkSetSystemFeature = async () => {
    setBulkOperationLoading(true)
    try {
      const result = await bulkSetSystemFeature(Array.from(selectedFeatureIds))

      if (result.success) {
        showSuccess(`${result.updated || 0} feature${result.updated === 1 ? '' : 's'} set as system feature`)
        setShowSetSystemFeatureModal(false)
        await silentRefresh()
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

  const handleBulkSetPlatformOnly = async () => {
    setBulkOperationLoading(true)
    try {
      const result = await bulkSetPlatformOnly(Array.from(selectedFeatureIds))

      if (result.success) {
        showSuccess(`${result.updated || 0} feature${result.updated === 1 ? '' : 's'} set to platform admin only`)
        setShowSetPlatformOnlyModal(false)
        await silentRefresh()
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

  const handleBulkExcludeFromDiscovery = async () => {
    setBulkOperationLoading(true)
    try {
      const result = await bulkExcludeFromDiscovery(Array.from(selectedFeatureIds))

      if (result.success) {
        showSuccess(`${result.updated || 0} feature${result.updated === 1 ? '' : 's'} marked as "not a feature" and excluded from discovery`)
        setShowExcludeFromDiscoveryModal(false)
        await silentRefresh()
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

  const handleExcludeFromDiscovery = useCallback(async (featureId: string) => {
    // Start fade-out animation immediately
    setExcludedFeatureIds(prev => new Set(prev).add(featureId))
    
    try {
      const result = await bulkExcludeFromDiscovery([featureId])
      if (result.success) {
        showSuccess('Feature marked as "not a feature" and excluded from discovery')
        // Invalidate query to refresh data (excluded feature will be filtered out by backend)
        await queryClient.invalidateQueries({ queryKey: ['feature-catalog'] })
        // Remove from excludedFeatureIds after fade animation completes (300ms)
        // This ensures smooth fade-out even if query refetches quickly
        setTimeout(() => {
          setExcludedFeatureIds(prev => {
            const next = new Set(prev)
            next.delete(featureId)
            return next
          })
        }, 300)
      } else {
        // Revert optimistic update on error
        setExcludedFeatureIds(prev => {
          const next = new Set(prev)
          next.delete(featureId)
          return next
        })
        showError(result.error || 'Operation failed')
      }
    } catch (err: any) {
      // Revert optimistic update on error
      setExcludedFeatureIds(prev => {
        const next = new Set(prev)
        next.delete(featureId)
        return next
      })
      showError(err.message || 'Operation failed')
    }
  }, [queryClient])

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
    setHierarchyFilter('all')
    setAddonFilter('all')
  }

  // Reset to first page when any filter changes so results make sense
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, categoryFilter, typeFilter, statusFilter, tierFilter, roleFilter, integrationFilter, quantifiableFilter, sourceFilter, systemFeatureFilter, platformAdminOnlyFilter, hierarchyFilter, addonFilter])


  // Group features by parent-child relationships and sort
  const organizedRows = useMemo(() => {
    // Separate parents and children
    const parents: (FeatureEntitlementWithCounts & { discovered?: DiscoveredFeature })[] = []
    const childrenByParent = new Map<string, (FeatureEntitlementWithCounts & { discovered?: DiscoveredFeature })[]>()
    
    // First pass: categorize all features
    features.forEach(f => {
      const discovered = discoveredFeatures.find(df => df.featureKey === f.feature_key)
      const row = { ...f, discovered }
      
      if (!(f as any).parent_feature_key) {
        parents.push(row)
      } else {
        const parentKey = (f as any).parent_feature_key
        if (!childrenByParent.has(parentKey)) {
          childrenByParent.set(parentKey, [])
        }
        childrenByParent.get(parentKey)!.push(row)
      }
    })
    
    // Sort parents by category, then display_name
    parents.sort((a, b) => {
      const categoryCompare = (a.category || '').localeCompare(b.category || '')
      if (categoryCompare !== 0) return categoryCompare
      return (a.display_name || '').localeCompare(b.display_name || '')
    })
    
    // Sort children within each parent group
    childrenByParent.forEach((children) => {
      children.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''))
    })
    
    // Build final ordered list: parent, then its children (if expanded), then next parent...
    const result: (FeatureEntitlementWithCounts & { discovered?: DiscoveredFeature })[] = []
    
    parents.forEach(parent => {
      result.push(parent)
      
      // Add children if parent is expanded
      if (expandedParents.has(parent.feature_key)) {
        const children = childrenByParent.get(parent.feature_key) || []
        children.forEach(child => {
          result.push(child)
        })
      }
    })
    
    return result
  }, [features, discoveredFeatures, expandedParents])

  const rows = organizedRows

  // Row style function for fade-out animation
  const getRowStyle = useCallback((row: FeatureEntitlementWithCounts & { discovered?: DiscoveredFeature }) => {
    if (excludedFeatureIds.has(row.id)) {
      return {
        opacity: 0,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: 'none' as const,
      }
    }
    return undefined
  }, [excludedFeatureIds])

  const columns: ColumnConfig<FeatureEntitlementWithCounts & { discovered?: DiscoveredFeature }>[] = useMemo(() => [
    {
      id: 'display_name',
      label: 'Feature',
      sortable: true,
      render: (row) => {
        const isParent = !(row as any).parent_feature_key
        const hasChildren = features.some(f => (f as any).parent_feature_key === row.feature_key)
        const isExpanded = expandedParents.has(row.feature_key)
        const isChild = !!(row as any).parent_feature_key
        
        return (
          <div>
            <div className="pa-body-m" style={{ fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              {/* Collapse/expand button for parents */}
              {isParent && hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedParents(prev => {
                      const next = new Set(prev)
                      if (next.has(row.feature_key)) {
                        next.delete(row.feature_key)
                      } else {
                        next.add(row.feature_key)
                      }
                      return next
                    })
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--pa-n600)',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                  title={isExpanded ? 'Collapse children' : 'Expand children'}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '20px',
                      transition: 'transform 0.2s ease',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                  >
                    chevron_right
                  </span>
                </button>
              ) : (
                <span style={{ width: '24px', flexShrink: 0 }} />
              )}
              {/* Child indicator */}
              {isChild && (
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '16px',
                    color: 'var(--pa-n500)',
                    cursor: 'help',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                  title={`Child of ${(row as any).parent_feature_key}`}
                >
                  subdirectory_arrow_right
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{row.display_name}</div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px', fontFamily: 'var(--pa-font-mono)' }}>
                  {row.feature_key}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginTop: '2px' }}>
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
            </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
             {row.discovered?.discoveredFrom.includes('routes') && <span title="Discovered in Routes">🛣️</span>}
             {row.discovered?.discoveredFrom.includes('schema') && <span title="Discovered in DB Schema">💾</span>}
             {row.discovered?.discoveredFrom.includes('services') && <span title="Discovered in Services">⚙️</span>}
          </div>
        </div>
      )
      },
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
      id: 'available_as_addon',
      label: 'Add-On',
      render: (row) => {
        const isAddOn = (row as any).available_as_addon === true
        const isPublic = (row as any).addon_is_public === true
        const hasPriceId = !!(row as any).addon_stripe_price_id
        const externalName = (row as any).addon_external_name
        
        if (!isAddOn) {
          return <span className="pa-body-s" style={{ color: 'var(--pa-n400)' }}>-</span>
        }
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Badge variant={isPublic ? 'success' : 'neutral'} size="small">
              {isPublic ? 'Public' : 'Private'}
            </Badge>
            {hasPriceId && (
              <div className="pa-body-xs" style={{ color: 'var(--pa-n500)', fontFamily: 'var(--pa-font-mono)' }}>
                {(row as any).addon_stripe_price_id?.slice(0, 12)}...
              </div>
            )}
            {externalName && (
              <div className="pa-body-xs" style={{ color: 'var(--pa-n600)' }}>
                {externalName}
              </div>
            )}
          </div>
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
            onClick={() => navigate(getLink(RouteKeys.PLATFORM_LICENSE_FEATURE_DETAIL, { id: row.id }))}
            disabled={excludedFeatureIds.has(row.id)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="dense"
            onClick={() => handleExcludeFromDiscovery(row.id)}
            style={{ color: 'var(--pa-warning)' }}
            disabled={excludedFeatureIds.has(row.id)}
          >
            Not a Feature
          </Button>
        </div>
      ),
    },
  ], [handleExcludeFromDiscovery, navigate, discoveredFeatures, features, expandedParents])

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
                    syncStatus={syncStatus as 'pending' | 'synced' | 'failed' | null}
                    loading={discoveryLoading || syncLoading}
                    onRefresh={() => runDiscovery(true)}
                    onSync={handleSync}
                />
                <div ref={exportMenuRef} style={{ position: 'relative' }}>
                  <Button
                      variant="secondary"
                      onClick={() => setExportMenuOpen(!exportMenuOpen)}
                      disabled={exporting}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {exporting ? 'sync' : 'download'}
                      </span>
                      {exporting ? 'Exporting...' : 'Export'}
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        {exportMenuOpen ? 'expand_less' : 'expand_more'}
                      </span>
                  </Button>
                  {exportMenuOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        backgroundColor: 'var(--pa-surface)',
                        border: '1px solid var(--pa-border)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 1000,
                        minWidth: '160px',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={() => handleExport('csv')}
                        disabled={exporting}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          textAlign: 'left',
                          border: 'none',
                          background: 'transparent',
                          cursor: exporting ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          opacity: exporting ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!exporting) {
                            e.currentTarget.style.backgroundColor = 'var(--pa-neutral-50)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                          description
                        </span>
                        <span>Export CSV</span>
                      </button>
                      <button
                        onClick={() => handleExport('xlsx')}
                        disabled={exporting}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          textAlign: 'left',
                          border: 'none',
                          background: 'transparent',
                          cursor: exporting ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          opacity: exporting ? 0.5 : 1,
                          borderTop: '1px solid var(--pa-border)',
                        }}
                        onMouseEnter={(e) => {
                          if (!exporting) {
                            e.currentTarget.style.backgroundColor = 'var(--pa-neutral-50)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                          table_chart
                        </span>
                        <span>Export Excel</span>
                      </button>
                    </div>
                  )}
                </div>
                <Button
                    variant="secondary"
                    onClick={() => setShowImportModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        upload
                    </span>
                    Import
                </Button>
                <Button
                    variant="primary"
                    onClick={() => navigate(getLink(RouteKeys.PLATFORM_LICENSE_FEATURE_DETAIL, { id: 'new' }))}
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
          tierExclusiveMode={tierExclusiveMode}
          onTierExclusiveModeChange={setTierExclusiveMode}
          availableTiers={availableTiers}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          roleExclusiveMode={roleExclusiveMode}
          onRoleExclusiveModeChange={setRoleExclusiveMode}
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
          hierarchyFilter={hierarchyFilter}
          onHierarchyFilterChange={setHierarchyFilter}
          addonFilter={addonFilter}
          onAddonFilterChange={setAddonFilter}
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
          onSetSystemFeature={() => setShowSetSystemFeatureModal(true)}
          onSetPlatformOnly={() => setShowSetPlatformOnlyModal(true)}
          onExcludeFromDiscovery={() => setShowExcludeFromDiscoveryModal(true)}
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

        {fetchError && (
          <div style={{ marginBottom: '24px' }}>
            <ErrorState
              title="Failed to Load Features"
              message={fetchError instanceof Error ? fetchError.message : 'Failed to load features'}
              onRetry={() => {
                queryClient.invalidateQueries({ queryKey: ['feature-catalog'] })
              }}
              retryLabel="Retry"
            />
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
            getRowStyle={getRowStyle}
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

        <SetAsSystemFeatureModal
          open={showSetSystemFeatureModal}
          selectedFeatures={selectedFeatures}
          onConfirm={handleBulkSetSystemFeature}
          onCancel={() => setShowSetSystemFeatureModal(false)}
          loading={bulkOperationLoading}
        />

        <SetPlatformOnlyModal
          open={showSetPlatformOnlyModal}
          selectedFeatures={selectedFeatures}
          onConfirm={handleBulkSetPlatformOnly}
          onCancel={() => setShowSetPlatformOnlyModal(false)}
          loading={bulkOperationLoading}
        />

        <ExcludeFromDiscoveryModal
          open={showExcludeFromDiscoveryModal}
          selectedFeatures={selectedFeatures}
          onConfirm={handleBulkExcludeFromDiscovery}
          onCancel={() => setShowExcludeFromDiscoveryModal(false)}
          loading={bulkOperationLoading}
        />

        <ImportFeaturesModal
          open={showImportModal}
          onConfirm={handleImport}
          onCancel={() => setShowImportModal(false)}
          loading={importing}
        />
        </div>
    </DiscoveryErrorBoundary>
  )
}
