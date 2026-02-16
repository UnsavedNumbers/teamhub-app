import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, Card, Button, PlatformDataTable, type ColumnConfig, OfflineBanner, ErrorState, Tabs, TabsTrigger, TabsContent, Modal, Input, Switch } from '../../components/platformAdmin'
import { isValidUUID } from '../../utils/uuid'
import { isNotFoundError } from '../../utils/errorUtils'
import { mapFeatureFlag, mapFeatureFlagOverride, mapFeatureFlagAuditLog } from '../../utils/domainMappers'
import { getLink } from '../../utils/routes'
import { t } from '../../i18n'
import { showSuccess, showError } from '../../utils/toast'
import type { FeatureFlag, FeatureFlagOverride, FeatureFlagAuditLog, RpcResponse } from '../../types/domain/FeatureFlag'

// Helper function to display flag value
function getValueDisplay(flag: FeatureFlag): string {
  if (flag.valueType === 'boolean') {
    return flag.defaultValueBoolean !== null ? String(flag.defaultValueBoolean) : 'N/A'
  } else if (flag.valueType === 'integer') {
    return flag.defaultValueInteger !== null ? String(flag.defaultValueInteger) : 'N/A'
  } else if (flag.valueType === 'double') {
    return flag.defaultValueDouble !== null ? String(flag.defaultValueDouble) : 'N/A'
  }
  return 'N/A'
}

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FeatureFlagDetail() {
  useDebugLifecycle('FeatureFlagDetail')
  
  const db = supabase as any
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [flag, setFlag] = useState<FeatureFlag | null>(null)
  const [flagsByEnv, setFlagsByEnv] = useState<Record<'dev' | 'staging' | 'prod', FeatureFlag | null>>({
    dev: null,
    staging: null,
    prod: null,
  })
  const [overrides, setOverrides] = useState<FeatureFlagOverride[]>([])
  const [auditLog, setAuditLog] = useState<FeatureFlagAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<'overrides' | 'audit'>('overrides')
  
  // Edit default value state per environment
  const [editingEnv, setEditingEnv] = useState<'dev' | 'staging' | 'prod' | null>(null)
  const [editValue, setEditValue] = useState<{ boolean?: boolean; integer?: number; double?: number }>({})
  const [editReason, setEditReason] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  
  // Validate route parameter
  const isValidId = useMemo(() => {
    if (!id) return false
    return isValidUUID(id)
  }, [id])
  
  const fetchFlag = useCallback(async () => {
    if (!id || !isValidId) {
      if (!isValidId && id) {
        setError(t('platformAdmin.featureFlags.detail.invalidId'))
      }
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    setNotFound(false)
    
    try {
      // First fetch the flag by ID to get the key
      const { data: flagData, error: flagError } = await db
        .from('admin_feature_flags_list')
        .select('*')
        .eq('id', id)
        .single()
      
      if (flagError) {
        if (isNotFoundError(flagError)) {
          setNotFound(true)
          setFlag(null)
        } else {
          setError(flagError.message || t('platformAdmin.featureFlags.detail.loadFailed'))
          setFlag(null)
        }
        setLoading(false)
        return
      }
      
      if (!flagData) {
        setNotFound(true)
        setFlag(null)
        setLoading(false)
        return
      }
      
      const initialFlag = mapFeatureFlag(flagData)
      setFlag(initialFlag)
      
      // Now fetch all environments for this flag key
      const { data: allEnvData, error: allEnvError } = await db
        .from('admin_feature_flags_list')
        .select('*')
        .eq('key', initialFlag.key)
        .is('deleted_at', null)
      
      if (allEnvError) {
        console.error('Error fetching all environments:', allEnvError)
        // Continue with just the initial flag
        setFlagsByEnv({
          dev: initialFlag.environment === 'dev' ? initialFlag : null,
          staging: initialFlag.environment === 'staging' ? initialFlag : null,
          prod: initialFlag.environment === 'prod' ? initialFlag : null,
        })
      } else {
        const flagsMap: Record<'dev' | 'staging' | 'prod', FeatureFlag | null> = {
          dev: null,
          staging: null,
          prod: null,
        }
        
        allEnvData?.forEach((row: any) => {
          const mappedFlag = mapFeatureFlag(row)
          flagsMap[mappedFlag.environment] = mappedFlag
        })
        
        setFlagsByEnv(flagsMap)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching flag:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Error details:', errorMessage)
      setError(errorMessage || t('errors.unknownError'))
      setFlag(null)
    } finally {
      setLoading(false)
    }
  }, [id, isValidId])
  
  const fetchOverrides = useCallback(async () => {
    if (!flag) return
    
    try {
      // Fetch overrides for all environments of this flag
      const flagIds = Object.values(flagsByEnv)
        .filter((f): f is FeatureFlag => f !== null)
        .map(f => f.id)
      
      if (flagIds.length === 0) {
        setOverrides([])
        return
      }
      
      const { data, error } = await db
        .from('admin_feature_flag_overrides')
        .select('*')
        .in('feature_flag_id', flagIds)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching overrides:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        setOverrides([])
      } else {
        // Map rows to include id field
        const mapped = (data || []).map((row: any) => mapFeatureFlagOverride(row))
        setOverrides(mapped)
      }
    } catch (err) {
      console.error('Error in fetchOverrides:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Error details:', errorMessage)
      setOverrides([])
    }
  }, [flag, flagsByEnv])
  
  const fetchAuditLog = useCallback(async () => {
    if (!flag) return
    
    try {
      // Fetch audit log for all environments of this flag
      const flagIds = Object.values(flagsByEnv)
        .filter((f): f is FeatureFlag => f !== null)
        .map(f => f.id)
      
      if (flagIds.length === 0) {
        setAuditLog([])
        return
      }
      
      const { data, error } = await db
        .from('admin_feature_flag_audit')
        .select('*')
        .in('feature_flag_id', flagIds)
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) {
        console.error('Error fetching audit log:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        setAuditLog([])
      } else {
        setAuditLog((data || []).map((row: any) => mapFeatureFlagAuditLog(row)))
      }
    } catch (err) {
      console.error('Error in fetchAuditLog:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Error details:', errorMessage)
      setAuditLog([])
    }
  }, [flag, flagsByEnv])
  
  const openEditDefaultDialog = useCallback((env: 'dev' | 'staging' | 'prod') => {
    if (!flag) return
    
    setEditingEnv(env)
    const envFlag = flagsByEnv[env]
    
    // Initialize with current value if exists, otherwise defaults
    if (envFlag) {
      if (flag.valueType === 'boolean') {
        setEditValue({ boolean: envFlag.defaultValueBoolean ?? false })
      } else if (flag.valueType === 'integer') {
        setEditValue({ integer: envFlag.defaultValueInteger ?? 0 })
      } else if (flag.valueType === 'double') {
        setEditValue({ double: envFlag.defaultValueDouble ?? 0 })
      }
    } else {
      // No flag exists for this environment - use defaults
      if (flag.valueType === 'boolean') {
        setEditValue({ boolean: false })
      } else if (flag.valueType === 'integer') {
        setEditValue({ integer: 0 })
      } else if (flag.valueType === 'double') {
        setEditValue({ double: 0.0 })
      }
    }
    setEditReason('')
    setEditError(null)
  }, [flagsByEnv, flag])
  
  const handleSaveDefaultValue = async () => {
    if (!editingEnv || !flag) return
    
    // Validate that exactly one value type is set
    const valueCount = (editValue.boolean !== undefined ? 1 : 0) + 
                       (editValue.integer !== undefined ? 1 : 0) + 
                       (editValue.double !== undefined ? 1 : 0)
    
    if (valueCount !== 1) {
      setEditError(t('platformAdmin.featureFlags.detail.exactlyOneValueRequired'))
      return
    }
    
    if (!editReason.trim()) {
      setEditError(t('platformAdmin.featureFlags.detail.reasonRequired'))
      return
    }
    
    setEditLoading(true)
    setEditError(null)
    
    try {
      let envFlag = flagsByEnv[editingEnv]
      
      // If flag doesn't exist for this environment, create it first
      if (!envFlag) {
        const { data: createData, error: createError } = await supabase
          .from('feature_flags')
          .insert({
            key: flag.key,
            value_type: flag.valueType,
            description: flag.description,
            environment: editingEnv,
          })
          .select()
          .single()
        
        if (createError) {
          setEditError(createError.message || 'Failed to create flag for this environment')
          return
        }
        
        // Map the created flag
        envFlag = mapFeatureFlag({
          ...createData,
          default_value_boolean: null,
          default_value_integer: null,
          default_value_double: null,
          org_override_count: 0,
          user_override_count: 0,
        })
      }
      
      // Now set the platform default
      const { data, error } = await supabase.rpc('admin_set_platform_default', {
        p_feature_flag_id: envFlag.id,
        p_value_boolean: editValue.boolean ?? null,
        p_value_integer: editValue.integer ?? null,
        p_value_double: editValue.double ?? null,
        p_environment: editingEnv,
        p_reason: editReason.trim(),
        p_expected_version: envFlag.version,
      } as any)
      
      if (error) {
        setEditError(error.message)
        return
      }
      
      const response = data as RpcResponse | null
      if (!response?.success) {
        setEditError(response?.error || t('errors.unknownError'))
        return
      }
      
      setEditingEnv(null)
      showSuccess(t('platformAdmin.featureFlags.detail.defaultValueUpdated'))
      fetchFlag()
      fetchAuditLog()
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setEditError(errMsg)
      showError(errMsg)
    } finally {
      setEditLoading(false)
    }
  }
  
  useEffect(() => {
    fetchFlag()
  }, [fetchFlag])
  
  useEffect(() => {
    if (activeTab === 'overrides') {
      fetchOverrides()
    } else {
      fetchAuditLog()
    }
  }, [activeTab, fetchOverrides, fetchAuditLog])
  
  const overrideColumns: ColumnConfig<FeatureFlagOverride & { id: string }>[] = [
    {
      id: 'override_type',
      label: t('platformAdmin.featureFlags.detail.overrideType'),
      render: (row: FeatureFlagOverride & { id: string }) => (
        <Badge variant={row.overrideType === 'org' ? 'info' : 'warning'}>
          {row.overrideType === 'org' ? t('platformAdmin.featureFlags.detail.organization') : t('platformAdmin.featureFlags.detail.user')}
        </Badge>
      ),
    },
    {
      id: 'scope_name',
      label: t('platformAdmin.featureFlags.detail.scope'),
      render: (row: FeatureFlagOverride & { id: string }) => (
        <div className="pa-body-m pa-ff-detail-cell-value">
          {row.scopeName}
        </div>
      ),
    },
    {
      id: 'value',
      label: t('platformAdmin.featureFlags.detail.value'),
      render: (row: FeatureFlagOverride & { id: string }) => (
        <div className="pa-body-m">
          {row.valueBoolean !== null ? String(row.valueBoolean) :
           row.valueInteger !== null ? String(row.valueInteger) :
           row.valueDouble !== null ? String(row.valueDouble) : 'N/A'}
        </div>
      ),
    },
    {
      id: 'created_at',
      label: t('platformAdmin.featureFlags.detail.created'),
      render: (row: FeatureFlagOverride & { id: string }) => (
        <div className="pa-body-s pa-ff-detail-cell-meta">
          {new Date(row.createdAt).toLocaleString()}
        </div>
      ),
    },
  ]
  
  const auditColumns: ColumnConfig<FeatureFlagAuditLog>[] = [
    {
      id: 'created_at',
      label: t('platformAdmin.featureFlags.detail.time'),
      render: (row: FeatureFlagAuditLog) => (
        <div className="pa-body-s pa-ff-detail-cell-meta">
          {new Date(row.createdAt).toLocaleString()}
        </div>
      ),
    },
    {
      id: 'action',
      label: t('platformAdmin.featureFlags.detail.action'),
      render: (row: FeatureFlagAuditLog) => (
        <Badge variant={row.action === 'delete' ? 'danger' : row.action === 'create' ? 'success' : 'info'}>
          {row.action}
        </Badge>
      ),
    },
    {
      id: 'actor_name',
      label: t('platformAdmin.featureFlags.detail.actor'),
      render: (row: FeatureFlagAuditLog) => (
        <div className="pa-body-m">
          {row.actorName || row.actorEmail || t('platformAdmin.featureFlags.detail.system')}
        </div>
      ),
    },
    {
      id: 'scope_type',
      label: t('platformAdmin.featureFlags.detail.scope'),
      render: (row: FeatureFlagAuditLog) => (
        <div className="pa-body-s pa-ff-detail-cell-meta">
          {row.scopeType || t('platformAdmin.featureFlags.detail.flag')}
        </div>
      ),
    },
    {
      id: 'scope_id',
      label: t('platformAdmin.featureFlags.detail.target'),
      render: (row: FeatureFlagAuditLog) => (
        <div className="pa-body-s pa-ff-detail-cell-meta">
          {row.scopeId || '-'}
        </div>
      ),
    },
  ]
  
  // Invalid ID
  if (!isValidId && id) {
    return (
      <div>
        <OfflineBanner />
        <button
          className="pa-btn pa-btn--ghost pa-mb-4"
          onClick={() => navigate(getLink('platformAdmin.featureFlags'))}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t('platformAdmin.featureFlags.detail.backToFlags')}
        </button>
        <Card>
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined">error</span>
            </div>
            <h3 className="pa-empty-title">{t('platformAdmin.featureFlags.detail.invalidIdTitle')}</h3>
            <p className="pa-empty-text">{t('platformAdmin.featureFlags.detail.invalidIdMessage')}</p>
          </div>
        </Card>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div>
        <OfflineBanner />
        <PageHeader title={t('platformAdmin.featureFlags.detail.title')} subtitle={t('common.loading')} />
        <div className="pa-grid pa-grid-3 pa-gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pa-card">
              <div className="pa-skeleton pa-ff-detail-skeleton-title" />
              <div className="pa-skeleton pa-ff-detail-skeleton-line" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  // Error state with retry
  if (error && !flag) {
    return (
      <div>
        <OfflineBanner />
        <button
          className="pa-btn pa-btn--ghost pa-mb-4"
          onClick={() => navigate(getLink('platformAdmin.featureFlags'))}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t('platformAdmin.featureFlags.detail.backToFlags')}
        </button>
        <ErrorState
          message={error}
          onRetry={fetchFlag}
          retryLabel={t('common.retry')}
        />
      </div>
    )
  }
  
  // Not found state
  if (notFound || !flag) {
    return (
      <div>
        <OfflineBanner />
        <button
          className="pa-btn pa-btn--ghost pa-mb-4"
          onClick={() => navigate(getLink('platformAdmin.featureFlags'))}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t('platformAdmin.featureFlags.detail.backToFlags')}
        </button>
        <Card>
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined">flag</span>
            </div>
            <h3 className="pa-empty-title">{t('platformAdmin.featureFlags.detail.notFoundTitle')}</h3>
            <p className="pa-empty-text">
              {t('platformAdmin.featureFlags.detail.notFoundMessage')}
            </p>
            <Button variant="primary" onClick={() => navigate(getLink('platformAdmin.featureFlags'))}>
              {t('platformAdmin.featureFlags.detail.backToFlags')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  return (
    <div>
      <OfflineBanner />
      <PageHeader
        title={flag.key}
        subtitle={flag.description || t('platformAdmin.featureFlags.detail.noDescription')}
        breadcrumbs={[
          { label: 'Platform Admin', path: getLink('platformAdmin.dashboard') },
          { label: 'Feature Flags', path: getLink('platformAdmin.featureFlags') },
          { label: flag.key },
        ]}
        actions={
          <Button variant="ghost" onClick={() => navigate(getLink('platformAdmin.featureFlags'))}>
            <span className="material-symbols-outlined">arrow_back</span>
            {t('platformAdmin.featureFlags.detail.backToFlags')}
          </Button>
        }
      />
      
      {/* Flag info + Platform defaults: two cards on one row */}
      <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
        <Card className="pa-ff-detail-card">
          <div className="pa-ff-flag-info">
            <div className="pa-ff-flag-info-body">
              <div className="pa-form-group">
                <div className="pa-ff-flag-info-key-label">{t('platformAdmin.featureFlags.detail.flagKey')}</div>
                <div className="pa-ff-flag-info-key-value">{flag.key}</div>
              </div>
              <div className="pa-form-group">
                <div className="pa-ff-flag-info-key-label">{t('platformAdmin.featureFlags.detail.descriptionLabel')}</div>
                {flag.description ? (
                  <div className="pa-ff-flag-info-desc">{flag.description}</div>
                ) : (
                  <div className="pa-ff-flag-info-desc-empty">{t('platformAdmin.featureFlags.detail.noDescription')}</div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card
          title={t('platformAdmin.featureFlags.detail.platformDefaultsByEnvironment')}
          className="pa-ff-detail-card"
        >
        <div className="pa-ff-env-list">
          {(['dev', 'staging', 'prod'] as const).map((env) => {
            const envFlag = flagsByEnv[env]
            const hasValue = envFlag && (
              (envFlag.valueType === 'boolean' && envFlag.defaultValueBoolean !== null) ||
              (envFlag.valueType === 'integer' && envFlag.defaultValueInteger !== null) ||
              (envFlag.valueType === 'double' && envFlag.defaultValueDouble !== null)
            )
            const valueText = envFlag && hasValue
              ? (envFlag.valueType === 'boolean'
                  ? String(envFlag.defaultValueBoolean)
                  : envFlag.valueType === 'integer'
                    ? String(envFlag.defaultValueInteger)
                    : String(envFlag.defaultValueDouble))
              : null

            return (
              <div key={env} className="pa-ff-env-row">
                <span className="pa-ff-env-row__name">{env}</span>
                <div className={`pa-ff-env-row__value ${!valueText ? 'pa-ff-env-row__value--empty' : ''}`}>
                  {valueText ?? (
                    <>
                      {t('platformAdmin.featureFlags.detail.notSet')}
                      <span className="pa-body-s"> — {t('platformAdmin.featureFlags.detail.clickToSet')}</span>
                    </>
                  )}
                </div>
                <div className="pa-ff-env-row__edit">
                  {(!envFlag || !envFlag.deletedAt) && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => openEditDefaultDialog(env)}
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overrides' | 'audit')}>
        <div className="pa-flex pa-flex-col sm:pa-flex-row pa-gap-2 pa-mb-4 pa-ff-tabs-bar">
          <TabsTrigger value="overrides">
            {t('platformAdmin.featureFlags.detail.overridesTab')} ({overrides.length})
          </TabsTrigger>
          <TabsTrigger value="audit">
            {t('platformAdmin.featureFlags.detail.auditLogTab')} ({auditLog.length})
          </TabsTrigger>
        </div>
        
        {/* Overrides Tab */}
        <TabsContent value="overrides">
          <Card>
            <PlatformDataTable
              columns={overrideColumns as ColumnConfig<{ id: string }>[]}
              rows={overrides as ({ id: string })[]}
              loading={false}
              emptyMessage={t('platformAdmin.featureFlags.detail.noOverrides')}
              page={0}
              rowsPerPage={1000}
              totalCount={overrides.length}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          </Card>
        </TabsContent>
        
        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <PlatformDataTable
              columns={auditColumns}
              rows={auditLog}
              loading={false}
              emptyMessage={t('platformAdmin.featureFlags.detail.noAuditLog')}
              page={0}
              rowsPerPage={1000}
              totalCount={auditLog.length}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Edit Default Value Modal */}
      <Modal
        open={editingEnv !== null}
        onClose={() => {
          setEditingEnv(null)
          setEditError(null)
        }}
        title={`Edit Platform Default - ${editingEnv?.toUpperCase()}`}
        size="small"
      >
        <div className="pa-form-modal-body">
          {editError && (
            <div className="pa-form-error" role="alert">
              {editError}
            </div>
          )}

          {editingEnv && (flagsByEnv[editingEnv] || flag) && (
            <div className="pa-form-group">
              <label className="pa-form-modal-label">
                {t('platformAdmin.featureFlags.detail.valueLabel')} ({flagsByEnv[editingEnv]?.valueType ?? flag.valueType})
              </label>
              {(flagsByEnv[editingEnv]?.valueType ?? flag.valueType) === 'boolean' && (
                <div className="pa-form-row-inline">
                  <Switch
                    checked={editValue.boolean ?? false}
                    onCheckedChange={(checked) => setEditValue({ boolean: checked })}
                  />
                  <span className="pa-body-m">
                    {editValue.boolean ? 'true' : 'false'}
                  </span>
                </div>
              )}
              {(flagsByEnv[editingEnv]?.valueType ?? flag.valueType) === 'integer' && (
                <Input
                  type="number"
                  value={editValue.integer?.toString() ?? ''}
                  onChange={(e) => setEditValue({ integer: parseInt(e.target.value, 10) || 0 })}
                  placeholder="0"
                  className="pa-form-input-full"
                />
              )}
              {(flagsByEnv[editingEnv]?.valueType ?? flag.valueType) === 'double' && (
                <Input
                  type="number"
                  step="0.01"
                  value={editValue.double?.toString() ?? ''}
                  onChange={(e) => setEditValue({ double: parseFloat(e.target.value) || 0 })}
                  placeholder="0.0"
                  className="pa-form-input-full"
                />
              )}
            </div>
          )}

          <div className="pa-form-group">
            <label className="pa-form-modal-label">
              {t('platformAdmin.featureFlags.detail.reasonLabel')} *
            </label>
            <Input
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder={t('platformAdmin.featureFlags.detail.reasonPlaceholder')}
              className="pa-form-input-full"
            />
          </div>

          <div className="pa-form-modal-actions">
            <Button
              variant="ghost"
              onClick={() => {
                setEditingEnv(null)
                setEditError(null)
              }}
              disabled={editLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveDefaultValue}
              disabled={editLoading || !editReason.trim()}
            >
              {editLoading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
