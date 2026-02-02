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

// Role types - now per organization
type OrgMemberRole = 'parent' | 'coach' | 'org_admin'
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
  signUp: (email: string, password: string, firstName: string, lastName: string, phone: string, zipcode: string, requiresOrgSetup?: boolean) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
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
      if (profileFetchRef.current.has(userId)) return

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
          data = result.data
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
                    r === 'parent' || r === 'coach' || r === 'org_admin'
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
      } catch (err) {
        console.error('Error in fetchProfile:', err)
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

      if (event === 'SIGNED_OUT') {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
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

  async function signUp(email: string, password: string, firstName: string, lastName: string, phone: string, zipcode: string, requiresOrgSetup?: boolean) {
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
        },
      },
    })

    if (!error && data?.session?.user && trimmedZip) {
      try {
        const homeLocation = await geocodeZipToHomeLocation(trimmedZip)
        if (homeLocation) {
          await supabase
            .from('users')
            .update({ home_location: homeLocation, home_zipcode: trimmedZip })
            .eq('id', data.session.user.id)
        }
      } catch (err) {
        console.error('Failed to save home_location after signup', err)
      }
    }

    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    setOrganizations([])
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

  async function refreshProfile() {
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
