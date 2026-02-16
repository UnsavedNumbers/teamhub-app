import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useOrganization, Organization } from '../contexts/OrganizationContext'
import type { PlatformAdminRole } from '../types/platformAdmin.types'
import type { HomeLocation } from '../types/location'
import { geocodeZipToHomeLocation } from '../utils/homeLocation'
import { USE_FAKE_DATA } from '../data/config'
import { getDemoUserContext } from '../data/fake/userContext'
import { getOrganizationById } from '../data/fake/fakeOrganizations'
import { debug } from '../lib/debug'

// Role types - now per organization
type OrgMemberRole = 'parent' | 'coach' | 'org_admin' | 'staff'
type LegacyUserRole = 'parent' | 'coach' | 'admin'

interface UserProfile {
  id: string
  email: string | null
  phone: string
  first_name: string
  last_name: string
  display_name: string | null
  home_location?: HomeLocation | null
  home_zipcode?: string
  // Legacy fields (deprecated, use organizations instead)
  role?: LegacyUserRole
  family_id?: string | null
  org_id?: string | null
  organizations: Organization[]
  isPlatformAdmin: boolean
  platformAdminRole: PlatformAdminRole | null
  // Organization setup requirement flag
  requiresOrgSetup: boolean
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, firstName: string, lastName: string, phone: string, zipcode: string, requiresOrgSetup?: boolean, signupMode?: 'fan' | 'parent') => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  updateEmail: (newEmail: string, redirectTo?: string) => Promise<{ error: AuthError | null }>
  refreshProfile: () => Promise<void>
  // Role helpers (UX-only, not security - RLS handles authorization)
  hasRole: (orgId: string, role: OrgMemberRole) => boolean
  hasAnyRole: (role: OrgMemberRole) => boolean
  isOrgAdmin: (orgId?: string) => boolean
}

