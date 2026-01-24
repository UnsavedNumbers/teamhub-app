import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, Card, FilterBar, ConfirmDialog, Button, Input, Select, PlatformDataTable, type ColumnConfig } from '../../components/platformAdmin'
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
import { showSuccess, showError } from '../../utils/toast'

type TabType = 'flags' | 'overrides' | 'audit'

export default function FeatureFlags() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('flags')
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([])
  const [overrides, setOverrides] = useState<FeatureFlagOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [environmentFilter, setEnvironmentFilter] = useState<FeatureFlagEnvironment>(getEnvironment())
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
  
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  
  // Form states
  const [newFlag, setNewFlag] = useState<CreateFeatureFlagRequest>({
    key: '',
    value_type: 'boolean',
    description: '',
    environment: getEnvironment(),
  })
  const [defaultValue, setDefaultValue] = useState<{ boolean?: boolean; integer?: number; double?: number }>({})
  const [orgSearch, setOrgSearch] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [orgValue, setOrgValue] = useState<{ boolean?: boolean; integer?: number; double?: number }>({})
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userValue, setUserValue] = useState<{ boolean?: boolean; integer?: number; double?: number }>({})
  
  // TODO: Fetch actual role
  const [adminRole] = useState<PlatformAdminRole>('super_admin')
  const currentEnvironment = getEnvironment()

  const fetchFlags = useCallback(async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('admin_feature_flags_list')
        .select('*', { count: 'exact' })
        .eq('environment', environmentFilter)

      if (search) {
        query = query.or(`key.ilike.%${search}%,description.ilike.%${search}%`)
      }
      
      if (!showDeleted) {
        query = query.is('deleted_at', null)
      }
      
      query = query.order('key', { ascending: true })
      
      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)
      
      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching feature flags:', error)
        setFlags([])
        setTotalCount(0)
      } else {
        setFlags(data || [])
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Error:', err)
      setFlags([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search, environmentFilter, showDeleted])
  
  const fetchOverrides = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_feature_flag_overrides')
        .select('*')
        .eq('environment', environmentFilter)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching overrides:', error)
        setOverrides([])
      } else {
        // Map rows to include id field
        const mapped = (data || []).map(row => mapFeatureFlagOverride(row))
        setOverrides(mapped)
      }
    } catch (err) {
      console.error('Error:', err)
      setOverrides([])
    }
  }, [environmentFilter])
  
  useEffect(() => {
    if (activeTab === 'flags') {
      fetchFlags()
    } else if (activeTab === 'overrides') {
      fetchOverrides()
    }
  }, [activeTab, fetchFlags, fetchOverrides])


  const handleCreateFlag = async (_reason: string) => {
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
      fetchFlags()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDialogLoading(false)
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
      setToast({
        show: true,
        message: 'Platform default updated successfully',
        variant: 'success',
      })
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
        p_user_id: selectedUserId,
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
      
      if (data && !(data as RpcResponse).success) {
        setDialogError((data as RpcResponse).error || 'Unknown error')
        return
      }
      
      setUserOverrideDialog({ open: false, flag: null })
      setSelectedUserId('')
      setUserValue({})
      setToast({
        show: true,
        message: 'User override set successfully',
        variant: 'success',
      })
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
      
      if (data && !(data as RpcResponse).success) {
        setDialogError((data as RpcResponse).error || 'Unknown error')
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
      setToast({
        show: true,
        message: 'Feature flag restored successfully',
        variant: 'success',
      })
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
          <div className="pa-body-m" style={{ fontWeight: 600 }}>
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
        <div className="pa-body-m">{getValueDisplay(row)}</div>
      ),
    },
    {
      id: 'overrides',
      label: 'Overrides',
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
          {row.org_override_count} orgs, {row.user_override_count} users
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
            size="small"
            onClick={() => {
              setEditDefaultDialog({ open: true, flag: row })
              setDefaultValue({
                boolean: row.default_value_boolean ?? undefined,
                integer: row.default_value_integer ?? undefined,
                double: row.default_value_double ?? undefined,
              })
            }}
          >
            Set Default
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => setOrgOverrideDialog({ open: true, flag: row })}
          >
            Org Override
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => setUserOverrideDialog({ open: true, flag: row })}
          >
            User Override
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => navigate(`/platform-admin/feature-flags/${row.id}`)}
          >
            View Details
          </Button>
          {row.deleted_at ? (
            <Button
              variant="ghost"
              size="small"
              onClick={() => setRestoreDialog({ open: true, flag: row })}
            >
              Restore
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="small"
              onClick={() => setDeleteDialog({ open: true, flag: row })}
            >
              Delete
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
          onClick={() => {
            // We'll use ConfirmDialog for this
            if (window.confirm(`Remove ${row.override_type} override for ${row.scope_name}?`)) {
              handleRemoveOverride(row, 'Removed via admin UI')
            }
          }}
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
        subtitle={`Manage feature flags and overrides. Current environment: ${currentEnvironment.toUpperCase()}`}
      />
      
      {/* Environment Badge */}
      <div style={{ marginBottom: 'var(--pa-space-4)' }}>
        <Badge variant="info" style={{ fontSize: '12px', padding: '6px 12px' }}>
          Environment: {currentEnvironment.toUpperCase()}
        </Badge>
      </div>
      
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
          Flags
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
          Overrides
        </button>
      </div>
      
      {/* Filters and Actions */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: 'var(--pa-space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
          searchPlaceholder="Search flags..."
        onClearAll={() => setSearch('')}
      />
        <Select
          value={environmentFilter}
          onChange={(e) => setEnvironmentFilter(e.target.value as FeatureFlagEnvironment)}
          style={{ minWidth: '150px' }}
          options={[
            { value: 'dev', label: 'Dev' },
            { value: 'staging', label: 'Staging' },
            { value: 'prod', label: 'Prod' },
          ]}
        />
        {activeTab === 'flags' && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
              />
              <span className="pa-body-s">Show deleted</span>
            </label>
            <Button
              variant="primary"
              onClick={() => setCreateDialog(true)}
              disabled={!canPerformAction(adminRole, 'toggle_feature_flag')}
            >
              Create Flag
            </Button>
          </>
        )}
      </div>
      
      {/* Content */}
      {activeTab === 'flags' && (
        <PlatformDataTable
          columns={flagColumns}
          rows={flags}
          loading={loading}
          emptyMessage="No feature flags found"
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
        />
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
            setNewFlag({ key: '', value_type: 'boolean', description: '', environment: getEnvironment() })
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
                <label className="pa-label">Flag Key *</label>
                <Input
                  value={newFlag.key}
                  onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="e.g., payments_enabled"
                  disabled={dialogLoading}
                />
                <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginTop: '4px' }}>
                  Lowercase letters, numbers, and underscores only
          </div>
              </div>
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
                variant="secondary"
                onClick={() => {
                  setCreateDialog(false)
                  setNewFlag({ key: '', value_type: 'boolean', description: '', environment: getEnvironment() })
                  setDialogError(null)
                }}
                disabled={dialogLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleCreateFlag('')}
                disabled={dialogLoading || !newFlag.key.trim()}
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
            setSelectedOrgId('')
            setOrgValue({})
            setOrgSearch('')
            setDialogError(null)
          }}
          requireReason
        >
          <div className="pa-form-group">
            <label className="pa-label">Organization *</label>
            <OrgSearchSelect
              value={selectedOrgId}
              onChange={setSelectedOrgId}
              search={orgSearch}
              onSearchChange={setOrgSearch}
              disabled={dialogLoading}
            />
          </div>
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
            setSelectedUserId('')
            setUserValue({})
            setUserSearch('')
            setDialogError(null)
          }}
          requireReason
        >
          <div className="pa-form-group">
            <label className="pa-label">User *</label>
            <UserSearchSelect
              value={selectedUserId}
              onChange={setSelectedUserId}
              search={userSearch}
              onSearchChange={setUserSearch}
              disabled={dialogLoading}
            />
          </div>
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

      {/* Toast */}
    </div>
  )
}

