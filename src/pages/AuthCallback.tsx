import { useCallback, useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { debug } from '../lib/debug'
import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'
import { useI18n } from '../i18n/useI18n'
import { useLoadingState } from '../contexts/LoadingStateContext'
import FullScreenLoader from '../components/common/FullScreenLoader'
import { getHostAppContext } from '../utils/host'
import {
  getSetupOrganizationFlag,
  clearSetupOrganizationFlag,
  cleanupStaleFlags,
} from '../utils/setupOrganization'
import { getLoginRedirect } from '../utils/loginRedirect'
import { mapAuthError } from '../utils/authErrorMapper'
import type { SupabaseExtended as Database } from '../lib/supabase.extended.types'
import type { OrgMemberRole } from '../contexts/OrganizationContext'

export default function AuthCallback() {
  useDebugLifecycle('AuthCallback')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { setLoading } = useLoadingState()
  const isMountedRef = useRef(true)
  const hasSetLoadingRef = useRef(false)
  const callbackTraceIdRef = useRef(`authcb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
  const [error, setError] = useState<string | null>(null)
  const [demoRedirect, setDemoRedirect] = useState<string | null>(null)
  const { user } = useAuth()
  const lastDeferredWaitLogRef = useRef<string>('')

  const getTraceMeta = useCallback(() => {
    if (typeof window === 'undefined') {
      return {
        traceId: callbackTraceIdRef.current,
        path: 'n/a',
        search: 'n/a',
        hasAuthHash: false,
      }
    }
    return {
      traceId: callbackTraceIdRef.current,
      path: window.location.pathname,
      search: window.location.search,
      hasAuthHash: window.location.hash.includes('access_token'),
    }
  }, [])

  const logAuthCallback = useCallback((message: string, data?: Record<string, unknown>) => {
    debug.flow('AuthCallback', message, {
      ...getTraceMeta(),
      ...data,
    })
  }, [getTraceMeta])

  const navigateWithTrace = useCallback((to: string, reason: string, extra?: Record<string, unknown>) => {
    const payload = {
      ...getTraceMeta(),
      to,
      reason,
      ...extra,
    }
    debug.flow('AuthCallback', 'Redirect', payload)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('auth_debug_trace_id', callbackTraceIdRef.current)
      window.sessionStorage.setItem(
        'auth_debug_last_redirect',
        JSON.stringify({ at: new Date().toISOString(), ...payload })
      )
    }
    navigate(to, { replace: true })
  }, [getTraceMeta, navigate])

  // Once setSession fires SIGNED_IN and useAuth reflects the user,
  // navigate to the deferred demo redirect target.
  // If auth context does not hydrate in time, fall back to a hard redirect when session exists.
  useEffect(() => {
    if (!demoRedirect) return

    if (user) {
      logAuthCallback('Deferred redirect released by auth context user', {
        demoRedirect,
        userId: user.id,
      })
      navigateWithTrace(demoRedirect, 'demo callback redirect')
      return
    }

    const waitKey = `${demoRedirect}|${(user as { id?: string } | null)?.id ?? 'no-user'}`
    if (lastDeferredWaitLogRef.current !== waitKey) {
      lastDeferredWaitLogRef.current = waitKey
      logAuthCallback('Deferred redirect waiting for auth context user', {
        demoRedirect,
      })
    }

    const timeoutId = window.setTimeout(async () => {
      const { data, error: recoveryError } = await supabase.auth.getSession()
      const recoveredUserId = data.session?.user?.id ?? null
      logAuthCallback('Deferred redirect timeout check', {
        demoRedirect,
        recoveryError: recoveryError?.message ?? null,
        hasRecoveredSession: !!data.session,
        recoveredUserId,
      })

      if (data.session?.user) {
        const payload = {
          ...getTraceMeta(),
          to: demoRedirect,
          reason: 'demo callback hard redirect fallback',
          recoveredUserId,
        }
        debug.flow('AuthCallback', 'Redirect', payload)
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('auth_debug_trace_id', callbackTraceIdRef.current)
          window.sessionStorage.setItem(
            'auth_debug_last_redirect',
            JSON.stringify({ at: new Date().toISOString(), ...payload })
          )
          window.location.replace(demoRedirect)
        }
      }
    }, 1200)

    return () => window.clearTimeout(timeoutId)
  }, [demoRedirect, user, navigateWithTrace, logAuthCallback, getTraceMeta])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('auth_debug_trace_id', callbackTraceIdRef.current)
    }
    logAuthCallback('Mounted')
    return () => {
      logAuthCallback('Unmounted')
      isMountedRef.current = false
    }
  }, [logAuthCallback])

  // Set loading state - show loader while processing callback
  // Use ref to track whether we've incremented the counter to prevent imbalance
  useEffect(() => {
    if (!hasSetLoadingRef.current) {
      setLoading(true)
      hasSetLoadingRef.current = true
    }
    return () => {
      if (hasSetLoadingRef.current) {
        setLoading(false)
        hasSetLoadingRef.current = false
      }
    }
  }, [setLoading])

  useEffect(() => {
    // Clean up any stale flags first
    cleanupStaleFlags()

    async function handleCallback() {
      if (!isMountedRef.current) return
      logAuthCallback('handleCallback start', {
        hasErrorParam: !!searchParams.get('error'),
        isDemoCallback: searchParams.get('demo') === 'true',
      })
      // Note: Loading is already set by the effect above, don't call setLoading(true) again
      // When we navigate away, the component unmounts and cleanup decrements the loading counter

      // Check for error in URL params
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      
      if (errorParam) {
        const errorMessage = errorDescription || errorParam
        logAuthCallback('Auth error returned in callback query params', {
          errorParam,
          errorDescription,
        })
        if (isMountedRef.current) {
          setError(mapAuthError(errorMessage, t))
          // Decrement loading counter and update ref since we're showing error UI (not navigating)
          if (hasSetLoadingRef.current) {
            setLoading(false)
            hasSetLoadingRef.current = false
          }
        }
        return
      }

      // Check if there's a hash fragment with auth tokens (implicit flow magic link callback).
      // flowType: 'pkce' causes Supabase to only auto-process ?code= query params.
      // Magic links from admin.generateLink() use implicit flow (#access_token= hash),
      // so we must manually extract tokens and call setSession() ourselves.
      const hash = window.location.hash
      const hasAuthHash = hash && hash.includes('access_token')

      console.log('[AuthCallback] Hash check:', { hasAuthHash, hash: hash?.substring(0, 60) })
      logAuthCallback('Hash check', {
        hasAuthHash,
        hashPreview: hash?.substring(0, 60) ?? null,
      })

      if (hasAuthHash) {
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        console.log('[AuthCallback] Tokens from hash:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken })
        logAuthCallback('Token presence from hash', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
        })

        if (accessToken && refreshToken) {
          logAuthCallback('Calling setSession')
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          console.log('[AuthCallback] setSession:', { hasSession: !!sessionData?.session, error: setSessionError?.message })
          logAuthCallback('setSession completed', {
            hasSession: !!sessionData?.session,
            setSessionError: setSessionError?.message ?? null,
            sessionUserId: sessionData?.session?.user?.id ?? null,
          })

          if (setSessionError) {
            if (isMountedRef.current) {
              setError(mapAuthError(setSessionError, t))
              if (hasSetLoadingRef.current) {
                setLoading(false)
                hasSetLoadingRef.current = false
              }
            }
            return
          }

          if (sessionData?.session) {
            const userId = sessionData.session.user.id
            const isDemoCallback = searchParams.get('demo') === 'true'

            console.log('[AuthCallback] Session set. isDemoCallback:', isDemoCallback, 'userId:', userId)

            // For demo callbacks, wait a moment for auth state to propagate before redirecting
            // This prevents a race condition where RouteGuard sees no user and redirects to login
            if (isDemoCallback) {
              await new Promise(resolve => setTimeout(resolve, 100))
              try {
                const { data: orgData, error: orgError } = await supabase.rpc('get_user_organizations', {
                  check_user_id: userId
                } as any)

                console.log('[AuthCallback] get_user_organizations:', { orgCount: orgData?.length, error: orgError?.message })
                logAuthCallback('Demo org fetch result', {
                  orgCount: orgData?.length ?? 0,
                  orgError: orgError?.message ?? null,
                })

                if (orgError) {
                  console.error('[AuthCallback] Error fetching demo orgs:', orgError)
                  navigateWithTrace('/portal/dashboard', 'demo org fetch error', {
                    orgError: orgError.message,
                  })
                  return
                }

                const organizations = (orgData || []).map((org: any) => {
                  const roles = Array.isArray(org.roles)
                    ? org.roles.filter(
                        (r: unknown): r is OrgMemberRole =>
                          r === 'parent' || r === 'coach' || r === 'org_admin' || r === 'staff'
                      )
                    : []
                  return {
                    id: org.org_id,
                    name: org.org_name || '',
                    roles,
                    get role() { return this.roles[0] ?? 'parent' }
                  }
                })

                let isFan = false
                if (sessionData.session.user.user_metadata?.signup_mode === 'fan') {
                  isFan = true
                }
                if (!isFan) {
                  const { count } = await supabase
                    .from('fan_org_follows')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                  if (count && count > 0) isFan = true
                }

                const finalRedirect = getLoginRedirect(false, organizations, isFan)
                console.log('[AuthCallback] Redirecting demo user to:', finalRedirect)
                setDemoRedirect(finalRedirect)
                return
              } catch (err) {
                console.error('[AuthCallback] Exception during demo redirect:', err)
                setDemoRedirect('/portal/dashboard')
                return
              }
            }
            // Non-demo implicit flow — fall through to normal session handling
          }
        }
      }

      // Get the session (for PKCE code-exchange callbacks or already-established sessions)
      const { data, error: sessionError } = await supabase.auth.getSession()
      
      console.log('[AuthCallback] getSession result:', { hasSession: !!data?.session, hasError: !!sessionError, userId: data?.session?.user?.id })
      logAuthCallback('getSession completed', {
        hasSession: !!data?.session,
        hasError: !!sessionError,
        sessionError: sessionError?.message ?? null,
        userId: data?.session?.user?.id ?? null,
      })
      
      if (sessionError) {
        if (isMountedRef.current) {
          setError(mapAuthError(sessionError, t))
          // Decrement loading counter and update ref since we're showing error UI (not navigating)
          if (hasSetLoadingRef.current) {
            setLoading(false)
            hasSetLoadingRef.current = false
          }
        }
        return
      }

      if (data.session) {
        // Session is valid, determine where to redirect
        const userId = data.session.user.id
        const appContext = getHostAppContext()

        // Priority -2: Check if this is a demo session callback
        const isDemoCallback = searchParams.get('demo') === 'true'
        if (isDemoCallback) {
          // For demo sessions, fetch organizations and use getLoginRedirect to determine correct destination
          // This ensures org_admin goes to /admin, coach goes to /admin, parent/athlete go to /portal/dashboard, etc.
          try {
            const { data: orgData, error: orgError } = await supabase.rpc('get_user_organizations', {
              check_user_id: userId
            } as any)

            if (orgError) {
              console.error('Error fetching demo user organizations for redirect:', orgError)
              // Fallback to portal dashboard if org fetch fails
              navigateWithTrace('/portal/dashboard', 'demo redirect org fetch error', {
                orgError: orgError.message,
              })
              return
            }

            // Map to Organization format with proper role validation
            const organizations = (orgData || []).map((org: any) => {
              const roles = Array.isArray(org.roles)
                ? org.roles.filter(
                    (r: unknown): r is OrgMemberRole =>
                      r === 'parent' || r === 'coach' || r === 'org_admin' || r === 'staff'
                  )
                : []
              
              return {
                id: org.org_id,
                name: org.org_name || '',
                roles,
                get role() { return this.roles[0] ?? 'parent' }
              }
            })

            // Check if user is a fan (for demo fan role)
            let isFan = false
            const signupMode = data.session.user.user_metadata?.signup_mode
            if (signupMode === 'fan') {
              isFan = true
            }
            if (!isFan) {
              const { count } = await supabase
                .from('fan_org_follows')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
              
              if (count && count > 0) {
                isFan = true
              }
            }

            // Defer navigation until useAuth confirms user is set
            const finalRedirect = getLoginRedirect(false, organizations, isFan)
            setDemoRedirect(finalRedirect)
            return
          } catch (err) {
            console.error('Exception fetching demo organizations for redirect:', err)
            setDemoRedirect('/portal/dashboard')
            return
          }
        }

        // Priority -1: Check if user is platform admin
        let isPlatformAdmin = false
        try {
          const { data: adminData } = await supabase
            .from('platform_admins')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle()

          if (adminData) {
            isPlatformAdmin = true
            // Navigation will unmount and cleanup will handle loading state
            navigateWithTrace('/platform-admin', 'platform admin detected')
            return
          }
        } catch (err) {
          console.error('Error checking platform admin status:', err)
        }

        // Priority 0: Check database for requires_org_setup flag (most reliable)
        // This handles email confirmation flows where localStorage may be on different device
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('requires_org_setup')
            .eq('id', userId)
            .single()

          // Only run org setup flow on the platform host. The admin subdomain
          // is reserved for platform admins and should not auto-route into org onboarding.
          if (appContext !== 'platform-admin' && !userError && (userData as any)?.requires_org_setup) {
          // Clear any localStorage flag (since database has it)
          clearSetupOrganizationFlag()
          // Navigation will unmount and cleanup will handle loading state
          navigateWithTrace('/admin/onboarding', 'requires_org_setup database flag')
          return
          }
        } catch (err) {
          console.error('Error checking requires_org_setup flag:', err)
          // Continue with fallback logic
        }

        // Priority 1: Check localStorage for setupOrganization flag
        // This handles Google OAuth flow where navigation state is lost
        const hasSetupOrgFlag = getSetupOrganizationFlag()
        if (hasSetupOrgFlag) {
          if (appContext === 'platform-admin') {
            // Prevent redirect loops if the flag was set on platform but callback happens on admin.
            clearSetupOrganizationFlag()
          } else {
          // Set the database flag for this user (for OAuth flow)
          // The trigger should have set it from metadata, but this is a backup
          try {
            type UsersUpdate = Database['public']['Tables']['users']['Update']

            await supabase
              .from('users')
              .update({ requires_org_setup: true } satisfies UsersUpdate)
              .eq('id', userId)

            // Also update auth metadata for consistency
            await supabase.auth.updateUser({
              data: { requires_org_setup: true }
            })
          } catch (err) {
            console.error('Error setting requires_org_setup flag:', err)
            // Continue anyway - the redirect will still work
          }

          // Clear the localStorage flag immediately to prevent redirect loops
          clearSetupOrganizationFlag()
          // Navigation will unmount and cleanup will handle loading state
          navigateWithTrace('/admin/onboarding', 'requires_org_setup local flag')
          return
          }
        }

        // Priority 2: Check for pending invite token in sessionStorage or localStorage
        const pendingInviteToken = sessionStorage.getItem('pending_invite_token') || localStorage.getItem('pending_invite_token')
        if (pendingInviteToken) {
          // Check if email is confirmed - if so, the auto-link trigger already ran
          // and we should let them go to dashboard, not redirect to accept-invite
          const emailConfirmed = data.session.user.email_confirmed_at !== null
          
          if (emailConfirmed) {
            // Email is confirmed, auto-link trigger has run
            // Clear the stored tokens since linking is done
            sessionStorage.removeItem('pending_invite_token')
            localStorage.removeItem('pending_invite_token')
            sessionStorage.removeItem('pending_invite_athlete_id')
            // Fall through to default redirect (dashboard)
          } else {
            // Email not yet confirmed, redirect to accept-invite which will handle the flow
            const pendingAthleteId = sessionStorage.getItem('pending_invite_athlete_id')
            
            // Check invite type from sessionStorage
            const inviteType = sessionStorage.getItem('pending_invite_type') || 'guardian'
            let acceptInviteUrl = `/portal/accept-invite?token=${pendingInviteToken}&type=${inviteType}`
            if (pendingAthleteId) {
              acceptInviteUrl += `&athlete_id=${pendingAthleteId}`
            }
            
            // Navigation will unmount and cleanup will handle loading state
            navigateWithTrace(acceptInviteUrl, 'pending invite token')
            return
          }
        }

        // Priority 3: Check for pending join team code
        const pendingJoinTeamCode = sessionStorage.getItem('pending_join_team_code')
        if (pendingJoinTeamCode) {
          // Email must be confirmed before joining team
          const emailConfirmed = data.session.user.email_confirmed_at !== null
          
          if (emailConfirmed) {
            // Redirect to join page with code
            const joinUrl = `/portal/join?code=${encodeURIComponent(pendingJoinTeamCode)}`
            // Navigation will unmount and cleanup will handle loading state
            navigateWithTrace(joinUrl, 'pending join team code')
            return
          } else {
            // Email not confirmed yet, will redirect after confirmation
            // Keep the code in sessionStorage for later
          }
        }

        // Priority 3b: Check for pending join link token
        const pendingJoinLinkToken = sessionStorage.getItem('pending_join_link_token')
        if (pendingJoinLinkToken) {
          // Email must be confirmed before joining via link
          const emailConfirmed = data.session.user.email_confirmed_at !== null
          
          if (emailConfirmed) {
            // Redirect to join link page with token
            const joinLinkUrl = `/portal/join/link?token=${encodeURIComponent(pendingJoinLinkToken)}`
            // Navigation will unmount and cleanup will handle loading state
            navigateWithTrace(joinLinkUrl, 'pending join link token')
            return
          }
        }

        // Priority 4: Check for redirect param in URL
        const redirectTo = searchParams.get('redirect')
        if (redirectTo) {
          // Validate the redirect URL is internal to prevent open redirect attacks
          if (redirectTo.startsWith('/')) {
            // Navigation will unmount and cleanup will handle loading state
            navigateWithTrace(redirectTo, 'redirect query param')
            return
          }
        }

        // Default: redirect based on user roles
        // Fetch user's organizations to determine redirect
        try {
          const { data: orgData, error: orgError } = await supabase.rpc('get_user_organizations', {
            check_user_id: userId
          } as any)

          if (orgError) {
            console.error('Error fetching user organizations for redirect:', orgError)
            // Fallback to host-based redirect if org fetch fails
            // Navigation will unmount and cleanup will handle loading state
            if (appContext === 'platform-admin') {
              navigateWithTrace('/platform-admin', 'org fetch fallback on platform host', {
                orgError: orgError.message,
              })
            } else {
              navigateWithTrace('/portal/dashboard', 'org fetch fallback', {
                orgError: orgError.message,
              })
            }
            return
          }

          // Map to Organization format with proper role validation
          const organizations = (orgData || []).map((org: any) => {
            // Normalize and validate roles array (same logic as useAuth.tsx)
            const roles = Array.isArray(org.roles)
              ? org.roles.filter(
                  (r: unknown): r is OrgMemberRole =>
                    r === 'parent' || r === 'coach' || r === 'org_admin' || r === 'staff'
                )
              : []
            
            return {
              id: org.org_id,
              name: org.org_name || '',
              roles,
              get role() { return this.roles[0] ?? 'parent' }
            }
          })

          // Check if user is a fan:
          // 1. Check auth metadata for signup_mode='fan'
          // 2. Check if user has any entries in fan_org_follows table
          let isFan = false
          
          // Check auth metadata signup_mode
          const signupMode = data.session.user.user_metadata?.signup_mode
          if (signupMode === 'fan') {
            isFan = true
          }
          
          // If not determined by metadata, check fan_org_follows table
          if (!isFan) {
            const { count } = await supabase
              .from('fan_org_follows')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
            
            if (count && count > 0) {
              isFan = true
            }
          }

          // Determine redirect based on roles and fan status
          const finalRedirect = getLoginRedirect(isPlatformAdmin, organizations, isFan)
          // Navigation will unmount and cleanup will handle loading state
          navigateWithTrace(finalRedirect, 'default role-based redirect', {
            isPlatformAdmin,
            orgCount: organizations.length,
            isFan,
            userId,
          })
        } catch (err) {
          // Fallback to host-based redirect if org fetch fails
          console.error('Exception fetching organizations for redirect:', err)
          // Navigation will unmount and cleanup will handle loading state
          if (appContext === 'platform-admin') {
            navigateWithTrace('/platform-admin', 'org fetch exception fallback platform', {
              error: err instanceof Error ? err.message : String(err),
            })
          } else {
            navigateWithTrace('/portal/dashboard', 'org fetch exception fallback', {
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
      } else {
        // No session found — redirect to login
        navigateWithTrace('/portal/login', 'no session after callback')
      }
    }

    handleCallback()
  }, [navigate, navigateWithTrace, searchParams, t, setLoading, logAuthCallback])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">
                  error
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Authentication Error
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                {error}
              </p>
              <a
                href="/portal/login"
                className="inline-flex justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Back to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <FullScreenLoader message="Completing sign in..." />
}
