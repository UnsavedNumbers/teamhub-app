import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, Card, Button, PlatformDataTable, type ColumnConfig, OfflineBanner, ErrorState, StatCard, Tabs, TabsTrigger, TabsContent, Modal, Input, Switch } from '../../components/platformAdmin'
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
  const [overrides, setOverrides] = useState<FeatureFlagOverride[]>([])
  const [auditLog, setAuditLog] = useState<FeatureFlagAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<'overrides' | 'audit'>('overrides')
  
  // Edit default value dialog state
  const [editDefaultOpen, setEditDefaultOpen] = useState(false)
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
      const { data, error } = await db
        .from('admin_feature_flags_list')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (isNotFoundError(error)) {
          setNotFound(true)
          setFlag(null)
        } else {
          setError(error.message || t('platformAdmin.featureFlags.detail.loadFailed'))
          setFlag(null)
        }
      } else if (data) {
        setFlag(mapFeatureFlag(data))
        setError(null)
      } else {
        setNotFound(true)
        setFlag(null)
      }
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
    if (!id) return
    
    try {
      const { data, error } = await db
        .from('admin_feature_flag_overrides')
        .select('*')
        .eq('feature_flag_id', id)
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
  }, [id])
  
  const fetchAuditLog = useCallback(async () => {
    if (!id) return
    
    try {
      const { data, error } = await db
        .from('admin_feature_flag_audit')
        .select('*')
        .eq('feature_flag_id', id)
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
  }, [id])
  
  const openEditDefaultDialog = useCallback(() => {
    if (!flag) return
    // Initialize with current value
    if (flag.valueType === 'boolean') {
      setEditValue({ boolean: flag.defaultValueBoolean ?? false })
    } else if (flag.valueType === 'integer') {
      setEditValue({ integer: flag.defaultValueInteger ?? 0 })
    } else if (flag.valueType === 'double') {
      setEditValue({ double: flag.defaultValueDouble ?? 0 })
    }
    setEditReason('')
    setEditError(null)
    setEditDefaultOpen(true)
  }, [flag])
  
  const handleSaveDefaultValue = async () => {
    if (!flag || !id) return
    
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
      const { data, error } = await supabase.rpc('admin_set_platform_default', {
        p_feature_flag_id: id,
        p_value_boolean: editValue.boolean ?? null,
        p_value_integer: editValue.integer ?? null,
        p_value_double: editValue.double ?? null,
        p_environment: flag.environment,
        p_reason: editReason.trim(),
        p_expected_version: flag.version,
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
      
      setEditDefaultOpen(false)
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
        <div className="pa-body-m" style={{ fontWeight: 600 }}>
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
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
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
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
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
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
          {row.scopeType || t('platformAdmin.featureFlags.detail.flag')}
        </div>
      ),
    },
    {
      id: 'scope_id',
      label: t('platformAdmin.featureFlags.detail.target'),
      render: (row: FeatureFlagAuditLog) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
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
              <div className="pa-skeleton" style={{ width: '60%', height: '20px', marginBottom: '16px' }} />
              <div className="pa-skeleton" style={{ width: '100%', height: '40px' }} />
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
      />
      
      {/* Back button */}
      <div className="pa-mb-4">
        <Button variant="ghost" onClick={() => navigate(getLink('platformAdmin.featureFlags'))}>
          <span className="material-symbols-outlined" style={{ marginRight: '8px' }}>arrow_back</span>
          {t('platformAdmin.featureFlags.detail.backToFlags')}
        </Button>
      </div>
      
      {/* Stat Cards */}
      <div className="pa-grid pa-grid-3 pa-gap-4 pa-mb-4">
        <StatCard
          label={t('platformAdmin.featureFlags.detail.orgOverrides')}
          value={flag.orgOverrideCount}
          icon="business"
        />
        <StatCard
          label={t('platformAdmin.featureFlags.detail.userOverrides')}
          value={flag.userOverrideCount}
          icon="person"
        />
        <StatCard
          label={t('platformAdmin.featureFlags.detail.environment')}
          value={flag.environment.toUpperCase()}
          icon="public"
        />
      </div>
      
      {/* Flag Info Card - Uplifted Design */}
      <Card title={t('platformAdmin.featureFlags.detail.flagInformation')} style={{ marginBottom: 'var(--pa-space-4)' }}>
        
        {/* Hero Section - Flag Key & Primary Value */}
        <div style={{
          background: 'linear-gradient(135deg, var(--pa-n25) 0%, var(--pa-n50) 100%)',
          borderRadius: '8px',
          padding: 'var(--pa-space-6)',
          marginBottom: 'var(--pa-space-6)',
          border: '1px solid var(--pa-n100)'
        }}>
          <div className="pa-grid" style={{ gridTemplateColumns: '1fr auto auto', gap: 'var(--pa-space-6)', alignItems: 'center' }}>
            {/* Flag Key - Primary identifier */}
            <div>
              <div className="pa-body-xs" style={{ 
                color: 'var(--pa-n500)', 
                marginBottom: 'var(--pa-space-1)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '6px' }}>key</span>
                {t('platformAdmin.featureFlags.detail.flagKey')}
              </div>
              <div style={{
                fontFamily: 'var(--pa-font-mono)',
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--pa-n900)',
                lineHeight: 1.2,
                wordBreak: 'break-word'
              }}>
                {flag.key}
              </div>
            </div>

            {/* Current Value Display */}
            <div style={{
              background: 'var(--pa-n0)',
              borderRadius: '8px',
              padding: 'var(--pa-space-4)',
              border: '2px solid var(--pa-n200)',
              minWidth: '140px',
              textAlign: 'center'
            }}>
              <div className="pa-body-xs" style={{ 
                color: 'var(--pa-n500)', 
                marginBottom: 'var(--pa-space-1)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600
              }}>
                {t('platformAdmin.featureFlags.detail.currentValue')}
              </div>
              <div style={{
                fontFamily: 'var(--pa-font-mono)',
                fontSize: '24px',
                fontWeight: 700,
                color: flag.valueType === 'boolean' 
                  ? (flag.defaultValueBoolean ? '#10b981' : '#ef4444')
                  : 'var(--pa-n900)'
              }}>
                {getValueDisplay(flag)}
              </div>
            </div>

            {/* Edit Action */}
            {!flag.deletedAt && (
              <Button 
                variant="primary" 
                onClick={openEditDefaultDialog}
                style={{ minWidth: '120px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>edit</span>
                {t('platformAdmin.featureFlags.detail.edit')}
              </Button>
            )}
          </div>
        </div>

        {/* Information Panels Grid */}
        <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2" style={{ gap: 'var(--pa-space-4)' }}>
          
          {/* Technical Details Panel */}
          <div style={{
            background: 'var(--pa-n25)',
            borderRadius: '6px',
            padding: 'var(--pa-space-4)',
            border: '1px solid var(--pa-n100)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 'var(--pa-space-3)',
              gap: 'var(--pa-space-2)'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-n600)' }}>settings</span>
              <h4 className="pa-body-m" style={{ fontWeight: 700, color: 'var(--pa-n800)', margin: 0 }}>
                {t('platformAdmin.featureFlags.detail.technicalDetails')}
              </h4>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-3)' }}>
              <div>
                <div className="pa-body-xs" style={{ color: 'var(--pa-n600)', marginBottom: '4px', fontWeight: 600 }}>
                  {t('platformAdmin.featureFlags.detail.valueType')}
                </div>
                <div className="pa-body-m" style={{ fontWeight: 500, color: 'var(--pa-n900)' }}>
                  <Badge variant="neutral">{flag.valueType}</Badge>
                </div>
              </div>
              
              <div>
                <div className="pa-body-xs" style={{ color: 'var(--pa-n600)', marginBottom: '4px', fontWeight: 600 }}>
                  {t('platformAdmin.featureFlags.detail.environment')}
                </div>
                <div className="pa-body-m" style={{ fontWeight: 500, color: 'var(--pa-n900)' }}>
                  <Badge variant="info">{flag.environment.toUpperCase()}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Panel */}
          <div style={{
            background: 'var(--pa-n25)',
            borderRadius: '6px',
            padding: 'var(--pa-space-4)',
            border: '1px solid var(--pa-n100)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 'var(--pa-space-3)',
              gap: 'var(--pa-space-2)'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-n600)' }}>schedule</span>
              <h4 className="pa-body-m" style={{ fontWeight: 700, color: 'var(--pa-n800)', margin: 0 }}>
                {t('platformAdmin.featureFlags.detail.metadata')}
              </h4>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-3)' }}>
              <div>
                <div className="pa-body-xs" style={{ color: 'var(--pa-n600)', marginBottom: '4px', fontWeight: 600 }}>
                  {t('platformAdmin.featureFlags.detail.created')}
                </div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
                  {new Date(flag.createdAt).toLocaleString()}
                </div>
              </div>
              
              <div>
                <div className="pa-body-xs" style={{ color: 'var(--pa-n600)', marginBottom: '4px', fontWeight: 600 }}>
                  {t('platformAdmin.featureFlags.detail.lastUpdated')}
                </div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
                  {new Date(flag.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </Card>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overrides' | 'audit')}>
        <div className="pa-flex pa-flex-col sm:pa-flex-row pa-gap-2 pa-mb-4" style={{ borderBottom: '2px solid var(--pa-n100)' }}>
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
        open={editDefaultOpen}
        onClose={() => setEditDefaultOpen(false)}
        title={t('platformAdmin.featureFlags.detail.editDefaultTitle')}
        size="small"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-4)' }}>
          {editError && (
            <div style={{ 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              color: '#b91c1c', 
              padding: 'var(--pa-space-3) var(--pa-space-4)', 
              borderRadius: '4px' 
            }}>
              {editError}
            </div>
          )}
          
          <div>
            <label className="pa-body-s" style={{ display: 'block', marginBottom: 'var(--pa-space-2)', color: 'var(--pa-n700)' }}>
              {t('platformAdmin.featureFlags.detail.valueLabel')} ({flag.valueType})
            </label>
            
            {flag.valueType === 'boolean' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)' }}>
                <Switch
                  checked={editValue.boolean ?? false}
                  onCheckedChange={(checked) => setEditValue({ boolean: checked })}
                />
                <span className="pa-body-m">
                  {editValue.boolean ? 'true' : 'false'}
                </span>
              </div>
            )}
            
            {flag.valueType === 'integer' && (
              <Input
                type="number"
                value={editValue.integer?.toString() ?? ''}
                onChange={(e) => setEditValue({ integer: parseInt(e.target.value, 10) || 0 })}
                placeholder="0"
                style={{ width: '100%' }}
              />
            )}
            
            {flag.valueType === 'double' && (
              <Input
                type="number"
                step="0.01"
                value={editValue.double?.toString() ?? ''}
                onChange={(e) => setEditValue({ double: parseFloat(e.target.value) || 0 })}
                placeholder="0.0"
                style={{ width: '100%' }}
              />
            )}
          </div>
          
          <div>
            <label className="pa-body-s" style={{ display: 'block', marginBottom: 'var(--pa-space-2)', color: 'var(--pa-n700)' }}>
              {t('platformAdmin.featureFlags.detail.reasonLabel')} *
            </label>
            <Input
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder={t('platformAdmin.featureFlags.detail.reasonPlaceholder')}
              style={{ width: '100%' }}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--pa-space-2)', paddingTop: 'var(--pa-space-4)' }}>
            <Button
              variant="ghost"
              onClick={() => setEditDefaultOpen(false)}
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