// Org Search Select Component
function OrgSearchSelect({
  value,
  onChange,
  search,
  onSearchChange,
  disabled,
}: {
  value: string
  onChange: (orgId: string) => void
  search: string
  onSearchChange: (search: string) => void
  disabled?: boolean
}) {
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (search.length < 2) {
      setOrgs([])
      return
    }
    
    const fetchOrgs = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name')
          .ilike('name', `%${search}%`)
          .limit(20)
        
        if (!error && data) {
          setOrgs(data)
        }
      } catch (err) {
        console.error('Error fetching organizations:', err)
      } finally {
        setLoading(false)
      }
    }
    
    const timeout = setTimeout(fetchOrgs, 300)
    return () => clearTimeout(timeout)
  }, [search])
  
  const selectedOrg = orgs.find(o => o.id === value)
  
  return (
    <div style={{ position: 'relative' }}>
      <Input
        value={selectedOrg ? selectedOrg.name : search}
        onChange={(e) => {
          onSearchChange(e.target.value)
          if (!e.target.value) {
            onChange('')
          }
        }}
        placeholder="Search organizations..."
        disabled={disabled}
        onFocus={() => {
          if (!search && value) {
            // Load selected org name
            const org = orgs.find(o => o.id === value)
            if (org) {
              onSearchChange(org.name)
            }
          }
        }}
      />
      {search.length >= 2 && orgs.length > 0 && !selectedOrg && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--pa-bg-primary)',
            border: '1px solid var(--pa-n100)',
            borderRadius: 'var(--pa-radius-md)',
            marginTop: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: 'var(--pa-shadow-2)',
          }}
        >
          {orgs.map((org) => (
            <div
              key={org.id}
              onClick={() => {
                onChange(org.id)
                onSearchChange(org.name)
              }}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--pa-n100)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--pa-n50)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div className="pa-body-m">{org.name}</div>
            </div>
          ))}
        </div>
      )}
      {loading && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '12px', textAlign: 'center' }}>
          <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>Loading...</div>
        </div>
      )}
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
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
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

