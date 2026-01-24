import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Badge, Card, ConfirmDialog, AddRoleModal, ChangeRoleModal, ManagePlatformAdminModal } from '../../components/platformAdmin'
import { canPerformAction } from '../../utils/platformAdminPermissions'
import { getDisplayEmail } from '../../utils/platformAdminMasking'
import { isRpcSuccessResponse } from '../../utils/typeAdapters'
import { isValidUUID } from '../../utils/uuid'
import { useAuth } from '../../hooks/useAuth'
import { useT } from '../../i18n/useI18n'
import { normalizeAdminUser, parseOrganizationsArray, formatDate, formatDateTime, formatRelativeTime, getUserOrganizations } from '../../utils/userDataHelpers'
import type { AdminUser, AdminRpcResponse, PlatformAdminRole, AdminUserOrganization } from '../../types/platformAdmin.types'
import { showSuccess, showError } from '../../utils/toast'

type ErrorType = 
  | 'invalid_uuid'
  | 'user_not_found'
  | 'permission_denied'
  | 'network_error'
  | 'rls_denied'
  | 'fetch_failed'
  | 'disable_failed'
  | 'enable_failed'
  | 'resend_failed'
  | 'logout_failed'
  | 'add_role_failed'
  | 'remove_role_failed'
  | 'change_role_failed'
  | 'platform_admin_failed'
  | 'unknown'

interface FetchError {
  type: ErrorType
  message: string
  retryable: boolean
}

interface FamilyInfo {
  id: string
  family_name: string
  organization_name: string
  children_count: number
  parent_count: number
  children: Array<{ id: string; first_name: string; last_name: string }>
  parents: Array<{ id: string; email: string; display_name: string }>
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const t = useT()
  
