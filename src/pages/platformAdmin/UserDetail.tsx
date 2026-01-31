import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Badge, Card } from '../../components/platformAdmin'
import { canPerformAction } from '../../utils/platformAdminPermissions'
import { getDisplayEmail } from '../../utils/platformAdminMasking'
import { isValidUUID } from '../../utils/uuid'
import { useAuth } from '../../hooks/useAuth'
import { useT } from '../../i18n/useI18n'
import { normalizeAdminUser } from '../../utils/userDataHelpers'
import type { AdminUser, PlatformAdminRole } from '../../types/platformAdmin.types'
import { cn } from '../../utils/cn'

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
  const [, setConfirmDialog] = useState<{
    open: boolean
    type: 'disable' | 'enable' | 'resend' | 'logout'
  }>({ open: false, type: 'disable' })
  
  // Dialog state
  const [, setFamilyInfo] = useState<FamilyInfo | null>(null)
  const [, setLoadingFamily] = useState(false)
  
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
          
          // Fetch family info if user has family_id (from admin_users view)
          if (normalizedUser.family_id) {
            fetchFamilyInfo(normalizedUser.family_id)
          }
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
      // Fetch family with organization
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select(`
          id,
          name,
          org_id,
          organizations!inner(name)
        `)
        .eq('id', familyId)
        .single()

      if (familyError) {
        console.error('Error fetching family:', familyError)
        setFamilyInfo(null)
        return
      }

      // Fetch children count
      const { count: childrenCount } = await supabase
        .from('athletes')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId)

      // Fetch parents count
      const { count: parentsCount } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId)
        .eq('role', 'guardian')

      if (!mountedRef.current) return

      if (familyData) {
        setFamilyInfo({
          id: familyData.id,
          family_name: familyData.name,
          organization_name: (familyData.organizations as any)?.name || '',
          children_count: childrenCount || 0,
          parent_count: parentsCount || 0,
          children: [],
          parents: []
        })
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

  useEffect(() => {
    if (id && isValidUUID(id)) {
      fetchUser()
    }
  }, [id, fetchUser])

  // Note: Family info is now fetched in fetchUser callback when user data is loaded
  // This useEffect is kept for backward compatibility but should not be needed

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
              <div className="pa-flex pa-gap-2 pa-mt-4 pa-justify-center">
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

  return (
    <div>
      {/* Header */}
      <div className="pa-flex pa-items-center pa-gap-3 pa-mb-5">
        <button
          className={cn("pa-btn", "pa-btn--ghost", "pa-p-2")}
          onClick={() => navigate('/platform-admin/users')}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className={cn("material-symbols-outlined", "pa-icon-xl")} style={{ color: 'var(--pa-n900)' }}>
          person
        </span>
        <div className="pa-flex-1">
          <h1 className={cn("pa-h1", "pa-mb-1")}>
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
      <div className={cn("pa-flex", "pa-gap-2", "pa-mb-5", "pa-flex-wrap")}>
        {user.is_disabled ? (
          <button
            className="pa-btn pa-btn--primary pa-btn--compact"
            disabled={!adminRole || !canPerformAction(adminRole, 'enable_user')}
            onClick={() => setConfirmDialog({ open: true, type: 'enable' })}
          >
            <span className="material-symbols-outlined">check_circle</span>
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
        
        {/* ... existing buttons ... */}
      </div>
      
      {/* ... rest of the file ... */}
    </div>
  )
}
