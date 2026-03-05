/**
 * FeatureFlagsTab Component
 * 
 * Displays and manages feature flags for the organization.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { PlatformDataTable, type ColumnConfig, Badge, ConfirmDialog, Button } from '../../../../components/platformAdmin'
import { DataState } from '../../../../components/platformAdmin/DataState'
import { useRolePermissions } from '../../../../hooks/useRolePermissions'
import { handleRpcError } from '../../../../utils/rpcErrorHandler'
import { isRpcSuccessResponse } from '../../../../utils/typeAdapters'
import { showSuccess, showError } from '../../../../utils/toast'
import { safeDate } from '../../../../utils/safeAccessors'
import type { AdminFeatureFlag, AdminRpcResponse } from '../../../../types/platformAdmin.types'
import type { PlatformAdminRole } from '../../../../types/platformAdmin.types'

interface FeatureFlagsTabProps {
  organizationId: string
  adminRole: PlatformAdminRole | null
  onFlagToggled?: () => void
}

export function FeatureFlagsTab({ organizationId, adminRole: _adminRole, onFlagToggled }: FeatureFlagsTabProps) {
  const isMountedRef = useRef(true)
  const permissions = useRolePermissions()
  const [flags, setFlags] = useState<AdminFeatureFlag[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    flag: AdminFeatureFlag | null
  }>({ open: false, flag: null })
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchFlags = useCallback(async () => {
    if (!organizationId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('admin_feature_flags')
        .select('*')
        .eq('org_id', organizationId)
        .order('feature_key', { ascending: true })

      if (!isMountedRef.current) return

      if (fetchError) {
        const normalized = handleRpcError(fetchError, 'fetch_feature_flags')
        setError(normalized.message)
        setFlags([])
        return
      }
      setFlags((data || []) as AdminFeatureFlag[])
    } catch (err) {
      if (!isMountedRef.current) return
      const normalized = handleRpcError(err, 'fetch_feature_flags')
      setError(normalized.message)
      setFlags([])
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [organizationId])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  const handleToggleFlag = (flag: AdminFeatureFlag) => {
    if (!permissions.canToggleFeatureFlag) {
      showError('You do not have permission to toggle feature flags')
      return
    }

    setDialogError(null)
    setConfirmDialog({ open: true, flag })
  }

  const handleConfirmToggle = async (reason: string) => {
    if (!confirmDialog.flag) return

    setDialogLoading(true)
    setDialogError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_set_feature_flag', {
        target_org_id: organizationId,
        target_feature_key: confirmDialog.flag.feature_key,
        target_enabled: !confirmDialog.flag.enabled,
        reason,
      })

      if (rpcError) {
        // Check if RPC function doesn't exist
        const is404 = rpcError.code === 'PGRST116' || 
                      rpcError.message.includes('404') || 
                      rpcError.message.includes('not found') ||
                      rpcError.message.includes('function') ||
                      rpcError.message.includes('does not exist')
        
        if (is404) {
          setDialogError('RPC function \'admin_set_feature_flag\' not available. Please ensure database migrations are up to date.')
        } else {
          const normalized = handleRpcError(rpcError, 'admin_set_feature_flag')
          setDialogError(normalized.message)
        }
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
        setDialogError((data as AdminRpcResponse)?.error || 'Unknown error')
        return
      }

      setConfirmDialog({ open: false, flag: null })
      showSuccess(`Feature flag ${!confirmDialog.flag.enabled ? 'enabled' : 'disabled'} successfully`)
      fetchFlags() // Refresh flags
      onFlagToggled?.() // Notify parent
    } catch (err) {
      const normalized = handleRpcError(err, 'admin_set_feature_flag')
      setDialogError(normalized.message)
    } finally {
      setDialogLoading(false)
    }
  }

  const columns: ColumnConfig<AdminFeatureFlag>[] = [
    {
      id: 'feature_key',
      label: 'Feature',
      render: (row) => (
        <code style={{ fontSize: '12px', background: 'var(--pa-n100)', padding: '2px 6px', borderRadius: '4px' }}>
          {row.feature_key}
        </code>
      ),
    },
    {
      id: 'enabled',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.enabled ? 'success' : 'neutral'}>
          {row.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      id: 'updated_at',
      label: 'Last Updated',
      render: (row) => safeDate(row.updated_at),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Button
          variant="ghost"
          size="dense"
          icon={row.enabled ? 'toggle_on' : 'toggle_off'}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            handleToggleFlag(row)
          }}
          disabled={!permissions.canToggleFeatureFlag}
          title={
            !permissions.canToggleFeatureFlag
              ? 'You do not have permission to toggle feature flags'
              : `Toggle ${row.feature_key}`
          }
        >
          {row.enabled ? 'Disable' : 'Enable'}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <DataState
        data={flags}
        loading={loading}
        error={error}
        onRetry={fetchFlags}
        emptyMessage="No feature flags configured for this organization"
        emptyIcon="flag"
      >
        {(data) => (
          <PlatformDataTable
            columns={columns}
            rows={data}
            loading={false}
            emptyMessage="No feature flags found"
            page={0}
            rowsPerPage={50}
            totalCount={data.length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
          />
        )}
      </DataState>

      <ConfirmDialog
        open={confirmDialog.open}
        title={`Toggle Feature Flag: ${confirmDialog.flag?.feature_key}`}
        description={
          confirmDialog.flag
            ? `Are you sure you want to ${confirmDialog.flag.enabled ? 'disable' : 'enable'} the feature "${confirmDialog.flag.feature_key}"?`
            : ''
        }
        confirmLabel={confirmDialog.flag?.enabled ? 'Disable' : 'Enable'}
        variant="info"
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleConfirmToggle}
        onCancel={() => {
          setDialogError(null)
          setConfirmDialog({ open: false, flag: null })
        }}
      />
    </div>
  )
}