/* ===================== CONTEXT ===================== */

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/* ===================== PROVIDER ===================== */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const { setOrganizations, currentOrganization } = useOrganization()

  // Prevent duplicate profile fetches (Bug Prevention #1 & #7)
  const profileFetchRef = useRef<Set<string>>(new Set())

  // Track last processed auth event timestamp for debouncing (Bug Prevention #3)
  const lastAuthEventRef = useRef<{ event: string; timestamp: number } | null>(null)

  // Mounted flag for cleanup (Bug Prevention #2)
  const mountedRef = useRef(true)

  /* ===================== FETCH PROFILE ===================== */

  const fetchProfile = useCallback(
    async (userId: string) => {
      // Prevent duplicate fetches for same user (Bug Prevention #1 & #7)
      if (profileFetchRef.current.has(userId)) {
        debug.flow('Auth', 'Profile fetch skipped (already in progress)', { userId })
        return
      }

      debug.flow('Auth', 'Profile fetch started', { userId })
      debug.perf.start(`auth.fetchProfile-${userId}`)

      profileFetchRef.current.add(userId)
      setLoading(true)

      try {
        /* ---- user table ---- */
        // Try to select with home_zipcode/home_location first (if migration has been applied)
        let { data: userData, error: userError } = await supabase
          .from('users')
          .select(
            'id, email, phone, display_name, home_zipcode, home_location, role, family_id, org_id, requires_org_setup'
          )
          .eq('id', userId)
          .single()

        // If column doesn't exist yet (migration not applied), retry without it
        if (userError?.code === '42703') {
          const retryResult = await supabase
            .from('users')
            .select(
              'id, email, phone, display_name, role, family_id, org_id, requires_org_setup'
            )
            .eq('id', userId)
            .single()
          userData = retryResult.data as any
          userError = retryResult.error
        }

        // Simplified error handling (Bug Prevention #4 & #9)
        if (userError || !userData) {
          const userErrorMessage = (userError?.message || '').toLowerCase()
          const isNetworkError =
            userErrorMessage.includes('networkerror') ||
            userErrorMessage.includes('failed to fetch') ||
            userErrorMessage.includes('network request failed')

          if (isNetworkError) {
            console.warn('Profile fetch network error:', userError)
            const { data: sessionData } = await supabase.auth.getSession()
            const sessionUser = sessionData.session?.user

            if (mountedRef.current && sessionUser?.id === userId) {
              const metadata = sessionUser.user_metadata ?? {}
              const fallbackProfile: UserProfile = {
                id: sessionUser.id,
                email: sessionUser.email ?? null,
                phone: typeof metadata.phone === 'string' ? metadata.phone : '',
                first_name: '',
                last_name: '',
                display_name:
                  typeof metadata.display_name === 'string' ? metadata.display_name : null,
                home_location: null,
                home_zipcode:
                  typeof metadata.home_zipcode === 'string' ? metadata.home_zipcode : undefined,
                role: undefined,
                family_id: null,
                org_id: null,
                organizations: [],
                isPlatformAdmin: false,
                platformAdminRole: null,
                requiresOrgSetup: Boolean(metadata.requires_org_setup),
              }
              setProfile((prev) => prev ?? fallbackProfile)
              setOrganizations([])
            }
            return
          }

          console.error('Profile fetch error:', userError)
          await supabase.auth.signOut()
          setProfile(null)
          return
        }

        // Type guard: ensure userData is not an error type
        if (!('id' in userData) || !userData.id) {
          console.error('Invalid user data structure')
          await supabase.auth.signOut()
          setProfile(null)
          return
        }

        // Type assertion: userData is now confirmed to be the correct type
        // home_zipcode/home_location may not exist if migration hasn't been applied yet
        const validUserData = userData as unknown as {
          id: string
          email: string | null
          phone: string | null
          display_name: string | null
          home_location?: HomeLocation | null
          home_zipcode?: string | null
          role: string | null
          family_id: string | null
          org_id: string | null
          requires_org_setup: boolean | null
        }

        /* ---- organizations ---- */
        let orgs: Organization[] = []
        let data: Array<{ org_id: string; org_name: string; roles: OrgMemberRole[] }> | null = null

        try {
          let orgError: any = null
          // Use real Supabase RPC
          const result = await supabase.rpc('get_user_organizations', {
            check_user_id: userId,
          })
          data = result.data as any
          orgError = result.error

          // Log RPC errors for debugging (this is likely the "profit data" / "profile data" error)
          if (orgError) {
            console.error('Error fetching user organizations:', orgError)
            // Continue with empty orgs - don't block profile creation
          }

          // Debug logging for organization loading
          if (process.env.NODE_ENV === 'development') {
            console.log('[useAuth] RPC result:', { userId, dataCount: data?.length ?? 0, hasError: !!orgError, data })
          }

          // Type-safe organization mapping (Bug Prevention #5 & #8)
          if (Array.isArray(data)) {
            orgs = data.map((o: any) => {
              // Normalize and validate roles array
              const roles = Array.isArray(o.roles)
                ? o.roles.filter(
                  (r: unknown): r is OrgMemberRole =>
                    r === 'parent' || r === 'coach' || r === 'org_admin' || r === 'staff'
                )
                : []

              return {
                id: o.org_id,
                name: o.org_name || '',
                roles,
                // Compatibility getter for deprecated 'role' property
                get role(): OrgMemberRole {
                  return roles[0] ?? 'parent'
                },
              }
            })
            
            // Debug logging for mapped organizations
            if (process.env.NODE_ENV === 'development') {
              console.log('[useAuth] Mapped organizations:', orgs)
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[useAuth] RPC data is not an array:', data)
            }
          }
        } catch (err) {
          // Continue with empty orgs on error
          console.error('Exception fetching user organizations:', err)
          orgs = []
        }

        /* ---- platform admin ---- */
        const { data: admin } = await supabase
          .from('platform_admins')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()

        // Bug Prevention #10: Default to 'support_admin' if NULL
        let platformAdminRole: PlatformAdminRole | null = null
        if (admin) {
          platformAdminRole = admin.role ?? 'support_admin'
          if (!admin.role) {
            console.warn(`Platform admin ${userId} has NULL role, defaulting to support_admin`)
          }
        }

        // Guard against auth state changes during fetch (Bug Prevention #8)
        // Check if user is still the same before setting profile
        if (!mountedRef.current) return

        const profileData: UserProfile = {
          id: validUserData.id,
          email: validUserData.email,
          phone: validUserData.phone ?? '',
          first_name: '', // first_name and last_name not in users table, derived from display_name if needed
          last_name: '',
          display_name: validUserData.display_name,
          home_location: (validUserData.home_location as HomeLocation | null) ?? null,
          home_zipcode: validUserData.home_zipcode ?? undefined,
          role: (validUserData.role === 'parent' || validUserData.role === 'coach' || validUserData.role === 'admin') 
            ? (validUserData.role as LegacyUserRole) 
            : undefined,
          family_id: validUserData.family_id,
          org_id: validUserData.org_id,
          organizations: orgs,
          isPlatformAdmin: !!admin,
          platformAdminRole,
          requiresOrgSetup: validUserData.requires_org_setup ?? false,
        }

        // Guard against state updates after unmount (Bug Prevention #2)
        if (!mountedRef.current) return

        // Debug logging before setting organizations
        if (process.env.NODE_ENV === 'development') {
          console.log('[useAuth] Setting organizations:', { orgCount: orgs.length, orgs })
        }

        setProfile(profileData)
        setOrganizations(orgs)
        debug.perf.end(`auth.fetchProfile-${userId}`)
        debug.flow('Auth', 'Profile fetch completed', {
          userId,
          orgCount: orgs.length,
          isPlatformAdmin: profileData.isPlatformAdmin,
          requiresOrgSetup: profileData.requiresOrgSetup
        })
      } catch (err) {
        debug.perf.end(`auth.fetchProfile-${userId}`)
        const message = err instanceof Error ? err.message.toLowerCase() : ''
        const isNetworkError =
          message.includes('networkerror') ||
          message.includes('failed to fetch') ||
          message.includes('network request failed')

        if (isNetworkError) {
          debug.error('Auth', 'Profile fetch failed (network)', { userId, error: err })
          return
        }

        debug.error('Auth', 'Profile fetch failed', { userId, error: err })
        if (mountedRef.current) {
          setProfile(null)
        }
      } finally {
        profileFetchRef.current.delete(userId)
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [setOrganizations]
  )

  /* ===================== AUTH BOOTSTRAP ===================== */

  useEffect(() => {
    mountedRef.current = true

    if (USE_FAKE_DATA) {
      setLoading(false)
      return () => {
        mountedRef.current = false
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mountedRef.current) return

      // Handle session/user mismatch (Bug Prevention #10)
      const session = data.session
      if (!mountedRef.current) return
      setSession(session)
      setUser(session?.user ?? null)

      // If session exists but user is null, clear state
      if (session && !session.user) {
        if (!mountedRef.current) return
        setSession(null)
        setUser(null)
        setProfile(null)
        setOrganizations([])
        setLoading(false)
        return
      }

      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        if (!mountedRef.current) return
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return

      // Ignore TOKEN_REFRESHED events - they fire on tab focus and cause unnecessary re-renders
      // The session is still valid, no need to trigger loading states or re-fetch profile
      if (event === 'TOKEN_REFRESHED') {
        // Silently update session without triggering loading states
        if (session) {
          setSession(session)
          // Don't update user or trigger profile fetch - nothing meaningful changed
          debug.flow('Auth', 'Token refreshed', { userId: session.user.id })
        }
        return
      }

      // Log auth state changes
      debug.flow('Auth', `State change: ${event}`, {
        event,
        userId: session?.user?.id,
        hasSession: !!session,
        email: session?.user?.email
      })

      // Event debouncing (Bug Prevention #3)
      const now = Date.now()
      const lastEvent = lastAuthEventRef.current
      if (
        lastEvent &&
        lastEvent.event === event &&
        now - lastEvent.timestamp < 100
      ) {
        return // Skip duplicate event within 100ms
      }
      lastAuthEventRef.current = { event, timestamp: now }

      // Handle session/user mismatch (Bug Prevention #10)
      if (session && !session.user) {
        if (!mountedRef.current) return
        setSession(null)
        setUser(null)
        setProfile(null)
        setOrganizations([])
        setLoading(false)
        return
      }

      if (!mountedRef.current) return
      setSession(session)
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN') {
        debug.flow('Auth', 'User signed in', { userId: session?.user?.id, email: session?.user?.email })
      } else if (event === 'SIGNED_OUT') {
        debug.flow('Auth', 'User signed out', { previousUserId: user?.id })
        if (!mountedRef.current) return
        setProfile(null)
        setOrganizations([])
        setLoading(false)
        return
      }

      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user.id)
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, setOrganizations])

  /* ===================== LOADING STATE TIMEOUT FALLBACK ===================== */

  // Bug Prevention #4: Ensure loading state doesn't get stuck
  useEffect(() => {
    if (!loading) return

    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading state stuck, forcing reset')
        setLoading(false)
      }
    }, 5000)

    return () => clearTimeout(timeout)
  }, [loading])

  /* ===================== AUTH ACTIONS ===================== */

  async function signInWithEmail(email: string, password: string) {
    return debug.group(`Auth.signInWithEmail: ${email}`, async () => {
        debug.flow('Auth', 'Login attempt', { email, method: 'email' })
        debug.perf.start('auth.signInWithEmail')

        if (USE_FAKE_DATA) {
      const demoContext = getDemoUserContext(email)
      if (!demoContext) {
        return { error: { message: 'Invalid login credentials' } as AuthError }
      }

      const roles: OrgMemberRole[] = demoContext.roles
      const organizationName = getOrganizationById(demoContext.orgId)?.name ?? 'Demo Organization'
      const organizations: Organization[] = [
        {
          id: demoContext.orgId,
          name: organizationName,
          roles,
          get role(): OrgMemberRole {
            return roles[0] ?? 'parent'
          },
        },
      ]

      const legacyRole: LegacyUserRole | undefined = roles.includes('org_admin')
        ? 'admin'
        : roles.includes('coach')
          ? 'coach'
          : roles.includes('parent')
            ? 'parent'
            : undefined

      const demoUser = {
        id: demoContext.userId,
        email: demoContext.email,
        user_metadata: { signup_mode: 'parent' },
      } as unknown as User

      const demoProfile: UserProfile = {
        id: demoContext.userId,
        email: demoContext.email,
        phone: '',
        first_name: '',
        last_name: '',
        display_name: demoContext.email?.split('@')[0] ?? null,
        home_location: null,
        home_zipcode: undefined,
        role: legacyRole,
        family_id: null,
        org_id: demoContext.orgId,
        organizations,
        isPlatformAdmin: demoContext.isPlatformAdmin,
        platformAdminRole: null,
        requiresOrgSetup: false,
      }

      setUser(demoUser)
      setSession(null)
            setProfile(demoProfile)
            setOrganizations(organizations)
            setLoading(false)
            debug.perf.end('auth.signInWithEmail')
            debug.flow('Auth', 'Login successful (demo)', { email, userId: demoContext.userId, roles: demoContext.roles })
            return { error: null }
        }

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            debug.perf.end('auth.signInWithEmail')
            if (error) {
                debug.error('Auth', 'Login failed', { email, error: error.message })
            } else {
                debug.flow('Auth', 'Login initiated', { email })
            }
            return { error }
        } catch (err) {
            debug.perf.end('auth.signInWithEmail')
            debug.error('Auth', 'Login exception', { email, error: err })
            return { error: err as AuthError }
        }
    })
  }

  async function signInWithGoogle() {
    // Import getBaseUrl to get current origin (supports localhost and production)
    const { getBaseUrl } = await import('../utils/host')
    const baseUrl = getBaseUrl()
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Use current base URL for OAuth redirect
        // This works for localhost development and production
        redirectTo: `${baseUrl}/portal/auth/callback`,
      },
    })
    return { error }
  }

  async function signUp(email: string, password: string, firstName: string, lastName: string, phone: string, zipcode: string, requiresOrgSetup?: boolean, signupMode?: 'fan' | 'parent', tosAccepted?: boolean, privacyAccepted?: boolean) {
    return debug.group(`Auth.signUp: ${email}`, async () => {
        debug.flow('Auth', 'Signup attempt', { email, signupMode, requiresOrgSetup })
        debug.perf.start('auth.signUp')

        // Import getBaseUrl to get current origin (supports localhost and production)
        const { getBaseUrl } = await import('../utils/host')
        const baseUrl = getBaseUrl()
        const trimmedZip = zipcode.trim()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Use current base URL for email verification links
        // This works for localhost development and production
        emailRedirectTo: `${baseUrl}/portal/auth/callback`,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          home_zipcode: trimmedZip || undefined, // Only include if not empty
          // Derive display_name from first+last for backward compatibility
          display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          // Pass requires_org_setup to metadata - the database trigger will read this
          requires_org_setup: requiresOrgSetup ?? false,
          // Pass signup_mode to metadata for tracking user intent
          signup_mode: signupMode || 'parent',
        },
      },
    })

        if (!error && data?.user) {
          const userId = data.session?.user?.id || data.user.id
          const now = new Date().toISOString()
          const consentVersion = '1.0' // Update this when ToS/Privacy Policy versions change

          try {
            // Update user with consent and home location
            const updateData: any = {}
            
            if (tosAccepted) {
              updateData.tos_accepted_at = now
            }
            if (privacyAccepted) {
              updateData.privacy_policy_accepted_at = now
            }
            if (tosAccepted || privacyAccepted) {
              updateData.consent_version = consentVersion
            }
            if (trimmedZip) {
              updateData.home_zipcode = trimmedZip
            }

            if (Object.keys(updateData).length > 0) {
              if (trimmedZip) {
                try {
                  const homeLocation = await geocodeZipToHomeLocation(trimmedZip)
                  if (homeLocation) {
                    updateData.home_location = homeLocation
                  }
                } catch (err) {
                  debug.error('Auth', 'Failed to geocode zipcode', { email, error: err })
                }
              }

              await supabase
                .from('users')
                .update(updateData)
                .eq('id', userId)
            }
          } catch (err) {
            debug.error('Auth', 'Failed to save consent/home location after signup', { email, error: err })
          }
        }

        debug.perf.end('auth.signUp')
        if (error) {
          debug.error('Auth', 'Signup failed', { email, error: error.message })
        } else {
          debug.flow('Auth', 'Signup successful', { email, userId: data?.user?.id, signupMode })
        }
        return { error }
    })
  }

  async function signOut() {
    return debug.group('Auth.signOut', async () => {
        debug.flow('Auth', 'Logout started', { userId: user?.id })
        debug.perf.start('auth.signOut')

        if (USE_FAKE_DATA) {
          setUser(null)
          setProfile(null)
          setSession(null)
          setOrganizations([])
          setLoading(false)
          debug.perf.end('auth.signOut')
          debug.flow('Auth', 'Logout completed (demo)', { userId: user?.id })
          return
        }

        try {
          await supabase.auth.signOut()
          setUser(null)
          setProfile(null)
          setSession(null)
          setOrganizations([])
          debug.perf.end('auth.signOut')
          debug.flow('Auth', 'Logout completed', { userId: user?.id })
        } catch (err) {
          debug.perf.end('auth.signOut')
          debug.error('Auth', 'Logout failed', { userId: user?.id, error: err })
        }
    })
  }

  async function resetPassword(email: string) {
    // Import getBaseUrl to get current origin (supports localhost and production)
    const { getBaseUrl } = await import('../utils/host')
    const baseUrl = getBaseUrl()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Use current base URL for password reset links
      // This works for localhost development and production
      redirectTo: `${baseUrl}/reset-password`,
    })
    return { error }
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }

  async function updateEmail(newEmail: string, redirectTo?: string) {
    // Import getBaseUrl to get current origin (supports localhost and production)
    const { getBaseUrl } = await import('../utils/host')
    const baseUrl = getBaseUrl()
    
    // Use provided redirectTo or default to current path (settings page)
    const emailRedirectTo = redirectTo 
      ? `${baseUrl}${redirectTo}` 
      : `${baseUrl}${window.location.pathname}`
    
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo }
    )
    return { error }
  }

  async function refreshProfile() {
    if (USE_FAKE_DATA) {
      return
    }

    if (user?.id) {
      await fetchProfile(user.id)
    }
  }

  /* ===================== ROLE HELPERS ===================== */

  function hasRole(orgId: string, role: OrgMemberRole) {
    if (profile?.isPlatformAdmin) return true
    return profile?.organizations.some(
      (o) => o.id === orgId && o.roles.includes(role)
    ) ?? false
  }

  function hasAnyRole(role: OrgMemberRole) {
    if (profile?.isPlatformAdmin) return true
    return profile?.organizations.some((o) => o.roles.includes(role)) ?? false
  }

  function isOrgAdmin(orgId?: string) {
    if (profile?.isPlatformAdmin) return true
    if (orgId) return hasRole(orgId, 'org_admin')
    return currentOrganization
      ? hasRole(currentOrganization.id, 'org_admin')
      : false
  }

  /* ===================== CONTEXT VALUE ===================== */

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signInWithEmail,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateEmail,
    refreshProfile,
    hasRole,
    hasAnyRole,
    isOrgAdmin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ===================== HOOK ===================== */

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/** Returns auth context or undefined when outside AuthProvider. Use when component may render outside provider. */
export function useOptionalAuth() {
  return useContext(AuthContext)
}
