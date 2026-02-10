import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, Card, FilterBar, ConfirmDialog, Button, Input, Select, PlatformDataTable, type ColumnConfig, ErrorState } from '../../components/platformAdmin'
import { EntitySelect } from '../../components/common/EntitySelect'
import { canPerformAction } from '../../utils/platformAdminPermissions'
import { getEnvironment } from '../../utils/featureFlags'
import { mapFeatureFlagOverride, isRpcSuccessResponse } from '../../utils/typeAdapters'
import type { 
  AdminFeatureFlag, 
  FeatureFlagValueType, 
  FeatureFlagEnvironment,
  FeatureFlagOverride,
  CreateFeatureFlagRequest,
  RpcResponse,
} from '../../types/featureFlags.types'
import type { PlatformAdminRole } from '../../types/platformAdmin.types'
import { showSuccess } from '../../utils/toast'

type TabType = 'flags' | 'overrides' | 'audit'

export default function FeatureFlags() {
  const db = supabase as any
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('flags')
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([])
  const [overrides, setOverrides] = useState<FeatureFlagOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [environmentFilter, setEnvironmentFilter] = useState<FeatureFlagEnvironment | 'all'>('all')
  const [showDeleted, setShowDeleted] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  
  // Dialog states
  const [createDialog, setCreateDialog] = useState(false)
  const [editDefaultDialog, setEditDefaultDialog] = useState<{ open: boolean; flag: AdminFeatureFlag | null }>({ open: false, flag: null })
  const [orgOverrideDialog, setOrgOverrideDialog] = useState<{ open: boolean; flag: AdminFeatureFlag | null }>({ open: false, flag: null })
  const [userOverrideDialog, setUserOverrideDialog] = useState<{ open: boolean; flag: AdminFeatureFlag | null }>({ open: false, flag: null })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; flag: AdminFeatureFlag | null }>({ open: false, flag: null })
  const [restoreDialog, setRestoreDialog] = useState<{ open: boolean; flag: AdminFeatureFlag | null }>({ open: false, flag: null })
  const [overrideToRemove, setOverrideToRemove] = useState<FeatureFlagOverride | null>(null)
  
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  
  // Form states
  const [flagType, setFlagType] = useState<'platform' | 'org'>('platform')
  const [newFlag, setNewFlag] = useState<CreateFeatureFlagRequest>({
    key: '',
    value_type: 'boolean',
    description: '',
    environment: getEnvironment(),
  })
  const [newOrgFlag, setNewOrgFlag] = useState<{ org_id: string | null; feature_key: string; enabled: boolean }>({
    org_id: null,
    feature_key: '',
    enabled: false,
  })
  const [defaultValue, setDefaultValue] = useState<{ boolean?: boolean; integer?: number; double?: number }>({})
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [orgValue, setOrgValue] = useState<{ boolean?: boolean; integer?: number; double?: number }>({})
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userValue, setUserValue] = useState<{ boolean?: boolean; integer?: number; double?: number }>({})
  
  // TODO: Fetch actual role
  const [adminRole] = useState<PlatformAdminRole>('super_admin')

  const fetchFlags = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Use admin_feature_flags_list view for platform-wide feature flags
      let query = supabase
        .from('admin_feature_flags_list')
        .select('*', { count: 'exact' })

      // Only filter by environment if not "all"
      if (environmentFilter !== 'all') {
        query = query.eq('environment', environmentFilter)
      }

      if (search) {
        query = query.or(`key.ilike.%${search}%,description.ilike.%${search}%`)
      }
      
      if (!showDeleted) {
        query = query.is('deleted_at', null)
      }
      
      query = query.order('environment', { ascending: true }).order('key', { ascending: true })
      
      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)
      
      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching feature flags:', error)
        setError(error.message || 'Failed to load feature flags')
        setFlags([])
        setTotalCount(0)
      } else {
        // Map to AdminFeatureFlag type
        const mappedFlags = (data || []).map((row: any) => ({
          id: row.id,
          key: row.key,
          value_type: row.value_type,
          description: row.description,
          environment: row.environment,
          deleted_at: row.deleted_at,
          version: row.version,
          created_at: row.created_at,
          updated_at: row.updated_at,
          default_value_boolean: row.default_value_boolean,
          default_value_integer: row.default_value_integer,
          default_value_double: row.default_value_double,
          org_override_count: row.org_override_count,
          user_override_count: row.user_override_count,
        })) as AdminFeatureFlag[]
        setFlags(mappedFlags)
        setTotalCount(count || 0)
        setError(null)
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setFlags([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search, environmentFilter, showDeleted])
  
  const fetchOverrides = useCallback(async () => {
    try {
      // The admin_feature_flag_overrides view may not exist in production
      // Skip fetching overrides if the view doesn't exist
      const { data, error } = await db
        .from('admin_feature_flag_overrides')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        // If table doesn't exist, just return empty array instead of showing error
        if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
          console.log('admin_feature_flag_overrides view not available')
          setOverrides([])
          return
        }
        console.error('Error fetching overrides:', error)
        setOverrides([])
      } else {
        // Map rows to include id field
        const mapped = (data || []).map((row: any) => mapFeatureFlagOverride(row))
        setOverrides(mapped)
      }
    } catch (err) {
      console.error('Error:', err)
      setOverrides([])
    }
  }, [])
  
  useEffect(() => {
    if (activeTab === 'flags') {
      fetchFlags()
    } else if (activeTab === 'overrides') {
      fetchOverrides()
    }
  }, [activeTab, fetchFlags, fetchOverrides])


  const handleCreateFlag = async (_reason: string) => {
    if (flagType === 'platform') {
      if (!newFlag.key.trim()) {
        setDialogError('Flag key is required')
        return
      }
      
      setDialogLoading(true)
      setDialogError(null)
      
      try {
        const { data, error } = await supabase.rpc('admin_create_feature_flag', {
          p_key: newFlag.key.trim().toLowerCase(),
          p_value_type: newFlag.value_type,
          p_description: newFlag.description || null,
          p_environment: newFlag.environment,
        } as any)
        
        if (error) {
          setDialogError(error.message)
          return
        }
        
        if (!isRpcSuccessResponse(data) || !(data as RpcResponse).success) {
          setDialogError((data as RpcResponse)?.error || 'Unknown error')
          return
        }
        
        setCreateDialog(false)
        setNewFlag({ key: '', value_type: 'boolean', description: '', environment: getEnvironment() })
        showSuccess('Feature flag created successfully')
        await fetchFlags()
      } catch (err) {
        setDialogError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setDialogLoading(false)
      }
    } else {
      // Org-specific flag
      if (!newOrgFlag.org_id) {
        setDialogError('Organization is required')
        return
      }
      if (!newOrgFlag.feature_key.trim()) {
        setDialogError('Feature key is required')
        return
      }
      
      setDialogLoading(true)
      setDialogError(null)
      
      try {
        const { error } = await supabase
          .from('feature_flags')
          .insert({
            org_id: newOrgFlag.org_id,
            feature_key: newOrgFlag.feature_key.trim().toLowerCase(),
            enabled: newOrgFlag.enabled,
          })
        
        if (error) {
          setDialogError(error.message)
          return
        }
        
        setCreateDialog(false)
        setNewOrgFlag({ org_id: null, feature_key: '', enabled: false })
        showSuccess('Org feature flag created successfully')
        await fetchFlags()
      } catch (err) {
        setDialogError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setDialogLoading(false)
      }
    }
  }
  
  const handleSetPlatformDefault = async (reason: string) => {
    if (!editDefaultDialog.flag) return
    
    const flag = editDefaultDialog.flag
    const valueCount = (defaultValue.boolean !== undefined ? 1 : 0) + 
                       (defaultValue.integer !== undefined ? 1 : 0) + 
                       (defaultValue.double !== undefined ? 1 : 0)
    
    if (valueCount !== 1) {
      setDialogError('Exactly one value must be provided')
      return
    }
    
    setDialogLoading(true)
    setDialogError(null)
    
    try {
      const { data, error } = await supabase.rpc('admin_set_platform_default', {
        p_feature_flag_id: flag.id,
        p_value_boolean: defaultValue.boolean ?? null,
        p_value_integer: defaultValue.integer ?? null,
        p_value_double: defaultValue.double ?? null,
        p_environment: flag.environment,
        p_reason: reason,
        p_expected_version: flag.version,
      } as any)
      
      if (error) {
        setDialogError(error.message)
        return
      }
      
      if (!isRpcSuccessResponse(data) || !(data as RpcResponse).success) {
        setDialogError((data as RpcResponse)?.error || 'Unknown error')
        return
      }
      
      setEditDefaultDialog({ open: false, flag: null })
      setDefaultValue({})
      showSuccess('Platform default updated successfully')
      fetchFlags()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDialogLoading(false)
    }
  }
  
  const handleSetOrgOverride = async (reason: string) => {
    if (!orgOverrideDialog.flag || !selectedOrgId) return
    
    const flag = orgOverrideDialog.flag
    const valueCount = (orgValue.boolean !== undefined ? 1 : 0) + 
                       (orgValue.integer !== undefined ? 1 : 0) + 
                       (orgValue.double !== undefined ? 1 : 0)
    
    if (valueCount !== 1) {
      setDialogError('Exactly one value must be provided')
      return
    }

    setDialogLoading(true)
    setDialogError(null)

    try {
      // Get current version if override exists
      const existing = overrides.find(
        o => o.feature_flag_id === flag.id && 
        o.scope_id === selectedOrgId && 
        o.override_type === 'org'
      )
      
      const { data, error } = await supabase.rpc('admin_set_org_override', {
        p_feature_flag_id: flag.id,
        p_org_id: selectedOrgId,
        p_value_boolean: orgValue.boolean ?? null,
        p_value_integer: orgValue.integer ?? null,
        p_value_double: orgValue.double ?? null,
        p_environment: flag.environment,
        p_reason: reason,
        p_expected_version: existing?.version,
      } as any)

      if (error) {
        setDialogError(error.message)
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as RpcResponse).success) {
        setDialogError((data as RpcResponse)?.error || 'Unknown error')
        return
      }

      setOrgOverrideDialog({ open: false, flag: null })
      setSelectedOrgId('')
      setOrgValue({})
      showSuccess('Organization override set successfully')
      fetchFlags()
      fetchOverrides()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDialogLoading(false)
    }
  }

  const handleSetUserOverride = async (reason: string) => {
    if (!userOverrideDialog.flag || !selectedUserId) return
    
    const flag = userOverrideDialog.flag
    const valueCount = (userValue.boolean !== undefined ? 1 : 0) + 
                       (userValue.integer !== undefined ? 1 : 0) + 
                       (userValue.double !== undefined ? 1 : 0)
    
    if (valueCount !== 1) {
      setDialogError('Exactly one value must be provided')
      return
    }
    
    setDialogLoading(true)
    setDialogError(null)
    
    try {
      // Get current version if override exists
      const existing = overrides.find(
        o => o.feature_flag_id === flag.id && 
        o.scope_id === selectedUserId && 
        o.override_type === 'user'
      )
      
      const { data, error } = await supabase.rpc('admin_set_user_override', {
        p_feature_flag_id: flag.id,
        p_user_id: selectedUserId!,
        p_value_boolean: userValue.boolean ?? null,
        p_value_integer: userValue.integer ?? null,
        p_value_double: userValue.double ?? null,
        p_environment: flag.environment,
        p_reason: reason,
        p_expected_version: existing?.version,
      } as any)
      
      if (error) {
        setDialogError(error.message)
        return
      }
      
      if (data && !(data as unknown as RpcResponse).success) {
        setDialogError((data as unknown as RpcResponse).error || 'Unknown error')
        return
      }
      
      setUserOverrideDialog({ open: false, flag: null })
      setSelectedUserId('')
      setUserValue({})
      showSuccess('User override set successfully')
      fetchFlags()
      fetchOverrides()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDialogLoading(false)
    }
  }
  
  const handleRemoveOverride = async (override: FeatureFlagOverride, reason: string) => {
    setDialogLoading(true)
    setDialogError(null)
    
    try {
      let data: RpcResponse
      let error: any
      
      if (override.override_type === 'org') {
        const result = await supabase.rpc('admin_remove_org_override', {
          p_feature_flag_id: override.feature_flag_id,
          p_org_id: override.scope_id,
          p_environment: override.environment,
          p_reason: reason,
          p_expected_version: override.version,
        } as any)
        data = result.data as any
        error = result.error
      } else {
        const result = await supabase.rpc('admin_remove_user_override', {
          p_feature_flag_id: override.feature_flag_id,
          p_user_id: override.scope_id,
          p_environment: override.environment,
          p_reason: reason,
          p_expected_version: override.version,
        } as any)
        data = result.data as any
        error = result.error
      }
      
      if (error) {
        setDialogError(error.message)
        return
      }
      
      if (!isRpcSuccessResponse(data) || !data.success) {
        setDialogError(data?.error || 'Unknown error')
        return
      }
      
      showSuccess('Override removed successfully')
      fetchFlags()
      fetchOverrides()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDialogLoading(false)
    }
  }
  
  const handleDeleteFlag = async (reason: string) => {
    if (!deleteDialog.flag) return
    
    setDialogLoading(true)
    setDialogError(null)
    
    try {
      const { data, error } = await supabase.rpc('admin_delete_feature_flag', {
        p_feature_flag_id: deleteDialog.flag!.id,
        p_environment: deleteDialog.flag!.environment,
        p_reason: reason,
      } as any)
      
      if (error) {
        setDialogError(error.message)
        return
      }
      
      if (data && !(data as unknown as RpcResponse).success) {
        setDialogError((data as unknown as RpcResponse).error || 'Unknown error')
        return
      }
      
      setDeleteDialog({ open: false, flag: null })
      showSuccess('Feature flag deleted successfully')
      fetchFlags()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDialogLoading(false)
    }
  }
  
  const handleRestoreFlag = async (reason: string) => {
    if (!restoreDialog.flag) return
    
    setDialogLoading(true)
    setDialogError(null)
    
    try {
      const { data, error } = await supabase.rpc('admin_restore_feature_flag', {
        p_feature_flag_id: restoreDialog.flag!.id,
        p_environment: restoreDialog.flag!.environment,
        p_reason: reason,
      } as any)
      
      if (error) {
        setDialogError(error.message)
        return
      }
      
      if (!isRpcSuccessResponse(data) || !(data as RpcResponse).success) {
        setDialogError((data as RpcResponse)?.error || 'Unknown error')
        return
      }
      
      setRestoreDialog({ open: false, flag: null })
      showSuccess('Feature flag restored successfully')
      fetchFlags()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDialogLoading(false)
    }
  }
  
  const getValueDisplay = (flag: AdminFeatureFlag): string => {
    if (flag.value_type === 'boolean') {
      return flag.default_value_boolean !== null ? String(flag.default_value_boolean) : 'Not set'
    }
    if (flag.value_type === 'integer') {
      return flag.default_value_integer !== null ? String(flag.default_value_integer) : 'Not set'
    }
    if (flag.value_type === 'double') {
      return flag.default_value_double !== null ? String(flag.default_value_double) : 'Not set'
    }
    return 'Not set'
  }
  
  const flagColumns: ColumnConfig<AdminFeatureFlag>[] = [
    {
      id: 'key',
      label: 'Key',
      sortable: true,
      render: (row) => (
      <div>
          <div className="pa-body-m" style={{ fontWeight: 600, color: 'var(--pa-n900)' }}>
            {row.key}
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
      id: 'environment',
      label: 'Environment',
      sortable: true,
      render: (row) => (
        <Badge variant={
          row.environment === 'prod' ? 'danger' : 
          row.environment === 'staging' ? 'warning' : 
          'info'
        }>
          {row.environment.toUpperCase()}
        </Badge>
      ),
    },
    {
      id: 'value_type',
      label: 'Type',
      render: (row) => (
        <Badge variant="neutral">{row.value_type}</Badge>
      ),
    },
    {
      id: 'default_value',
      label: 'Platform Default',
      render: (row) => (
        <div className="pa-body-m" style={{ fontFamily: 'var(--pa-font-mono)' }}>
          {getValueDisplay(row)}
        </div>
      ),
    },
    {
      id: 'overrides',
      label: 'Overrides',
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
          {row.org_override_count > 0 || row.user_override_count > 0 ? (
            <>
              {row.org_override_count > 0 && <div>{row.org_override_count} org{row.org_override_count > 1 ? 's' : ''}</div>}
              {row.user_override_count > 0 && <div>{row.user_override_count} user{row.user_override_count > 1 ? 's' : ''}</div>}
            </>
          ) : (
            <span style={{ color: 'var(--pa-n400)' }}>None</span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            size="small"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              setEditDefaultDialog({ open: true, flag: row })
              setDefaultValue({
                boolean: row.default_value_boolean ?? undefined,
                integer: row.default_value_integer ?? undefined,
                double: row.default_value_double ?? undefined,
              })
            }}
            title="Edit default value"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
          </Button>
          {row.deleted_at ? (
            <Button
              variant="ghost"
              size="small"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                setRestoreDialog({ open: true, flag: row })
              }}
              title="Restore flag"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>restore</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="small"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                setDeleteDialog({ open: true, flag: row })
              }}
              title="Delete flag"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
            </Button>
          )}
        </div>
      ),
    },
  ]
  
  const overrideColumns: ColumnConfig<FeatureFlagOverride & { id: string }>[] = [
    {
      id: 'feature_key',
      label: 'Flag Key',
      render: (row) => (
        <div className="pa-body-m" style={{ fontWeight: 600 }}>
          {row.feature_key}
        </div>
      ),
    },
    {
      id: 'override_type',
      label: 'Type',
      render: (row) => (
        <Badge variant={row.override_type === 'org' ? 'info' : 'warning'}>
          {row.override_type === 'org' ? 'Organization' : 'User'}
        </Badge>
      ),
    },
    {
      id: 'scope_name',
      label: 'Scope',
      render: (row: FeatureFlagOverride) => (
        <div className="pa-body-m">{row.scope_name}</div>
      ),
    },
    {
      id: 'value',
      label: 'Value',
      render: (row) => (
        <div className="pa-body-m">
          {row.value_boolean !== null ? String(row.value_boolean) :
           row.value_integer !== null ? String(row.value_integer) :
           row.value_double !== null ? String(row.value_double) : 'N/A'}
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
          onClick={() => setOverrideToRemove(row)}
        >
          Remove
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Feature Flags"
        subtitle="Manage feature flags across all environments"
        actions={
          <Button
            variant="primary"
            onClick={() => setCreateDialog(true)}
            disabled={!canPerformAction(adminRole, 'toggle_feature_flag')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>add</span>
            Create Flag
          </Button>
        }
      />
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--pa-space-4)', borderBottom: '2px solid var(--pa-n100)' }}>
        <button
          onClick={() => setActiveTab('flags')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'flags' ? '3px solid var(--pa-n900)' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'flags' ? 700 : 400,
            color: activeTab === 'flags' ? 'var(--pa-n900)' : 'var(--pa-n700)',
          }}
        >
          All Flags ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('overrides')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'overrides' ? '3px solid var(--pa-n900)' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'overrides' ? 700 : 400,
            color: activeTab === 'overrides' ? 'var(--pa-n900)' : 'var(--pa-n700)',
          }}
        >
          Overrides ({overrides.length})
        </button>
      </div>
      
      {/* Filters and Actions */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: 'var(--pa-space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
          searchPlaceholder="Search by key or description..."
        onClearAll={() => setSearch('')}
      />
        <Select
          value={environmentFilter}
          onChange={(e) => setEnvironmentFilter(e.target.value as FeatureFlagEnvironment | 'all')}
          style={{ minWidth: '150px' }}
          options={[
            { value: 'all', label: 'All Environments' },
            { value: 'dev', label: 'Dev' },
            { value: 'staging', label: 'Staging' },
            { value: 'prod', label: 'Production' },
          ]}
        />
        {activeTab === 'flags' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            <span className="pa-body-s">Show deleted</span>
          </label>
        )}
      </div>
      
      {/* Content */}
      {activeTab === 'flags' && (
        <>
          {error && !loading && (
            <ErrorState
              message={error}
              onRetry={fetchFlags}
              retryLabel="Retry"
            />
          )}
          {!error && (
            <>
              <div className="pa-body-xs" style={{ 
                color: 'var(--pa-n600)', 
                marginBottom: 'var(--pa-space-2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
                Click any row to view detailed information and manage overrides
              </div>
              <PlatformDataTable
                columns={flagColumns}
                rows={flags}
                loading={loading}
                emptyMessage="No feature flags found. Try adjusting your filters."
                page={page}
                rowsPerPage={rowsPerPage}
                totalCount={totalCount}
                onPageChange={setPage}
                onRowsPerPageChange={setRowsPerPage}
                onRowClick={(row) => navigate(`/platform-admin/feature-flags/${row.id}`)}
              />
            </>
          )}
        </>
      )}
      
      {activeTab === 'overrides' && (
        <Card>
          <PlatformDataTable
            columns={overrideColumns as ColumnConfig<{ id: string }>[]}
            rows={overrides as ({ id: string })[]}
            loading={loading}
            emptyMessage="No overrides found"
            page={0}
            rowsPerPage={1000}
            totalCount={overrides.length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
          />
        </Card>
      )}
      
      {/* Create Flag Dialog */}
      {createDialog && (
        <div
          onClick={() => {
            setCreateDialog(false)
            setFlagType('platform')
            setNewFlag({ key: '', value_type: 'boolean', description: '', environment: getEnvironment() })
            setNewOrgFlag({ org_id: null, feature_key: '', enabled: false })
            setDialogError(null)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 15, 20, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="pa-card"
            style={{
              width: '100%',
              maxWidth: '600px',
              margin: 'var(--pa-space-4)',
              padding: 0,
            }}
          >
            <div style={{ padding: 'var(--pa-space-5)', borderBottom: '1px solid var(--pa-n100)' }}>
              <h2 className="pa-h2" style={{ margin: 0 }}>Create Feature Flag</h2>
            </div>
            <div style={{ padding: 'var(--pa-space-5)' }}>
              <p className="pa-body-m" style={{ margin: '0 0 var(--pa-space-4) 0', color: 'var(--pa-n700)' }}>
                Create a new feature flag. The key must be unique within the environment and contain only lowercase letters, numbers, and underscores.
              </p>
              <div className="pa-form-group">
                <label className="pa-label">Flag Type *</label>
                <Select
                  value={flagType}
                  onChange={(e) => setFlagType(e.target.value as 'platform' | 'org')}
                  disabled={dialogLoading}
                  options={[
                    { value: 'platform', label: 'Platform-wide (affects all orgs)' },
                    { value: 'org', label: 'Organization-specific' },
                  ]}
                />
              </div>
              {flagType === 'org' && (
                <div className="pa-form-group">
                  <label className="pa-label">Organization *</label>
                  <EntitySelect
                    value={newOrgFlag.org_id}
                    onChange={(value) => setNewOrgFlag({ ...newOrgFlag, org_id: value })}
                    fetchOptions={async (query) => {
                      const { data, error } = await supabase
                        .from('organizations')
                        .select('id, name')
                        .ilike('name', `%${query}%`)
                        .limit(20)
                      
                      if (error) throw error
                      return (data || []).map((org: any) => ({
                        id: org.id,
                        label: org.name,
                      }))
                    }}
                    getOptionById={async (id) => {
                      const { data, error } = await supabase
                        .from('organizations')
                        .select('id, name')
                        .eq('id', id)
                        .single()
                      
                      if (error) return null
                      return data ? { id: data.id, label: data.name } : null
                    }}
                    placeholder="Select organization..."
                    disabled={dialogLoading}
                  />
                </div>
              )}
              <div className="pa-form-group">
                <label className="pa-label">Flag Key *</label>
                <Input
                  value={flagType === 'platform' ? newFlag.key : newOrgFlag.feature_key}
                  onChange={(e) => {
                    const key = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                    if (flagType === 'platform') {
                      setNewFlag({ ...newFlag, key })
                    } else {
                      setNewOrgFlag({ ...newOrgFlag, feature_key: key })
                    }
                  }}
                  placeholder="e.g., payments_enabled"
                  disabled={dialogLoading}
                />
                <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginTop: '4px' }}>
                  Lowercase letters, numbers, and underscores only
          </div>
              </div>
              {flagType === 'platform' && (
                <>
                  <div className="pa-form-group">
                    <label className="pa-label">Value Type *</label>
                    <Select
                      value={newFlag.value_type}
                      onChange={(e) => setNewFlag({ ...newFlag, value_type: e.target.value as FeatureFlagValueType })}
                      disabled={dialogLoading}
                      options={[
                        { value: 'boolean', label: 'Boolean' },
                        { value: 'integer', label: 'Integer' },
                        { value: 'double', label: 'Double' },
                      ]}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label className="pa-label">Description</label>
                    <textarea
                      className="pa-input pa-textarea"
                      value={newFlag.description}
                      onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                      placeholder="Describe what this flag controls..."
                      disabled={dialogLoading}
                      style={{ minHeight: '80px' }}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label className="pa-label">Environment *</label>
                    <Select
                      value={newFlag.environment}
                      onChange={(e) => setNewFlag({ ...newFlag, environment: e.target.value as FeatureFlagEnvironment })}
                      disabled={dialogLoading}
                      options={[
                        { value: 'dev', label: 'Dev' },
                        { value: 'staging', label: 'Staging' },
                        { value: 'prod', label: 'Prod' },
                      ]}
                    />
                  </div>
                </>
              )}
              {flagType === 'org' && (
                <div className="pa-form-group">
                  <label className="pa-label">Enabled</label>
                  <Select
                    value={String(newOrgFlag.enabled)}
                    onChange={(e) => setNewOrgFlag({ ...newOrgFlag, enabled: e.target.value === 'true' })}
                    disabled={dialogLoading}
                    options={[
                      { value: 'false', label: 'Disabled' },
                      { value: 'true', label: 'Enabled' },
                    ]}
                  />
                </div>
              )}
              {dialogError && (
                <div
                      className="pa-card"
                      style={{
                    padding: 'var(--pa-space-3)',
                    background: 'var(--pa-danger-bg)',
                    border: '1px solid var(--pa-n800)',
                    marginTop: 'var(--pa-space-3)',
                  }}
                >
                  <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
                    {dialogError}
                  </span>
                </div>
              )}
            </div>
            <div
              style={{
                padding: 'var(--pa-space-4) var(--pa-space-5)',
                borderTop: '1px solid var(--pa-n100)',
                        display: 'flex',
                gap: 'var(--pa-space-3)',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                variant="blue"
                onClick={() => {
                  setCreateDialog(false)
                  setFlagType('platform')
                  setNewFlag({ key: '', value_type: 'boolean', description: '', environment: getEnvironment() })
                  setNewOrgFlag({ org_id: null, feature_key: '', enabled: false })
                  setDialogError(null)
                }}
                disabled={dialogLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleCreateFlag('')}
                disabled={dialogLoading || (flagType === 'platform' ? !newFlag.key.trim() : (!newOrgFlag.feature_key.trim() || !newOrgFlag.org_id))}
              >
                {dialogLoading ? 'Creating...' : 'Create'}
              </Button>
                        </div>
                      </div>
        </div>
      )}
      
      {/* Edit Platform Default Dialog */}
      {editDefaultDialog.open && editDefaultDialog.flag && (
        <FormModal
          open={editDefaultDialog.open}
          title="Set Platform Default"
          description={`Set the platform default value for "${editDefaultDialog.flag.key}"`}
          confirmLabel="Set Default"
          loading={dialogLoading}
          error={dialogError}
          onConfirm={handleSetPlatformDefault}
          onCancel={() => {
            setEditDefaultDialog({ open: false, flag: null })
            setDefaultValue({})
            setDialogError(null)
          }}
          requireReason
        >
          {editDefaultDialog.flag.value_type === 'boolean' && (
            <div className="pa-form-group">
              <label className="pa-label">Value *</label>
              <Select
                value={defaultValue.boolean !== undefined ? String(defaultValue.boolean) : ''}
                onChange={(e) => setDefaultValue({ boolean: e.target.value === 'true' })}
                disabled={dialogLoading}
                options={[
                  { value: '', label: 'Select...' },
                  { value: 'true', label: 'True' },
                  { value: 'false', label: 'False' },
                ]}
              />
            </div>
          )}
          {editDefaultDialog.flag.value_type === 'integer' && (
            <div className="pa-form-group">
              <label className="pa-label">Value *</label>
              <Input
                type="number"
                value={defaultValue.integer ?? ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val) && val >= -2147483648 && val <= 2147483647) {
                    setDefaultValue({ integer: val })
                  } else if (e.target.value === '') {
                    setDefaultValue({ integer: undefined })
                  }
                }}
                placeholder="Enter integer value"
                disabled={dialogLoading}
                min={-2147483648}
                max={2147483647}
              />
              <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginTop: '4px' }}>
                Range: -2,147,483,648 to 2,147,483,647
              </div>
            </div>
          )}
          {editDefaultDialog.flag.value_type === 'double' && (
            <div className="pa-form-group">
              <label className="pa-label">Value *</label>
              <Input
                type="number"
                step="any"
                value={defaultValue.double ?? ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val)) {
                    setDefaultValue({ double: val })
                  } else if (e.target.value === '') {
                    setDefaultValue({ double: undefined })
                  }
                }}
                placeholder="Enter double value"
                disabled={dialogLoading}
              />
            </div>
          )}
        </FormModal>
      )}

      {/* Org Override Dialog */}
      {orgOverrideDialog.open && orgOverrideDialog.flag && (
        <FormModal
          open={orgOverrideDialog.open}
          title="Set Organization Override"
          description={`Set an organization override for "${orgOverrideDialog.flag.key}"`}
          confirmLabel="Set Override"
          loading={dialogLoading}
          error={dialogError}
          onConfirm={handleSetOrgOverride}
          onCancel={() => {
            setOrgOverrideDialog({ open: false, flag: null })
            setSelectedOrgId(null)
            setOrgValue({})
            setDialogError(null)
          }}
          requireReason
        >
          <EntitySelect
            label="Organization *"
            value={selectedOrgId}
            onChange={(id) => setSelectedOrgId(id)}
            fetchOptions={async (query) => {
              const { data, error } = await supabase
                .from('organizations')
                .select('id, name')
                .ilike('name', `%${query}%`)
                .limit(20)
              
              if (error) throw error
              return (data || []).map((org: any) => ({
                id: org.id,
                label: org.name,
              }))
            }}
            getOptionById={async (id) => {
              const { data, error } = await supabase
                .from('organizations')
                .select('id, name')
                .eq('id', id)
                .single()
              
              if (error || !data) return null
              return { id: data.id, label: data.name }
            }}
            placeholder="Search organizations..."
            disabled={dialogLoading}
            required
          />
          {orgOverrideDialog.flag.value_type === 'boolean' && (
            <div className="pa-form-group">
              <label className="pa-label">Value *</label>
              <Select
                value={orgValue.boolean !== undefined ? String(orgValue.boolean) : ''}
                onChange={(e) => setOrgValue({ boolean: e.target.value === 'true' })}
                disabled={dialogLoading}
                options={[
                  { value: '', label: 'Select...' },
                  { value: 'true', label: 'True' },
                  { value: 'false', label: 'False' },
                ]}
              />
            </div>
          )}
          {orgOverrideDialog.flag.value_type === 'integer' && (
            <div className="pa-form-group">
              <label className="pa-label">Value *</label>
              <Input
                type="number"
                value={orgValue.integer ?? ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val) && val >= -2147483648 && val <= 2147483647) {
                    setOrgValue({ integer: val })
                  } else if (e.target.value === '') {
                    setOrgValue({ integer: undefined })
                  }
                }}
                placeholder="Enter integer value"
                disabled={dialogLoading}
                min={-2147483648}
                max={2147483647}
              />
            </div>
          )}
          {orgOverrideDialog.flag.value_type === 'double' && (
            <div className="pa-form-group">
              <label className="pa-label">Value *</label>
              <Input
                type="number"
                step="any"
                value={orgValue.double ?? ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val)) {
                    setOrgValue({ double: val })
                  } else if (e.target.value === '') {
                    setOrgValue({ double: undefined })
                  }
                }}
                placeholder="Enter double value"
                disabled={dialogLoading}
              />
            </div>
          )}
        </FormModal>
      )}
      
      {/* User Override Dialog */}
      {userOverrideDialog.open && userOverrideDialog.flag && (
        <FormModal
          open={userOverrideDialog.open}
          title="Set User Override"
          description={`Set a user override for "${userOverrideDialog.flag.key}"`}
          confirmLabel="Set Override"
          loading={dialogLoading}
          error={dialogError}
          onConfirm={handleSetUserOverride}
          onCancel={() => {
            setUserOverrideDialog({ open: false, flag: null })
            setSelectedUserId(null)
            setUserValue({})
            setDialogError(null)
          }}
          requireReason
        >
          <EntitySelect
            label="User *"
            value={selectedUserId}
            onChange={(id) => setSelectedUserId(id)}
            fetchOptions={async (query) => {
              const { data, error } = await supabase
                .from('users')
                .select('id, email, display_name')
                .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
                .limit(20)
              
              if (error) throw error
              return (data || []).map((user: any) => ({
                id: user.id,
                label: user.display_name || user.email || '',
                data: user,
              }))
            }}
            getOptionById={async (id) => {
              const { data, error } = await supabase
                .from('users')
                .select('id, email, display_name')
                .eq('id', id)
                .single()
              
              if (error || !data) return null
              return {
                id: data.id,
                label: data.display_name || data.email || '',
                data,
              }
            }}
            renderOption={(option, isHighlighted) => (
              <div
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: isHighlighted ? 'var(--pa-n50)' : 'transparent',
                  borderBottom: '1px solid var(--pa-n100)',
                }}
              >
                <div className="pa-body-m">{option.label}</div>
                {option.data && (option.data as any).email && option.label !== (option.data as any).email && (
                  <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
                    {(option.data as any).email}
                  </div>
                )}
              </div>
            )}
            placeholder="Search users by email or name..."
            disabled={dialogLoading}
            required
          />
          {userOverrideDialog.flag.value_type === 'boolean' && (
            <div className="pa-form-group">
              <label className="pa-label">Value *</label>
              <Select
                value={userValue.boolean !== undefined ? String(userValue.boolean) : ''}
                onChange={(e) => setUserValue({ boolean: e.target.value === 'true' })}
                disabled={dialogLoading}
                options={[
                  { value: '', label: 'Select...' },
                  { value: 'true', label: 'True' },
                  { value: 'false', label: 'False' },
                ]}
              />
            </div>
          )}
          {userOverrideDialog.flag.value_type === 'integer' && (
            <div className="pa-form-group">
              <label className="pa-label">Value *</label>
              <Input
                type="number"
                value={userValue.integer ?? ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val) && val >= -2147483648 && val <= 2147483647) {
                    setUserValue({ integer: val })
                  } else if (e.target.value === '') {
                    setUserValue({ integer: undefined })
                  }
                }}
                placeholder="Enter integer value"
                disabled={dialogLoading}
                min={-2147483648}
                max={2147483647}
              />
            </div>
          )}
          {userOverrideDialog.flag.value_type === 'double' && (
            <div className="pa-form-group">
              <label className="pa-label">Value *</label>
              <Input
                type="number"
                step="any"
                value={userValue.double ?? ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val)) {
                    setUserValue({ double: val })
                  } else if (e.target.value === '') {
                    setUserValue({ double: undefined })
                  }
                }}
                placeholder="Enter double value"
                disabled={dialogLoading}
              />
            </div>
          )}
        </FormModal>
      )}
      
      {/* Delete Flag Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Feature Flag"
        description={deleteDialog.flag ? `Are you sure you want to delete "${deleteDialog.flag.key}"? This will soft-delete the flag. All overrides will be preserved.` : ''}
        confirmLabel="Delete"
        variant="warning"
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleDeleteFlag}
        onCancel={() => {
          setDeleteDialog({ open: false, flag: null })
          setDialogError(null)
        }}
      />
      
      {/* Restore Flag Dialog */}
      <ConfirmDialog
        open={restoreDialog.open}
        title="Restore Feature Flag"
        description={restoreDialog.flag ? `Are you sure you want to restore "${restoreDialog.flag.key}"?` : ''}
        confirmLabel="Restore"
        variant="info"
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleRestoreFlag}
        onCancel={() => {
          setRestoreDialog({ open: false, flag: null })
          setDialogError(null)
        }}
      />

      {/* Remove Override Confirmation Dialog */}
      <ConfirmDialog
        open={!!overrideToRemove}
        title="Remove Override"
        description={`Remove ${overrideToRemove?.override_type} override for ${overrideToRemove?.scope_name}?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (overrideToRemove) {
            handleRemoveOverride(overrideToRemove, 'Removed via admin UI')
            setOverrideToRemove(null)
          }
        }}
        onCancel={() => setOverrideToRemove(null)}
      />

      {/* Toast */}
    </div>
  )
}


// Form Modal Component
function FormModal({
  open,
  title,
  description,
  confirmLabel,
  loading,
  error,
  onConfirm,
  onCancel,
  requireReason,
  children,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  loading: boolean
  error: string | null
  onConfirm: (reason: string) => void
  onCancel: () => void
  requireReason?: boolean
  children: React.ReactNode
}) {
  const [reason, setReason] = useState('')
  
  useEffect(() => {
    if (!open) {
      setReason('')
    }
  }, [open])
  
  if (!open) return null
  
  const handleConfirm = () => {
    if (requireReason && !reason.trim()) return
    onConfirm(reason)
  }
  
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 15, 20, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="pa-card"
        style={{
          width: '100%',
          maxWidth: '600px',
          margin: 'var(--pa-space-4)',
          padding: 0,
        }}
      >
        <div style={{ padding: 'var(--pa-space-5)', borderBottom: '1px solid var(--pa-n100)' }}>
          <h2 className="pa-h2" style={{ margin: 0 }}>{title}</h2>
        </div>
        <div style={{ padding: 'var(--pa-space-5)' }}>
          <p className="pa-body-m" style={{ margin: '0 0 var(--pa-space-4) 0', color: 'var(--pa-n700)' }}>
            {description}
          </p>
          {children}
          {requireReason && (
            <div className="pa-form-group" style={{ marginTop: 'var(--pa-space-4)' }}>
              <label className="pa-label">Reason (required)</label>
              <textarea
                className="pa-input pa-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter a reason for this action..."
                disabled={loading}
                style={{ minHeight: '80px' }}
              />
            </div>
          )}
          {error && (
            <div
              className="pa-card"
              style={{
                padding: 'var(--pa-space-3)',
                background: 'var(--pa-danger-bg)',
                border: '1px solid var(--pa-n800)',
                marginTop: 'var(--pa-space-3)',
              }}
            >
              <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
                {error}
              </span>
            </div>
          )}
        </div>
        <div
          style={{
            padding: 'var(--pa-space-4) var(--pa-space-5)',
            borderTop: '1px solid var(--pa-n100)',
            display: 'flex',
            gap: 'var(--pa-space-3)',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="blue" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={loading || (requireReason && !reason.trim())}
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

