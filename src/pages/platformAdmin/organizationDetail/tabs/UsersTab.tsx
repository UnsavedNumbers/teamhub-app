/**
 * UsersTab Component
 * 
 * Displays all users in the organization with their roles and status.
 * Uses get_organization_users RPC for efficient server-side filtering.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../../lib/supabase'
import { PlatformDataTable, type ColumnConfig, Badge, Button, ConfirmDialog } from '../../../../components/platformAdmin'
import { DataState } from '../../../../components/platformAdmin/DataState'
import { useRolePermissions } from '../../../../hooks/useRolePermissions'
import { usePagination } from '../../../../hooks/usePagination'
import { handleRpcError } from '../../../../utils/rpcErrorHandler'
import { isRpcSuccessResponse } from '../../../../utils/typeAdapters'
import { showSuccess, showError } from '../../../../utils/toast'
import { getDisplayEmail } from '../../../../utils/platformAdminMasking'
import { safeString, safeDate, safeBoolean } from '../../../../utils/safeAccessors'
import { USE_FAKE_DATA } from '../../../../data/config'
import type { AdminRpcResponse, PlatformAdminRole } from '../../../../types/platformAdmin.types'

interface OrganizationUser {
  id: string
  email: string | null
  phone: string | null
  display_name: string | null
  roles: string[]
  is_platform_admin: boolean
  last_sign_in_at: string | null
  email_confirmed: boolean | null
  is_disabled: boolean | null
  created_at: string | null
  updated_at: string | null
}

interface UsersTabProps {
  organizationId: string
  adminRole: string | null
}

export function UsersTab({ organizationId, adminRole }: UsersTabProps) {
  const navigate = useNavigate()
  const permissions = useRolePermissions()
  const isMountedRef = useRef(true)
  const [users, setUsers] = useState<OrganizationUser[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { page, rowsPerPage, totalCount, setPage, setRowsPerPage, setTotalCount } = usePagination(0, 50)

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'disable' | 'enable' | 'force_logout' | 'resend_verification'
    user: OrganizationUser | null
  }>({ open: false, type: 'disable', user: null })
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_organization_users', {
        target_org_id: organizationId,
      })

      if (!isMountedRef.current) return

      if (rpcError) {
        const normalized = handleRpcError(rpcError, 'get_organization_users')
        setError(normalized.message)
        setUsers([])
        setTotalCount(0)
        return
      }

      const userList = (data || []) as OrganizationUser[]
      setUsers(userList)
      setTotalCount(userList.length)
    } catch (err) {
      if (!isMountedRef.current) return
      const normalized = handleRpcError(err, 'get_organization_users')
      setError(normalized.message)
      setUsers([])
      setTotalCount(0)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [organizationId, setTotalCount])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRowClick = (user: OrganizationUser) => {
    navigate(`/platform-admin/users/${user.id}`)
  }

  const handleDisable = (user: OrganizationUser) => {
    if (!permissions.canDisableUser) {
      showError('You do not have permission to disable users')
      return
    }
    setDialogError(null)
    setConfirmDialog({ open: true, type: 'disable', user })
  }

  const handleEnable = (user: OrganizationUser) => {
    if (!permissions.canEnableUser) {
      showError('You do not have permission to enable users')
      return
    }
    setDialogError(null)
    setConfirmDialog({ open: true, type: 'enable', user })
  }

  const handleForceLogout = (user: OrganizationUser) => {
    if (!permissions.canForceLogout) {
      showError('You do not have permission to force logout')
      return
    }
    setDialogError(null)
    setConfirmDialog({ open: true, type: 'force_logout', user })
  }

  const handleResendVerification = (user: OrganizationUser) => {
    if (!permissions.canResendVerification) {
      showError('You do not have permission to resend verification')
      return
    }
    setDialogError(null)
    setConfirmDialog({ open: true, type: 'resend_verification', user })
  }

  const handleConfirmAction = async (reason: string) => {
    if (!confirmDialog.user) return

    if (USE_FAKE_DATA) {
      showError('This action is not available in demo mode')
      setConfirmDialog({ open: false, type: 'disable', user: null })
      return
    }

    setDialogLoading(true)
    setDialogError(null)

    try {
      let rpcName: string
      let rpcParams: Record<string, unknown>

      switch (confirmDialog.type) {
        case 'disable':
          rpcName = 'admin_disable_user'
          rpcParams = { target_user_id: confirmDialog.user.id, reason }
          break
        case 'enable':
          rpcName = 'admin_enable_user'
          rpcParams = { target_user_id: confirmDialog.user.id, reason }
          break
        case 'force_logout':
          rpcName = 'admin_force_logout'
          rpcParams = { target_user_id: confirmDialog.user.id, reason }
          break
        case 'resend_verification':
          rpcName = 'admin_resend_verification'
          rpcParams = { target_user_id: confirmDialog.user.id, reason }
          break
        default:
          throw new Error('Unknown action type')
      }

      const { data, error: rpcError } = await supabase.rpc(rpcName, rpcParams)

      if (rpcError) {
        const normalized = handleRpcError(rpcError, rpcName)
        setDialogError(normalized.message)
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
        setDialogError((data as AdminRpcResponse)?.error || 'Unknown error')
        return
      }

      setConfirmDialog({ open: false, type: 'disable', user: null })
      showSuccess(`User ${confirmDialog.type === 'disable' ? 'disabled' : confirmDialog.type === 'enable' ? 'enabled' : confirmDialog.type === 'force_logout' ? 'logged out' : 'verification sent'} successfully`)
      fetchUsers() // Refresh users list
    } catch (err) {
      const normalized = handleRpcError(err, 'user_action')
      setDialogError(normalized.message)
    } finally {
      setDialogLoading(false)
    }
  }

  // Paginate users client-side (since RPC returns all users)
  const paginatedUsers = users
    ? users.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
    : []

  const columns: ColumnConfig<OrganizationUser>[] = [
    {
      id: 'email',
      label: 'Email',
      render: (row) => (
        <div>
          <div className="pa-body-m">{getDisplayEmail(row.email, adminRole, false)}</div>
          {row.is_platform_admin && (
            <Badge variant="info" size="small" style={{ marginTop: '4px' }}>
              Platform Admin
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'display_name',
      label: 'Name',
      render: (row) => safeString(row.display_name),
    },
    {
      id: 'roles',
      label: 'Roles',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {row.roles.map((role) => (
            <Badge key={role} variant="neutral" size="small">
              {role}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {safeBoolean(row.email_confirmed) ? (
            <Badge variant="success" size="small">Email Confirmed</Badge>
          ) : (
            <Badge variant="warning" size="small">Email Unconfirmed</Badge>
          )}
          {safeBoolean(row.is_disabled) && (
            <Badge variant="danger" size="small">Disabled</Badge>
          )}
        </div>
      ),
    },
    {
      id: 'last_sign_in_at',
      label: 'Last Sign In',
      render: (row) => safeDate(row.last_sign_in_at),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          {safeBoolean(row.is_disabled) ? (
            permissions.canEnableUser && (
              <Button
                variant="ghost"
                size="dense"
                icon="check_circle"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEnable(row)
                }}
                title="Enable user"
              />
            )
          ) : (
            permissions.canDisableUser && (
              <Button
                variant="ghost"
                size="dense"
                icon="block"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDisable(row)
                }}
                title="Disable user"
              />
            )
          )}
          {permissions.canForceLogout && (
            <Button
              variant="ghost"
              size="dense"
              icon="logout"
              onClick={(e) => {
                e.stopPropagation()
                handleForceLogout(row)
              }}
              title="Force logout"
            />
          )}
          {!safeBoolean(row.email_confirmed) && permissions.canResendVerification && (
            <Button
              variant="ghost"
              size="dense"
              icon="mail"
              onClick={(e) => {
                e.stopPropagation()
                handleResendVerification(row)
              }}
              title="Resend verification"
            />
          )}
        </div>
      ),
    },
  ]

  const getDialogTitle = () => {
    switch (confirmDialog.type) {
      case 'disable':
        return 'Disable User'
      case 'enable':
        return 'Enable User'
      case 'force_logout':
        return 'Force Logout'
      case 'resend_verification':
        return 'Resend Verification Email'
      default:
        return 'Confirm Action'
    }
  }

  const getDialogDescription = () => {
    const userName = confirmDialog.user?.display_name || confirmDialog.user?.email || 'this user'
    switch (confirmDialog.type) {
      case 'disable':
        return `Are you sure you want to disable ${userName}? They will not be able to sign in until re-enabled.`
      case 'enable':
        return `Are you sure you want to enable ${userName}? They will be able to sign in again.`
      case 'force_logout':
        return `Are you sure you want to force ${userName} to log out? All their active sessions will be terminated.`
      case 'resend_verification':
        return `Are you sure you want to resend the verification email to ${userName}?`
      default:
        return 'Are you sure?'
    }
  }

  return (
    <div>
      {/* Link to full users page */}
      <div className="pa-flex pa-items-center pa-justify-between pa-mb-4">
        <div />
        <Button
          variant="ghost"
          size="dense"
          icon="open_in_new"
          onClick={() => navigate(`/platform-admin/users?org_id=${organizationId}`)}
        >
          View All Users
        </Button>
      </div>

      <DataState
        data={users}
        loading={loading}
        error={error}
        onRetry={fetchUsers}
        emptyMessage="No users found in this organization"
        emptyIcon="people"
      >
        {(data) => (
          <PlatformDataTable
            columns={columns}
            rows={paginatedUsers}
            loading={false}
            emptyMessage="No users found"
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalCount}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
            onRowClick={handleRowClick}
          />
        )}
      </DataState>

      <ConfirmDialog
        open={confirmDialog.open}
        title={getDialogTitle()}
        description={getDialogDescription()}
        confirmLabel={confirmDialog.type === 'disable' ? 'Disable' : confirmDialog.type === 'enable' ? 'Enable' : confirmDialog.type === 'force_logout' ? 'Force Logout' : 'Resend'}
        variant={confirmDialog.type === 'disable' || confirmDialog.type === 'force_logout' ? 'danger' : 'info'}
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setDialogError(null)
          setConfirmDialog({ open: false, type: 'disable', user: null })
        }}
      />
    </div>
  )
}
