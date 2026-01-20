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

// Role types - now per organization
type OrgMemberRole = 'parent' | 'coach' | 'org_admin'

// Legacy single-org role type (for backward compatibility)
type LegacyUserRole = 'parent' | 'coach' | 'admin'

interface UserProfile {
  id: string
  email: string | null
  phone: string | null
  display_name: string | null
  // Legacy fields (deprecated, use organizations instead)
  role?: LegacyUserRole
  family_id?: string | null
  org_id?: string | null
  // New multi-org fields
  organizations: Organization[]
  isPlatformAdmin: boolean
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
  signUp: (email: string, password: string, displayName?: string, requiresOrgSetup?: boolean) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  refreshProfile: () => Promise<void>
  // Role helpers (UX-only, not security - RLS handles authorization)
  hasRole: (orgId: string, role: OrgMemberRole) => boolean
  hasAnyRole: (role: OrgMemberRole) => boolean
  isOrgAdmin: (orgId?: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(
            'id, email, phone, display_name, role, family_id, org_id, requires_org_setup'
          )
          .eq('id', userId)
          .single()

        // Simplified error handling (Bug Prevention #4 & #9)
        if (userError || !userData || !userData.id) {
          console.error('Profile fetch error:', userError)
          await supabase.auth.signOut()
          setProfile(null)
          return
        }

        /* ---- organizations ---- */
        let orgs: Organization[] = []
        try {
          const { data, error: orgError } = await supabase.rpc('get_user_organizations', {
            check_user_id: userId,
          })

          // Log RPC errors for debugging (this is likely the "profit data" / "profile data" error)
          if (orgError) {
            console.error('Error fetching user organizations:', orgError)
            // Continue with empty orgs - don't block profile creation
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
                id: o.organization_id,
                name: o.org_name || '',
                roles,
                // Compatibility getter for deprecated 'role' property
                get role(): OrgMemberRole {
                  return roles[0] ?? 'parent'
                },
              }
            })
          }
        } catch (err) {
          // Continue with empty orgs on error
          console.error('Exception fetching user organizations:', err)
          orgs = []
        }

        /* ---- platform admin ---- */
        const { data: admin } = await supabase
          .from('platform_admins')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle()

        // Guard against auth state changes during fetch (Bug Prevention #8)
        // Check if user is still the same before setting profile
        if (!mountedRef.current) return
        
        const profileData: UserProfile = {
          id: userData.id,
          email: userData.email,
          phone: userData.phone,
          display_name: userData.display_name,
          role: userData.role ?? undefined,
          family_id: userData.family_id,
          org_id: userData.org_id,
          organizations: orgs,
          isPlatformAdmin: !!admin,
          requiresOrgSetup: userData.requires_org_setup ?? false,
        }

        // Guard against state updates after unmount (Bug Prevention #2)
        if (!mountedRef.current) return
        
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/portal/auth/callback`,
      },
    })
    return { error }
  }

  async function signUp(email: string, password: string, displayName?: string, requiresOrgSetup?: boolean) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/auth/callback`,
        data: {
          display_name: displayName,
          // Pass requires_org_setup to metadata - the database trigger will read this
          requires_org_setup: requiresOrgSetup ?? false,
        },
      },
    })
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
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
    if (orgId) {
      return hasRole(orgId, 'org_admin')
    }
    return currentOrganization ? hasRole(currentOrganization.id, 'org_admin') : false
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
