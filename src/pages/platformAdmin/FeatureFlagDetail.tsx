import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, Card, Button, PlatformDataTable, type ColumnConfig, OfflineBanner, ErrorState } from '../../components/platformAdmin'
import { isValidUUID } from '../../utils/uuid'
import { isNotFoundError } from '../../utils/errorUtils'
import { mapFeatureFlag, mapFeatureFlagOverride, mapFeatureFlagAuditLog } from '../../utils/domainMappers'
import type { FeatureFlag, FeatureFlagOverride, FeatureFlagAuditLog } from '../../types/domain/FeatureFlag'

export default function FeatureFlagDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [flag, setFlag] = useState<FeatureFlag | null>(null)
  const [overrides, setOverrides] = useState<FeatureFlagOverride[]>([])
  const [auditLog, setAuditLog] = useState<FeatureFlagAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<'overrides' | 'audit'>('overrides')
  
  // Validate route parameter
  const isValidId = useMemo(() => {
    if (!id) return false
    return isValidUUID(id)
  }, [id])
  
  const fetchFlag = useCallback(async () => {
    if (!id || !isValidId) {
      if (!isValidId && id) {
        setError('Invalid feature flag ID format')
      }
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    setNotFound(false)
    
    try {
      const { data, error } = await supabase
        .from('admin_feature_flags_list')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (isNotFoundError(error)) {
          setNotFound(true)
          setFlag(null)
        } else {
          setError(error.message || 'Failed to load feature flag')
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
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setFlag(null)
    } finally {
      setLoading(false)
    }
  }, [id, isValidId])
  
  const fetchOverrides = useCallback(async () => {
    if (!id) return
    
    try {
      const { data, error } = await supabase
        .from('admin_feature_flag_overrides')
        .select('*')
        .eq('feature_flag_id', id)
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
  }, [id])
  
  const fetchAuditLog = useCallback(async () => {
    if (!id) return
    
    try {
      const { data, error } = await supabase
        .from('admin_feature_flag_audit')
        .select('*')
        .eq('feature_flag_id', id)
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) {
        console.error('Error fetching audit log:', error)
        setAuditLog([])
      } else {
        setAuditLog((data || []).map(row => mapFeatureFlagAuditLog(row)))
      }
    } catch (err) {
      console.error('Error:', err)
      setAuditLog([])
    }
  }, [id])
  
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
  
  const getValueDisplay = (flag: FeatureFlag): string => {
    if (flag.valueType === 'boolean') {
      return flag.defaultValueBoolean !== null ? String(flag.defaultValueBoolean) : 'Not set'
    }
    if (flag.valueType === 'integer') {
      return flag.defaultValueInteger !== null ? String(flag.defaultValueInteger) : 'Not set'
    }
    if (flag.valueType === 'double') {
      return flag.defaultValueDouble !== null ? String(flag.defaultValueDouble) : 'Not set'
    }
    return 'Not set'
  }
  
  const overrideColumns: ColumnConfig<FeatureFlagOverride & { id: string }>[] = [
    {
      id: 'override_type',
      label: 'Type',
      render: (row: FeatureFlagOverride & { id: string }) => (
        <Badge variant={row.overrideType === 'org' ? 'info' : 'warning'}>
          {row.overrideType === 'org' ? 'Organization' : 'User'}
        </Badge>
      ),
    },
    {
      id: 'scope_name',
      label: 'Scope',
      render: (row: FeatureFlagOverride & { id: string }) => (
        <div className="pa-body-m" style={{ fontWeight: 600 }}>
          {row.scopeName}
        </div>
      ),
    },
    {
      id: 'value',
      label: 'Value',
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
      label: 'Created',
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
      label: 'Time',
      render: (row: FeatureFlagAuditLog) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
          {new Date(row.createdAt).toLocaleString()}
        </div>
      ),
    },
    {
      id: 'action',
      label: 'Action',
      render: (row: FeatureFlagAuditLog) => (
        <Badge variant={row.action === 'delete' ? 'danger' : row.action === 'create' ? 'success' : 'info'}>
          {row.action}
        </Badge>
      ),
    },
    {
      id: 'actor_name',
      label: 'Actor',
      render: (row: FeatureFlagAuditLog) => (
        <div className="pa-body-m">
          {row.actorName || row.actorEmail || 'System'}
        </div>
      ),
    },
    {
      id: 'scope_type',
      label: 'Scope',
      render: (row: FeatureFlagAuditLog) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
          {row.scopeType || 'flag'}
        </div>
      ),
    },
    {
      id: 'scope_id',
      label: 'Target',
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
          onClick={() => navigate('/platform-admin/feature-flags')}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Feature Flags
        </button>
        <Card>
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined">error</span>
            </div>
            <h3 className="pa-empty-title">INVALID FEATURE FLAG ID</h3>
            <p className="pa-empty-text">The feature flag ID in the URL is invalid.</p>
          </div>
        </Card>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div>
        <OfflineBanner />
        <PageHeader title="Feature Flag Detail" subtitle="Loading..." />
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
          onClick={() => navigate('/platform-admin/feature-flags')}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Feature Flags
        </button>
        <ErrorState
          message={error}
          onRetry={fetchFlag}
          retryLabel="Retry"
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
          onClick={() => navigate('/platform-admin/feature-flags')}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Feature Flags
        </button>
        <Card>
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined">flag</span>
            </div>
            <h3 className="pa-empty-title">FEATURE FLAG NOT FOUND</h3>
            <p className="pa-empty-text">
              The feature flag you're looking for doesn't exist or has been deleted.
            </p>
            <Button variant="primary" onClick={() => navigate('/platform-admin/feature-flags')}>
              Back to Feature Flags
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
        title={`Feature Flag: ${flag.key}`}
        subtitle={flag.description || 'No description'}
      />
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: 'var(--pa-space-4)' }}>
        <Button variant="ghost" onClick={() => navigate('/platform-admin/feature-flags')}>
          ← Back to Flags
        </Button>
        <Badge variant={flag.deletedAt ? 'danger' : 'success'}>
          {flag.deletedAt ? 'Deleted' : 'Active'}
        </Badge>
        <Badge variant="info">{flag.environment.toUpperCase()}</Badge>
        <Badge variant="neutral">{flag.valueType}</Badge>
      </div>
      
      {/* Flag Info */}
      <Card title="Flag Information" style={{ marginBottom: 'var(--pa-space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--pa-space-4)' }}>
          <div>
            <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginBottom: '4px' }}>Key</div>
            <div className="pa-body-m" style={{ fontWeight: 600 }}>{flag.key}</div>
          </div>
          <div>
            <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginBottom: '4px' }}>Value Type</div>
            <div className="pa-body-m">{flag.valueType}</div>
          </div>
          <div>
            <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginBottom: '4px' }}>Environment</div>
            <div className="pa-body-m">{flag.environment.toUpperCase()}</div>
          </div>
          <div>
            <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginBottom: '4px' }}>Platform Default</div>
            <div className="pa-body-m">{getValueDisplay(flag)}</div>
          </div>
          <div>
            <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginBottom: '4px' }}>Organization Overrides</div>
            <div className="pa-body-m">{flag.orgOverrideCount}</div>
          </div>
          <div>
            <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginBottom: '4px' }}>User Overrides</div>
            <div className="pa-body-m">{flag.userOverrideCount}</div>
          </div>
          <div>
            <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginBottom: '4px' }}>Created</div>
            <div className="pa-body-m">{new Date(flag.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginBottom: '4px' }}>Last Updated</div>
            <div className="pa-body-m">{new Date(flag.updatedAt).toLocaleString()}</div>
          </div>
        </div>
      </Card>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--pa-space-4)', borderBottom: '2px solid var(--pa-n100)' }}>
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
        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '3px solid var(--pa-n900)' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'audit' ? 700 : 400,
            color: activeTab === 'audit' ? 'var(--pa-n900)' : 'var(--pa-n700)',
          }}
        >
          Audit Log ({auditLog.length})
        </button>
      </div>
      
      {/* Content */}
      {activeTab === 'overrides' && (
        <Card>
          <PlatformDataTable
            columns={overrideColumns as ColumnConfig<{ id: string }>[]}
            rows={overrides as ({ id: string })[]}
            loading={false}
            emptyMessage="No overrides found for this flag"
            page={0}
            rowsPerPage={1000}
            totalCount={overrides.length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
          />
        </Card>
      )}
      
      {activeTab === 'audit' && (
        <Card>
          <PlatformDataTable
            columns={auditColumns}
            rows={auditLog}
            loading={false}
            emptyMessage="No audit log entries found"
            page={0}
            rowsPerPage={1000}
            totalCount={auditLog.length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
          />
        </Card>
      )}
    </div>
  )
}