// User Search Select Component
function UserSearchSelect({
  value,
  onChange,
  search,
  onSearchChange,
  disabled,
}: {
  value: string
  onChange: (userId: string) => void
  search: string
  onSearchChange: (search: string) => void
  disabled?: boolean
}) {
  const [users, setUsers] = useState<Array<{ id: string; email: string; display_name: string | null }>>([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (search.length < 2) {
      setUsers([])
      return
    }
    
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, display_name')
          .or(`email.ilike.%${search}%,display_name.ilike.%${search}%`)
          .limit(20)
        
        if (!error && data) {
          setUsers(data as Array<{ id: string; email: string; display_name: string | null }>)
        }
      } catch (err) {
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }
    
    const timeout = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timeout)
  }, [search])
  
  const selectedUser = users.find(u => u.id === value)
  
  return (
    <div style={{ position: 'relative' }}>
      <Input
        value={selectedUser ? (selectedUser.display_name || selectedUser.email) : search}
        onChange={(e) => {
          onSearchChange(e.target.value)
          if (!e.target.value) {
            onChange('')
          }
        }}
        placeholder="Search users by email or name..."
        disabled={disabled}
        onFocus={() => {
          if (!search && value) {
            const user = users.find(u => u.id === value)
            if (user) {
              onSearchChange(user.display_name || user.email)
            }
          }
        }}
      />
      {search.length >= 2 && users.length > 0 && !selectedUser && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--pa-bg-primary)',
            border: '1px solid var(--pa-n100)',
            borderRadius: 'var(--pa-radius-md)',
            marginTop: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: 'var(--pa-shadow-2)',
          }}
        >
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => {
                onChange(user.id)
                onSearchChange(user.display_name || user.email)
              }}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--pa-n100)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--pa-n50)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div className="pa-body-m">{user.display_name || user.email}</div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>{user.email}</div>
            </div>
          ))}
        </div>
      )}
      {loading && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '12px', textAlign: 'center' }}>
          <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>Loading...</div>
        </div>
      )}
    </div>
  )
}
