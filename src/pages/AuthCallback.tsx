import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useI18n } from '../i18n/useI18n'
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
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Clean up any stale flags first
    cleanupStaleFlags()

    async function handleCallback() {
      // Check for error in URL params
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      
      if (errorParam) {
        const errorMessage = errorDescription || errorParam
        setError(mapAuthError(errorMessage, t))
        return
      }

      // Get the session from the URL hash (for OAuth callbacks)
      const { data, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setError(mapAuthError(sessionError, t))
        return
      }

      if (data.session) {
        // Session is valid, determine where to redirect
        const userId = data.session.user.id
        const appContext = getHostAppContext()

        // Priority -1: Check if user is platform admin
        let isPlatformAdmin = false
        try {
          const { data: adminData } = await supabase
            .from('platform_admins')
            .select('user_id')
            .eq('user_id', userId)
            .single()

          if (adminData) {
            isPlatformAdmin = true
            navigate('/platform-admin', { replace: true })
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
            navigate('/admin/onboarding', { replace: true })
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
          navigate('/admin/onboarding', { replace: true })
          return
          }
        }

        // Priority 2: Check for pending invite token in sessionStorage
        const pendingInviteToken = sessionStorage.getItem('pending_invite_token')
        if (pendingInviteToken) {
          navigate(`/portal/accept-invite?token=${pendingInviteToken}`, { replace: true })
          return
        }

        // Priority 3: Check for redirect param in URL
        const redirectTo = searchParams.get('redirect')
        if (redirectTo) {
          // Validate the redirect URL is internal to prevent open redirect attacks
          if (redirectTo.startsWith('/')) {
            navigate(redirectTo, { replace: true })
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
            if (appContext === 'platform-admin') {
              navigate('/platform-admin', { replace: true })
            } else {
              navigate('/portal/dashboard', { replace: true })
            }
            return
          }

          // Map to Organization format with proper role validation
          const organizations = (orgData || []).map((org: any) => {
            // Normalize and validate roles array (same logic as useAuth.tsx)
            const roles = Array.isArray(org.roles)
              ? org.roles.filter(
                  (r: unknown): r is OrgMemberRole =>
                    r === 'parent' || r === 'coach' || r === 'org_admin'
                )
              : []
            
            return {
              id: org.org_id,
              name: org.org_name || '',
              roles,
              get role() { return this.roles[0] ?? 'parent' }
            }
          })

          // Determine redirect based on roles
          const finalRedirect = getLoginRedirect(isPlatformAdmin, organizations)
          navigate(finalRedirect, { replace: true })
        } catch (err) {
          // Fallback to host-based redirect if org fetch fails
          console.error('Exception fetching organizations for redirect:', err)
          if (appContext === 'platform-admin') {
            navigate('/platform-admin', { replace: true })
          } else {
            navigate('/portal/dashboard', { replace: true })
          }
        }
      } else {
        // No session, might be email confirmation
        // Supabase should handle this automatically
        navigate('/portal/login', { replace: true })
      }
    }

    handleCallback()
  }, [navigate, searchParams])

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">Completing sign in...</p>
      </div>
    </div>
  )
}