  // Technical Mitigation #2, #6, #8: AbortController and mountedRef
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<FetchError | null>(null)
  const [platformAdminRole, setPlatformAdminRole] = useState<PlatformAdminRole | null>(null)
  const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null)
  const [loadingFamily, setLoadingFamily] = useState(false)
  
  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'disable' | 'enable' | 'resend' | 'logout'
  }>({ open: false, type: 'disable' })
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  
  // Role management modals
  const [addRoleModal, setAddRoleModal] = useState(false)
  const [changeRoleModal, setChangeRoleModal] = useState<{ open: boolean; org: AdminUserOrganization | null }>({ open: false, org: null })
  const [removeRoleDialog, setRemoveRoleDialog] = useState<{ open: boolean; org: AdminUserOrganization | null }>({ open: false, org: null })
  const [managePlatformAdminModal, setManagePlatformAdminModal] = useState(false)
  
  // Get admin role from profile
  const adminRole: PlatformAdminRole | null = profile?.platformAdminRole ?? null

  // Technical Mitigation #6, #8: Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  // Validate UUID on mount
  useEffect(() => {
    if (!id) {
      setFetchError({
        type: 'invalid_uuid',
        message: t('errors.invalidUserId'),
        retryable: false,
      })
      setLoading(false)
      return
    }

    if (!isValidUUID(id)) {
      setFetchError({
        type: 'invalid_uuid',
        message: t('errors.invalidUserId'),
        retryable: false,
      })
      setLoading(false)
      return
    }
  }, [id, t])

  const getErrorType = (error: any): ErrorType => {
    if (!error) return 'unknown'
    
    const errorCode = error.code
    const errorMessage = error.message?.toLowerCase() || ''
    
    // Network errors
    if (errorCode === 'PGRST116' || errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'network_error'
    }
    
    // RLS/permission errors
    if (errorCode === '42501' || errorMessage.includes('permission') || errorMessage.includes('row-level security')) {
      return 'rls_denied'
    }
    
    // Not found
    if (errorCode === 'PGRST116' || errorMessage.includes('not found')) {
      return 'user_not_found'
    }
    
    return 'fetch_failed'
  }

  const getErrorMessage = (errorType: ErrorType): string => {
    switch (errorType) {
      case 'invalid_uuid':
        return t('errors.invalidUserId')
      case 'user_not_found':
        return t('errors.userNotFound')
      case 'permission_denied':
        return t('errors.permissionDenied')
      case 'network_error':
        return t('errors.networkError')
      case 'rls_denied':
        return t('errors.rlsDenied')
      case 'fetch_failed':
        return t('errors.fetchFailed')
      case 'disable_failed':
        return t('errors.disableFailed')
      case 'enable_failed':
        return t('errors.enableFailed')
      case 'resend_failed':
        return t('errors.resendVerificationFailed')
      case 'logout_failed':
        return t('errors.forceLogoutFailed')
      case 'add_role_failed':
        return t('admin.userDetail.addRoleFailed')
      case 'remove_role_failed':
        return t('admin.userDetail.removeRoleFailed')
      case 'change_role_failed':
        return t('admin.userDetail.changeRoleFailed')
      case 'platform_admin_failed':
        return t('admin.userDetail.addPlatformAdminFailed')
      default:
        return t('errors.unknownError')
    }
  }

  // Fetch platform admin role
  const fetchPlatformAdminRole = useCallback(async (userId: string) => {
    if (!mountedRef.current) return
    
    try {
      const { data, error } = await supabase
        .from('platform_admins')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()

      if (!mountedRef.current) return

      if (error) {
        console.error('Error fetching platform admin role:', error)
        setPlatformAdminRole(null)
      } else if (data) {
        setPlatformAdminRole(data.role)
      } else {
        setPlatformAdminRole(null)
      }
    } catch (err) {
      if (!mountedRef.current) return
      console.error('Error fetching platform admin role:', err)
      setPlatformAdminRole(null)
    }
  }, [])

  // Fetch family info
  const fetchFamilyInfo = useCallback(async (familyId: string) => {
    if (!mountedRef.current || !familyId || !isValidUUID(familyId)) return

    setLoadingFamily(true)
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const { data, error } = await supabase
        .from('admin_families')
        .select('*')
        .eq('id', familyId)
        .single()
        .abortSignal(abortControllerRef.current.signal)

      if (!mountedRef.current) return

      if (error) {
        console.error('Error fetching family info:', error)
        setFamilyInfo(null)
      } else if (data) {
        setFamilyInfo(data as FamilyInfo)
      } else {
        setFamilyInfo(null)
      }
    } catch (err: any) {
      if (!mountedRef.current || err.name === 'AbortError') return
      console.error('Error fetching family info:', err)
      setFamilyInfo(null)
    } finally {
      if (mountedRef.current) {
        setLoadingFamily(false)
      }
    }
  }, [])

  // Technical Mitigation #2, #8: AbortController for request cancellation
  const fetchUser = useCallback(async () => {
    if (!id || !isValidUUID(id)) {
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    if (!mountedRef.current) return
    setLoading(true)
    setFetchError(null)

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', id)
        .single()
        .abortSignal(abortControllerRef.current.signal)

      if (!mountedRef.current) return

      if (error) {
        const errorType = getErrorType(error)
        if (!mountedRef.current) return
        setFetchError({
          type: errorType,
          message: getErrorMessage(errorType),
          retryable: errorType === 'network_error' || errorType === 'fetch_failed',
        })
        setUser(null)
        console.error('Error fetching user:', error)
      } else if (data) {
        // Technical Mitigation #1, #10: Normalize data
        const normalizedUser = normalizeAdminUser(data)
        
        if (!mountedRef.current) return
        
        // Validate data shape
        if (!normalizedUser.id || typeof normalizedUser.id !== 'string') {
          setFetchError({
            type: 'fetch_failed',
            message: t('errors.fetchFailed'),
            retryable: true,
          })
          setUser(null)
        } else {
          setUser(normalizedUser)
          setFetchError(null)
          
          // Fetch platform admin role if user is platform admin
          if (normalizedUser.is_platform_admin) {
            fetchPlatformAdminRole(normalizedUser.id)
          } else {
            setPlatformAdminRole(null)
          }
          
          // Fetch family info if user has family_id (need to check users table)
          // For now, we'll check if any org has family context
          // TODO: Add family_id to admin_users view or query separately
        }
      } else {
        if (!mountedRef.current) return
        setFetchError({
          type: 'user_not_found',
          message: t('errors.userNotFound'),
          retryable: false,
        })
        setUser(null)
      }
    } catch (err: any) {
      if (!mountedRef.current || err.name === 'AbortError') return
      const errorType = getErrorType(err)
      if (!mountedRef.current) return
      setFetchError({
        type: errorType,
        message: getErrorMessage(errorType),
        retryable: errorType === 'network_error' || errorType === 'fetch_failed',
      })
      setUser(null)
      console.error('Error fetching user:', err)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [id, t, fetchPlatformAdminRole])

  useEffect(() => {
    if (id && isValidUUID(id)) {
      fetchUser()
    }
  }, [id, fetchUser])

  const handleConfirmAction = async (reason: string) => {
    if (!user || !user.id) return

    // Validate user ID
    if (!isValidUUID(user.id)) {
      setDialogError(t('errors.invalidUserId'))
      return
    }

    setDialogLoading(true)
    setDialogError(null)

    try {
      let rpcName: 'admin_enable_user' | 'admin_disable_user' | 'admin_resend_verification' | 'admin_force_logout'
      let targetUserId = user.id
      let errorKey: ErrorType

      switch (confirmDialog.type) {
        case 'enable':
          rpcName = 'admin_enable_user'
          errorKey = 'enable_failed'
          break
        case 'disable':
          rpcName = 'admin_disable_user'
          errorKey = 'disable_failed'
          break
        case 'resend':
          rpcName = 'admin_resend_verification'
          errorKey = 'resend_failed'
          break
        case 'logout':
          rpcName = 'admin_force_logout'
          errorKey = 'logout_failed'
          break
        default:
          return
      }

      const { data, error } = await supabase.rpc(rpcName, { 
        target_user_id: targetUserId, 
        reason 
      })

      if (error) {
        const errorMessage = error.message || getErrorMessage(errorKey)
        setDialogError(errorMessage)
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
        const errorMessage = (data as AdminRpcResponse)?.error || getErrorMessage(errorKey)
        setDialogError(errorMessage)
        return
      }

      setConfirmDialog({ open: false, type: 'disable' })
      showSuccess(t('admin.userDetail.actionSuccess'))
      // Refresh user data to get updated status
      await fetchUser()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : getErrorMessage('unknown')
      setDialogError(errorMessage)
      console.error('Action error:', err)
    } finally {
      setDialogLoading(false)
    }
  }

  // Role management handlers
  const handleAddRole = async (orgId: string, role: 'parent' | 'coach' | 'org_admin', reason: string) => {
    if (!user?.id || !isValidUUID(user.id) || !isValidUUID(orgId)) {
      setDialogError(t('errors.invalidUserId'))
      return
    }

    setDialogLoading(true)
    setDialogError(null)

    try {
      const { data, error } = await supabase.rpc('admin_add_org_role', {
        target_user_id: user.id,
        target_org_id: orgId,
        target_role: role,
        reason,
      })

      if (error) {
        setDialogError(error.message || t('admin.userDetail.addRoleFailed'))
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
        setDialogError((data as AdminRpcResponse)?.error || t('admin.userDetail.addRoleFailed'))
        return
      }

      setAddRoleModal(false)
      showSuccess(t('admin.userDetail.addRoleSuccess'))
      await fetchUser()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : t('admin.userDetail.addRoleFailed'))
      console.error('Add role error:', err)
    } finally {
      setDialogLoading(false)
    }
  }

  const handleRemoveRole = async (org: AdminUserOrganization, reason: string) => {
    if (!user?.id || !isValidUUID(user.id) || !isValidUUID(org.org_id)) {
      setDialogError(t('errors.invalidUserId'))
      return
    }

    setDialogLoading(true)
    setDialogError(null)

    try {
      const { data, error } = await supabase.rpc('admin_remove_org_role', {
        target_user_id: user.id,
        target_org_id: org.org_id,
        target_role: org.role as 'parent' | 'coach' | 'org_admin',
        reason,
      })

      if (error) {
        setDialogError(error.message || t('admin.userDetail.removeRoleFailed'))
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
        setDialogError((data as AdminRpcResponse)?.error || t('admin.userDetail.removeRoleFailed'))
        return
      }

      setRemoveRoleDialog({ open: false, org: null })
      showSuccess(t('admin.userDetail.removeRoleSuccess'))
      await fetchUser()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : t('admin.userDetail.removeRoleFailed'))
      console.error('Remove role error:', err)
    } finally {
      setDialogLoading(false)
    }
  }

  const handleChangeRole = async (orgId: string, oldRole: 'parent' | 'coach' | 'org_admin', newRole: 'parent' | 'coach' | 'org_admin', reason: string) => {
    if (!user?.id || !isValidUUID(user.id) || !isValidUUID(orgId)) {
      setDialogError(t('errors.invalidUserId'))
      return
    }

    setDialogLoading(true)
    setDialogError(null)

    try {
      const { data, error } = await supabase.rpc('admin_change_org_role', {
        target_user_id: user.id,
        target_org_id: orgId,
        old_role: oldRole,
        new_role: newRole,
        reason,
      })

      if (error) {
        setDialogError(error.message || t('admin.userDetail.changeRoleFailed'))
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
        setDialogError((data as AdminRpcResponse)?.error || t('admin.userDetail.changeRoleFailed'))
        return
      }

      setChangeRoleModal({ open: false, org: null })
      showSuccess(t('admin.userDetail.changeRoleSuccess'))
      await fetchUser()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : t('admin.userDetail.changeRoleFailed'))
      console.error('Change role error:', err)
    } finally {
      setDialogLoading(false)
    }
  }

  // Platform admin management handlers
  const handleAddPlatformAdmin = async (role: PlatformAdminRole, reason: string) => {
    if (!user?.email) {
      setDialogError(t('errors.userNotFound'))
      return
    }

    setDialogLoading(true)
    setDialogError(null)

    try {
      const { data, error } = await supabase.rpc('admin_add_platform_admin', {
        target_email: user.email,
        target_role: role,
        reason,
      })

      if (error) {
        setDialogError(error.message || t('admin.userDetail.addPlatformAdminFailed'))
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
        setDialogError((data as AdminRpcResponse)?.error || t('admin.userDetail.addPlatformAdminFailed'))
        return
      }

      setManagePlatformAdminModal(false)
      showSuccess(t('admin.userDetail.addPlatformAdminSuccess'))
      await fetchUser()
      await fetchPlatformAdminRole(user.id!)
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : t('admin.userDetail.addPlatformAdminFailed'))
      console.error('Add platform admin error:', err)
    } finally {
      setDialogLoading(false)
    }
  }

  const handleRemovePlatformAdmin = async (reason: string) => {
    if (!user?.id || !isValidUUID(user.id)) {
      setDialogError(t('errors.invalidUserId'))
      return
    }

    setDialogLoading(true)
    setDialogError(null)

    try {
      const { data, error } = await supabase.rpc('admin_remove_platform_admin', {
        target_user_id: user.id,
        reason,
      })

      if (error) {
        setDialogError(error.message || t('admin.userDetail.removePlatformAdminFailed'))
        return
      }

      if (!isRpcSuccessResponse(data) || !(data as AdminRpcResponse).success) {
        setDialogError((data as AdminRpcResponse)?.error || t('admin.userDetail.removePlatformAdminFailed'))
        return
      }

      setManagePlatformAdminModal(false)
      showSuccess(t('admin.userDetail.removePlatformAdminSuccess'))
      await fetchUser()
      setPlatformAdminRole(null)
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : t('admin.userDetail.removePlatformAdminFailed'))
      console.error('Remove platform admin error:', err)
    } finally {
      setDialogLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="pa-flex pa-items-center pa-gap-3 pa-mb-5">
          <button 
            className="pa-btn pa-btn--ghost" 
            onClick={() => navigate('/platform-admin/users')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="pa-skeleton" style={{ width: '300px', height: '32px' }} />
        </div>
        <div className="pa-skeleton" style={{ width: '100%', height: '300px' }} />
      </div>
    )
  }

  // Error state with retry
  if (fetchError && !user) {
    return (
      <div>
        <button
          className="pa-btn pa-btn--ghost pa-mb-4"
          onClick={() => navigate('/platform-admin/users')}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t('admin.userDetail.backToUsers')}
        </button>
        <Card>
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined">error</span>
            </div>
            <h3 className="pa-empty-title">{t('admin.userDetail.notFound')}</h3>
            <p className="pa-empty-text">{fetchError.message}</p>
            {fetchError.retryable && (
              <div className="pa-flex pa-gap-2 pa-mt-4" style={{ justifyContent: 'center' }}>
                <button
                  className="pa-btn pa-btn--primary"
                  onClick={fetchUser}
                >
                  <span className="material-symbols-outlined">refresh</span>
                  {t('admin.userDetail.retry')}
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // User not found state
  if (!user) {
    return (
      <div>
        <button
          className="pa-btn pa-btn--ghost pa-mb-4"
          onClick={() => navigate('/platform-admin/users')}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t('admin.userDetail.backToUsers')}
        </button>
        <Card>
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined">person</span>
            </div>
            <h3 className="pa-empty-title">{t('admin.userDetail.notFound')}</h3>
            <p className="pa-empty-text">{t('admin.userDetail.notFoundMessage')}</p>
          </div>
        </Card>
      </div>
    )
  }

  const getDialogTitle = () => {
    switch (confirmDialog.type) {
      case 'enable': 
        return t('admin.userDetail.enableUser')
      case 'disable': 
        return t('admin.userDetail.disableUser')
      case 'resend': 
        return t('admin.userDetail.resendVerification')
      case 'logout': 
        return t('admin.userDetail.forceLogout')
      default: 
        return 'Confirm Action'
    }
  }

  const getDialogDescription = () => {
    const email = user.email || 'this user'
    switch (confirmDialog.type) {
      case 'enable': 
        return t('admin.userDetail.confirmEnable', { email })
      case 'disable': 
        return t('admin.userDetail.confirmDisable', { email })
      case 'resend': 
        return t('admin.userDetail.confirmResend', { email })
      case 'logout': 
        return t('admin.userDetail.confirmLogout', { email })
      default: 
        return 'Are you sure?'
    }
  }

  const organizations = getUserOrganizations(user)
  const canManageRoles = adminRole && canPerformAction(adminRole, 'disable_user') // Using disable_user as proxy for role management
  const canManagePlatformAdmins = adminRole === 'super_admin'

  return (
    <div>
      {/* Header */}
      <div className="pa-flex pa-items-center pa-gap-3 pa-mb-5">
        <button
          className="pa-btn pa-btn--ghost"
          onClick={() => navigate('/platform-admin/users')}
          style={{ padding: '8px' }}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--pa-blue)' }}>
          person
        </span>
        <div style={{ flex: 1 }}>
          <h1 className="pa-h1" style={{ marginBottom: '4px' }}>
            {user.display_name || getDisplayEmail(user.email, adminRole, false)}
          </h1>
          <div className="pa-flex pa-gap-2">
            {user.is_platform_admin && (
              <Badge variant="info">
                {platformAdminRole ? `Platform Admin (${platformAdminRole.replace('_', ' ')})` : 'Platform Admin'}
              </Badge>
            )}
            <Badge variant={user.email_confirmed ? 'success' : 'warning'}>
              {user.email_confirmed ? 'Verified' : 'Unverified'}
            </Badge>
            {user.is_disabled && (
              <Badge variant="danger">Disabled</Badge>
            )}
          </div>
        </div>
        {fetchError && fetchError.retryable && (
          <button
            className="pa-btn pa-btn--secondary pa-btn--compact"
            onClick={fetchUser}
            title={t('admin.userDetail.refresh')}
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pa-flex pa-gap-2 pa-mb-5" style={{ flexWrap: 'wrap' }}>
        {user.is_disabled ? (
          <button
            className="pa-btn pa-btn--primary pa-btn--compact"
            disabled={!adminRole || !canPerformAction(adminRole, 'enable_user')}
            onClick={() => setConfirmDialog({ open: true, type: 'enable' })}
          >
            <span className="material-symbols-outlined">play_arrow</span>
            {t('admin.userDetail.enableUser')}
          </button>
        ) : (
          <button
            className="pa-btn pa-btn--danger pa-btn--compact"
            disabled={!adminRole || !canPerformAction(adminRole, 'disable_user')}
            onClick={() => setConfirmDialog({ open: true, type: 'disable' })}
          >
            <span className="material-symbols-outlined">block</span>
            {t('admin.userDetail.disableUser')}
          </button>
        )}
        <button
          className="pa-btn pa-btn--blue pa-btn--compact"
          disabled={!adminRole || !canPerformAction(adminRole, 'resend_verification')}
          onClick={() => setConfirmDialog({ open: true, type: 'resend' })}
        >
          <span className="material-symbols-outlined">refresh</span>
          {t('admin.userDetail.resendVerification')}
        </button>
        <button
          className="pa-btn pa-btn--blue pa-btn--compact"
          disabled={!adminRole || !canPerformAction(adminRole, 'force_logout')}
          onClick={() => setConfirmDialog({ open: true, type: 'logout' })}
        >
          <span className="material-symbols-outlined">logout</span>
          {t('admin.userDetail.forceLogout')}
        </button>
        {canManageRoles && (
          <button
            className="pa-btn pa-btn--secondary pa-btn--compact"
            onClick={() => setAddRoleModal(true)}
          >
            <span className="material-symbols-outlined">add</span>
            {t('admin.userDetail.addRole')}
          </button>
        )}
        {canManagePlatformAdmins && (
          <button
            className="pa-btn pa-btn--secondary pa-btn--compact"
            onClick={() => setManagePlatformAdminModal(true)}
          >
            <span className="material-symbols-outlined">admin_panel_settings</span>
            {t('admin.userDetail.managePlatformAdmin')}
          </button>
        )}
        {user.id && (
          <>
            <button
              className="pa-btn pa-btn--secondary pa-btn--compact"
              onClick={() => navigate(`/platform-admin/logs?user_id=${encodeURIComponent(user.id!)}`)}
            >
              <span className="material-symbols-outlined">history</span>
              {t('admin.userDetail.viewActivity')}
            </button>
          </>
        )}
      </div>

      {/* User Details */}
      <div className="pa-grid pa-grid-2">
        <Card title={t('admin.userDetail.userDetails')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pa-space-4)' }}>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">ID</div>
              <code style={{ fontSize: '12px' }}>{user.id}</code>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Email</div>
              <div className="pa-body-m">{getDisplayEmail(user.email, adminRole, false)}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Display Name</div>
              <div className="pa-body-m">{user.display_name ?? '—'}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">{t('admin.userDetail.phone')}</div>
              <div className="pa-body-m">{user.phone ?? '—'}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Created</div>
              <div className="pa-body-m">{formatDate(user.created_at)}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">{t('admin.userDetail.updatedAt')}</div>
              <div className="pa-body-m">{formatDate(user.updated_at)}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Last Sign In</div>
              <div className="pa-body-m">
                {user.last_sign_in_at ? (
                  <span title={formatDateTime(user.last_sign_in_at)}>
                    {formatRelativeTime(user.last_sign_in_at)}
                  </span>
                ) : '—'}
              </div>
            </div>
          </div>
        </Card>

        <Card title={t('admin.userDetail.organizations')}>
          {organizations.length > 0 ? (
            <div className="pa-flex pa-flex-col pa-gap-2">
              {organizations.map((org) => (
                <div
                  key={org.org_id}
                  className="pa-flex pa-items-center pa-justify-between"
                  style={{ padding: 'var(--pa-space-2) 0', borderBottom: '1px solid var(--pa-n100)' }}
                >
                  <div className="pa-flex pa-items-center pa-gap-2" style={{ flex: 1 }}>
                    <button
                      className="pa-btn pa-btn--ghost pa-btn--compact"
                      onClick={() => navigate(`/platform-admin/organizations/${org.org_id}`)}
                      style={{ padding: '4px 8px', textAlign: 'left' }}
                    >
                      <span className="pa-body-m" style={{ color: 'var(--pa-blue)' }}>
                        {org.org_name}
                      </span>
                    </button>
                    <Badge variant="neutral">{org.role}</Badge>
                  </div>
                  {canManageRoles && (
                    <div className="pa-flex pa-gap-1">
                      <button
                        className="pa-btn pa-btn--ghost pa-btn--compact"
                        onClick={() => setChangeRoleModal({ open: true, org })}
                        title={t('admin.userDetail.changeRole')}
                        style={{ padding: '4px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                      </button>
                      <button
                        className="pa-btn pa-btn--ghost pa-btn--compact"
                        onClick={() => setRemoveRoleDialog({ open: true, org })}
                        title={t('admin.userDetail.removeRole')}
                        style={{ padding: '4px', color: 'var(--pa-danger)' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="pa-body-m pa-text-muted">
              {t('admin.userDetail.noOrganizations')}
            </span>
          )}
        </Card>

        {/* Platform Admin Card */}
        {user.is_platform_admin && (
          <Card title={t('admin.userDetail.platformAdminRole')}>
            <div className="pa-flex pa-items-center pa-justify-between">
              <div>
                <div className="pa-body-m">
                  {platformAdminRole ? platformAdminRole.replace('_', ' ') : 'Loading...'}
                </div>
                {canManagePlatformAdmins && (
                  <button
                    className="pa-btn pa-btn--secondary pa-btn--compact pa-mt-2"
                    onClick={() => setManagePlatformAdminModal(true)}
                  >
                    {t('admin.userDetail.managePlatformAdmin')}
                  </button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Family Card */}
        {user.family_id && familyInfo && (
          <Card title={t('admin.userDetail.family')}>
            <div className="pa-flex pa-flex-col pa-gap-2">
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Family Name</div>
                <div className="pa-body-m">{familyInfo.family_name}</div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Organization</div>
                <div className="pa-body-m">{familyInfo.organization_name}</div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Children</div>
                <div className="pa-body-m">{familyInfo.children_count}</div>
              </div>
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Parents</div>
                <div className="pa-body-m">{familyInfo.parent_count}</div>
              </div>
              <button
                className="pa-btn pa-btn--secondary pa-btn--compact pa-mt-2"
                onClick={() => navigate(`/platform-admin/families/${user.family_id}`)}
              >
                {t('admin.userDetail.viewFamily')}
              </button>
            </div>
          </Card>
        )}
        {user.family_id && !familyInfo && !loadingFamily && (
          <Card title={t('admin.userDetail.family')}>
            <span className="pa-body-m pa-text-muted">{t('admin.userDetail.noFamily')}</span>
          </Card>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={getDialogTitle()}
        description={getDialogDescription()}
        confirmLabel="Confirm"
        variant={confirmDialog.type === 'disable' ? 'danger' : 'warning'}
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog({ open: false, type: 'disable' })}
      />

      {/* Add Role Modal */}
      <AddRoleModal
        open={addRoleModal}
        userId={user.id!}
        existingOrgs={organizations}
        onConfirm={handleAddRole}
        onCancel={() => setAddRoleModal(false)}
        loading={dialogLoading}
        error={dialogError}
      />

      {/* Change Role Modal */}
      {changeRoleModal.org && (
        <ChangeRoleModal
          open={changeRoleModal.open}
          userId={user.id!}
          orgId={changeRoleModal.org.org_id}
          orgName={changeRoleModal.org.org_name}
          currentRole={changeRoleModal.org.role as 'parent' | 'coach' | 'org_admin'}
          onConfirm={handleChangeRole}
          onCancel={() => setChangeRoleModal({ open: false, org: null })}
          loading={dialogLoading}
          error={dialogError}
        />
      )}

      {/* Remove Role Dialog */}
      {removeRoleDialog.org && (
        <ConfirmDialog
          open={removeRoleDialog.open}
          title={t('admin.userDetail.removeRole')}
          description={`Remove ${removeRoleDialog.org.role} role from ${removeRoleDialog.org.org_name}?`}
          confirmLabel="Remove"
          variant="danger"
          requireReason
          loading={dialogLoading}
          error={dialogError}
          onConfirm={(reason) => handleRemoveRole(removeRoleDialog.org!, reason)}
          onCancel={() => setRemoveRoleDialog({ open: false, org: null })}
        />
      )}

      {/* Manage Platform Admin Modal */}
      <ManagePlatformAdminModal
        open={managePlatformAdminModal}
        userId={user.id!}
        userEmail={user.email || ''}
        isCurrentlyAdmin={user.is_platform_admin ?? false}
        currentRole={platformAdminRole}
        onConfirm={handleAddPlatformAdmin}
        onRemove={handleRemovePlatformAdmin}
        onCancel={() => setManagePlatformAdminModal(false)}
        loading={dialogLoading}
        error={dialogError}
      />
    </div>
  )
}
