import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, Card, Button, PlatformDataTable, type ColumnConfig } from '../../components/platformAdmin'
import type { AdminFeatureFlag, FeatureFlagOverride, FeatureFlagAuditLog } from '../../types/featureFlags.types'

export default function FeatureFlagDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [flag, setFlag] = useState<AdminFeatureFlag | null>(null)
  const [overrides, setOverrides] = useState<FeatureFlagOverride[]>([])
  const [auditLog, setAuditLog] = useState<FeatureFlagAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overrides' | 'audit'>('overrides')
  
  const fetchFlag = useCallback(async () => {
    if (!id) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('admin_feature_flags_list')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('Error fetching feature flag:', error)
        setFlag(null)
      } else {
        setFlag(data)
      }
    } catch (err) {
      console.error('Error:', err)
      setFlag(null)
    } finally {
      setLoading(false)
    }
  }, [id])
  
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
        setOverrides(data || [])
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
        setAuditLog(data || [])
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
  
  const overrideColumns: ColumnConfig<FeatureFlagOverride>[] = [
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
      label: row => row.override_type === 'org' ? 'Organization' : 'User',
      render: (row) => (
        <div className="pa-body-m" style={{ fontWeight: 600 }}>
          {row.scope_name}
        </div>
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
      id: 'created_at',
      label: 'Created',
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
          {new Date(row.created_at).toLocaleString()}
        </div>
      ),
    },
  ]
  
  const auditColumns: ColumnConfig<FeatureFlagAuditLog>[] = [
    {
      id: 'created_at',
      label: 'Time',
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
          {new Date(row.created_at).toLocaleString()}
        </div>
      ),
    },
    {
      id: 'action',
      label: 'Action',
      render: (row) => (
        <Badge variant={row.action === 'delete' ? 'danger' : row.action === 'create' ? 'success' : 'info'}>
          {row.action}
        </Badge>
      ),
    },
    {
      id: 'actor_name',
      label: 'Actor',
      render: (row) => (
        <div className="pa-body-m">
          {row.actor_name || row.actor_email || 'System'}
        </div>
      ),
    },
    {
      id: 'scope_type',
      label: 'Scope',
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
          {row.scope_type || 'flag'}
        </div>
      ),
    },
    {
      id: 'scope_id',
      label: 'Target',
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
          {row.scope_id || '-'}
        </div>
      ),
    },
  ]
  
  if (loading) {
    return (
      <div>
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
  
  if (!flag) {
    return (
      <div>
        <PageHeader title="Feature Flag Not Found" subtitle="The requested feature flag could not be found." />
        <Card>
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>error</span>
            </div>
            <h3 className="pa-empty-title">FLAG NOT FOUND</h3>
            <p className="pa-empty-text">
              The feature flag you're looking for doesn't exist or has been deleted.
            </p>
            <Button variant="primary" onClick={() => navigate('/platform-admin/feature-flags')}>
              Back to Flags
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  return (
    <div>
      <PageHeader
        title={`Feature Flag: ${flag.key}`}
        subtitle={flag.description || 'No description'}
      />
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: 'var(--pa-space-4)' }}>
        <Button variant="ghost" onClick={() => navigate('/platform-admin/feature-flags')}>
          ← Back to Flags
        </Button>
        <Badge variant={flag.deleted_at ? 'danger' : 'success'}>
          {flag.deleted_at ? 'Deleted' : 'Active'}
        </Badge>
        <Badge variant="info">{flag.environment.toUpperCase()}</Badge>
        <Badge variant="neutral">{flag.value_type}</Badge>
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
            <div className="pa-body-m">{flag.value_type}</div>
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
            <div className="pa-body-m">{flag.org_override_count}</div>
          </div>
          <div>
            <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginBottom: '4px' }}>User Overrides</div>
            <div className="pa-body-m">{flag.user_override_count}</div>
          </div>
          <div>
            <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginBottom: '4px' }}>Created</div>
            <div className="pa-body-m">{new Date(flag.created_at).toLocaleString()}</div>
          </div>
          <div>
            <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginBottom: '4px' }}>Last Updated</div>
            <div className="pa-body-m">{new Date(flag.updated_at).toLocaleString()}</div>
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
            columns={overrideColumns}
            rows={overrides}
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
